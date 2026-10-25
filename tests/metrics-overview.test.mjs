import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const cache = new Map();
function load(relative) {
  const url = new URL(relative, import.meta.url);
  if (cache.has(url.href)) return cache.get(url.href);
  const source = fs.readFileSync(url, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const resolve = (name) => {
    if (name === '@/utils/platformHealth') return load('../src/utils/platformHealth.ts');
    if (name === '@/utils/deployments') return load('../src/utils/deployments.ts');
    throw new Error(`unexpected import ${name}`);
  };
  vm.runInNewContext(code, { exports, require: resolve, Math, Number, String, Set, Array, Object, Error, Map, Date, Infinity, isFinite: Number.isFinite, parseInt: Number.parseInt, Boolean, Symbol, JSON }, {});
  cache.set(url.href, exports);
  return exports;
}
const m = load('../src/utils/metricsOverview.ts');
const d = load('../src/utils/deliveryMetrics.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

const stats = (over = {}) => ({ total: 0, failures: 0, errorRatePercent: 0, avgLatencyMs: null, p50LatencyMs: null, p95LatencyMs: null, p99LatencyMs: null, maxLatencyMs: null, cost: 0, storageBytes: 0, overageCalls: 0, cacheHits: 0, cacheMisses: 0, ...over });
const row = (over = {}) => ({ name: 'op', calls: 10, failures: 0, errorRatePercent: 0, avgLatencyMs: 100, p95LatencyMs: 200, cost: 0, ...over });

test('calls and failures are added up per day across systems, and latency is weighted by calls', () => {
  const systems = [
    { timeline: [{ date: '2026-10-01', count: 10, failures: 1, avgLatencyMs: 100 }, { date: '2026-10-02', count: 5, failures: 0, avgLatencyMs: 50 }] },
    { timeline: [{ date: '2026-10-01', count: 30, failures: 2, avgLatencyMs: 200 }, { date: '2026-10-03', count: 0, failures: 0, avgLatencyMs: null }] },
  ];
  const line = plain(m.aggregateTimeline(systems));
  assert.deepEqual(line.map((p) => p.date), ['2026-10-01', '2026-10-02', '2026-10-03'], 'in date order');
  assert.equal(line[0].count, 40);
  assert.equal(line[0].failures, 3);
  assert.equal(line[0].avgLatencyMs, (10 * 100 + 30 * 200) / 40, 'the busier system counts for more');
  assert.equal(line[2].avgLatencyMs, null, 'a quiet day has no latency, not zero');
});

test('top operations merge every system and keep the system on the row', () => {
  const systems = [
    { id: 'actions', label: 'Actions', topOperations: [row({ name: 'charge', calls: 50 }), row({ name: 'refund', calls: 5 })] },
    { id: 'databases', label: 'Databases', topOperations: [row({ name: 'charge', calls: 80 }), row({ name: 'idle', calls: 0 })] },
  ];
  const top = plain(m.topOperations(systems, 3));
  assert.deepEqual(top.map((r) => `${r.systemId}:${r.name}`), ['databases:charge', 'actions:charge', 'actions:refund'], 'same name in two systems stays two rows, most used first, nothing with no calls');
  assert.equal(m.topOperations(systems, 1).length, 1);
});

test('the slowest operations ignore ones with too few calls to have a meaningful p95', () => {
  const systems = [{ id: 'actions', label: 'Actions', topOperations: [row({ name: 'rare', calls: 2, p95LatencyMs: 9000 }), row({ name: 'slow', calls: 40, p95LatencyMs: 3000 }), row({ name: 'fast', calls: 40, p95LatencyMs: 80 }), row({ name: 'nolatency', calls: 40, p95LatencyMs: null })] }];
  assert.deepEqual(plain(m.slowestOperations(systems)).map((r) => r.name), ['slow', 'fast']);
});

test('the success rate is the share that worked, and unknown when nothing ran', () => {
  assert.equal(m.successRate({ total: 200, failures: 10 }), 95);
  assert.equal(m.successRate({ total: 0, failures: 0 }), null);
});

test('the headline tiles carry how each number moved, and skip what has nothing to say', () => {
  const tiles = plain(m.periodTiles({
    current: stats({ total: 2000, failures: 20, errorRatePercent: 1, avgLatencyMs: 300, p50LatencyMs: 200, p95LatencyMs: 900, p99LatencyMs: 1500, maxLatencyMs: 4000 }),
    previous: stats({ total: 1000, failures: 10, errorRatePercent: 1, avgLatencyMs: 150, p95LatencyMs: 600 }),
  }));
  assert.deepEqual(tiles.map((t) => t.id), ['calls', 'success', 'latency', 'p95'], 'no cache, storage or overage tile when there is none');
  const calls = tiles.find((t) => t.id === 'calls');
  assert.equal(calls.value, '2,000');
  assert.equal(calls.delta.direction, 'up');
  assert.equal(calls.delta.tone, 'neutral', 'more calls is neither good nor bad');
  assert.equal(tiles.find((t) => t.id === 'success').value, '99%');
  assert.equal(tiles.find((t) => t.id === 'success').tone, 'warn', '1% errors is worth a look');
  const latency = tiles.find((t) => t.id === 'latency');
  assert.equal(latency.delta.tone, 'bad', 'slower is bad');
  assert.equal(latency.value, '300 ms');
});

test('cache, storage and over-plan tiles appear when there is something to show', () => {
  const tiles = plain(m.periodTiles({ current: stats({ total: 10, cacheHits: 90, cacheMisses: 10, storageBytes: 5 * 1024 * 1024, overageCalls: 4 }), previous: stats() }));
  assert.deepEqual(tiles.map((t) => t.id).slice(4), ['cache', 'storage', 'overage']);
  assert.equal(tiles.find((t) => t.id === 'cache').value, '90%');
  assert.equal(tiles.find((t) => t.id === 'storage').value, '5 MB');
});

test('a period with no calls reads as a dash, not 100% success', () => {
  const tiles = plain(m.periodTiles({ current: stats(), previous: stats() }));
  assert.equal(tiles.find((t) => t.id === 'success').value, '-');
  assert.equal(tiles.find((t) => t.id === 'success').tone, 'neutral');
});

test('the busiest bucket is the one with the most calls, and null when nothing ran', () => {
  assert.deepEqual(plain(m.busiestBucket([{ date: 'a', count: 3, failures: 0, avgLatencyMs: 1 }, { date: 'b', count: 9, failures: 2, avgLatencyMs: 1 }, { date: 'c', count: 9, failures: 0, avgLatencyMs: 1 }])), { date: 'b', count: 9, failures: 2 });
  assert.equal(m.busiestBucket([{ date: 'a', count: 0, failures: 0, avgLatencyMs: null }]), null);
});

test('each product shows its share of the calls, most used first', () => {
  const shares = plain(m.productShares([row({ name: 'a', calls: 25 }), row({ name: 'b', calls: 75 }), row({ name: 'z', calls: 0 })], 100));
  assert.deepEqual(shares.map((r) => [r.name, r.share]), [['b', 75], ['a', 25]]);
  assert.equal(m.productShares([row({ calls: 5 })], 0)[0].share, 0, 'no total, no share');
});

const minutes = (n) => new Date(Date.UTC(2026, 9, 25, 12, 0, 0) - n * 60_000).toISOString();
const dep = (over = {}) => ({ id: 'd', kind: 'function', product: 'shop', name: 'api', version: '1', env: 'prd', target: { kind: 'cloud_run', connection: 'c', region: 'r' }, resourceName: 'r', releaseHash: 'x', trafficPercent: 100, state: 'active', revision: 1, updatedAt: minutes(10), ...over });
const build = (over = {}) => ({ id: 'b', kind: 'function', product: 'shop', name: 'api', version: '1', connection: 'c', region: 'r', status: 'succeeded', builder: 'x', imageRepository: 'r', createdAt: minutes(20), updatedAt: minutes(18), ...over });
const now = new Date(Date.UTC(2026, 9, 25, 12, 0, 0));

test('build success rate counts finished builds only, and build time is for the successful ones', () => {
  const out = plain(d.summarizeDelivery([], [build(), build({ createdAt: minutes(60), updatedAt: minutes(56) }), build({ status: 'failed' }), build({ status: 'building' })], now));
  assert.equal(out.finishedBuilds, 3, 'one is still building');
  assert.equal(Math.round(out.buildSuccessRate), 67);
  assert.equal(out.avgBuildMs, 3 * 60_000, '2 and 4 minutes average to 3');
  assert.equal(out.slowestBuildMs, 4 * 60_000);
});

test('no finished builds means no rate, not 0%', () => {
  const out = plain(d.summarizeDelivery([], [build({ status: 'building' })], now));
  assert.equal(out.buildSuccessRate, null);
  assert.equal(out.avgBuildMs, null);
});

test('builds this week only counts the last seven days', () => {
  const old = build({ createdAt: new Date(now.getTime() - 9 * 86_400_000).toISOString(), updatedAt: new Date(now.getTime() - 9 * 86_400_000 + 1000).toISOString() });
  assert.equal(d.summarizeDelivery([], [build(), old], now).buildsThisWeek, 1);
});

test('rollback rate, last deploy, canaries and the split by product come from the deployments', () => {
  const out = plain(d.summarizeDelivery([
    dep({ product: 'shop', updatedAt: minutes(5) }),
    dep({ product: 'shop', state: 'rolled_back', updatedAt: minutes(1) }),
    dep({ product: 'blog', trafficPercent: 20, updatedAt: minutes(30) }),
    dep({ product: 'blog', state: 'failed' }),
  ], [], now));
  assert.equal(out.rollbackRate, 25);
  assert.equal(out.rolledBack, 1);
  assert.equal(out.lastDeployedAt, minutes(5), 'the newest active one; a rollback is not a deploy');
  assert.equal(out.partialTraffic, 1);
  assert.deepEqual(out.byProduct.map((p) => [p.product, p.total, p.active, p.attention]), [['blog', 2, 1, 1], ['shop', 2, 1, 1]], 'tied totals sort by name');
});

test('nothing deployed reads as unknown, not zero', () => {
  const out = plain(d.summarizeDelivery([], [], now));
  assert.equal(out.rollbackRate, null);
  assert.equal(out.lastDeployedAt, null);
  assert.deepEqual(out.byProduct, []);
});

const tabs = load('../src/utils/dashboardTabs.ts');
const dep0 = { deploymentsFailing: 0, failedBuilds: 0, blockedPlans: 0, plansAwaitingApproval: 0, deployments: 0, connections: 0, connectionsBroken: 0, connectionsPending: 0 };

test('the Deployments & Cloud tab shows red for what failed, amber for what waits on a person, and green only when something is running', () => {
  assert.deepEqual(plain(tabs.deploymentsIndicator(dep0)), { tone: 'neutral', count: 0, label: 'Nothing deployed yet' });
  assert.equal(tabs.deploymentsIndicator({ ...dep0, deployments: 3, connections: 1 }).tone, 'good');
  const waiting = tabs.deploymentsIndicator({ ...dep0, deployments: 3, plansAwaitingApproval: 2 });
  assert.deepEqual(plain(waiting), { tone: 'warn', count: 2, label: '2 waiting on you' });
  const broken = tabs.deploymentsIndicator({ ...dep0, deployments: 3, deploymentsFailing: 1, failedBuilds: 1, connectionsBroken: 1, plansAwaitingApproval: 4 });
  assert.equal(broken.tone, 'bad', 'a failure outranks something waiting');
  assert.equal(broken.count, 3);
  assert.equal(broken.label, '3 issues to fix');
  assert.equal(tabs.deploymentsIndicator({ ...dep0, blockedPlans: 1 }).label, '1 issue to fix');
});

test('the Platform Health tab reads failing systems and health checks, and says so while it has nothing yet', () => {
  const healthy = [{ status: 'healthy' }, { status: 'idle' }];
  assert.deepEqual(plain(tabs.healthIndicator({ systems: healthy, attention: [] })), { tone: 'good', count: 0, label: 'Everything healthy' });
  assert.equal(tabs.healthIndicator({ systems: [{ status: 'idle' }], attention: [] }).label, 'No activity yet');
  assert.equal(tabs.healthIndicator({ systems: null, attention: [] }).label, 'Reading status');
  const failing = tabs.healthIndicator({ systems: [{ status: 'down' }, { status: 'degraded' }], attention: [{ severity: 'bad' }] });
  assert.deepEqual(plain(failing), { tone: 'bad', count: 2, label: '1 system failing' });
  assert.deepEqual(plain(tabs.healthIndicator({ systems: [{ status: 'healthy' }], attention: [{ severity: 'bad' }, { severity: 'bad' }] })), { tone: 'bad', count: 2, label: '2 checks down' });
  assert.deepEqual(plain(tabs.healthIndicator({ systems: [{ status: 'degraded' }], attention: [] })), { tone: 'warn', count: 1, label: '1 degraded' });
  assert.deepEqual(plain(tabs.healthIndicator({ systems: null, attention: [{ severity: 'warn' }] })), { tone: 'warn', count: 1, label: '1 check to look at' }, 'a failing health check shows even before the health read arrives');
});

test('the Metrics tab says how much happened, never that something is wrong', () => {
  assert.equal(tabs.metricsIndicator(null).label, 'Usage and activity');
  assert.equal(tabs.metricsIndicator(0).label, 'No calls this period');
  assert.equal(tabs.metricsIndicator(1234).label, '1,234 calls this period');
  assert.equal(tabs.metricsIndicator(1).label, '1 call this period');
  assert.equal(tabs.metricsIndicator(5).tone, 'neutral');
});
