import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => { throw new Error(`Unexpected dependency: ${name}`); } });
  return exports;
}

const w = load('../src/utils/workBoard.ts');
// Arrays made inside the sandbox are compared by value, not by realm.
const plain = (v) => JSON.parse(JSON.stringify(v));
const NOW = Date.parse('2026-10-29T08:00:00Z');
const item = (over) => ({
  id: over.ref, ref: over.ref, number: Number(over.ref.slice(2)), title: over.ref, body: '', kind: 'task', status: 'ready', priority: 'medium',
  product: 'shop', env: null, parent_id: null, assignee: null, labels: [], paths: [], components: [], critical: false, source: 'agent',
  plan_key: null, outcome: null, created_at: '2026-10-28T08:00:00Z', updated_at: '2026-10-28T08:00:00Z', completed_at: null, ...over,
});

test('items fall into the board columns; epics and cancelled work are not cards', () => {
  const cols = w.groupIntoColumns([
    item({ ref: 'W-1', kind: 'epic' }),
    item({ ref: 'W-2', status: 'claimed' }),
    item({ ref: 'W-3', status: 'in_progress' }),
    item({ ref: 'W-4', status: 'blocked' }),
    item({ ref: 'W-5', status: 'awaiting_approval' }),
    item({ ref: 'W-6', status: 'cancelled' }),
    item({ ref: 'W-7', status: 'backlog' }),
  ], NOW);
  assert.deepEqual(plain(cols.working.map((i) => i.ref)), ['W-2', 'W-3']);
  assert.deepEqual(plain(cols.attention.map((i) => i.ref)), ['W-4', 'W-5'], 'blocked and awaiting approval both need a person');
  assert.deepEqual(plain(cols.backlog.map((i) => i.ref)), ['W-7']);
  assert.equal(Object.values(cols).flat().length, 5);
});

test('ready work is ordered by priority, then oldest first; done work newest first and only the last 14 days', () => {
  const cols = w.groupIntoColumns([
    item({ ref: 'W-1', priority: 'low' }),
    item({ ref: 'W-2', priority: 'urgent', created_at: '2026-10-28T09:00:00Z' }),
    item({ ref: 'W-3', priority: 'urgent', created_at: '2026-10-28T07:00:00Z' }),
    item({ ref: 'W-4', status: 'done', completed_at: '2026-10-29T07:00:00Z' }),
    item({ ref: 'W-5', status: 'done', completed_at: '2026-10-29T07:30:00Z' }),
    item({ ref: 'W-6', status: 'done', completed_at: '2026-10-01T07:00:00Z' }),
  ], NOW);
  assert.deepEqual(plain(cols.ready.map((i) => i.ref)), ['W-3', 'W-2', 'W-1']);
  assert.deepEqual(plain(cols.done.map((i) => i.ref)), ['W-5', 'W-4']);
});

test('the status line puts what needs a person first', () => {
  const sessions = [{ state: 'active' }, { state: 'offline' }];
  assert.match(w.summarise([item({ ref: 'W-1', status: 'awaiting_approval' }), item({ ref: 'W-2', status: 'blocked' })], sessions, NOW).label, /1 waiting for your approval, 1 blocked/);
  assert.equal(w.summarise([item({ ref: 'W-1', status: 'blocked' })], [], NOW).tone, 'warn');
  assert.match(w.summarise([item({ ref: 'W-1', status: 'claimed' })], sessions, NOW).label, /stopped answering/);
  const calm = w.summarise([item({ ref: 'W-1', status: 'in_progress' })], [{ state: 'active' }], NOW);
  assert.equal(calm.tone, 'good');
  assert.equal(calm.activeAgents, 1);
  assert.equal(w.summarise([], [], NOW).label, 'No open work');
});

