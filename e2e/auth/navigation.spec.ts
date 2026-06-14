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
      origins?: Array<{ localStorage?: Array<{ name: string }> }>;
    };
    return (state.origins?.[0]?.localStorage?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

test.describe('Workbench navigation (authenticated)', () => {
  test.skip(!authStorageHasSession(), 'Run auth.setup with valid E2E_EMAIL / E2E_PASSWORD');

  const sidebarViews = [
    { id: 'cloud', label: 'Cloud' },
    { id: 'products', label: 'Products' },
    { id: 'apps', label: 'Apps' },
    { id: 'environments', label: 'Environments' },
    { id: 'partnership', label: 'Partnerships' },
  ] as const;

  for (const view of sidebarViews) {
    test(`activates ${view.label} icon in sidebar`, async ({ page }) => {
      await page.goto('/');
      const button = page.getByTestId(`icon-sidebar-${view.id}`);
      await button.click();
      await expect(button).toHaveClass(/bg-primary/);
    });
  }

  test('marketplace public route still reachable when authenticated', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByTestId('marketplace-header')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Workbench' })).toBeVisible();
  });
});
