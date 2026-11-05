import { test, expect } from '@playwright/test';
const metric = { calls: 12000, failures: 20, measured: 11950, slowCalls: 100, errorRatePercent: 0.17, totalLatencyMs: 620000, averageLatencyMs: 52, maxLatencyMs: 5000, p50LatencyMs: 20, p95LatencyMs: 300, p99LatencyMs: 1200 };
const fingerprint = 'a'.repeat(64);
const row = { ...metric, operation: 'find-active-users', fingerprint };
const fixture = { window: { start: '2026-11-05T12:00:00Z', end: '2026-11-05T13:00:00Z', bucketMs: 60000, slowMs: 1000 },
  summary: { ...metric, callsPerMinute: 200 }, previous: { ...metric, p95LatencyMs: 150 },
  coverage: { measured: 11950, missingLatency: 50, fingerprinted: 11000, latestAt: '2026-11-05T12:59:00Z', percentileMethod: 'approximate', sampled: false, totalQueryGroups: 50, rankingLimit: 20, slowSampleLimit: 30, slowRankingMinimumCalls: 3 },
  timeline: Array.from({ length: 60 }, (_, index) => ({ ...metric, calls: 100 + index * 3, failures: index % 8, p50LatencyMs: 15 + index % 12, p95LatencyMs: 180 + index * 2, p99LatencyMs: 600 + index * 10, timestamp: new Date(Date.parse('2026-11-05T12:00:00Z') + index * 60000).toISOString() })),
  rankings: { mostUsed: [row], slowest: [row], mostTime: [row], failing: [row] },
  histogram: [{ _id: 0, calls: 500 }, { _id: 50, calls: 8000 }],
  slowSamples: [{ timestamp: '2026-11-05T12:59:00Z', operation: row.operation, fingerprint, duration: 5000, failed: 1, trace_id: 'trace-fixture-123456', env: 'snd' }],
};
for(const kind of ['database', 'vector', 'graph', 'storage']) {
  test(`${kind} performance scope, rankings and drilldown`, async ({ page }) => {
    const requests: string[] = [];
    await page.route('**/log/v1/products/**/performance/**', route => { requests.push(route.request().url()); return route.fulfill({ json: { data: fixture } }); });
    await page.goto(`/e2e/fixtures/resource-performance.html?kind=${kind}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('p99 latency', { exact: true })).toBeVisible();
    await expect(page.getByText('12,000', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('+100.0% vs previous period')).toBeVisible();
    await expect(page.getByText('Latency distribution', { exact: true })).toBeVisible();
    expect(requests[0]).toContain(`/resources/${kind}/core/performance/000000000000000000000001`);
    expect(requests[0]).toContain('env=snd');
    await page.getByRole('button', { name: /find-active-users.*query shape/ }).click();
    await expect.poll(() => requests.some(url => url.includes(`query_fingerprint=${fingerprint}`))).toBeTruthy();
    await page.getByLabel('Clear query filter').click();
    await expect(page.getByText(/Inspecting find-active-users/)).toHaveCount(0);
    await page.getByLabel('Query ranking').selectOption('slowest');
    await expect(page.getByRole('button', { name: /find-active-users.*query shape/ })).toBeVisible();
    await page.screenshot({ path: `/tmp/ductape-performance-${kind}.png`, fullPage: true });
  });
}
test('empty measurements stay unknown; errors offer retry', async ({ page }) => {
  await page.route('**/log/v1/products/**/performance/**', route => route.fulfill({ json: { data: { ...fixture, summary: { ...metric, calls: 0, measured: 0, failures: 0, slowCalls: 0, p50LatencyMs: null, p95LatencyMs: null, p99LatencyMs: null, averageLatencyMs: null, maxLatencyMs: null, totalLatencyMs: 0, callsPerMinute: 0 } } } }));
  await page.goto('/e2e/fixtures/resource-performance.html');
  await expect(page.getByText('No completed operations recorded in this period.')).toBeVisible();
  await expect(page.getByText('Query and operation rankings')).toHaveCount(0);
  await page.route('**/log/v1/products/**/performance/**', route => route.fulfill({ status: 503, json: {} }));
  await page.getByLabel('Refresh performance').click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
});

test('dark mobile performance stays within viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/log/v1/products/**/performance/**', route => route.fulfill({ json: { data: fixture } }));
  await page.goto('/e2e/fixtures/resource-performance.html?kind=storage&dark=1');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('p99 latency', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: '/tmp/ductape-performance-dark-mobile.png', fullPage: true });
});
