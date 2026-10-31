import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({}), Math, Number, String, Array, Object, Date, JSON }, {});
  return exports;
}
const u = load('../src/utils/usage.ts');
const plain = (v) => JSON.parse(JSON.stringify(v));

test('bytes read as people read them', () => {
  assert.equal(u.formatBytes(0), '0 B');
  assert.equal(u.formatBytes(-5), '0 B');
  assert.equal(u.formatBytes(812), '812 B');
  assert.equal(u.formatBytes(1024), '1 KB');
  assert.equal(u.formatBytes(4300), '4.2 KB');
  assert.equal(u.formatBytes(13 * 1024 * 1024), '13 MB');
  assert.equal(u.formatBytes(1.06 * 1024 ** 3), '1.06 GB');
  assert.equal(u.formatBytes(5 * 1024 ** 5), '5120 TB');
});

test('the period says where it comes from', () => {
  assert.deepEqual(plain(u.describePeriod({ from: '2026-10-01', to: '2026-10-31', basis: 'calendar_month' })), { range: '1 Oct to 31 Oct 2026', basis: 'This month' });
  assert.deepEqual(plain(u.describePeriod({ from: '2026-12-15', to: '2027-01-14', basis: 'billing_period' })), { range: '15 Dec 2026 to 14 Jan 2027', basis: 'This billing period' });
  assert.equal(u.describePeriod({ from: '2026-10-01', to: '2026-10-02', basis: 'requested' }).basis, 'Selected days');
});

test('top sources carry their share, and logs with no project are named', () => {
  const usage = {
    total: { bytes: 1000, logs: 10 },
    byProject: [
      { product_tag: 'shop', env: 'prd', bytes: 700, logs: 7 },
      { product_tag: null, env: null, bytes: 300, logs: 3 },
    ],
  };
  assert.deepEqual(plain(u.topSources(usage)), [
    { label: 'shop / prd', bytes: 700, logs: 7, share: 70 },
    { label: 'No project', bytes: 300, logs: 3, share: 30 },
  ]);
  assert.equal(u.topSources({ total: { bytes: 0, logs: 0 }, byProject: [{ product_tag: 'a', env: null, bytes: 0, logs: 0 }] })[0].share, 0);
  assert.equal(u.topSources({ total: { bytes: 6, logs: 6 }, byProject: Array.from({ length: 8 }, (_, i) => ({ product_tag: `p${i}`, env: null, bytes: 1, logs: 1 })) }).length, 5);
});
