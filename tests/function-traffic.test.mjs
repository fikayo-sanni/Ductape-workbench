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

const { trafficFor, formatThroughput, formatLatencyMs } = load('../src/utils/functionTraffic.ts');
const plain = value => JSON.parse(JSON.stringify(value));
const HOUR = 3_600_000;

test('trafficFor reads only the matching function and derives rate from the window', () => {
  const traffic = plain(trafficFor([
    { type: 'functions', operation: 'send-otp', calls: 120, failures: 6, averageLatencyMs: 200, p95LatencyMs: 900, maxLatencyMs: 2000 },
    { type: 'functions', operation: 'other', calls: 5000, failures: 0, averageLatencyMs: 1, maxLatencyMs: 2 },
    { type: 'feature', operation: 'send-otp', calls: 9, failures: 9, averageLatencyMs: 5 },
  ], 'send-otp', HOUR));
  assert.equal(traffic.calls, 120);
  assert.equal(traffic.failures, 6);
  assert.equal(traffic.errorRatePercent, 5);
  assert.equal(traffic.averageLatencyMs, 200);
  assert.equal(traffic.p95LatencyMs, 900);
  assert.equal(traffic.maxLatencyMs, 2000);
  assert.equal(traffic.callsPerMinute, 2);
});

test('trafficFor returns null with no recorded calls and tolerates a missing p95 or latency', () => {
  assert.equal(trafficFor([], 'x', HOUR), null);
  assert.equal(trafficFor([{ type: 'functions', operation: 'x', calls: 0 }], 'x', HOUR), null);
  const traffic = plain(trafficFor([{ type: 'functions', operation: 'x', calls: 3, failures: 0, averageLatencyMs: null }], 'x', HOUR));
  assert.equal(traffic.averageLatencyMs, null);
  assert.equal(traffic.p95LatencyMs, null);
  assert.equal(traffic.maxLatencyMs, null);
});

test('trafficFor weights the average across rows by call count', () => {
  const traffic = plain(trafficFor([
    { type: 'functions', operation: 'x', calls: 1, failures: 0, averageLatencyMs: 100 },
    { type: 'Functions', operation: 'x', calls: 3, failures: 0, averageLatencyMs: 200 },
  ], 'x', HOUR));
  assert.equal(traffic.averageLatencyMs, 175);
});

test('formatThroughput picks a unit that keeps small rates readable', () => {
  assert.equal(formatThroughput(120), '120 / min');
  assert.equal(formatThroughput(2.5), '2.5 / min');
  assert.equal(formatThroughput(0.05), '3.0 / hour');
  assert.equal(formatThroughput(0.0005), '0.7 / day');
});

test('formatLatencyMs', () => {
  assert.equal(formatLatencyMs(null), '-');
  assert.equal(formatLatencyMs(0.2), '<1 ms');
  assert.equal(formatLatencyMs(340.4), '340 ms');
  assert.equal(formatLatencyMs(1500), '1.50 s');
});
