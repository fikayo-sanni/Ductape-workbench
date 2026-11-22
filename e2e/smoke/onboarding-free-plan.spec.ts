import { test, expect, type Page } from '@playwright/test';

test.setTimeout(180_000);
test.use({ actionTimeout: 60_000 });

const workspaceId = '111111111111111111111111';
const userId = '222222222222222222222222';
const freeId = '6a0000000000000000000001';
const plans = [
  { _id: freeId, name: 'Free', tag: 'free', monthlyPrice: 0, currency: 'USD', isPayAsYouGo: false, isEnterprise: false },
  { _id: '6a0000000000000000000002', name: 'Beginner', tag: 'beginner', monthlyPrice: 10, currency: 'USD' },
  { _id: '6a0000000000000000000003', name: 'Pay As You Go', tag: 'payg', monthlyPrice: 0, currency: 'USD', isPayAsYouGo: true },
];

async function onboarding(page: Page, options: { savedBilling?: boolean; failFirst?: boolean } = {}) {
  const subscriptions: Record<string, unknown>[] = [];
  const billingRequests: string[] = [];
  let active = false;
  await page.addInitScript(({ workspaceId, userId, freeId, savedBilling }) => {
    localStorage.setItem('token', 'mock-onboarding-token');
    localStorage.setItem('user', JSON.stringify({ _id: userId, public_key: 'mock-public-key', email: 'test@example.test' }));
    localStorage.setItem('currentWorkspaceId', workspaceId);
    sessionStorage.setItem('onboardingWorkspaceId', workspaceId);
    sessionStorage.setItem('onboardingStep', savedBilling ? 'billing' : 'plan');
    if (savedBilling) sessionStorage.setItem('onboardingPlanId', freeId);
  }, { workspaceId, userId, freeId, savedBilling: options.savedBilling });
  await page.route('**/*/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (/billing|payment|paystack|checkout/.test(path)) billingRequests.push(path);
    if (path === '/pricing/v1/subscription') data = plans;
    else if (path === `/workspaces/v1/fetch/${userId}`) data = [{ _id: workspaceId, workspace_id: workspaceId, workspace_name: 'Test workspace', accepted: true, default: true }];
    else if (path === `/workspaces/v1/get/${workspaceId}`) data = { _id: workspaceId, workspace_name: 'Test workspace', admin: false };
    else if (path === `/workspaces/v1/subscription/${workspaceId}`) data = { subscription: active ? { _id: 'subscription-free', plan_id: freeId } : null };
    else if (path === '/workspaces/v1/subscribe' && request.method() === 'POST') {
      subscriptions.push(request.postDataJSON());
      if (options.failFirst && subscriptions.length === 1) {
        await route.fulfill({ status: 503, json: { status: false, message: 'Temporary activation failure' } });
        return;
      }
      active = true;
      data = { subscription: { _id: 'subscription-free', plan_id: freeId, workspace_id: workspaceId } };
    }
    await route.fulfill({ json: { status: true, data } });
  });
  await page.goto('/onboarding', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  return { subscriptions, billingRequests };
}

test('free onboarding activates directly and never loads billing or card collection', async ({ page }) => {
  const calls = await onboarding(page);
  await page.getByRole('button', { name: /^Free\b/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your workspace keys' })).toBeVisible();
  expect(calls.subscriptions).toEqual([{ plan_id: freeId, workspace_id: workspaceId }]);
  expect(calls.billingRequests).toEqual([]);
  await expect(page.getByRole('heading', { name: 'Add payment method' })).toHaveCount(0);
});

test('a saved free payment step skips the billing form and permits retry after failure', async ({ page }) => {
  const calls = await onboarding(page, { savedBilling: true, failFirst: true });
  await expect(page.getByRole('heading', { name: 'Activate your free plan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Add payment method' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('Could not activate your free plan. Please try again.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your workspace keys' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your workspace keys' })).toBeVisible();
  expect(calls.subscriptions).toHaveLength(2);
  expect(calls.billingRequests).toEqual([]);
});

for (const name of ['Beginner', 'Pay As You Go']) {
  test(`${name} still goes through billing`, async ({ page }) => {
    const calls = await onboarding(page);
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Add payment method' })).toBeVisible();
    expect(calls.subscriptions).toEqual([]);
  });
}
