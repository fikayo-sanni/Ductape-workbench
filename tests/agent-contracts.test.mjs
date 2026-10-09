import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative, dependencies = {}) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports;
}

const contracts = load('../src/services/agent/methodContracts.ts');
let requests = 0;
const tools = load('../src/services/agent/tools.ts', {
  './methodContracts': contracts,
  '@/services/productServicesReal': { default: { fetchProducts: async () => {
    requests++;
    return { data: [{ tag: 'p', public_key: 'key' }] };
  } } },
  '@/services/appServicesReal': { default: {} },
  '@/services/logsServices': {},
  '@/services/sdkProxy': { SDKProxyService: class {
    async execute(module, method, ...params) { requests++; return { module, method, params }; }
  } },
});
const context = { user: { _id: 'u', public_key: 'key', auth_token: 'token' }, workspaceId: 'w' };

test('unknown mutation schemas fail closed before even loading products', async () => {
  requests = 0;
  const instance = new tools.WorkspaceDataTools(context);
  for (const [module, method] of [['databases', 'createTable'], ['product', 'create'], ['actions', 'run']]) {
    await assert.rejects(instance.execute('ductape_mutate', { module, method, product: 'p', params: [{}] }),
      error => error.code === 'MUTATION_CONTRACT_UNAVAILABLE');
  }
  assert.equal(requests, 0);
});

test('graph execution requires confirmation and cannot use the read tool', async () => {
  const instance = new tools.WorkspaceDataTools(context);
  assert.equal(tools.requiresConfirmation('ductape_mutate'), true);
  await assert.rejects(instance.execute('ductape_query', {
    module: 'graph', method: 'action.execute', product: 'p', params: [{}],
  }), /not a read method/);
  const result = await instance.execute('ductape_mutate', {
    module: 'graph', method: 'action.execute', product: 'p',
    params: [{ product: 'p', env: 'dev', graph: 'g', action: 'a', input: {} }],
  });
  assert.equal(result.method, 'action.execute');
});

test('saved action discovery uses real names and unsupported database execute stays blocked', async () => {
  const instance = new tools.WorkspaceDataTools(context);
  for (const [module, method] of [['databases', 'action.list'], ['databases', 'action.fetch'], ['graph', 'action.fetchAll']]) {
    const result = await instance.execute('ductape_query', { module, method, product: 'p', params: ['tag'] });
    assert.equal(result.method, method);
  }
  await assert.rejects(instance.execute('ductape_mutate', {
    module: 'databases', method: 'execute', product: 'p', params: [{}],
  }), /not a write method/);
  await assert.rejects(instance.execute('ductape_query', {
    module: 'databases', method: 'action.dispatch', product: 'p', params: [{}],
  }), /not a read method/);
  const dispatched = await instance.execute('ductape_mutate', {
    module: 'databases', method: 'action.dispatch', product: 'p',
    params: [{ product: 'p', env: 'dev', database: 'db', event: 'action', input: { data: {} } }],
  });
  assert.equal(dispatched.method, 'action.dispatch');
});

test('fallback guidance never recommends probing a mutation', () => {
  assert.match(contracts.describeMethodContract('unknown', 'method'), /do not guess inputs/i);
  assert.equal(contracts.hasVerifiedMutationContract('product', 'create'), false);
  assert.equal(contracts.hasVerifiedMutationContract('missing', 'method'), false);
  assert.doesNotMatch(tools.describeAllowedWriteMethods(), /createTable/);
  assert.match(tools.describeAllowedReadMethods(), /graph: list, fetch, action.fetchAll, action.fetch/);
});
