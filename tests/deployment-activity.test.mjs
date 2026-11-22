import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const deployments = load('../src/utils/deployments.ts');
const { deploymentActivity } = load('../src/utils/deploymentActivity.ts', { './deployments': deployments });
const now = Date.parse('2026-11-22T12:00:00Z');
const plan = (stage, expiresAt = '2026-11-22T13:00:00Z') => ({ stage, expiresAt });

test('pending indicators include approval and apply steps but exclude finished, blocked and expired plans', () => {
  const stats = deploymentActivity([], ['pending_approval', 'approved', 'ready', 'blocked', 'applied', 'expired'].map((stage) => plan(stage)).concat(plan('pending_approval', '2026-11-22T11:59:00Z')), now);
  assert.equal(stats.pendingPlans, 3);
  assert.equal(stats.needsApproval, 1);
  assert.equal(stats.readyToApply, 2);
});

test('every in-flight rollout phase is visible, while active and failed releases do not spin', () => {
  const phases = ['planned', 'building', 'built', 'provisioning', 'verifying', 'promoting', 'active', 'failed', 'rolled_back'];
  assert.equal(deploymentActivity(phases.map((state) => ({ state })), [], now).inProgress, 6);
});

test('indicators move from pending plan to running rollout to completion without accumulating stale counts', () => {
  assert.equal(deploymentActivity([], [plan('pending_approval')], now).pendingPlans, 1);
  const rolling = deploymentActivity([{ state: 'provisioning' }], [plan('applied')], now);
  assert.equal(rolling.pendingPlans, 0);
  assert.equal(rolling.inProgress, 1);
  const finished = deploymentActivity([{ state: 'active' }], [plan('applied')], now);
  assert.equal(finished.pendingPlans, 0);
  assert.equal(finished.inProgress, 0);
});
