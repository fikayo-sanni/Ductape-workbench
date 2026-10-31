import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Math, Number, String, Set, Array, Object, Error, Map, parseInt: Number.parseInt }, {});
  return exports;
}
const { rolloutView } = load('../src/utils/deployments.ts');
const plain = (v) => JSON.parse(JSON.stringify(v));

const base = {
  id: 'd1', kind: 'function', product: 'shop', name: 'payments', version: '1.4.0', env: 'prd',
  target: { kind: 'cloud_run', connection: 'gcp-main', region: 'europe-west2' }, resourceName: 'payments-prd',
  releaseHash: 'rel-new', lastGoodReleaseHash: 'rel-old', trafficPercent: 10, state: 'active', revision: 7, updatedAt: '2026-10-31T10:00:00Z',
  currentRevision: 'payments-00007', lastGoodRevision: 'payments-00006', candidateUrl: 'https://payments-00007.run.app',
};
// The journal as the Deploy reconciler writes it for a Cloud Run release moved to 10%.
const journal = [
  { seq: 1, state: 'provisioning', step: 'provisioning_started', at: '2026-10-31T09:50:00Z' },
  { seq: 2, state: 'verifying', step: 'provisioned', at: '2026-10-31T09:52:00Z', observed: { revision: 'payments-00007', previousRevision: 'payments-00006' } },
  { seq: 3, state: 'promoting', step: 'verified', at: '2026-10-31T09:53:00Z', observed: { attempts: 2, checks: [{ path: '/healthz', status: 200 }, { path: '/ready', status: 204 }] } },
  { seq: 4, state: 'active', step: 'promoted_partially', at: '2026-10-31T09:54:00Z', observed: { requestedTrafficPercent: 10, traffic: [{ revision: 'payments-00007', percent: 10 }, { revision: 'payments-00006', percent: 90 }] } },
];

test('a release taking part of the traffic is shown beside the last good one', () => {
  assert.deepEqual(plain(rolloutView(base, journal)), {
    moving: false,
    candidate: {
      release: 'rel-new', revision: 'payments-00007', trafficPercent: 10, observedPercent: 10, url: 'https://payments-00007.run.app',
      since: '2026-10-31T09:54:00Z', verification: { at: '2026-10-31T09:53:00Z', attempts: 2, passed: 2, total: 2 },
    },
    stable: { release: 'rel-old', revision: 'payments-00006', trafficPercent: 90, observedPercent: 90 },
  });
});

test('a failed check and a split the cloud reports differently are both shown', () => {
  const j = [...journal.slice(0, 2),
    { seq: 3, state: 'promoting', step: 'verified', at: 't3', observed: { attempts: 3, checks: [{ path: '/healthz', status: 200 }, { path: '/ready', status: 503 }] } },
    { seq: 4, state: 'active', step: 'promoted_partially', at: 't4', observed: { traffic: [{ revision: 'payments-00007', percent: 5 }, { revision: 'payments-00006', percent: 95 }] } }];
  const v = rolloutView(base, j);
  assert.deepEqual(plain(v.candidate.verification), { at: 't3', attempts: 3, passed: 1, total: 2 });
  assert.equal(v.candidate.observedPercent, 5);
  assert.equal(v.stable.observedPercent, 95);
});

test('a function verification (one call) and a check made after traffic moved count too', () => {
  const j = [{ seq: 1, state: 'active', step: 'promoted_partially', at: 't1', observed: { verifiedAfterTraffic: { url: 'x', status: 200, attempts: 1, operation: 'charge' } } }];
  assert.deepEqual(plain(rolloutView(base, j).candidate.verification), { at: 't1', attempts: 1, passed: 1, total: 1, status: 200 });
});

test('while it is being checked, the last good release still has all the traffic', () => {
  const v = rolloutView({ ...base, state: 'verifying', trafficPercent: 25 }, journal.slice(0, 2));
  assert.equal(v.moving, true);
  assert.equal(v.candidate.trafficPercent, 0);
  assert.equal(v.stable.trafficPercent, 100);
  assert.equal(v.candidate.verification, undefined);
});

test('no rollout: a first release, one serving everything, or nothing yet', () => {
  assert.equal(rolloutView({ ...base, lastGoodReleaseHash: undefined }, journal), undefined);
  assert.equal(rolloutView({ ...base, lastGoodReleaseHash: 'rel-new' }, journal), undefined);
  assert.equal(rolloutView({ ...base, trafficPercent: 100 }, journal), undefined);
  assert.equal(rolloutView({ ...base, trafficPercent: 0 }, journal), undefined);
});

test('Lambda and Cloudflare journals name the split as "live" with weights', () => {
  const j = [{ seq: 1, state: 'active', step: 'promoted_partially', at: 't', observed: { live: [{ version: 'payments-00007', weight: 20 }] } }];
  assert.equal(rolloutView(base, j).candidate.observedPercent, 20);
});
