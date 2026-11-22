import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function service(get) {
  const source = fs.readFileSync(new URL('../src/services/workServices.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, URLSearchParams, require: (name) => {
    assert.equal(name, '@/config/axiosinstance');
    return { __esModule: true, default: { get, interceptors: { request: { use() {} } } } };
  } });
  return exports;
}
const auth = { workspaceId: 'workspace', userId: 'user', publicKey: 'public' };
const response = (data) => ({ data: { data } });

test('search queries the full product history with encoded text, auth and pagination', async () => {
  const api = service(async (url) => {
    const parsed = new URL(url, 'https://example.test');
    assert.equal(parsed.pathname, '/tickets/v1/work/items');
    assert.equal(parsed.searchParams.get('q'), 'slow [query] & retry');
    assert.equal(parsed.searchParams.get('product'), 'shop');
    assert.equal(parsed.searchParams.get('workspace_id'), auth.workspaceId);
    assert.equal(parsed.searchParams.get('user_id'), auth.userId);
    assert.equal(parsed.searchParams.get('limit'), '50');
    assert.equal(parsed.searchParams.get('offset'), '50');
    assert.equal(parsed.searchParams.has('status'), false, 'closed and old work must be searchable');
    return response({ items: [], total: 123 });
  });
  assert.equal((await api.searchWorkItems(auth, 'shop', '  slow [query] & retry  ', 50)).total, 123);
});

test('a reference opens the exact item even when it is outside the board window', async () => {
  const item = { ref: 'W-123', product: 'shop', status: 'cancelled' };
  const api = service(async (url) => {
    assert.equal(new URL(url, 'https://example.test').pathname, '/tickets/v1/work/items/W-123');
    return response(item);
  });
  const found = await api.searchWorkItems(auth, 'shop', 'w123');
  assert.equal(found.total, 1);
  assert.equal(found.items[0], item);
  assert.equal((await api.searchWorkItems(auth, 'another-product', 'W-123')).total, 0, 'the selected product scopes reference searches too');
});

test('a missing reference is empty but authorization and network failures remain visible', async () => {
  const missing = service(async () => { throw { response: { status: 404 } }; });
  assert.equal((await missing.searchWorkItems(auth, 'shop', 'W-999')).total, 0);
  for (const status of [401, 403, 500]) {
    const error = Object.assign(new Error('Request failed'), { response: { status } });
    const api = service(async () => { throw error; });
    await assert.rejects(api.searchWorkItems(auth, 'shop', 'W-123'), (failure) => failure === error);
  }
});
