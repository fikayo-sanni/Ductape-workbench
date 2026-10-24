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
    if (name === '@/utils/deployments') return load('../src/utils/deployments.ts');
    if (name === '@/utils/deployControls') return load('../src/utils/deployControls.ts');
    throw new Error(`unexpected import ${name}`);
  };
  vm.runInNewContext(code, { exports, require: resolve, Math, Number, String, Set, Array, Object, Error, Map, Date, parseInt: Number.parseInt, Boolean, Symbol, JSON }, {});
  cache.set(url.href, exports);
  return exports;
}
const s = load('../src/utils/infraSummary.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

const at = (minutesAgo) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
const dep = (over = {}) => ({
  id: 'd', kind: 'function', product: 'shop', name: 'api', version: '1.0.0', env: 'prd', target: { kind: 'cloud_run', connection: 'gcp-main', region: 'europe-west2' },
  resourceName: 'r', releaseHash: 'sha256:x', trafficPercent: 100, state: 'active', revision: 1, updatedAt: at(10), ...over,
});
const caps = (over = {}) => ({ mutationsEnabled: true, reconcilerEnabled: true, observeFromProvider: true, adminOnly: false, stepUp: { mode: 'off', ready: true, method: 'email_code' }, targets: ['cloud_run', 'aws_lambda', 'aws_fargate', 'azure_container_apps', 'cloudflare_workers'], ...over });

test('deployments are counted by state, environment and where they run', () => {
  const summary = s.summarizeDeployments([
    dep({ id: '1', env: 'prd', state: 'active' }),
    dep({ id: '2', env: 'prd', state: 'failed', updatedAt: at(5) }),
    dep({ id: '3', env: 'stg', state: 'building', target: { kind: 'aws_lambda', connection: 'aws-main' } }),
    dep({ id: '4', env: 'stg', state: 'rolled_back', target: { kind: 'aws_lambda', connection: 'aws-main' }, updatedAt: at(1) }),
    dep({ id: '5', env: 'stg', state: 'active', target: { kind: 'aws_lambda', connection: 'aws-main' } }),
  ]);
  assert.deepEqual([summary.total, summary.active, summary.inFlight, summary.attention], [5, 2, 1, 2]);
  assert.deepEqual(plain(summary.byEnvironment.map((g) => [g.key, g.total, g.active, g.attention, g.inFlight])), [['stg', 3, 1, 1, 1], ['prd', 2, 1, 1, 0]]);
  assert.deepEqual(plain(summary.byTarget.map((g) => [g.label, g.total])), [['AWS Lambda', 3], ['Cloud Run', 2]], 'a target shows its name, not its code');
  assert.deepEqual(plain(summary.needsAttention.map((d) => d.id)), ['4', '2'], 'failed and rolled back, newest first');
  assert.equal(summary.recent[0].id, '4', 'the latest change first');
  assert.equal(s.summarizeDeployments([]).total, 0);
});

test('only the latest few are listed, and plans and builds that need a person are counted', () => {
  const many = Array.from({ length: 12 }, (_, i) => dep({ id: String(i), state: 'failed', updatedAt: at(i + 1) }));
  const summary = s.summarizeDeployments(many, [{ stage: 'pending_approval' }, { stage: 'pending_approval' }, { stage: 'blocked' }, { stage: 'applied' }, { stage: 'ready' }], [{ status: 'failed' }, { status: 'building' }, { status: 'awaiting_upload' }, { status: 'succeeded' }]);
  assert.equal(summary.needsAttention.length, 5);
  assert.equal(summary.recent.length, 5);
  assert.equal(summary.attention, 12, 'the count is of all of them, the list is of the latest');
  assert.equal(summary.plansAwaitingApproval, 2);
  assert.equal(summary.plansBlocked, 1);
  assert.deepEqual(plain(summary.builds), { inFlight: 2, failed: 1 });
});

const conn = (over = {}) => ({ tag: 'gcp-main', display_name: 'Main GCP', provider: 'gcp', status: 'active', scopes: ['deploy'], metadata: {}, ...over });

test('cloud connections are counted by provider and status, with who can deploy and why not', () => {
  const summary = s.summarizeConnections([
    conn(),
    conn({ tag: 'aws-main', display_name: 'AWS', provider: 'aws' }),
    conn({ tag: 'aws-new', display_name: 'AWS new', provider: 'aws', status: 'pending' }),
    conn({ tag: 'gcp-nodeploy', display_name: 'No deploy', scopes: [] }),
    conn({ tag: 'dns', display_name: 'DNS only', provider: 'digitalocean', scopes: [] }),
  ], caps(), [dep({ target: { kind: 'cloud_run', connection: 'gcp-main' } }), dep({ target: { kind: 'cloud_run', connection: 'gcp-main' } })]);
  assert.deepEqual([summary.total, summary.active, summary.notActive, summary.deployReady], [5, 4, 1, 2]);
  assert.deepEqual(plain(summary.byProvider.map((p) => [p.label, p.total, p.active])), [['AWS', 2, 1], ['Google Cloud', 2, 2], ['Digitalocean', 1, 1]]);
  const by = Object.fromEntries(summary.rows.map((r) => [r.tag, r]));
  assert.equal(by['gcp-main'].deployReady, true);
  assert.deepEqual(plain(by['gcp-main'].targets), ['Cloud Run']);
  assert.equal(by['gcp-main'].deployments, 2, 'how many deployments went through it');
  assert.equal(by['aws-new'].deployReady, false);
  assert.match(by['aws-new'].deployNote, /Not active yet/, 'a connection that is not finished says what is missing');
  assert.equal(by['aws-new'].statusLabel, 'Setup not finished');
  assert.match(by['gcp-nodeploy'].deployNote, /deploy scope/);
  assert.equal(by.dns.deployNote, undefined, 'a provider nothing can be deployed to is not nagged about deploys');
  assert.equal(by.dns.deployReady, false);
  assert.equal(summary.rows[0].tag, 'aws-new', 'a connection that needs a look is listed first');
  assert.equal(by['aws-main'].targets.length >= 1, true);
});

test('a server that cannot deploy a kind of target says so on its connections', () => {
  const summary = s.summarizeConnections([conn({ tag: 'a', provider: 'aws' })], caps({ targets: ['cloud_run'] }));
  assert.equal(summary.rows[0].deployReady, false);
  assert.ok(summary.rows[0].deployNote, 'the reason is given');
  assert.equal(s.summarizeConnections([], caps()).total, 0);
  assert.equal(s.summarizeConnections([conn()], undefined).rows[0].deployReady, true, 'with no word from the server, a ready connection is shown as ready');
  assert.equal(s.providerLabel(undefined), 'Unknown');
});
