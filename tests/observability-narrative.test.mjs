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
  vm.runInNewContext(code, { exports, Number });
  return exports;
}

const { describeStatus } = load('../src/utils/observabilityNarrative.ts');

const base = { total: 0, failures: 0, errorRatePercent: 0, unhealthyChecks: 0, totalChecks: 0, rangeLabel: '24 hours' };

test('no activity reads as neutral and says what was searched', () => {
  const result = describeStatus(base);
  assert.equal(result.tone, 'neutral');
  assert.equal(result.title, 'No activity yet');
  assert.match(result.detail, /last 24 hours/);
});

test('clean runs are good and mention healthy checks', () => {
  const result = describeStatus({ ...base, total: 1200, totalChecks: 3 });
  assert.equal(result.tone, 'good');
  assert.equal(result.title, 'Running cleanly');
  assert.match(result.detail, /1,200 operations/);
  assert.match(result.detail, /All 3 health checks are available/);
});

test('a single operation and a single check use singular wording', () => {
  const result = describeStatus({ ...base, total: 1, totalChecks: 1 });
  assert.match(result.detail, /1 operation in/);
  assert.match(result.detail, /The health check is available/);
});

test('small failure rates warn and name the worst operation', () => {
  const result = describeStatus({
    ...base,
    total: 200,
    failures: 4,
    errorRatePercent: 2,
    topFailing: { operation: 'charge-card', failures: 3 },
  });
  assert.equal(result.tone, 'warn');
  assert.equal(result.title, '4 of 200 operations failed (2%)');
  assert.match(result.detail, /Most failures: charge-card \(3\)/);
});

test('high failure rates are bad', () => {
  const result = describeStatus({ ...base, total: 100, failures: 30, errorRatePercent: 30 });
  assert.equal(result.tone, 'bad');
  assert.equal(result.title, '30 of 100 operations failed (30%)');
});

test('a failing health check downgrades otherwise clean runs', () => {
  const result = describeStatus({ ...base, total: 50, unhealthyChecks: 1, totalChecks: 4 });
  assert.equal(result.tone, 'warn');
  assert.equal(result.title, 'Operations are fine, but a health check is failing');
  assert.match(result.detail, /1 of 4 health checks are unavailable/);
});
