import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/utils/logoUpload.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(code, { exports, String });
const { validateLogoFile, logoInitials, MAX_LOGO_BYTES } = exports;

test('accepts the image types the upload endpoint takes', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']) {
    assert.equal(validateLogoFile({ type, size: 1000 }), undefined);
  }
});

test('rejects other types, empty files and files over 5 MB', () => {
  assert.match(validateLogoFile({ type: 'application/pdf', size: 1000 }), /image file/);
  assert.match(validateLogoFile({ type: '', size: 1000 }), /image file/);
  assert.match(validateLogoFile({ type: 'image/png', size: 0 }), /empty/);
  assert.match(validateLogoFile({ type: 'image/png', size: MAX_LOGO_BYTES + 1 }), /5 MB/);
  assert.equal(validateLogoFile({ type: 'image/png', size: MAX_LOGO_BYTES }), undefined);
});

test('initials come from the first two words', () => {
  assert.equal(logoInitials('Smoke Product'), 'SP');
  assert.equal(logoInitials('billing'), 'B');
  assert.equal(logoInitials('  three word name '), 'TW');
  assert.equal(logoInitials(''), '?');
  assert.equal(logoInitials(undefined), '?');
});
