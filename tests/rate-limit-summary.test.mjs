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
  vm.runInNewContext(code, { exports, Date, Map, Set, Number, String, JSON });
  return exports;
}

const { decisionDetails, summarizeDecisions } = load('../src/utils/rateLimitSummary.ts');

// The module runs in a separate vm realm; copy into this realm before deep comparison.
const plain = value => JSON.parse(JSON.stringify(value));

test('decisionDetails reads JSON text, plain objects and falls back to the row action', () => {
  assert.deepEqual(
    plain(decisionDetails({ data: '{"outcome":"rejected","remaining":0,"limit":100,"latency":4}' })),
    { outcome: 'rejected', remaining: 0, limit: 100, latency: 4 },
  );
  assert.equal(decisionDetails({ data: { outcome: 'allowed', remaining: 9, limit: 10 }, latency: 2 }).latency, 2);
  assert.equal(decisionDetails({ data: 'not json', action: 'bypassed' }).outcome, 'bypassed');
  assert.equal(decisionDetails({ status: 'success' }).outcome, 'allowed');
  assert.equal(decisionDetails({ status: 'fail' }).outcome, 'rejected');
  assert.equal(decisionDetails({ data: { remaining: null } }).remaining, undefined);
});

test('summarizeDecisions groups by policy and orders the noisiest first', () => {
  const rows = [
    { parent_tag: 'login', env: 'prd', timestamp: '2026-10-01T10:00:00Z', data: { outcome: 'allowed', limit: 5 } },
    { parent_tag: 'login', env: 'prd', timestamp: '2026-10-01T10:05:00Z', data: { outcome: 'rejected', limit: 5 } },
    { parent_tag: 'login', env: 'snd', timestamp: '2026-10-01T09:00:00Z', data: { outcome: 'rejected', limit: 5 } },
    { parent_tag: 'search', env: 'prd', timestamp: '2026-10-02T10:00:00Z', data: { outcome: 'allowed', limit: 50 } },
    { parent_tag: 'search', env: 'prd', timestamp: '2026-10-02T10:01:00Z', data: { outcome: 'bypassed' } },
  ];
  const summary = summarizeDecisions(rows);

  assert.equal(summary.total, 5);
  assert.equal(summary.allowed, 2);
  assert.equal(summary.rejected, 2);
  assert.equal(summary.other, 1);
  assert.deepEqual(plain(summary.policies.map(p => p.tag)), ['login', 'search']);

  const login = summary.policies[0];
  assert.equal(login.total, 3);
  assert.equal(login.rejected, 2);
  assert.equal(login.limit, 5);
  assert.deepEqual(plain(login.envs), ['prd', 'snd']);
  assert.equal(login.lastAt, new Date('2026-10-01T10:05:00Z').getTime());
});

test('summarizeDecisions copes with an empty batch', () => {
  const summary = summarizeDecisions([]);
  assert.equal(summary.total, 0);
  assert.equal(summary.policies.length, 0);
});

const { mergePolicies } = load('../src/utils/rateLimitSummary.ts');

test('mergePolicies lists stored policies first, then code-defined ones, and links versions', () => {
  const summaries = summarizeDecisions([
    { parent_tag: 'login', env: 'prd', timestamp: '2026-10-01T10:00:00Z', data: { outcome: 'allowed', limit: 5 } },
    { parent_tag: 'in-code', env: 'prd', timestamp: '2026-10-01T10:00:00Z', data: { outcome: 'allowed', limit: 9 } },
    { parent_tag: 'removed', env: 'prd', timestamp: '2026-10-01T10:00:00Z', data: { outcome: 'allowed' } },
  ]).policies;
  const views = plain(mergePolicies(
    [
      { tag: 'login-v2', supersedes: 'login', limit: 10 },
      { tag: 'login', limit: 5 },
      { tag: 'removed', deleted: true },
      { tag: 'idle', limit: 1 },
    ],
    summaries,
  ));

  assert.deepEqual(views.map(view => [view.tag, view.source]), [
    ['idle', 'workbench'], ['login', 'workbench'], ['login-v2', 'workbench'], ['in-code', 'code'],
  ]);
  assert.equal(views.find(view => view.tag === 'login').supersededBy, 'login-v2');
  assert.equal(views.find(view => view.tag === 'login').stats.total, 1);
  assert.equal(views.find(view => view.tag === 'idle').stats, undefined);
  assert.equal(views.find(view => view.tag === 'removed'), undefined);
});
