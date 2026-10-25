import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../src/components/Dashboard.tsx', import.meta.url), 'utf8');
const at = (marker) => {
  const index = source.indexOf(marker);
  assert.ok(index >= 0, `${marker} is on the dashboard`);
  return index;
};

test('the original dashboard comes first and the platform health sections come after "Activity by type"', () => {
  const original = ['{/* Workspace status */}', '{/* Stats */}', '{/* Timeline */}', '{/* Products */}', '{/* Activity by type'].map(at);
  assert.deepEqual(original, [...original].sort((a, b) => a - b), 'the original sections keep their order');
  assert.ok(at('<PlatformHealth') > at('{/* Activity by type'), 'platform health, resource usage and usage by product follow it');
  assert.equal(source.split('<PlatformHealth').length - 1, 1, 'it is on the page once');
  assert.ok(at('<InfraSummary') > at('{/* Activity by type'), 'the deployment and cloud connection summaries follow Activity by type too');
  assert.ok(at('<InfraSummary') < at('<PlatformHealth'), 'and come before platform health');
  assert.equal(source.split('<InfraSummary').length - 1, 1, 'once');
  assert.doesNotMatch(source, /['"]Other['"]/, 'nothing on the dashboard is called Other');
});

test('Activity by type is a Gantt chart, and the totals failing does not replace the page', () => {
  assert.match(source, /<ActivityGantt/);
  assert.doesNotMatch(source, /Failed to load dashboard data/, 'one request failing must not blank the sections that read other data');
  assert.match(source, /totalsFailed/);
});

test('products show their own average and p95 latency', () => {
  assert.match(source, /Avg latency/);
  assert.match(source, /p95 latency/);
  assert.match(source, /productLatency\(platformHealth\.data/);
});

test('the green trend badges are gone from the stat cards', () => {
  assert.doesNotMatch(source, /TrendingUp|TrendingDown|TrendIcon/);
  assert.doesNotMatch(source, /text-green bg-green\/10/);
});

test('the dashboard is three tabs: Metrics, Deployments & Cloud and Platform Health, each with its own sections', () => {
  assert.match(source, /label: 'Metrics'/);
  assert.match(source, /label: 'Deployments & Cloud'/);
  assert.match(source, /label: 'Platform Health'/);
  const metrics = at("{tab === 'metrics'");
  const deployments = at("{tab === 'deployments'");
  const health = at("{tab === 'health'");
  assert.ok(metrics < deployments && deployments < health, 'in that order');
  for (const marker of ['<MetricsOverview', '{/* Timeline */}', '{/* Products */}', '{/* Activity by type']) {
    assert.ok(at(marker) > metrics && at(marker) < deployments, `${marker} is on the Metrics tab`);
  }
  for (const marker of ['<InfraSummary', '<DeliveryMetrics']) {
    assert.ok(at(marker) > deployments && at(marker) < health, `${marker} is on the Deployments & Cloud tab`);
  }
  for (const marker of ['{/* Needs attention */}', '<PlatformHealth']) {
    assert.ok(at(marker) > health, `${marker} is on the Platform Health tab`);
  }
});

const tabsSource = fs.readFileSync(new URL('../src/components/dashboard/DashboardTabs.tsx', import.meta.url), 'utf8');

test('the status banner and period filters stay above the tabs, and the chosen tab is remembered', () => {
  assert.ok(at('{/* Workspace status */}') < at('{/* Tabs */}'), 'the banner is always visible');
  assert.ok(at('{/* Header */}') < at('{/* Tabs */}'));
  assert.match(source, /localStorage\.setItem\(TAB_STORAGE_KEY/);
  assert.match(source, /<DashboardTabs/);
  assert.match(tabsSource, /role="tablist"/);
  assert.match(tabsSource, /aria-selected=\{active\}/);
});

test('each tab carries how it is doing, so a problem on a closed tab is still seen', () => {
  assert.match(source, /healthIndicator\(/);
  assert.match(source, /useDeploymentsIndicator\(\)/);
  assert.match(source, /metricsIndicator\(/);
  assert.ok(source.indexOf('useDeploymentsIndicator()') < source.indexOf('if (isLoading)'), 'the hook is read before any early return');
  assert.match(tabsSource, /data-tone=\{indicator\.tone\}/, 'the tone is on the tab');
  assert.match(tabsSource, /indicator\.count > 0/, 'a problem shows its count');
  assert.match(tabsSource, /border-red\/50/, 'a failing tab has a red edge');
  assert.match(tabsSource, /border-orange\/50/, 'a tab waiting on someone has an amber edge');
});
