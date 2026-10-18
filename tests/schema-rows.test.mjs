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
  vm.runInNewContext(code, { exports });
  return exports;
}

const { schemaToRows, valueToRows } = load('../src/utils/schemaRows.ts');
const { functionPayload } = load('../src/utils/functionPayload.ts');

test('function activity distinguishes real payloads from metadata and missing samples', () => {
  assert.equal(functionPayload(undefined).payload_unavailable, true);
  assert.equal(functionPayload({ operation: 'generate' }).payload_unavailable, true);
  assert.equal(functionPayload(JSON.stringify({ input: {}, output: null })).output, null);
  assert.equal(functionPayload({ input: { password: '[REDACTED]' } }).input.password, '[REDACTED]');
});

// The module runs in a separate vm realm; copy into this realm before deep comparison.
const pick = (rows, fn) => Array.from(rows, fn);

test('schemaToRows describes fields in plain language with required flags', () => {
  const rows = schemaToRows({
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', minLength: 3, maxLength: 120 },
      plan: { type: 'string', enum: ['free', 'pro'] },
      seats: { type: 'integer', minimum: 1, maximum: 50 },
      tags: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    },
  });

  assert.deepEqual(pick(rows, r => r.name), ['email', 'plan', 'seats', 'tags']);
  assert.equal(rows[0].required, true);
  assert.equal(rows[0].type, 'text');
  assert.equal(rows[0].note, '3 to 120 characters');
  assert.equal(rows[1].required, false);
  assert.equal(rows[1].note, 'one of: free, pro');
  assert.equal(rows[2].type, 'whole number');
  assert.equal(rows[2].note, '1 to 50');
  assert.equal(rows[3].type, 'list of text');
  assert.equal(rows[3].note, 'at most 5 items');
});

test('schemaToRows nests object fields and stops at the depth limit', () => {
  const rows = schemaToRows({
    type: 'object',
    properties: {
      customer: {
        type: 'object',
        properties: {
          address: { type: 'object', properties: { city: { type: 'string' } } },
        },
      },
    },
  });

  assert.deepEqual(pick(rows, r => [r.name, r.depth]), [['customer', 0], ['address', 1], ['city', 2]]);
});

test('schemaToRows handles non-object and empty schemas', () => {
  assert.equal(schemaToRows(null).length, 0);
  assert.equal(schemaToRows(undefined).length, 0);
  const rows = schemaToRows({ type: 'array', items: { type: 'number' } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, '(value)');
  assert.equal(rows[0].type, 'list of number');
  assert.equal(schemaToRows({ type: 'object' })[0].note, 'Object; fields unspecified');
  assert.equal(schemaToRows({ type: 'object', properties: {} })[0].note, 'Object; fields unspecified');
  assert.equal(schemaToRows({ type: 'object', additionalProperties: false })[0].note, 'No fields allowed');
});

test('valueToRows flattens a sample payload and accepts JSON text', () => {
  const rows = valueToRows({ id: 'abc', amount: 12.5, paid: true, items: [{ sku: 'x' }] });
  assert.deepEqual(pick(rows, r => r.name), ['id', 'amount', 'paid', 'items', 'item 1', 'sku']);
  assert.equal(rows[1].type, 'number');
  assert.equal(rows[3].example, '1 item');

  assert.equal(valueToRows('{"ok":true}')[0].name, 'ok');
  assert.equal(valueToRows('not json').length, 0);
  assert.equal(valueToRows(undefined).length, 0);
});
