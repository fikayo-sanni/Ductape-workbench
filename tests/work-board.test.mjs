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

test('epics show how far their work has got, across nested subtasks', () => {
  const items = [
    item({ ref: 'W-1', kind: 'epic' }),
    item({ ref: 'W-2', parent_id: 'W-1', status: 'done' }),
    item({ ref: 'W-3', parent_id: 'W-1', status: 'in_progress' }),
    item({ ref: 'W-4', parent_id: 'W-3', kind: 'subtask', status: 'blocked' }),
    item({ ref: 'W-5', parent_id: 'W-1', status: 'cancelled' }),
    item({ ref: 'W-6', kind: 'epic' }),
    item({ ref: 'W-7', parent_id: 'W-6', status: 'done' }),
    item({ ref: 'W-8' }),
  ];
  assert.deepEqual([...w.descendantIds(items, 'W-1')].sort(), ['W-2', 'W-3', 'W-4', 'W-5']);
  const [first, second] = w.epicSummaries(items);
  assert.equal(first.epic.ref, 'W-1', 'unfinished epics come first');
  assert.deepEqual({ total: first.total, done: first.done, working: first.working, attention: first.attention }, { total: 3, done: 1, working: 1, attention: 1 }, 'cancelled work does not count');
  assert.equal(second.epic.ref, 'W-6');
  assert.equal(second.progress, 1);
});

test('what work delivered is grouped by kind; an epic gathers its work\'s without duplicates', () => {
  const a = (kind, ref, extra = {}) => ({ kind, ref, url: null, title: null, meta: null, at: '2026-10-29T08:00:00Z', by: null, ...extra });
  const groups = w.groupArtifacts([
    { ref: 'W-1', artifacts: [a('document', 'docs/plan.md')] },
    { ref: 'W-2', artifacts: [a('commit', 'a1'), a('component', 'database:orders-db'), a('pull_request', '#42')] },
    { ref: 'W-3', artifacts: [a('pull_request', '#42'), a('release', 'sha256:9f2c')] },
  ]);
  assert.deepEqual(plain(groups.map((g) => g.kind)), ['component', 'release', 'pull_request', 'commit', 'document']);
  assert.equal(groups.find((g) => g.kind === 'pull_request').entries.length, 1);
  assert.equal(groups.find((g) => g.kind === 'pull_request').entries[0].from, 'W-2', 'credited to the first item that delivered it');
  assert.deepEqual(plain(w.groupArtifacts([{ ref: 'W-9' }])), []);
});

test('agents are named for their person: yours, someone else\'s, or the client alone when unknown', () => {
  const sessions = [
    { agent: { id: 'a1', client: 'claude-code' }, user_id: 'u-ada', owner: { name: 'Ada', full_name: 'Ada Okafor' } },
    { agent: null, user_id: 'u-ada' },
  ];
  const dir = w.agentDirectory(sessions, { a2: { client: 'codex', owner: { id: 'u-bola', name: 'Bola' } }, a3: { client: 'cursor', owner: null } });
  assert.equal(w.agentLabel(dir.get('a1'), 'u-ada'), 'Your Claude Code');
  assert.equal(w.agentLabel(dir.get('a1'), 'u-bola'), "Ada's Claude Code");
  assert.equal(w.agentLabel(dir.get('a2'), 'u-ada'), "Bola's Codex");
  assert.equal(w.agentLabel({ client: 'codex', owner: { id: 'x', name: 'Jesus' } }), "Jesus' Codex");
  assert.equal(w.agentLabel(dir.get('a3')), 'Cursor');
  assert.equal(w.agentLabel(undefined, 'u-ada', 'codex'), 'Codex', 'an agent not in the directory falls back to its client');
  assert.equal(w.viaLabel({ via: 'mcp', client_name: 'claude-code 2.1.0' }), 'via MCP (claude-code 2.1.0)');
  assert.equal(w.viaLabel({ via: 'hook' }), 'via hooks');
  assert.equal(w.viaLabel({}), 'via the CLI');
});

test('what was delivered reads in words, and says how Ductape knows it', () => {
  assert.equal(w.artifactDetail({ kind: 'test_report', meta: { passed: 47, failed: 1, result: 'failed', exit_code: 1 } }), '47 passed, 1 failed');
  assert.equal(w.artifactDetail({ kind: 'test_report', meta: { result: 'failed', exit_code: 3 } }), 'failed (exit 3)');
  assert.equal(w.artifactDetail({ kind: 'deployment', meta: { env: 'prd', state: 'live', traffic_percent: 100, release: 'sha256:ab' } }), 'prd, live, 100% of traffic');
  assert.equal(w.artifactDetail({ kind: 'build', meta: { status: 'succeeded' } }), 'succeeded');
  assert.equal(w.artifactDetail({ kind: 'document', meta: { pages: 3 } }), 'pages 3');
  assert.deepEqual(plain(Object.keys(w.SOURCE_LABEL)), ['ductape', 'ductape_cli', 'reported']);
});

test('long refs are cut to one line: hashes, ids, and test runs by commit and time', () => {
  assert.equal(w.shortRef({ kind: 'release', ref: `sha256:${'7c'.repeat(32)}` }), 'sha256:7c7c7c7c7c7c');
  assert.equal(w.shortRef({ kind: 'deployment', ref: '6ae378119925595364232f2e' }), '6ae378119925');
  assert.equal(w.shortRef({ kind: 'test_report', ref: 'npm test @ a1b2c3d 2026-10-29T16:45:12Z' }), 'a1b2c3d 2026-10-29 16:45 UTC');
  assert.equal(w.shortRef({ kind: 'commit', ref: '4e1f9a2' }), '4e1f9a2');
});

test('quiet sessions (stopped answering, holding nothing) are kept out of the way', () => {
  const s = (id, state, held) => ({ id, state, working_on: held ? [{ item_id: 'x' }] : [] });
  const { live, quiet } = w.splitSessions([s('a', 'active', false), s('b', 'offline', true), s('c', 'offline', false)]);
  assert.deepEqual(plain(live.map((x) => x.id)), ['a', 'b'], 'an agent that stopped answering while holding work still shows');
  assert.deepEqual(plain(quiet.map((x) => x.id)), ['c']);
  assert.equal(w.agentWhere({ name: "Ada's Claude Code", machine: 'ada-mbp' }, "Ada's Claude Code"), 'ada-mbp', 'the label is not repeated');
  assert.equal(w.agentWhere({ name: 'refunds bot', machine: 'ci-7' }, "Ada's Claude Code"), 'refunds bot · ci-7');
  assert.equal(w.agentWhere(null, 'x'), '');
});

test('a deployment shows its state now beside what it was when recorded', () => {
  const meta = { env: 'prd', state: 'live', traffic_percent: 100 };
  assert.equal(w.artifactDetail({ kind: 'deployment', meta }), 'prd, live, 100% of traffic');
  assert.equal(w.artifactDetail({ kind: 'deployment', meta, current: { state: 'live', traffic_percent: 100 } }), 'prd, live, 100% of traffic', 'unchanged: said once');
  assert.equal(w.artifactDetail({ kind: 'deployment', meta, current: { state: 'rolled_back', traffic_percent: 0 } }), 'prd, now rolled back at 0%, was live at 100%');
});
