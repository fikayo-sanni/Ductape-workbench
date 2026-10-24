import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Math, Number, String, Set, Array, Object, Error, Map, Date, Infinity, isFinite: Number.isFinite }, {});
  return exports;
}
const h = load('../src/utils/platformHealth.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

const stats = (over = {}) => ({ total: 0, failures: 0, errorRatePercent: 0, avgLatencyMs: null, p50LatencyMs: null, p95LatencyMs: null, p99LatencyMs: null, maxLatencyMs: null, cost: 0, storageBytes: 0, overageCalls: 0, cacheHits: 0, cacheMisses: 0, ...over });
const system = (over = {}) => ({ id: 'actions', label: 'Actions', types: ['actions'], status: 'healthy', current: stats({ total: 10 }), previous: stats(), timeline: [], topErrors: [], ...over });

test('numbers are written the way a person reads them', () => {
  assert.equal(h.formatCount(0), '0');
  assert.equal(h.formatCount(999), '999');
  assert.equal(h.formatCount(1234), '1,234');
  assert.equal(h.formatCount(12345), '12.3k');
  assert.equal(h.formatCount(1234567), '1.2M');
  assert.equal(h.formatCount(NaN), '0');
  assert.equal(h.formatDuration(null), '-', 'nothing measured is a dash, never a zero');
  assert.equal(h.formatDuration(0.4), '<1 ms');
  assert.equal(h.formatDuration(840), '840 ms');
  assert.equal(h.formatDuration(1234), '1.2 s');
  assert.equal(h.formatDuration(125000), '2m 5s');
  assert.equal(h.formatPercent(0), '0%');
  assert.equal(h.formatPercent(2.46), '2.5%');
  assert.equal(h.formatPercent(12.4), '12%');
});

test('a change since the period before says which way it went and whether that is good', () => {
  assert.deepEqual(plain(h.deltaOf(150, 100, 'count')), { text: '+50%', direction: 'up', tone: 'neutral' }, 'more calls is neither good nor bad');
  assert.deepEqual(plain(h.deltaOf(100, 100, 'count')), { text: 'no change', direction: 'flat', tone: 'neutral' });
  assert.equal(h.deltaOf(104, 100, 'count').direction, 'flat', 'under 5% is noise');
  assert.deepEqual(plain(h.deltaOf(5, 0, 'count')), { text: 'new', direction: 'up', tone: 'neutral' }, 'no division by zero');
  assert.deepEqual(plain(h.deltaOf(300, 200, 'latency')), { text: '+50%', direction: 'up', tone: 'bad' }, 'slower is bad');
  assert.deepEqual(plain(h.deltaOf(100, 200, 'latency')), { text: '-50%', direction: 'down', tone: 'good' });
  assert.deepEqual(plain(h.deltaOf(7, 2, 'rate')), { text: '+5 pts', direction: 'up', tone: 'bad' }, 'rates move in points, and more errors is bad');
  assert.deepEqual(plain(h.deltaOf(1, 4.5, 'rate')), { text: '-3.5 pts', direction: 'down', tone: 'good' });
  assert.equal(h.deltaOf(2.2, 2, 'rate').direction, 'flat');
  assert.equal(h.deltaOf(null, 5, 'latency').direction, 'none', 'nothing to compare says nothing');
  assert.equal(h.deltaOf(5, null, 'count').text, '');
});

test('systems are shown worst first, then busiest, with idle ones last', () => {
  const ordered = h.orderSystems([
    system({ label: 'Idle', status: 'idle', current: stats() }),
    system({ label: 'Quiet', status: 'healthy', current: stats({ total: 5 }) }),
    system({ label: 'Busy', status: 'healthy', current: stats({ total: 500 }) }),
    system({ label: 'Slow', status: 'degraded', current: stats({ total: 50 }) }),
    system({ label: 'Broken', status: 'down', current: stats({ total: 1 }) }),
  ]);
  assert.deepEqual(plain(ordered.map((s) => s.label)), ['Broken', 'Slow', 'Busy', 'Quiet', 'Idle']);
});

test('the summary sentence matches what the systems are doing', () => {
  const health = (systems, alerts = []) => ({ systems, alerts, overall: { current: stats(), previous: stats() }, window: {}, generatedAt: '', recentErrors: [] });
  assert.equal(h.summarize(health([system({ status: 'idle' })])).tone, 'neutral');
  assert.equal(h.summarize(health([system(), system({ id: 'b' })])).title, 'Every system is healthy');
  const degraded = h.summarize(health([system({ status: 'degraded' })], [{ severity: 'warning' }]));
  assert.deepEqual([degraded.tone, degraded.title], ['warn', '1 system is degraded']);
  const down = h.summarize(health([system({ status: 'down' }), system({ status: 'down', id: 'b' })], [{ severity: 'critical' }, { severity: 'critical' }, { severity: 'warning' }]));
  assert.deepEqual([down.tone, down.title], ['bad', '2 systems are failing']);
  assert.match(down.detail, /2 critical and 1 other alert/);
  assert.deepEqual(plain(h.countStatuses([system(), system({ status: 'down' }), system({ status: 'idle' })])), { down: 1, degraded: 0, healthy: 1, idle: 1 });
});

test('a chart of calls over time keeps a sliver for a quiet bucket and puts the failed share on top', () => {
  assert.deepEqual(plain(h.sparkBars([])), []);
  const flat = h.sparkBars([{ date: 'a', count: 0, failures: 0, avgLatencyMs: null }, { date: 'b', count: 0, failures: 0, avgLatencyMs: null }]);
  assert.ok(flat.every((bar) => bar.height === 0 && bar.failedHeight === 0), 'no calls draws nothing');
  const bars = h.sparkBars([
    { date: 'a', count: 100, failures: 25, avgLatencyMs: 1 },
    { date: 'b', count: 1, failures: 0, avgLatencyMs: 1 },
    { date: 'c', count: 0, failures: 0, avgLatencyMs: null },
  ]);
  assert.equal(bars[0].height, 1);
  assert.equal(bars[0].failedHeight, 0.25);
  assert.equal(bars[1].height, 0.06, 'one call in a hundred is still visible');
  assert.equal(bars[2].height, 0, 'and none is empty');
  assert.ok(bars.every((bar) => bar.failedHeight <= bar.height));
});

test('time since an error is said the way people say it', () => {
  const now = new Date('2026-10-24T12:00:00Z');
  assert.equal(h.timeAgo(null, now), '');
  assert.equal(h.timeAgo('2026-10-24T11:59:30Z', now), 'just now');
  assert.equal(h.timeAgo('2026-10-24T11:55:00Z', now), '5 min ago');
  assert.equal(h.timeAgo('2026-10-24T09:00:00Z', now), '3 h ago');
  assert.equal(h.timeAgo('2026-10-22T12:00:00Z', now), '2 d ago');
  assert.equal(h.timeAgo('2026-10-25T12:00:00Z', now), 'just now', 'a clock that is a little ahead never shows a negative time');
});

test('opening a system\'s logs filters to its one log type, or to all when it is made of several, and to failures when asked', () => {
  assert.deepEqual(plain(h.logsFilterFor({ types: ['actions'] }, true)), { component: 'actions', status: 'fail' });
  assert.deepEqual(plain(h.logsFilterFor({ types: ['actions'] }, false)), { component: 'actions', status: 'all' });
  assert.deepEqual(plain(h.logsFilterFor({ types: ['email', 'sms'] }, true)), { component: 'all', status: 'fail' }, 'the logs page filters on one type, so several mean no type filter');
  assert.deepEqual(plain(h.logsFilterFor(undefined, true)), { component: 'all', status: 'fail' });
});

test('sizes and costs are written the way a person reads them', () => {
  assert.equal(h.formatBytes(0), '-');
  assert.equal(h.formatBytes(null), '-');
  assert.equal(h.formatBytes(512), '512 B');
  assert.equal(h.formatBytes(2048), '2 KB');
  assert.equal(h.formatBytes(1536), '1.5 KB');
  assert.equal(h.formatBytes(5 * 1024 * 1024), '5 MB');
  assert.equal(h.formatBytes(150 * 1024 * 1024 * 1024), '150 GB');
  assert.equal(h.formatCost(0), '-', 'nothing charged is a dash');
  assert.equal(h.formatCost(50), '$50.00');
  assert.equal(h.formatCost(1234.5), '$1,235');
  assert.equal(h.formatCost(0.0042), '$0.0042', 'a very small amount keeps the digits that show it');
  assert.equal(h.formatCost(0.5), '$0.50');
});

test('cache hit rate is only a rate when there were reads', () => {
  assert.equal(h.cacheHitRate({ cacheHits: 7, cacheMisses: 3 }), 70);
  assert.equal(h.cacheHitRate({ cacheHits: 0, cacheMisses: 0 }), null, 'no reads: no rate, not 0%');
  assert.equal(h.cacheHitRate({ cacheHits: 0, cacheMisses: 4 }), 0);
  assert.equal(h.shareOfCalls(25, 100), 25);
  assert.equal(h.shareOfCalls(5, 0), 0, 'no division by zero');
});

test('the inventory counts line up with the systems they belong to', () => {
  const inventory = [{ name: 'Databases', count: 3, type: 'database' }, { name: 'Message Queues', count: 2, type: 'queue' }, { name: 'Cache Instances', count: 0, type: 'cache' }];
  assert.deepEqual(plain(h.provisionedFor('databases', inventory)), { count: 3, name: 'Databases' });
  assert.deepEqual(plain(h.provisionedFor('events', inventory)), { count: 2, name: 'Message Queues' });
  assert.deepEqual(plain(h.provisionedFor('cache', inventory)), { count: 0, name: 'Cache Instances' }, 'zero provisioned is still said');
  assert.equal(h.provisionedFor('actions', inventory), null, 'a system the inventory does not count has no number');
});

test('each system says the one extra thing worth knowing about its use', () => {
  assert.equal(h.usageDetail({ id: 'storage', current: stats({ storageBytes: 4096 }) }), '4 KB written');
  assert.equal(h.usageDetail({ id: 'cache', current: stats({ cacheHits: 7, cacheMisses: 3 }) }), '70% hit rate');
  assert.equal(h.usageDetail({ id: 'cache', current: stats() }), '', 'a cache nobody read from has nothing to say');
  assert.equal(h.usageDetail({ id: 'actions', current: stats({ overageCalls: 5 }) }), '5 over plan');
  assert.equal(h.usageDetail({ id: 'storage', current: stats({ storageBytes: 2048, overageCalls: 1200 }) }), '2 KB written · 1,200 over plan');
  assert.equal(h.usageDetail({ id: 'actions', current: stats() }), '');
});

const row = (name, over = {}) => ({ name, calls: 10, failures: 0, errorRatePercent: 0, avgLatencyMs: 50, p95LatencyMs: 90, cost: 0, ...over });

test('a product with no product is the workspace', () => {
  assert.equal(h.productDisplayName(''), 'Workspace');
  assert.equal(h.productDisplayName('shop'), 'shop');
  assert.equal(h.productDisplayName('none'), 'none', 'a product that happens to be called none is just that');
});

test('a product finds its own latency, with or without the workspace prefix, and the workspace is never a product', () => {
  const rows = [row('shop', { avgLatencyMs: 40 }), row('', { avgLatencyMs: 999 }), row('billing')];
  assert.equal(h.productLatency(rows, 'shop').avgLatencyMs, 40);
  assert.equal(h.productLatency(rows, 'ductape:shop').avgLatencyMs, 40, 'the product tag carries the workspace prefix and the logs may not');
  assert.equal(h.productLatency([row('ductape:shop')], 'shop').name, 'ductape:shop');
  assert.equal(h.productLatency(rows, 'ghost'), undefined, 'a product that made no calls has no numbers, not zeros');
  assert.equal(h.productLatency(rows, ''), undefined);
  assert.equal(h.productLatency(rows, undefined), undefined);
});

const point = (date, count, failures = 0) => ({ date, count, failures, avgLatencyMs: null });
const sys = (id, label, timeline, total) => ({ id, label, types: [id], status: 'healthy', current: stats({ total: total ?? timeline.reduce((n, p) => n + p.count, 0), failures: timeline.reduce((n, p) => n + p.failures, 0) }), previous: stats(), timeline, topErrors: [], topOperations: [], topProducts: [] });

test('activity over time becomes one bar per unbroken run of use, in the busiest systems first', () => {
  const days = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'].map((d) => `${d}T00:00:00.000Z`);
  const rows = h.ganttRows([
    sys('jobs', 'Jobs', days.map((d) => point(d, 0))),
    sys('actions', 'Actions', [point(days[0], 10), point(days[1], 30, 3), point(days[2], 0), point(days[3], 0), point(days[4], 5), point(days[5], 5)]),
    sys('storage', 'Storage', days.map((d) => point(d, 100))),
  ], 650);
  assert.deepEqual(plain(rows.map((r) => r.id)), ['storage', 'actions'], 'a system with no calls is left out; the busiest is first');
  const actions = rows[1];
  assert.deepEqual(plain(actions.spans.map((s) => [s.from, s.to, s.calls, s.failures])), [[0, 1, 40, 3], [4, 5, 10, 0]], 'a gap of idle buckets splits the bar in two');
  assert.deepEqual(plain([actions.spans[0].start, actions.spans[0].end]), [days[0], days[1]]);
  assert.equal(rows[0].spans.length, 1, 'constant use is one long bar');
  assert.equal(Math.round(rows[0].share), 92, 'share is of all calls: 600 of 650');
});

test('a busy bucket is drawn stronger than a quiet one, and a bucket that mostly fails is marked', () => {
  const d = (n) => `2026-10-2${n}T00:00:00.000Z`;
  const [r] = h.ganttRows([sys('a', 'A', [point(d(0), 100), point(d(1), 10), point(d(2), 1), point(d(3), 0), point(d(4), 20, 2), point(d(5), 20, 1)])], 1000);
  assert.deepEqual(plain(r.cells.map((c) => c.intensity)), [1, 0.25, 0.25, 0, 0.25, 0.25], 'never fainter than a quarter while there was activity, and nothing for none');
  assert.deepEqual(plain(r.cells.map((c) => c.failing)), [false, false, false, false, true, true], '10% failing is marked, and 5% (1 of 20) is the line, so it is marked too');
});

test('the axis has at most six evenly spaced labels, named by hour or by day', () => {
  const hours = Array.from({ length: 25 }, (_, i) => point(new Date(Date.UTC(2026, 9, 24, i % 24)).toISOString(), 1));
  const axis = h.ganttAxis(hours, 'hour');
  assert.equal(axis.length, 6);
  assert.deepEqual([axis[0].index, axis[5].index], [0, 24], 'the first and the last are always labelled');
  assert.equal(axis[0].label, '00:00');
  assert.equal(h.bucketLabel('2026-10-24T00:00:00.000Z', 'day'), 'Oct 24');
  assert.deepEqual(plain(h.ganttAxis([], 'day')), []);
  assert.equal(h.ganttAxis([point('2026-10-24T00:00:00.000Z', 1)], 'day').length, 1);
  assert.equal(h.ganttAxis(hours.slice(0, 3), 'hour').length, 3, 'a short window is labelled at every bucket');
});
