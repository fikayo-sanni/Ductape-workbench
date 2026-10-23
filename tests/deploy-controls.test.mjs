import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Math, Number, String, Set, Array, Object, Error, Map, Date, parseInt: Number.parseInt, Number }, {});
  return exports;
}

const c = load('../src/utils/deployControls.ts');
const { compareVersions } = load('../src/utils/deployments.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

const caps = (over = {}) => ({
  mutationsEnabled: true, reconcilerEnabled: true, observeFromProvider: true, adminOnly: false,
  stepUp: { mode: 'off', ready: true, method: 'email_code' }, targets: ['aws_lambda', 'azure_container_apps', 'cloud_run'], ...over,
});
const desired = (over = {}) => ({ product: 'buydeck', name: 'api', kind: 'function', version: '1.0.0', env: 'prd', target: { kind: 'cloud_run', connection: 'gcp-main', region: 'europe-west2' }, releaseHash: `sha256:${'a'.repeat(64)}`, trafficPercent: 100, ...over });
const plan = (stage, over = {}) => ({
  id: 'p1', stage, status: stage === 'approved' ? 'approved' : stage === 'applied' ? 'applied' : 'pending', ok: stage !== 'blocked', planHash: `sha256:${'b'.repeat(64)}`,
  desired: desired(), actions: [], warnings: [], expiresAt: new Date(Date.now() + 3600_000).toISOString(), createdAt: new Date().toISOString(), ...over,
});

test('notices say what this server will not do, and nothing when all is well', () => {
  assert.deepEqual(plain(c.capabilityNotices(caps())), []);
  assert.deepEqual(plain(c.capabilityNotices(undefined)), []);
  assert.match(c.capabilityNotices(caps({ mutationsEnabled: false }))[0].text, /switched off/);
  const stepUp = c.capabilityNotices(caps({ stepUp: { mode: 'all', ready: false, method: 'email_code' } }));
  assert.equal(stepUp[0].tone, 'bad');
  assert.match(stepUp[0].text, /cannot send one/);
  assert.equal(c.capabilityNotices(caps({ stepUp: { mode: 'misconfigured', ready: false, method: 'email_code' } })).length, 1);
  assert.match(c.capabilityNotices(caps({ observeFromProvider: false }))[0].text, /only be made from a terminal/);
  const worker = (over) => caps({ worker: { alive: true, ...over } });
  assert.deepEqual(plain(c.capabilityNotices(worker({ oldestInFlightSeconds: 60 }))), [], 'a healthy worker says nothing');
  const down = c.capabilityNotices(worker({ alive: false }));
  assert.equal(down[0].tone, 'bad');
  assert.match(down[0].text, /No Deploy worker has checked in/);
  assert.deepEqual(plain(c.capabilityNotices(caps({ mutationsEnabled: false, worker: { alive: false } })).filter((n) => /worker/.test(n.text))), [], 'no worker is expected while changes are off');
  assert.deepEqual(plain(c.capabilityNotices(caps())), [], 'an older server that reports no worker is left alone');
  const slow = c.capabilityNotices(worker({ oldestInFlightSeconds: 25 * 60 }));
  assert.equal(slow[0].tone, 'warn');
  assert.match(slow[0].text, /25 minutes/);
  assert.equal(c.STUCK_AFTER_SECONDS, 1200);
});

test('the access level is read from the workspace list, and unknown stays unknown', () => {
  const list = { data: [{ workspace_id: 'w1', access_level: 'admin' }, { workspace_id: 'w2', access_level: 'collaborator' }] };
  assert.equal(c.accessLevelFor(list, 'w1'), 'admin');
  assert.equal(c.accessLevelFor(list, 'w3'), undefined);
  assert.equal(c.accessLevelFor(null, 'w1'), undefined);
  assert.equal(c.accessLevelFor(list, null), undefined);
  assert.equal(c.isAdminLevel('Owner'), true);
  assert.equal(c.isAdminLevel('collaborator'), false);
  assert.equal(c.isAdminLevel(undefined), false);
});

test('step-up is needed exactly where the server asks for it', () => {
  const mode = (m) => caps({ stepUp: { mode: m, ready: true, method: 'email_code' } });
  assert.equal(c.stepUpNeeded('approve', mode('off'), true), false);
  assert.equal(c.stepUpNeeded('retire', mode('off'), true), false);
  assert.equal(c.stepUpNeeded('approve', mode('production'), true), true, 'approving where a person must approve');
  assert.equal(c.stepUpNeeded('approve', mode('production'), false), false, 'approving where nobody must');
  assert.equal(c.stepUpNeeded('approve', mode('all'), false), true);
  assert.equal(c.stepUpNeeded('retire', mode('production'), true), true, 'retiring always');
  assert.equal(c.stepUpNeeded('policy', mode('production'), true), true, 'policy always');
  assert.equal(c.stepUpNeeded('policy', mode('misconfigured'), true), true, 'a broken setup blocks, it does not wave through');
  assert.equal(c.stepUpNeeded('approve', undefined, true), false);
});

test('a code is spent on the scope the server will ask for, character for character', () => {
  assert.equal(c.stepUpScope.approve(`sha256:${'b'.repeat(64)}`), `plan:sha256:${'b'.repeat(64)}`);
  assert.equal(c.stepUpScope.retire('ductape:buydeck', 'api', '1.0.0'), 'retire:ductape:buydeck/api@1.0.0');
  assert.equal(c.stepUpScope.policy('buydeck', 'prd'), 'policy:buydeck/prd');
  assert.equal(c.STEP_UP_HEADER, 'x-ductape-grant');
  assert.equal(c.isSixDigitCode('123456'), true);
  assert.equal(c.isSixDigitCode(' 123456 '), true);
  for (const bad of ['12345', '1234567', 'abcdef', '12 456', '']) assert.equal(c.isSixDigitCode(bad), false, bad);
});

test('the scopes match the backend source, so a code cannot be asked for one thing and rejected for another', () => {
  const route = new URL('../../backend/integrations/src/routes/deploy.routes.ts', import.meta.url);
  if (!fs.existsSync(route)) return;
  const source = fs.readFileSync(route, 'utf8');
  assert.ok(source.includes("`plan:${info.planHash}`"));
  assert.ok(source.includes("`retire:${productTag}/${functionName}@${version}`"));
  assert.ok(source.includes("`policy:${req.params.product}/${req.params.env}`"));
  assert.ok(source.includes("'x-ductape-grant'"));
});

test('stages are described, sorted with what needs a person first, and counted', () => {
  assert.equal(c.describeStage('pending_approval').tone, 'warn');
  assert.equal(c.describeStage('applied').tone, 'good');
  assert.equal(c.describeStage('blocked').tone, 'bad');
  assert.equal(c.describeStage('mystery').label, 'mystery');
  const old = new Date(Date.now() - 86400_000).toISOString();
  const plans = [plan('applied'), plan('approved', { id: 'a' }), plan('pending_approval', { id: 'old', createdAt: old }), plan('pending_approval', { id: 'new' }), plan('blocked')];
  assert.deepEqual(plain(c.sortPlans(plans).map((p) => p.id)), ['new', 'old', 'a', 'p1', 'p1']);
  assert.deepEqual(plain(c.planTotals(plans)), { total: 5, needsApproval: 2, readyToApply: 1, blocked: 1 });
  assert.equal(plans[0].id, 'p1', 'sorting does not reorder the input');
});

test('time left on a plan', () => {
  const now = Date.parse('2030-01-01T00:00:00Z');
  const at = (ms) => new Date(now + ms).toISOString();
  assert.equal(c.expiresIn({ stage: 'approved', expiresAt: at(30_000) }, now), 'less than a minute');
  assert.equal(c.expiresIn({ stage: 'approved', expiresAt: at(90_000) }, now), '1 minute');
  assert.equal(c.expiresIn({ stage: 'approved', expiresAt: at(25 * 60_000) }, now), '25 minutes');
  assert.equal(c.expiresIn({ stage: 'approved', expiresAt: at(3 * 3600_000) }, now), '3 hours');
  assert.equal(c.expiresIn({ stage: 'approved', expiresAt: at(-1) }, now), 'expired');
  for (const stage of ['applied', 'expired', 'blocked']) assert.equal(c.expiresIn({ stage, expiresAt: at(1000) }, now), undefined, stage);
});

test('a plan that needs a person can be approved but not applied, and the reasons are given', () => {
  const k = c.planControls(plan('pending_approval'), caps(), undefined);
  assert.equal(k.approve.enabled, true);
  assert.equal(k.apply.enabled, false);
  assert.match(k.apply.reason, /Approve this plan first/);
  assert.equal(k.approveNeedsCode, false, 'step-up is off');
});

test('an approved plan or one that needs no approval can be applied', () => {
  for (const stage of ['approved', 'ready']) {
    const k = c.planControls(plan(stage), caps(), undefined);
    assert.equal(k.apply.enabled, true, stage);
    assert.equal(k.approve.enabled, false, stage);
  }
});

test('plans that are blocked, expired or applied offer nothing', () => {
  for (const stage of ['blocked', 'expired', 'applied']) {
    const k = c.planControls(plan(stage), caps(), 'owner');
    assert.equal(k.approve.enabled, false, stage);
    assert.equal(k.apply.enabled, false, stage);
    assert.ok(k.approve.reason && k.apply.reason, `${stage} explains itself`);
  }
  const blocked = c.planControls(plan('blocked', { placement: [{ code: 'x', message: 'Region is outside the allowed placement.' }] }), caps(), 'owner');
  assert.match(blocked.apply.reason, /outside the allowed placement/);
});

test('applying is off when the server cannot change the cloud or cannot reach the target', () => {
  const off = c.planControls(plan('approved'), caps({ mutationsEnabled: false }), 'owner');
  assert.equal(off.apply.enabled, false);
  assert.match(off.apply.reason, /switched off/);
  const noTarget = c.planControls(plan('approved', { desired: desired({ target: { kind: 'vps', connection: 'x' } }) }), caps(), 'owner');
  assert.equal(noTarget.apply.enabled, false);
  assert.match(noTarget.apply.reason, /cannot deploy to vps/);
  assert.equal(c.planControls(plan('approved'), undefined, undefined).apply.enabled, true, 'capabilities not loaded: the server decides');
});

test('on a server that limits decisions to admins, a known non-admin cannot approve, and an unknown level is left to the server', () => {
  const strict = caps({ adminOnly: true });
  const p = plan('pending_approval');
  const collaborator = c.planControls(p, strict, 'collaborator');
  assert.equal(collaborator.approve.enabled, false);
  assert.match(collaborator.approve.reason, /owner or admin/);
  assert.equal(c.planControls(p, strict, 'admin').approve.enabled, true);
  assert.equal(c.planControls(p, strict, 'owner').approve.enabled, true);
  assert.equal(c.planControls(p, strict, undefined).approve.enabled, true);
  assert.equal(c.planControls(p, caps(), 'collaborator').approve.enabled, true, 'not enforced when the server does not enforce it');
});

test('approving asks for a code where the server will, and is off when the server cannot send one', () => {
  const ready = caps({ stepUp: { mode: 'production', ready: true, method: 'email_code' } });
  const k = c.planControls(plan('pending_approval'), ready, 'owner');
  assert.equal(k.approveNeedsCode, true);
  assert.equal(k.approve.enabled, true);
  const broken = caps({ stepUp: { mode: 'production', ready: false, method: 'email_code' } });
  const blocked = c.planControls(plan('pending_approval'), broken, 'owner');
  assert.equal(blocked.approve.enabled, false);
  assert.match(blocked.approve.reason, /cannot send one/);
});

test('a plan is summarised for the person approving it', () => {
  const lines = c.summarizePlan({ intent: 'rollback', desired: desired({ trafficPercent: 25 }) });
  assert.deepEqual(plain(lines), ['Roll back: api 1.0.0 in prd, on gcp-main (europe-west2)', 'Release aaaaaaaaaaaa will receive 25% of traffic'], 'the headline only; each change is listed on its own');
  assert.match(c.summarizePlan({ desired: desired({ trafficPercent: 12.5 }) })[1], /12.5%/);
  assert.match(c.summarizePlan({ desired: desired() })[0], /^Deploy: /);
});

const connection = (over = {}) => ({ tag: 'gcp_main', display_name: 'GCP main', provider: 'gcp', status: 'active', scopes: ['deploy'], metadata: {}, ...over });

test('only connections that could deploy are offered as targets, each on or off with the reason', () => {
  const options = c.targetOptions([
    connection(),
    connection({ tag: 'aws_main', display_name: 'AWS', provider: 'aws', metadata: { default_region: 'eu-west-2' } }),
    connection({ tag: 'noscope', scopes: ['storage'] }),
    connection({ tag: 'pending', status: 'pending' }),
    connection({ tag: 'atlas', provider: 'mongodb_atlas' }),
    connection({ tag: undefined }),
  ], caps({ targets: ['cloud_run'] }));
  assert.deepEqual(plain(options.map((o) => o.connectionTag)), ['gcp_main', 'aws_main', 'noscope', 'pending'], 'usable first, then the rest by name');
  const by = Object.fromEntries(options.map((o) => [o.connectionTag, o]));
  assert.equal(by.gcp_main.enabled, true);
  assert.equal(by.gcp_main.targetKind, 'cloud_run');
  assert.equal(by.aws_main.enabled, false);
  assert.match(by.aws_main.reason, /cannot deploy to aws_lambda/);
  assert.equal(by.aws_main.defaultRegion, 'eu-west-2');
  assert.match(by.noscope.reason, /deploy scope/);
  assert.match(by.pending.reason, /Not active/);
  assert.equal(by.atlas, undefined, 'a cloud that can never deploy is not listed');
  assert.equal(options[0].enabled, true, 'usable connections come first');
  assert.equal(c.targetKindForProvider('azure'), 'azure_container_apps');
  assert.equal(c.targetKindForProvider('neo4j_aura'), undefined);
  assert.equal(c.defaultRegionFor(connection({ provider: 'azure', metadata: { default_location: 'uksouth' } })), 'uksouth');
  assert.equal(c.defaultRegionFor(connection()), '');
});

test('a new plan is checked before it is sent, and built the way the server reads it', () => {
  const release = { releaseHash: `sha256:${'c'.repeat(64)}`, kind: 'function', product: 'buydeck', name: 'api', version: '1.2.0' };
  const target = c.targetOptions([connection()], caps())[0];
  const ok = c.buildNewPlanRequest({ product: 'buydeck', release, env: 'stg', target, region: ' europe-west2 ', trafficPercent: '10' });
  assert.deepEqual(plain(ok), {
    product: 'buydeck', kind: 'function', function: 'api', version: '1.2.0', env: 'stg',
    target: { kind: 'cloud_run', connection: 'gcp_main', region: 'europe-west2' }, releaseHash: release.releaseHash, trafficPercent: 10,
  });
  const service = c.buildNewPlanRequest({ product: 'buydeck', release: { ...release, kind: 'service', name: 'web' }, env: 'stg', target, region: '', trafficPercent: 100 });
  assert.equal(service.service, 'web');
  assert.equal(service.function, undefined, 'a service is named by service only');
  assert.equal(service.target.region, undefined, 'no region is sent when none is given');
  const base = { product: 'buydeck', release, env: 'stg', target, region: '', trafficPercent: 10 };
  assert.throws(() => c.buildNewPlanRequest({ ...base, release: undefined }), /Choose the release/);
  assert.throws(() => c.buildNewPlanRequest({ ...base, env: '' }), /Choose an environment/);
  assert.throws(() => c.buildNewPlanRequest({ ...base, target: undefined }), /Choose a cloud connection/);
  assert.throws(() => c.buildNewPlanRequest({ ...base, target: { ...target, enabled: false, reason: 'Not active yet.' } }), /Not active yet/);
  assert.throws(() => c.buildNewPlanRequest({ ...base, trafficPercent: '101' }), /whole number from 0 to 100/);
});

test('a release is only offered for targets that can run what it is made of', () => {
  const image = { artifact: 'image', kind: 'function' };
  const legacy = { kind: 'function' };
  const bundle = { artifact: 'worker_bundle', kind: 'function' };
  const service = { artifact: 'image', kind: 'service' };
  assert.equal(c.releaseFitsTarget(image, 'cloud_run').enabled, true);
  assert.equal(c.releaseFitsTarget(legacy, 'aws_lambda').enabled, true, 'a release with no artifact is an image');
  assert.equal(c.releaseFitsTarget(bundle, 'cloudflare_workers').enabled, true);
  assert.equal(c.releaseFitsTarget(bundle, undefined).enabled, true, 'nothing is ruled out before a target is chosen');
  assert.match(c.releaseFitsTarget(bundle, 'cloud_run').reason, /runs only on a Cloudflare Workers target/);
  assert.match(c.releaseFitsTarget(image, 'cloudflare_workers').reason, /container image.*publish-worker/);
  assert.match(c.releaseFitsTarget(service, 'cloudflare_workers').reason, /cannot run a service/);
  assert.equal(c.targetKindForProvider('cloudflare'), 'cloudflare_workers');
  const options = c.targetOptions([{ tag: 'cf', display_name: 'CF', provider: 'cloudflare', status: 'active', scopes: ['deploy'], metadata: {} }], caps({ targets: ['cloudflare_workers'] }));
  assert.deepEqual(plain(options.map((o) => [o.connectionTag, o.targetKind, o.enabled])), [['cf', 'cloudflare_workers', true]]);
  const request = { product: 'p', env: 'stg', target: options[0], region: '', trafficPercent: 100 };
  assert.throws(() => c.buildNewPlanRequest({ ...request, release: { ...image, releaseHash: 'sha256:x', product: 'p', name: 'n', version: '1.0.0' } }), /container image/, 'refused before it is sent');
  const ok = c.buildNewPlanRequest({ ...request, release: { ...bundle, releaseHash: 'sha256:x', product: 'p', name: 'n', version: '1.0.0' } });
  assert.equal(ok.target.kind, 'cloudflare_workers');
  assert.equal(ok.target.region, undefined, 'a Worker has no region');
});

test('new plans are only offered where the server reads the cloud itself', () => {
  assert.equal(c.newPlanGate(caps()).enabled, true);
  const off = c.newPlanGate(caps({ observeFromProvider: false }));
  assert.equal(off.enabled, false);
  assert.match(off.reason, /ductape deploy plans create/);
  assert.equal(c.newPlanGate(undefined).enabled, false);
});

test('traffic is a whole number from 0 to 100', () => {
  for (const good of [0, 1, 50, 100, '7', ' 25 ']) assert.equal(c.validateTraffic(good).ok, true, String(good));
  for (const bad of [-1, 101, 1.5, 'abc', '', '1e2', '12.5', '1000']) assert.equal(c.validateTraffic(bad).ok, false, String(bad));
  assert.equal(c.validateTraffic(' 25 ').value, 25);
  assert.deepEqual([...c.TRAFFIC_PRESETS], [0, 5, 10, 25, 50, 100]);
});

test('a traffic move is described, including the ones worth a second look', () => {
  assert.equal(c.describeTrafficChange(100, 100).tone, 'neutral');
  assert.equal(c.describeTrafficChange(100, 0).tone, 'warn');
  assert.match(c.describeTrafficChange(100, 0).text, /Nothing is deleted/);
  assert.match(c.describeTrafficChange(10, 100).text, /last known good/);
  assert.match(c.describeTrafficChange(0, 10).text, /rest keeps going to the last good release/);
});

const deployment = (over = {}) => ({
  id: 'd1', kind: 'function', product: 'buydeck', name: 'api', version: '1.0.0', env: 'prd', target: { kind: 'cloud_run', connection: 'gcp_main' }, resourceName: 'r',
  releaseHash: `sha256:${'a'.repeat(64)}`, lastGoodReleaseHash: `sha256:${'f'.repeat(64)}`, trafficPercent: 50, state: 'active', revision: 3, updatedAt: 'x', ...over,
});

test('what can be planned for a deployment follows the server\'s rules', () => {
  const by = (d, k = caps()) => Object.fromEntries(c.deploymentIntents(d, k).map((i) => [i.intent, i]));
  const active = by(deployment());
  assert.equal(active.traffic.enabled && active.redeploy.enabled && active.rollback.enabled, true);
  const moving = by(deployment({ state: 'promoting' }));
  for (const i of Object.values(moving)) { assert.equal(i.enabled, false); assert.match(i.reason, /promoting.*Wait/); }
  const noEarlier = by(deployment({ lastGoodReleaseHash: undefined }));
  assert.equal(noEarlier.rollback.enabled, false);
  assert.match(noEarlier.rollback.reason, /no earlier release/);
  assert.equal(by(deployment({ lastGoodReleaseHash: `sha256:${'a'.repeat(64)}` })).rollback.enabled, false, 'the same release is not an earlier one');
  const blind = by(deployment(), caps({ observeFromProvider: false }));
  for (const i of Object.values(blind)) { assert.equal(i.enabled, false); assert.match(i.reason, /ductape deploy plans create/); }
});

test('a plan request from a deployment is built and checked', () => {
  const d = deployment();
  assert.deepEqual(plain(c.buildDeploymentPlanRequest(d, 'redeploy')), { intent: 'redeploy' });
  assert.deepEqual(plain(c.buildDeploymentPlanRequest(d, 'rollback')), { intent: 'rollback', releaseHash: `sha256:${'f'.repeat(64)}` });
  assert.deepEqual(plain(c.buildDeploymentPlanRequest(d, 'traffic', '100')), { intent: 'traffic', trafficPercent: 100 });
  assert.throws(() => c.buildDeploymentPlanRequest(d, 'traffic', '50'), /already sends 50%/);
  assert.doesNotThrow(() => c.buildDeploymentPlanRequest(deployment({ state: 'failed' }), 'traffic', '50'));
  assert.throws(() => c.buildDeploymentPlanRequest(d, 'traffic', 'lots'), /whole number/);
  assert.throws(() => c.buildDeploymentPlanRequest(d, 'traffic'), /whole number/);
  assert.throws(() => c.buildDeploymentPlanRequest(deployment({ lastGoodReleaseHash: undefined }), 'rollback'), /no earlier release/);
});

const version = (over = {}) => ({ version: '1.0.0', status: 'available', createdAt: 'x', isLatestAvailable: false, releases: 1, serving: [], ...over });
const live = (over = {}) => ({ deploymentId: 'd', env: 'prd', target: { kind: 'cloud_run', connection: 'gcp_main' }, state: 'active', trafficPercent: 100, releaseHash: 'h', ...over });

test('version actions follow the lifecycle: available, deprecated, retired', () => {
  const a = c.versionControls(version(), caps(), 'owner');
  assert.equal(a.deprecate.enabled, true);
  assert.equal(a.undeprecate.enabled, false);
  assert.equal(a.retire.enabled, false);
  assert.match(a.retire.reason, /Deprecate a version before retiring/);
  const d = c.versionControls(version({ status: 'deprecated' }), caps(), 'owner');
  assert.equal(d.deprecate.enabled, false);
  assert.equal(d.undeprecate.enabled, true);
  assert.equal(d.retire.enabled, true);
  const r = c.versionControls(version({ status: 'retired' }), caps(), 'owner');
  for (const k of [r.deprecate, r.undeprecate, r.retire]) { assert.equal(k.enabled, false); assert.match(k.reason, /retired/); }
});

test('a version cannot be retired while anything of it is serving, and the reason names where', () => {
  const serving = (over) => version({ status: 'deprecated', serving: [live(over)] });
  const blocked = c.versionControls(serving({ state: 'active', trafficPercent: 100 }), caps(), 'owner').retire;
  assert.equal(blocked.enabled, false);
  assert.match(blocked.reason, /prd on gcp_main \(active, 100%\)/);
  assert.equal(c.versionControls(serving({ state: 'promoting', trafficPercent: 0 }), caps(), 'owner').retire.enabled, false, 'in motion counts as serving');
  assert.equal(c.versionControls(serving({ state: 'active', trafficPercent: 0 }), caps(), 'owner').retire.enabled, true, 'active with no traffic is not serving');
  assert.equal(c.versionControls(serving({ state: 'failed', trafficPercent: 100 }), caps(), 'owner').retire.enabled, true);
  assert.equal(c.stillServing({ state: 'rolled_back', trafficPercent: 100 }), false);
});

test('retiring is held to the admin rule and to step-up', () => {
  const deprecated = version({ status: 'deprecated' });
  const strict = caps({ adminOnly: true });
  assert.equal(c.versionControls(deprecated, strict, 'collaborator').retire.enabled, false);
  assert.equal(c.versionControls(deprecated, strict, 'admin').retire.enabled, true);
  const withCode = caps({ stepUp: { mode: 'production', ready: true, method: 'email_code' } });
  assert.equal(c.versionControls(deprecated, withCode, 'owner').retireNeedsCode, true);
  assert.equal(c.versionControls(deprecated, caps(), 'owner').retireNeedsCode, false);
  const broken = caps({ stepUp: { mode: 'all', ready: false, method: 'email_code' } });
  assert.equal(c.versionControls(deprecated, broken, 'owner').retire.enabled, false);
  assert.equal(c.versionControls(version(), broken, 'owner').deprecate.enabled, true, 'deprecating needs no code');
});

test('a deprecation is checked the way the server checks it', () => {
  const siblings = [{ version: '1.0.0', status: 'deprecated' }, { version: '1.1.0', status: 'available' }, { version: '2.0.0', status: 'available' }, { version: '3.0.0', status: 'retired' }, { version: '0.9.0', status: 'available' }];
  const now = Date.parse('2030-01-01T00:00:00Z');
  const build = (input) => c.buildDeprecation('1.0.0', input, siblings, compareVersions, now);
  assert.deepEqual(plain(build({ reason: '  old API  ' })), { reason: 'old API' });
  assert.throws(() => build({ reason: '   ' }), /Say why/);
  assert.throws(() => build({ reason: 'x'.repeat(501) }), /up to 500/);
  assert.throws(() => build({ reason: 'r', sunsetAt: '2029-12-31T00:00:00Z' }), /in the future/);
  assert.throws(() => build({ reason: 'r', sunsetAt: 'soon' }), /in the future/);
  assert.equal(build({ reason: 'r', sunsetAt: '2030-06-01T00:00:00Z' }).sunsetAt, '2030-06-01T00:00:00.000Z');
  assert.equal(build({ reason: 'r', replacementVersion: '2.0.0' }).replacementVersion, '2.0.0');
  assert.throws(() => build({ reason: 'r', replacementVersion: 'two' }), /not a valid version/);
  assert.throws(() => build({ reason: 'r', replacementVersion: '0.9.0' }), /higher version/);
  assert.throws(() => build({ reason: 'r', replacementVersion: '1.0.0' }), /higher version/);
  assert.throws(() => build({ reason: 'r', replacementVersion: '3.0.0' }), /not an available version/);
  assert.throws(() => build({ reason: 'r', replacementVersion: '9.9.9' }), /not an available version/);
  assert.deepEqual(plain(c.replacementChoices('1.0.0', siblings, compareVersions)), ['2.0.0', '1.1.0'], 'available and higher, newest first');
  assert.equal(c.isValidVersion('1.2.3-rc.1'), true);
  assert.equal(c.isValidVersion('1.2'), false);
});

test('version history reads without ids', () => {
  assert.equal(c.describeVersionEvent({ event: 'deprecated', actor: 'human:1', detail: { reason: 'Use v2' }, at: 'x' }), 'Deprecated: Use v2');
  assert.equal(c.describeVersionEvent({ event: 'retired', actor: 'human:1', at: 'x' }), 'Retired');
  assert.equal(c.describeVersionEvent({ event: 'undeprecated', actor: 'a', at: 'x' }), 'Restored to available');
  assert.equal(c.describeVersionEvent({ event: 'odd', actor: 'a', at: 'x' }), 'odd');
  assert.equal(c.describeActor('human:6ad6'), 'a person');
  assert.equal(c.describeActor('agent:6ad6'), 'an agent');
  assert.equal(c.describeActor(undefined), 'unknown');
  assert.equal(c.describeVersionStatus('deprecated').tone, 'warn');
});

test('a policy is stored the way the server stores it, and weakening it is recognised', () => {
  assert.deepEqual(plain(c.normalizePolicy({ requireHumanApproval: true, allowAgentApply: true })), { requireHumanApproval: true, allowAgentApply: false }, 'a required approval means no agent applies');
  assert.deepEqual(plain(c.normalizePolicy({ requireHumanApproval: false, allowAgentApply: true })), { requireHumanApproval: false, allowAgentApply: true });
  const strict = { requireHumanApproval: true, allowAgentApply: false };
  const people = { requireHumanApproval: false, allowAgentApply: false };
  const agents = { requireHumanApproval: false, allowAgentApply: true };
  assert.equal(c.weakensPolicy(strict, people), true);
  assert.equal(c.weakensPolicy(strict, agents), true);
  assert.equal(c.weakensPolicy(people, agents), true);
  assert.equal(c.weakensPolicy(agents, people), false);
  assert.equal(c.weakensPolicy(people, strict), false);
  assert.equal(c.weakensPolicy(strict, { requireHumanApproval: true, allowAgentApply: true }), false, 'normalised first');
  assert.equal(c.samePolicy(strict, { requireHumanApproval: true, allowAgentApply: true }), true);
  assert.equal(c.samePolicy(strict, people), false);
  assert.match(c.describePolicyChange(strict, agents), /no longer need a person's approval.*agent may now apply/);
  assert.equal(c.describePolicyChange(strict, strict), 'No change');
  assert.match(c.describePolicyChange(undefined, strict), /must approve every plan/);
});

test('changing policy is an admin decision that may need a code', () => {
  assert.equal(c.policyControl(caps(), 'collaborator').enabled, true);
  assert.equal(c.policyControl(caps({ adminOnly: true }), 'collaborator').enabled, false);
  assert.equal(c.policyControl(caps({ adminOnly: true }), 'owner').enabled, true);
  assert.equal(c.policyControl(caps({ stepUp: { mode: 'production', ready: true, method: 'email_code' } }), 'owner').needsCode, true);
  assert.equal(c.policyControl(caps({ stepUp: { mode: 'production', ready: false, method: 'email_code' } }), 'owner').enabled, false);
});

test('a build can be stopped only while it is waiting or running', () => {
  assert.equal(c.buildCancelControl('awaiting_upload').enabled, true);
  assert.equal(c.buildCancelControl('building').enabled, true);
  for (const status of ['succeeded', 'failed', 'expired', 'cancelled']) assert.equal(c.buildCancelControl(status).enabled, false, status);
  assert.match(c.buildCancelControl('cancelled').reason, /already stopped/);
});

test('the server\'s explanation and code are kept, and a missing or wrong code is marked', () => {
  const failure = (status, code, errors) => ({ response: { status, data: { errors, meta: { code } } } });
  assert.deepEqual(plain(c.controlError(failure(409, 'VERSION_IN_USE', 'Version 1.0.0 is still serving'))), { code: 'VERSION_IN_USE', stepUpRequired: false, codeInvalid: false, message: 'Version 1.0.0 is still serving' });
  assert.equal(c.controlError(failure(403, 'STEP_UP_REQUIRED', 'needs a code')).stepUpRequired, true);
  assert.equal(c.controlError(failure(403, 'STEP_UP_CODE_INVALID', 'not right')).codeInvalid, true);
  assert.equal(c.controlError(failure(400, 'INVALID_INPUT', ['a', 'b'])).message, 'a; b');
  assert.equal(c.controlError(new Error('Network Error')).message, 'Network Error');
  assert.equal(c.controlError({}, 'fallback').message, 'fallback');
});

const fargateMeta = { fargate_cluster: 'ductape', fargate_listener_arn: 'l', fargate_base_domain: 'deploy.example.com', fargate_vpc_id: 'v', fargate_subnets: ['s'], fargate_security_groups: ['g'], fargate_task_role_arn: 't', fargate_execution_role_arn: 'e', fargate_log_group: '/ecs/ductape' };

test('an AWS connection with the Fargate details offers Fargate as a second place to deploy, and one without them offers only Lambda', () => {
  const aws = (metadata) => connection({ tag: 'aws_main', display_name: 'AWS', provider: 'aws', metadata });
  const lambdaOnly = c.targetOptions([aws({ default_region: 'eu-west-2' })], caps());
  assert.deepEqual(plain(lambdaOnly.map((o) => o.targetKind)), ['aws_lambda'], 'nothing configured is not an error and adds no option');
  const both = c.targetOptions([aws({ default_region: 'eu-west-2', ...fargateMeta })], caps({ targets: ['aws_lambda', 'aws_fargate'] }));
  assert.deepEqual(plain(both.map((o) => o.targetKind).sort()), ['aws_fargate', 'aws_lambda']);
  assert.equal(new Set(both.map((o) => o.key)).size, 2, 'each option has its own key, though they share a connection');
  assert.ok(both.every((o) => o.connectionTag === 'aws_main' && o.enabled));
  assert.match(both.find((o) => o.targetKind === 'aws_fargate').label, / - Fargate$/);
  assert.equal(both.find((o) => o.targetKind === 'aws_fargate').defaultRegion, 'eu-west-2');
  const partial = c.targetOptions([aws({ fargate_cluster: 'ductape', fargate_vpc_id: 'v' })], caps({ targets: ['aws_lambda', 'aws_fargate'] })).find((o) => o.targetKind === 'aws_fargate');
  assert.equal(partial.enabled, false);
  assert.match(partial.reason, /only partly set up. Missing: listener arn, base domain, subnets/);
  const old = c.targetOptions([aws({ ...fargateMeta })], caps({ targets: ['aws_lambda'] })).find((o) => o.targetKind === 'aws_fargate');
  assert.match(old.reason, /cannot deploy to aws_fargate yet/);
  const notReady = c.targetOptions([{ ...aws(fargateMeta), status: 'pending' }], caps({ targets: ['aws_lambda', 'aws_fargate'] })).filter((o) => o.targetKind === 'aws_fargate');
  assert.match(notReady[0].reason, /Not active/, 'the connection\'s own state comes first');
  assert.deepEqual(plain(c.targetOptions([connection({ metadata: fargateMeta })], caps()).map((o) => o.targetKind)), ['cloud_run'], 'only AWS offers Fargate');
});

test('a bundle never fits Fargate, and a container does', () => {
  assert.equal(c.releaseFitsTarget({ artifact: 'worker_bundle', kind: 'function' }, 'aws_fargate').enabled, false);
  assert.equal(c.releaseFitsTarget({ artifact: 'image', kind: 'service' }, 'aws_fargate').enabled, true, 'a service runs on Fargate');
  assert.equal(c.releaseFitsTarget({ kind: 'function' }, 'aws_fargate').enabled, true);
});

test('the keys that make a connection ready for Fargate are the same as the form\'s fields', () => {
  const form = fs.readFileSync(new URL('../src/utils/deployConnection.ts', import.meta.url), 'utf8');
  const fieldKeys = [...form.matchAll(/\{ key: '(fargate_[a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual(plain(c.FARGATE_CONNECTION_KEYS), fieldKeys);
  assert.deepEqual(plain(c.fargateSetup({})), { configured: false, missing: [] });
  assert.deepEqual(plain(c.fargateSetup(fargateMeta)), { configured: true, missing: [] });
});

const expressMeta = { fargate_cluster: 'ductape', fargate_subnets: ['s'], fargate_task_role_arn: 't', fargate_execution_role_arn: 'e', fargate_log_group: '/ecs/ductape', express_infrastructure_role_arn: 'i' };

test('an AWS connection set up for ECS Express offers it as its own target, labelled for what it cannot guarantee', () => {
  const aws = (metadata) => connection({ tag: 'aws_main', display_name: 'AWS', provider: 'aws', metadata });
  const caps2 = caps({ targets: ['aws_lambda', 'aws_fargate', 'aws_ecs_express'] });
  assert.deepEqual(plain(c.targetOptions([aws({})], caps2).map((o) => o.targetKind)), ['aws_lambda'], 'never set up for Express adds nothing');
  const options = c.targetOptions([aws(expressMeta)], caps2);
  assert.deepEqual(plain(options.map((o) => o.targetKind).sort()), ['aws_ecs_express', 'aws_lambda'], 'Express alone has no listener or domain, so no noisy half-set-up Fargate option');
  const express = options.find((o) => o.targetKind === 'aws_ecs_express');
  assert.equal(express.enabled, true);
  assert.match(express.label, /ECS Express \(checked after traffic starts\)/, 'the label says what is different');
  assert.equal(express.key, 'aws_main::aws_ecs_express');
  const both = c.targetOptions([aws({ ...expressMeta, ...fargateMeta })], caps2);
  assert.deepEqual(plain(both.map((o) => o.targetKind).sort()), ['aws_ecs_express', 'aws_fargate', 'aws_lambda']);
  const partial = c.targetOptions([aws({ fargate_cluster: 'ductape', express_infrastructure_role_arn: 'i' })], caps2).find((o) => o.targetKind === 'aws_ecs_express');
  assert.equal(partial.enabled, false);
  assert.match(partial.reason, /only partly set up. Missing: subnets, task role arn, execution role arn, log group/);
  const oldServer = c.targetOptions([aws(expressMeta)], caps({ targets: ['aws_lambda'] })).find((o) => o.targetKind === 'aws_ecs_express');
  assert.match(oldServer.reason, /cannot deploy to aws_ecs_express yet/);
  assert.deepEqual(plain(c.expressSetup({})), { configured: false, missing: [] });
  assert.deepEqual(plain(c.expressSetup(expressMeta)), { configured: true, missing: [] });
});

test('a plan to ECS Express is refused in the dialog unless it sends all the traffic', () => {
  const release = { releaseHash: `sha256:${'c'.repeat(64)}`, kind: 'function', product: 'buydeck', name: 'api', version: '1.2.0' };
  const target = c.targetOptions([connection({ tag: 'aws_main', provider: 'aws', metadata: expressMeta })], caps({ targets: ['aws_ecs_express'] })).find((o) => o.targetKind === 'aws_ecs_express');
  assert.throws(() => c.buildNewPlanRequest({ product: 'buydeck', release, env: 'prd', target, region: 'eu-west-2', trafficPercent: 10 }), /cannot split traffic/);
  const request = c.buildNewPlanRequest({ product: 'buydeck', release, env: 'prd', target, region: 'eu-west-2', trafficPercent: 100 });
  assert.equal(request.target.kind, 'aws_ecs_express');
  assert.equal(request.trafficPercent, 100);
});

test('the keys that make a connection ready for Express are the same as the form\'s field', () => {
  const form = fs.readFileSync(new URL('../src/utils/deployConnection.ts', import.meta.url), 'utf8');
  assert.ok(form.includes("key: 'express_infrastructure_role_arn'"));
  assert.ok(c.EXPRESS_CONNECTION_KEYS.includes('express_infrastructure_role_arn'));
  for (const key of c.EXPRESS_CONNECTION_KEYS.filter((k) => k.startsWith('fargate_'))) assert.ok(c.FARGATE_CONNECTION_KEYS.includes(key), `${key} is a Fargate field too`);
});
