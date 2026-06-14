import type { Page } from '@playwright/test';

const sampleDomains = {
  data: [
    {
      _id: 'domain-payments',
      domain_name: 'Payments',
      parent_domain_id: null,
      parents: [],
    },
    {
      _id: 'domain-crm',
      domain_name: 'CRM',
      parent_domain_id: null,
      parents: [],
    },
  ],
};

const sampleApps = {
  data: [
    {
      _id: 'app-e2e-1',
      app_name: 'E2E Test Payments App',
      tag: 'e2e-payments-app',
      domains: ['Payments'],
      description: 'Fixture app for Playwright marketplace tests',
      latest_version: '1.0.0',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
    {
      _id: 'app-e2e-2',
      app_name: 'E2E CRM Connector',
      tag: 'e2e-crm-app',
      domains: ['CRM'],
      description: 'Second fixture app',
      latest_version: '2.0.0',
      created_at: '2024-02-01T00:00:00.000Z',
      updated_at: '2024-02-01T00:00:00.000Z',
    },
  ],
};

const sampleAppDetail = {
  data: {
    ...sampleApps.data[0],
    versions: [
      {
        _id: 'ver-1',
        version: '1.0.0',
        latest: true,
        created_at: '2024-01-01T00:00:00.000Z',
      },
    ],
  },
};

function isAppsListRequest(url: string): boolean {
  return /\/apps\/v1\/domains\/(?:all|[^/?]+)(?:\?|$)/.test(url);
}

/**
 * Stub marketplace list/detail APIs so public routes work without a live backend.
 */
export async function mockMarketplaceApis(page: Page): Promise<void> {
  await page.route('**/apps/v1/fetch/tag**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', json: sampleAppDetail });
  });

  await page.route('**/apps/v1/domains**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const url = route.request().url();
    if (isAppsListRequest(url)) {
      await route.fulfill({ status: 200, contentType: 'application/json', json: sampleApps });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', json: sampleDomains });
  });
}
