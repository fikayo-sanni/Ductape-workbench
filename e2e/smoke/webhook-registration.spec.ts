import { test, expect } from '@playwright/test';
import { createHash, createDecipheriv } from 'node:crypto';

test('bulk webhook registration preserves scope and retries only failures', async ({ page }) => {
  test.setTimeout(120_000);
  const writes: Record<string, string>[] = [];
  let failPayment = true;
  await page.route('**/proxy/v1/sdk-proxy/execute', async route => {
    const body = route.request().postDataJSON();
    const [iv, ciphertext] = body.encrypted_payload.split(':');
    const decipher = createDecipheriv('aes-256-cbc', createHash('sha256').update('test-public').digest(), Buffer.from(iv, 'hex'));
    const request = JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString());
    let data: unknown = null;
    if (request.method === 'apps.webhooks.list') {
      data = [{ tag: 'orders', config: [{ productEnv: 'dev', url: 'https://old.example.com', uuid: 'existing' }] }];
    }
    if (request.method === 'apps.webhooks.generateLink') {
      const input = request.params[0];
      writes.push(input);
      if (input.webhook_tag === 'payments' && failPayment) {
        return route.fulfill({ json: { status: false, message: 'Temporary registration failure' } });
      }
      data = `https://webhooks.example.com/${input.webhook_tag}/${input.env}`;
    }
    await route.fulfill({ json: { status: true, data: { data } } });
  });
  await page.goto('/e2e/fixtures/webhook-registration.html', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByRole('checkbox', { name: 'Select orders', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Select payments', exact: true }).check();
  await page.getByRole('button', { name: 'Register selected' }).click();
  await page.getByLabel('Consumer endpoint', { exact: true }).fill('https://consumer.example.com/events');
  await page.getByRole('checkbox', { name: 'Development', exact: true }).check();
  const save = page.getByRole('button', { name: 'Save registrations', exact: true });
  await expect(save).toBeDisabled();
  await page.getByRole('checkbox', { name: /Update 1 existing registration/ }).check();
  await save.click();
  await expect(page.getByRole('button', { name: 'Retry 1 failed' })).toBeEnabled();
  expect(writes.map(input => input.webhook_tag)).toEqual(['orders', 'payments']);
  expect(writes.every(input => input.env === 'dev' && input.url === 'https://consumer.example.com/events' && input.method === 'POST' && input.access_tag === 'access' && input.product === 'product')).toBe(true);
  failPayment = false;
  await page.getByRole('button', { name: 'Retry 1 failed' }).click();
  await expect(page.getByRole('button', { name: 'Registrations saved' })).toBeDisabled();
  expect(writes.map(input => input.webhook_tag)).toEqual(['orders', 'payments', 'payments']);
  await expect(page.getByRole('list', { name: 'Registration results' }).getByRole('listitem')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/webhook-bulk-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: 'test-results/webhook-bulk-mobile-dark.png' });
  await page.getByRole('button', { name: 'Close registration' }).click();
  await page.getByRole('checkbox', { name: 'Select all webhooks', exact: true }).check();
  await expect(page.getByText('3 selected', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Select all webhooks', exact: true }).uncheck();
  await expect(page.getByRole('button', { name: 'Register selected' })).toBeDisabled();
});
