import { test, expect } from '@playwright/test';
import { mockMarketplaceApis } from '../helpers/mock-marketplace';

test.describe('Public marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await mockMarketplaceApis(page);
  });

  test('renders marketplace index with search and apps', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByTestId('marketplace-header')).toBeVisible();
    await expect(page.getByText('Ductape Marketplace')).toBeVisible();
    await expect(page.getByTestId('marketplace-search')).toBeVisible();
    await expect(page.getByText('E2E Test Payments App')).toBeVisible();
  });

  test('filters apps via search input', async ({ page }) => {
    await page.goto('/marketplace');
    const search = page.getByTestId('marketplace-search');
    await search.fill('CRM');
    await expect(page.getByText('E2E CRM Connector')).toBeVisible();
    await expect(page.getByText('E2E Test Payments App')).not.toBeVisible();
  });

  test('navigates to Workbench link', async ({ page }) => {
    await page.goto('/marketplace');
    await page.getByRole('link', { name: 'Workbench' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('login-modal')).toBeVisible();
  });

  test('shows sign in on marketplace when logged out', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('app detail route loads with mocked API', async ({ page }) => {
    await page.goto('/marketplace/app/e2e-payments-app');
    await expect(page.getByTestId('marketplace-header')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Store' })).toBeVisible();
  });
});
