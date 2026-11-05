import { test, expect } from '@playwright/test';
for (const kind of ['messaging','notifications','caches','jobs','features','agents','resilience','functions']) {
  test(`${kind} shared overview cards retain readable metrics`, async ({ page }) => {
    await page.goto(`/e2e/fixtures/resource-overviews.html?kind=${kind}`);
    await page.waitForLoadState('networkidle');
    const cards = page.locator('[data-resource-overview-metric]');
    await expect(cards).toHaveCount(4);
    const label = cards.first().locator('p').first();
    const value = cards.first().locator('div.tabular-nums');
    await expect(value).toBeVisible();
    const bounds = await label.boundingBox(); const valueBounds = await value.boundingBox();
    expect(bounds!.y).toBeLessThan(valueBounds!.y);
    await expect(cards.first()).not.toHaveClass(/text-center/);
    await page.getByRole('button', { name: '1 month', exact: true }).click();
    await expect(page.getByRole('button', { name: '1 month', exact: true })).toHaveClass(/bg-primary/);
    await page.screenshot({ path: `/tmp/ductape-overview-${kind}.png`, fullPage: true });
  });
}
test('actual session overview preserves values and trends', async ({ page }) => {
  await page.goto('/e2e/fixtures/resource-overviews.html?kind=sessions');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-resource-overview-metric]')).toHaveCount(6);
  await expect(page.getByText('Daily Active', { exact: true })).toBeVisible();
  await expect(page.getByText('1,200', { exact: true })).toBeVisible();
  await expect(page.getByText('42,000', { exact: true })).toBeVisible();
  await expect(page.getByText('20.0%', { exact: true })).toBeVisible();
  await page.screenshot({ path: '/tmp/ductape-overview-sessions.png', fullPage: true });
});
test('actual webhook overview preserves selectors and controls', async ({ page }) => {
  await page.goto('/e2e/fixtures/resource-overviews.html?kind=webhooks');
  await expect(page.locator('[data-resource-overview-metric]')).toHaveCount(4);
  await expect(page.getByText('Single selector', { exact: true })).toBeVisible();
  await expect(page.getByText('4', { exact: true })).toBeVisible();
});
test('overview cards and controls fit mobile dark mode', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/e2e/fixtures/resource-overviews.html?kind=messaging&dark=1');
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await expect(page.getByText('12,345', {exact:true})).toBeVisible();
  await page.screenshot({path:'/tmp/ductape-overview-mobile.png',fullPage:true});
});
