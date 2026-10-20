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
  vm.runInNewContext(code, { exports, Math, Number, String }, {});
  return exports;
}

const { DEFAULT_STRATEGY_FORM, validateStrategy, strategyFields, describeStrategy, healthView } = load('../src/utils/healthcheckStrategy.ts');
const plain = value => JSON.parse(JSON.stringify(value));

test('a new check defaults to reactive with a 15 minute baseline and a 1 minute recheck ceiling', () => {
  assert.deepEqual(plain(DEFAULT_STRATEGY_FORM), { strategy: 'reactive', heartbeatMinutes: '15', recheckSeconds: '60' });
  assert.deepEqual(plain(strategyFields(DEFAULT_STRATEGY_FORM)), { mode: 'reactive', heartbeat: 900000, recovery: { max: 60000 } });
});

test('an interval check saves no extra fields', () => {
  assert.equal(strategyFields({ ...DEFAULT_STRATEGY_FORM, strategy: 'interval' }), null);
  assert.equal(validateStrategy({ ...DEFAULT_STRATEGY_FORM, strategy: 'interval', heartbeatMinutes: 'x' }), undefined);
});

test('never checking on a baseline is allowed and saves a zero heartbeat', () => {
  const form = { ...DEFAULT_STRATEGY_FORM, heartbeatMinutes: '0' };
  assert.equal(validateStrategy(form), undefined);
  assert.equal(strategyFields(form).heartbeat, 0);
});

test('validateStrategy rejects blanks and nonsense', () => {
  assert.match(validateStrategy({ ...DEFAULT_STRATEGY_FORM, heartbeatMinutes: '' }), /while healthy/);
  assert.match(validateStrategy({ ...DEFAULT_STRATEGY_FORM, heartbeatMinutes: '-5' }), /while healthy/);
  assert.match(validateStrategy({ ...DEFAULT_STRATEGY_FORM, recheckSeconds: '0' }), /down/);
  assert.match(validateStrategy({ ...DEFAULT_STRATEGY_FORM, recheckSeconds: 'abc' }), /down/);
});

test('describeStrategy explains both modes', () => {
  assert.equal(describeStrategy({}, 'every 2 minutes'), 'Checks on a schedule, every 2 minutes.');
  assert.match(describeStrategy({ mode: 'reactive' }), /Assumed healthy until something fails: a baseline check every 15 minutes, then rechecks at least every 1 minute/);
  assert.match(describeStrategy({ mode: 'reactive', heartbeat: 0, recovery: { max: 30000 } }), /no baseline check, then rechecks at least every 30 seconds/);
});

test('health is assumed: a check that never ran is healthy, only unavailable is unhealthy', () => {
  assert.deepEqual(plain(healthView(undefined)), { tone: 'good', label: 'Healthy', note: 'No failures seen' });
  assert.deepEqual(plain(healthView({ status: 'unknown' })), { tone: 'good', label: 'Healthy', note: 'No failures seen' });
  assert.deepEqual(plain(healthView({ status: 'available', lastChecked: '2026-10-18T10:00:00Z' })), { tone: 'good', label: 'Healthy' });
  assert.equal(healthView({ status: 'unavailable' }).label, 'Unhealthy');
  assert.equal(healthView({ status: 'unavailable', monitor_state: 'probing' }).label, 'Down');
  assert.equal(healthView({ status: 'available', monitor_state: 'probing' }).label, 'Recovering');
});
