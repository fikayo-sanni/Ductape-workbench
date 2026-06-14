import { test, expect } from '@playwright/test';

test.describe('Workbench auth pages (unauthenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('redirects workbench root to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('validates password length before submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill('user@example.com');
    await page.getByTestId('login-password').fill('short');
    await page.getByTestId('login-submit').click();
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('signup page renders', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByTestId('signup-page')).toBeVisible();
  });
});
