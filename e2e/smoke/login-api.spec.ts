import { test, expect } from '@playwright/test';
import { hasAuthCredentials } from '../helpers/env';

test.describe('Login via UI (live API)', () => {
  test.skip(!hasAuthCredentials(), 'Requires E2E_EMAIL and E2E_PASSWORD');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test('logs in and dismisses login modal', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('login-modal')).toBeVisible();

    await page.getByTestId('login-email').fill(process.env.E2E_EMAIL!);
    await page.getByTestId('login-password').fill(process.env.E2E_PASSWORD!);
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-modal')).toBeHidden({ timeout: 30_000 });
    await expect(page.getByTestId('workbench-header')).toBeVisible();
    await expect(page.getByTestId('icon-sidebar')).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });
});
