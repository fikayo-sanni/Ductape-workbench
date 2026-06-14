import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '../.auth/user.json');

function authStorageHasSession(): boolean {
  if (!fs.existsSync(authFile)) return false;
  try {
    const state = JSON.parse(fs.readFileSync(authFile, 'utf8')) as {
      origins?: Array<{ localStorage?: Array<{ name: string; value: string }> }>;
    };
    const storage = state.origins?.[0]?.localStorage ?? [];
    return storage.some((e) => e.name === 'token' && e.value.length > 0);
  } catch {
    return false;
  }
}

test.describe('Authenticated workbench', () => {
  test.skip(!authStorageHasSession(), 'Run auth.setup with valid E2E_EMAIL / E2E_PASSWORD');

  test('does not show login modal on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('login-modal')).toBeHidden();
    await expect(page.getByTestId('workbench-header')).toBeVisible();
    await expect(page.getByTestId('icon-sidebar')).toBeVisible();
  });

  test('icon sidebar navigates to products view', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('icon-sidebar-products').click();
    await expect(page.getByTestId('icon-sidebar-products')).toHaveClass(/bg-primary/);
  });

  test('opens dashboard tab from icon sidebar', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('icon-sidebar-dashboard').click();
    await expect(page.getByTestId('tab-bar')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Dashboard', { exact: false }).first()).toBeVisible();
  });

  test('opens marketplace tab from icon sidebar', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('icon-sidebar-marketplace').click();
    await expect(page.getByTestId('tab-bar')).toBeVisible({ timeout: 15_000 });
  });

  test('persists session in localStorage', async ({ page }) => {
    await page.goto('/');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    expect(token).toBeTruthy();
    expect(user).toBeTruthy();
  });
});
