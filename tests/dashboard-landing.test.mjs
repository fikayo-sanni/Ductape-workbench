import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports }, {});
  return exports;
}
const { landingKey, shouldOpenDashboard } = load('../src/utils/dashboardLanding.ts');

test('the dashboard opens for a person and workspace, and again when either changes', () => {
  const a = landingKey('u1', 'w1');
  assert.equal(a, 'u1:w1');
  assert.equal(shouldOpenDashboard(null, a, true), true, 'on opening, or on a fresh login');
  assert.equal(shouldOpenDashboard(a, a, true), false, 'not again for the same person and workspace, however often the page renders');
  assert.equal(shouldOpenDashboard(a, landingKey('u1', 'w2'), true), true, 'a switch of workspace lands on the new workspace\'s dashboard');
  assert.equal(shouldOpenDashboard(a, landingKey('u2', 'w1'), true), true, 'a login as someone else lands too');
});

test('nothing opens before the saved tabs have loaded, or when nobody is signed in', () => {
  assert.equal(shouldOpenDashboard(null, landingKey('u1', 'w1'), false), false, 'the saved tabs would replace it');
  assert.equal(landingKey(null, 'w1'), null, 'not signed in');
  assert.equal(landingKey('u1', null), null, 'no workspace yet');
  assert.equal(landingKey('', 'w1'), null);
  assert.equal(shouldOpenDashboard(null, null, true), false);
});

test('signing out and in again lands again: a null key resets what was shown', () => {
  let shownFor = null;
  const step = (key, hydrated = true) => { if (key === null) { shownFor = null; return false; } if (!shouldOpenDashboard(shownFor, key, hydrated)) return false; shownFor = key; return true; };
  assert.deepEqual([step('u1:w1'), step('u1:w1'), step(null), step('u1:w1'), step('u1:w2'), step('u1:w2')], [true, false, false, true, true, false]);
});
