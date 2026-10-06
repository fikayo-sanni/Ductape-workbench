import { test, expect } from '@playwright/test';

for (const section of ['cloud', 'products', 'apps', 'environments']) {
  test(`${section} sidebar refresh loads fresh data and preserves search`, async ({ page }) => {
    test.setTimeout(120_000);
    let fresh = false;
    let fail = false;
    const requests: string[] = [];
    await page.route(/\/(apps|integrations|workspaces|proxy)\/v1\//, async route => {
      requests.push(route.request().url());
      if (fail) return route.fulfill({ status: 500, json: { message: 'Test failure' } });
      const name = fresh ? 'Fresh item' : 'Original item';
      let json: unknown = { data: [] };
      if (section === 'products') json = { data: [{ _id: 'p', name, tag: 'item', status: 'draft' }] };
      if (section === 'apps') json = { data: [{ _id: route.request().url(), app_name: name, tag: 'item', workspace_id: route.request().url().includes('/access/') ? 'other' : 'test-workspace' }] };
      if (section === 'cloud') json = { status: true, data: { data: [{ id: 'c', display_name: name, tag: 'item', provider: 'aws', status: 'active' }] } };
      if (section === 'environments') json = { status: true, data: [{ workspace_id: 'test-workspace', workspace_name: 'Test', accepted: true, defaultEnvs: [{ env_name: name, slug: 'dev' }] }] };
      return route.fulfill({ json });
    });
    await page.goto(`/e2e/fixtures/sidebar-refresh.html?section=${section}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    const button = page.getByRole('button', { name: `Refresh ${section === 'cloud' ? 'cloud connections' : section}`, exact: true });
    await expect(button).toBeEnabled({ timeout: 60_000 });
    const search = page.getByPlaceholder(/^Search/);
    await search.fill(section === 'environments' ? 'dev' : 'item');
    const before = requests.length;
    fresh = true;
    await button.click();
    await expect(page.getByText('Fresh item', { exact: true }).first()).toBeVisible();
    await expect(button).toBeEnabled();
    expect(requests.length - before).toBe(section === 'apps' ? 2 : 1);
    await expect(search).toHaveValue(section === 'environments' ? 'dev' : 'item');
    fail = true;
    await button.click();
    await expect(page.getByText(/Failed to refresh/)).toBeVisible();
    await expect(button).toBeEnabled();
    await expect(page.getByText('Fresh item', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: `test-results/sidebar-${section}.png` });
  });
}
