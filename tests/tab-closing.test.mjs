import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/utils/tabClosing.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(code, { exports });
const { tabsToClose, unsavedCount } = exports;
const plain = value => JSON.parse(JSON.stringify(value));

const tabs = [{ id: 'a' }, { id: 'b', isDirty: true }, { id: 'c' }, { id: 'd', isDirty: true }];

test('each scope picks the right tabs relative to the one the menu was opened from', () => {
  assert.deepEqual(plain(tabsToClose(tabs, 'b', 'all')), ['a', 'b', 'c', 'd']);
  assert.deepEqual(plain(tabsToClose(tabs, 'b', 'active')), ['b']);
  assert.deepEqual(plain(tabsToClose(tabs, 'b', 'others')), ['a', 'c', 'd']);
  assert.deepEqual(plain(tabsToClose(tabs, 'b', 'right')), ['c', 'd']);
  assert.deepEqual(plain(tabsToClose(tabs, 'd', 'right')), []);
});

test('with no active tab only "close all" does anything', () => {
  assert.deepEqual(plain(tabsToClose(tabs, null, 'all')), ['a', 'b', 'c', 'd']);
  for (const scope of ['active', 'others', 'right']) assert.deepEqual(plain(tabsToClose(tabs, null, scope)), []);
  assert.deepEqual(plain(tabsToClose([], null, 'all')), []);
});

test('unsavedCount counts only the tabs being closed', () => {
  assert.equal(unsavedCount(tabs, ['a', 'b', 'c', 'd']), 2);
  assert.equal(unsavedCount(tabs, ['a', 'c']), 0);
  assert.equal(unsavedCount(tabs, ['d']), 1);
});