test('lease and last-seen read in minutes', () => {
  assert.equal(w.leaseLeft('2026-10-29T08:04:10Z', NOW), '5m left');
  assert.equal(w.leaseLeft('2026-10-29T07:59:00Z', NOW), 'expired');
  assert.equal(w.ago('2026-10-29T07:59:50Z', NOW), 'just now');
  assert.equal(w.ago('2026-10-29T07:57:00Z', NOW), '3m ago');
  assert.equal(w.ago('2026-10-29T05:00:00Z', NOW), '3h ago');
  assert.equal(w.clientName('claude-code'), 'Claude Code');
  assert.equal(w.clientName('unknown'), 'Agent');
});

test('components: planned ones last; a typed list parses with + for planned', () => {
  const sorted = w.sortComponents([{ type: 'job', tag: 'x', planned: true }, { type: 'feature', tag: 'checkout' }, { type: 'app', tag: 'ductape:paystack' }]);
  assert.deepEqual(plain(sorted.map(w.componentLabel)), ['app:ductape:paystack', 'feature:checkout', 'job:x']);
  assert.deepEqual(plain(w.parseComponentList('feature:checkout, job:reminder+\ndatabase:orders-db')), [
    { type: 'feature', tag: 'checkout', planned: false },
    { type: 'job', tag: 'reminder', planned: true },
    { type: 'database', tag: 'orders-db', planned: false },
  ]);
});

test('the plan graph places each item one column after what it waits on', () => {
  const items = [item({ ref: 'W-1', kind: 'epic' }), item({ ref: 'W-2' }), item({ ref: 'W-3' }), item({ ref: 'W-4' }), item({ ref: 'W-5' })];
  const nodes = w.layoutGraph(items, [{ from: 'W-2', to: 'W-3' }, { from: 'W-3', to: 'W-4' }, { from: 'W-2', to: 'W-4' }], { w: 100, h: 10 });
  const at = Object.fromEntries(nodes.map((n) => [n.ref, [n.x, n.y]]));
  assert.equal(at['W-1'], undefined, 'the plan itself is not a node');
  assert.deepEqual(plain(at['W-2']), [0, 0]);
  assert.deepEqual(plain(at['W-5']), [0, 10], 'independent work starts in the first column, below');
  assert.deepEqual(plain(at['W-3']), [100, 0]);
  assert.deepEqual(plain(at['W-4']), [200, 0], 'after the latest thing it waits on');
});

test('the Work area opens on the remembered product, else the busiest', () => {
  const products = [{ tag: 'billing', open_items: 0 }, { tag: 'shop', open_items: 7 }];
  assert.equal(w.defaultProduct(products, null), 'shop');
  assert.equal(w.defaultProduct(products, 'billing'), 'billing');
  assert.equal(w.defaultProduct(products, 'gone'), 'shop', 'a remembered product that no longer exists is ignored');
  assert.equal(w.defaultProduct([], null), undefined);
});

const ws = load('../src/utils/workStream.ts');

test('the live stream is framed into events across chunk boundaries; keep-alives are skipped', () => {
  const first = ws.parseSse('event: ready\ndata: {"product":"shop"}\n\n: keep-alive\n\nevent: work\ndata: {"ref":"W-');
  assert.deepEqual(plain(first.events), [{ event: 'ready', data: { product: 'shop' } }]);
  const second = ws.parseSse(first.rest + '3","type":"claimed"}\r\n\r\n');
  assert.deepEqual(plain(second.events), [{ event: 'work', data: { ref: 'W-3', type: 'claimed' } }]);
  assert.equal(second.rest, '');
  assert.deepEqual(plain(ws.parseSse('data: not json\n\n').events), [{ event: 'message', data: 'not json' }]);
});

test('reconnects back off from 1 s to 30 s, and polling slows while the stream is live', () => {
  assert.deepEqual([0, 1, 2, 5, 9].map(ws.reconnectDelay), [1000, 2000, 4000, 30000, 30000]);
  assert.equal(ws.pollInterval(true), 60000);
  assert.equal(ws.pollInterval(false), 5000);
});
