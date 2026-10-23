import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Math, Number, String, Set, Array, Object, Error, Map, parseInt: Number.parseInt }, {});
  return exports;
}

const {
  DEPLOY_PROVIDERS, buildTotals, compareVersions, deployErrorMessage, describeBuildStatus, hasDeployScope, isBuildInFlight, describePolicy, describeState, describeTarget, filterDeployments, formatTraffic, groupByEnvironment, isInFlight, shortHash, totals,
} = load('../src/utils/deployments.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

const target = { kind: 'cloud_run', connection: 'gcp-main', region: 'europe-west2' };
const dep = (over) => ({
  id: 'd', kind: 'function', product: 'buydeck', name: 'reserve-stock', version: '1.0.0', env: 'stg', target, resourceName: 'r', releaseHash: `sha256:${'a'.repeat(64)}`,
  trafficPercent: 100, state: 'active', revision: 1, updatedAt: '2026-10-01T00:00:00Z', ...over,
});
const policy = (requireHumanApproval, allowAgentApply = false) => ({ requireHumanApproval, allowAgentApply, source: 'default' });
const envs = [
  { slug: 'dev', name: 'Development', active: true, policy: policy(false, true) },
  { slug: 'stg', name: 'Staging', active: true, policy: policy(false) },
  { slug: 'prd', name: 'Production', active: true, policy: policy(true) },
];

test('states carry a plain label and a colour that says whether to look', () => {
  assert.deepEqual(plain(describeState('active')), { label: 'Active', tone: 'good' });
  assert.deepEqual(plain(describeState('failed')), { label: 'Failed', tone: 'bad' });
  assert.deepEqual(plain(describeState('rolled_back')), { label: 'Rolled back', tone: 'warn' });
  assert.deepEqual(plain(describeState('verifying')), { label: 'Verifying', tone: 'info' });
  assert.deepEqual(plain(describeState('planned')), { label: 'Planned', tone: 'neutral' });
  assert.deepEqual(plain(describeState('something_new')), { label: 'something_new', tone: 'neutral' }, 'an unknown state is shown as it came');
  assert.equal(isInFlight('promoting'), true);
  assert.equal(isInFlight('active'), false);
  assert.equal(isInFlight('rolled_back'), false);
});

test('policy is described the way applying actually behaves', () => {
  assert.equal(describePolicy(policy(true)).label, 'Approval required');
  assert.equal(describePolicy(policy(true, true)).label, 'Approval required', 'allowing agents does nothing when approval is required');
  assert.equal(describePolicy(policy(false, true)).label, 'Agents may apply');
  assert.equal(describePolicy(policy(false, false)).label, 'People apply');
});

test('traffic, targets and hashes read cleanly', () => {
  assert.equal(formatTraffic(100), '100%');
  assert.equal(formatTraffic(12.5), '12.5%');
  assert.equal(formatTraffic(0), '0%');
  assert.equal(formatTraffic(Number.NaN), '-');
  assert.equal(describeTarget(target), 'Cloud Run · gcp-main · europe-west2');
  assert.equal(describeTarget({ kind: 'aws_lambda', connection: 'aws-1' }), 'AWS Lambda · aws-1');
  assert.equal(describeTarget({ kind: 'novel', connection: 'x' }), 'novel · x');
  assert.equal(shortHash(`sha256:${'ab12'.repeat(16)}`), 'ab12ab12ab12');
  assert.equal(shortHash(undefined), '-');
});

test('versions sort newest first and a prerelease is older than its release', () => {
  const sorted = ['1.0.0', '1.10.0', '1.2.0', '1.2.0-rc.1', '2.0.0'].sort((a, b) => compareVersions(b, a));
  assert.deepEqual(sorted, ['2.0.0', '1.10.0', '1.2.0', '1.2.0-rc.1', '1.0.0']);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.ok(compareVersions('1.0', '1.0.1') < 0);
});

test('deployments are grouped under the product environments, in their order, including empty ones', () => {
  const list = [
    dep({ id: '1', name: 'b-api', kind: 'service', env: 'prd', version: '1.0.0' }),
    dep({ id: '2', name: 'a-fn', env: 'stg', version: '1.0.0' }),
    dep({ id: '3', name: 'a-fn', env: 'stg', version: '1.1.0' }),
    dep({ id: '4', name: 'gone', env: 'qa1' }),
  ];
  const groups = plain(groupByEnvironment(list, envs));
  assert.deepEqual(groups.map((g) => [g.slug, g.known, g.deployments.map((d) => d.id)]), [
    ['dev', true, []], ['stg', true, ['3', '2']], ['prd', true, ['1']], ['qa1', false, ['4']],
  ], 'newest version first within a name; an environment the product dropped is still shown');
  assert.equal(groups[0].name, 'Development');
  assert.equal(groups[3].policy, undefined, 'no policy is invented for an environment the product no longer has');
});

test('filters narrow by kind, environment and text', () => {
  const list = [
    dep({ id: '1', name: 'buydeck-api', kind: 'service', env: 'prd' }),
    dep({ id: '2', name: 'reserve-stock', env: 'stg' }),
  ];
  const ids = (filters) => filterDeployments(list, filters).map((d) => d.id);
  assert.deepEqual(ids({}), ['1', '2']);
  assert.deepEqual(ids({ kind: 'service' }), ['1']);
  assert.deepEqual(ids({ kind: 'function', env: 'stg' }), ['2']);
  assert.deepEqual(ids({ env: 'prd', kind: 'function' }), []);
  assert.deepEqual(ids({ search: '  RESERVE ' }), ['2']);
  assert.deepEqual(ids({ search: 'gcp-main' }), ['1', '2'], 'the connection is searchable');
  assert.deepEqual(ids({ kind: 'all', env: 'all' }), ['1', '2']);
});

test('totals count what needs a look', () => {
  assert.deepEqual(plain(totals([
    dep({ state: 'active' }), dep({ state: 'active' }), dep({ state: 'verifying' }), dep({ state: 'failed' }), dep({ state: 'rolled_back' }), dep({ state: 'planned' }),
  ])), { total: 6, active: 2, inFlight: 2, attention: 2 });
  assert.deepEqual(plain(totals([])), { total: 0, active: 0, inFlight: 0, attention: 0 });
});

test('errors say what the server said, or that the server has no deploy support', () => {
  assert.match(deployErrorMessage({ response: { status: 404, data: {} } }), /does not offer Ductape Deploy/);
  assert.equal(
    deployErrorMessage({ response: { status: 404, data: { errors: 'Product "x" was not found in this workspace', meta: { code: 'PRODUCT_NOT_FOUND' } } } }),
    'Product "x" was not found in this workspace [PRODUCT_NOT_FOUND]',
    'a real not-found keeps its explanation',
  );
  assert.equal(deployErrorMessage({ response: { status: 403, data: { errors: ['no access'] } } }), 'no access');
  assert.equal(deployErrorMessage(new Error('Network Error')), 'Network Error');
  assert.equal(deployErrorMessage(undefined), 'The deployments could not be loaded.');
});

const build = (status, over = {}) => ({ id: 'b', kind: 'function', product: 'p', name: 'n', version: '1.0.0', connection: 'gcp-main', region: 'europe-west2', status, builder: 'dockerfile', imageRepository: 'r', createdAt: 'x', updatedAt: 'x', ...over });

test('build statuses carry a label and a colour, and running ones are known', () => {
  assert.deepEqual(plain(describeBuildStatus('succeeded')), { label: 'Succeeded', tone: 'good' });
  assert.deepEqual(plain(describeBuildStatus('failed')), { label: 'Failed', tone: 'bad' });
  assert.deepEqual(plain(describeBuildStatus('expired')), { label: 'Expired', tone: 'warn' });
  assert.deepEqual(plain(describeBuildStatus('cancelled')), { label: 'Cancelled', tone: 'warn' });
  assert.deepEqual(plain(describeBuildStatus('building')), { label: 'Building', tone: 'info' });
  assert.deepEqual(plain(describeBuildStatus('awaiting_upload')), { label: 'Waiting for source', tone: 'neutral' });
  assert.deepEqual(plain(describeBuildStatus('queued_somewhere')), { label: 'queued_somewhere', tone: 'neutral' }, 'an unknown status is shown as it came');
  assert.equal(isBuildInFlight('building'), true);
  assert.equal(isBuildInFlight('awaiting_upload'), true);
  assert.equal(isBuildInFlight('succeeded'), false);
  assert.equal(isBuildInFlight('failed'), false);
});

test('build totals count what is running and what failed', () => {
  assert.deepEqual(plain(buildTotals([build('succeeded'), build('succeeded'), build('building'), build('awaiting_upload'), build('failed'), build('expired')])), { total: 6, inFlight: 2, succeeded: 2, failed: 1 });
  assert.deepEqual(plain(buildTotals([])), { total: 0, inFlight: 0, succeeded: 0, failed: 0 });
});

test('a connection can deploy only with the deploy scope, and only GCP, AWS, Azure and Cloudflare can deploy today', () => {
  assert.equal(hasDeployScope(['storage', 'deploy']), true);
  assert.equal(hasDeployScope(['storage', 'broker']), false);
  assert.equal(hasDeployScope([]), false);
  assert.equal(hasDeployScope(undefined), false);
  for (const provider of ['gcp', 'aws', 'azure', 'cloudflare']) assert.equal(DEPLOY_PROVIDERS.has(provider), true, provider);
  for (const provider of ['mongodb_atlas', 'neo4j_aura']) assert.equal(DEPLOY_PROVIDERS.has(provider), false, provider);
});
