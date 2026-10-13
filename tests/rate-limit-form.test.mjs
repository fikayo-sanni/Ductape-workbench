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
  vm.runInNewContext(code, { exports, Number, String, Set, Map, Object, JSON });
  return exports;
}

const form = load('../src/utils/rateLimitForm.ts');
// The module runs in a separate vm realm; copy into this realm before deep comparison.
const plain = value => JSON.parse(JSON.stringify(value));
const envs = ['prd', 'snd'];

const valid = (over = {}) => ({ ...form.emptyForm(envs), name: 'Login', tag: 'login', keys: ['user_id'], ...over });

test('slugify and nextVersionTag', () => {
  assert.equal(form.slugify('  Login Attempts! '), 'login-attempts');
  assert.equal(form.nextVersionTag('login', ['login']), 'login-v2');
  assert.equal(form.nextVersionTag('login-v2', ['login', 'login-v2']), 'login-v3');
  assert.equal(form.nextVersionTag('login', ['login', 'login-v2', 'login-v3']), 'login-v4');
});

test('splitWindow and describeWindow', () => {
  assert.deepEqual(plain(form.splitWindow('15m')), { amount: '15', unit: 'm' });
  assert.deepEqual(plain(form.splitWindow('2000ms')), { amount: '2', unit: 's' });
  assert.deepEqual(plain(form.splitWindow('nope')), { amount: '', unit: 'm' });
  assert.equal(form.describeWindow('1m'), '1 minute');
  assert.equal(form.describeWindow('30s'), '30 seconds');
  assert.equal(form.describeWindow('250ms'), '250 ms');
  assert.equal(form.describePolicy({ limit: 100, window: '1m', key: ['user_id', 'ip'] }), '100 requests per user_id + ip every 1 minute');
  assert.equal(form.describePolicy({}), 'Limit not recorded');
});

test('a complete form validates and builds the platform payload', () => {
  const f = valid({ description: '  Throttle sign-in ', limit: '5', windowAmount: '15', windowUnit: 'm', strategy: 'sliding', failurePolicy: 'fail_open' });
  assert.equal(Object.keys(form.validateForm(f, [])).length, 0);
  assert.deepEqual(plain(form.buildPayload(f)), {
    tag: 'login', name: 'Login', description: 'Throttle sign-in', key: ['user_id'],
    limit: 5, window: '15m', strategy: 'sliding', failurePolicy: 'fail_open',
  });
});

test('field errors are specific', () => {
  const errors = form.validateForm(valid({ name: '', tag: 'bad tag', keys: [], limit: '0', windowAmount: '2', windowUnit: 'd' }), []);
  assert.match(errors.name, /name/);
  assert.match(errors.tag, /letters, numbers/);
  assert.match(errors.keys, /at least one field/i);
  assert.match(errors.limit, /between 1 and 10,000/);
  assert.match(errors.window, /longer than 1 day/);

  assert.match(form.validateForm(valid({ limit: '1.5' }), []).limit, /whole number/);
  assert.match(form.validateForm(valid({ windowAmount: '0' }), []).window, /at least 1/);
  assert.match(form.validateForm(valid({ tag: 'login' }), ['login']).tag, /already used.*permanent/);
  assert.equal(form.validateForm(valid({ windowAmount: '24', windowUnit: 'h' }), []).window, undefined);
  assert.match(form.validateForm(valid({ keys: Array.from({ length: 9 }, (_, i) => `k${i}`) }), []).keys, /At most 8/);
});

test('environment overrides are included only when enabled and filled in', () => {
  const f = valid();
  f.overrides = f.overrides.map(o => (o.slug === 'prd' ? { ...o, enabled: true, limit: '500', windowAmount: '10', windowUnit: 's', strategy: 'sliding' } : o));
  assert.equal(Object.keys(form.validateForm(f, [])).length, 0);
  assert.deepEqual(plain(form.buildPayload(f).envs), [{ slug: 'prd', limit: 500, window: '10s', strategy: 'sliding' }]);

  const empty = valid();
  empty.overrides = empty.overrides.map(o => (o.slug === 'snd' ? { ...o, enabled: true } : o));
  assert.match(form.validateForm(empty, []).overrides.snd, /at least one setting/);

  const bad = valid();
  bad.overrides = bad.overrides.map(o => (o.slug === 'snd' ? { ...o, enabled: true, limit: '99999' } : o));
  assert.match(form.validateForm(bad, []).overrides.snd, /^Limit: /);
  assert.equal('envs' in form.buildPayload(valid()), false);
});

test('a new version is pre-filled from the old policy and points back at it', () => {
  const policy = {
    tag: 'login', name: 'Login', description: 'Throttle sign-in', key: ['user_id'], limit: 5, window: '1m',
    strategy: 'fixed', failurePolicy: 'fail_closed', envs: [{ slug: 'prd', limit: 50, window: '30s' }],
  };
  const f = form.formFromPolicy(policy, envs, ['login']);
  assert.equal(f.tag, 'login-v2');
  assert.equal(f.supersedes, 'login');
  assert.equal(f.limit, '5');
  assert.equal(f.windowAmount, '1');
  assert.equal(f.windowUnit, 'm');
  assert.deepEqual(plain(f.keys), ['user_id']);
  const prd = f.overrides.find(o => o.slug === 'prd');
  assert.equal(prd.enabled, true);
  assert.equal(prd.limit, '50');
  assert.equal(prd.windowAmount, '30');
  assert.equal(f.overrides.find(o => o.slug === 'snd').enabled, false);
  assert.equal(form.buildPayload(f).supersedes, 'login');
  // The name equal to the tag is treated as "no custom name" so the user is asked for one.
  assert.equal(form.formFromPolicy({ ...policy, name: 'login' }, envs, ['login']).name, '');
});
