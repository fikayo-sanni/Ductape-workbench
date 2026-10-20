import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function compile(relative) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

// productOverview imports healthcheckStrategy, so both are loaded into one context.
const strategy = {};
vm.runInNewContext(compile('../src/utils/healthcheckStrategy.ts'), { exports: strategy, Math, Number, String });
const overview = {};
vm.runInNewContext(compile('../src/utils/productOverview.ts'), {
  exports: overview,
  require: () => strategy,
  Math, Number, String, Boolean,
});
const { summarizeHealth, attentionItems, setupSteps, groupCategories, RESOURCE_GROUPS, successRate, formatPercent } = overview;
const plain = value => JSON.parse(JSON.stringify(value));

test('summarizeHealth treats a check that never ran as healthy and sorts the worst first', () => {
  const summary = plain(summarizeHealth([
    { tag: 'a', name: 'Stripe', envs: [{ slug: 'prd' }, { slug: 'dev', status: 'unavailable' }] },
    { tag: 'b', name: 'DB', envs: [{ slug: 'prd', status: 'available', lastChecked: '2026-10-18T10:00:00Z' }, { slug: 'dev', status: 'available', monitor_state: 'probing', lastChecked: '2026-10-18T10:00:00Z' }] },
    { tag: 'gone', deleted: true, envs: [{ slug: 'prd', status: 'unavailable' }] },
  ]));
  assert.equal(summary.total, 4);
  assert.equal(summary.healthy, 2);
  assert.equal(summary.down, 1);
  assert.equal(summary.recovering, 1);
  assert.deepEqual(summary.problems.map(p => [p.name, p.env, p.label]), [['Stripe', 'dev', 'Unhealthy'], ['DB', 'dev', 'Recovering']]);
  assert.deepEqual(plain(summarizeHealth(undefined)), { total: 0, healthy: 0, down: 0, recovering: 0, problems: [] });
});

test('attentionItems is empty when everything is fine', () => {
  const items = attentionItems({
    health: summarizeHealth([{ tag: 'a', envs: [{ slug: 'prd' }] }]),
    activity: { total: 100, failures: 0, errorRatePercent: 0 },
    deployments: { total: 2, attention: 0, inFlight: 0 },
    environments: [{ active: true }],
    periodLabel: '24 hours',
  });
  assert.deepEqual(plain(items), []);
});

test('attentionItems lists problems worst first', () => {
  const items = plain(attentionItems({
    health: summarizeHealth([{ tag: 'a', name: 'Stripe', envs: [{ slug: 'prd', status: 'unavailable' }] }]),
    activity: { total: 200, failures: 30, errorRatePercent: 15, topFailing: { operation: 'charge', failures: 20 } },
    deployments: { total: 3, attention: 1, inFlight: 2 },
    environments: [{ active: false }, { active: false }],
    periodLabel: '24 hours',
  }));
  assert.deepEqual(items.map(i => [i.id, i.severity]), [
    ['health:a:prd', 'bad'],
    ['activity:failures', 'bad'],
    ['deployments:attention', 'bad'],
    ['environments:inactive', 'warn'],
  ]);
  assert.match(items[1].title, /30 operations failed \(15%\)/);
  assert.match(items[1].detail, /Most in charge/);
});

test('a few failures are a warning, and a deployment in flight is only information', () => {
  const items = plain(attentionItems({
    health: summarizeHealth([]),
    activity: { total: 1000, failures: 3, errorRatePercent: 0.3 },
    deployments: { total: 1, attention: 0, inFlight: 1 },
    environments: [{ active: true }],
    periodLabel: '7 days',
  }));
  assert.deepEqual(items.map(i => [i.id, i.severity]), [['activity:failures', 'warn'], ['deployments:inflight', 'info']]);
});

test('unknown activity or deployments add nothing', () => {
  const items = attentionItems({ health: summarizeHealth([]), environments: [], periodLabel: '24 hours' });
  assert.equal(items.length, 0);
});

test('setupSteps marks what is done and points at the next category', () => {
  const empty = plain(setupSteps({ environments: 0, apps: 0, databases: 0, features: 0, functions: 0, healthchecks: 0, fallbacks: 0, quotas: 0 }));
  assert.deepEqual(empty.map(s => s.done), [false, false, false, false]);
  assert.equal(empty[1].target, 'apps');
  const partial = plain(setupSteps({ environments: 2, apps: 1, databases: 0, features: 0, functions: 1, healthchecks: 0, fallbacks: 0, quotas: 0 }));
  assert.deepEqual(partial.map(s => s.done), [true, true, true, false]);
  const dbOnly = plain(setupSteps({ environments: 1, apps: 0, databases: 2, features: 0, functions: 0, healthchecks: 0, fallbacks: 1, quotas: 0 }));
  assert.deepEqual(dbOnly.map(s => s.done), [true, true, false, true]);
});

test('every resource category is in exactly one group', () => {
  const all = RESOURCE_GROUPS.flatMap(g => [...g.categories]);
  assert.equal(new Set(all).size, all.length);
  const grouped = plain(groupCategories(all.map(id => ({ id })).concat([{ id: 'something-new' }])));
  assert.equal(grouped.flatMap(g => g.items).length, all.length, 'unknown categories are dropped, none are lost');
  assert.deepEqual(plain(groupCategories([{ id: 'features' }, { id: 'apps' }])).map(g => g.id), ['build', 'logic']);
});

test('successRate and formatPercent', () => {
  assert.equal(successRate(0, 0), null);
  assert.equal(successRate(200, 2), 99);
  assert.equal(formatPercent(null), '-');
  assert.equal(formatPercent(100), '100%');
  assert.equal(formatPercent(99.99), '99.9%');
  assert.equal(formatPercent(98.43), '98.4%');
  assert.equal(formatPercent(5.123), '5.12%');
});

test('productHealth separates unwatched from healthy', () => {
  const { productHealth, workspaceAttention } = overview;
  assert.equal(productHealth({ name: 'A' }).state, 'unwatched');
  assert.equal(productHealth({ healthchecks: [] }).state, 'unwatched');
  assert.equal(productHealth({ healthchecks: [{ tag: 'a', envs: [{ slug: 'prd' }] }] }).state, 'good');
  assert.equal(productHealth({ healthchecks: [{ tag: 'a', envs: [{ slug: 'prd', status: 'available', monitor_state: 'probing', lastChecked: 'x' }] }] }).state, 'warn');
  assert.equal(productHealth({ healthchecks: [{ tag: 'a', envs: [{ slug: 'prd', status: 'unavailable' }] }] }).state, 'bad');
});

test('workspaceAttention lists problems from every product, worst first', () => {
  const { workspaceAttention } = overview;
  const items = plain(workspaceAttention([
    { _id: '1', name: 'Shop', healthchecks: [{ tag: 'db', name: 'DB', envs: [{ slug: 'prd', status: 'available', monitor_state: 'probing', lastChecked: 'x' }] }] },
    { _id: '2', name: 'Blog', healthchecks: [{ tag: 'api', name: 'API', envs: [{ slug: 'prd', status: 'unavailable' }] }] },
    { _id: '3', name: 'Quiet', healthchecks: [{ tag: 'ok', envs: [{ slug: 'prd' }] }] },
  ]));
  assert.deepEqual(items.map(i => [i.productName, i.severity, i.title]), [
    ['Blog', 'bad', 'API is unhealthy in prd'],
    ['Shop', 'warn', 'DB is recovering in prd'],
  ]);
  assert.deepEqual(plain(workspaceAttention(undefined)), []);
});
