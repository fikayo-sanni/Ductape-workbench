import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, encodeURIComponent, String, Object }, {});
  return exports;
}

const { CLOUD_PROVIDER_GUIDES, gcpApiEnableUrl, gcpIamUrl } = load('../src/components/cloud/cloudSetupGuide.ts');
const guide = CLOUD_PROVIDER_GUIDES.gcp.deployGuide;
const plain = (value) => JSON.parse(JSON.stringify(value));

test('the GCP guide explains deploy setup: safety, what is created, APIs, roles, steps and fixes', () => {
  assert.ok(guide, 'GCP has a deploy guide');
  assert.match(guide.safety, /never deletes anything/);
  assert.match(guide.safety, /dedicated project/);
  assert.ok(guide.creates.some((c) => /ductape-source/.test(c)) && guide.creates.some((c) => /Artifact Registry/.test(c)) && guide.creates.some((c) => /Cloud Run/.test(c)) && guide.creates.some((c) => /Secret Manager/.test(c)));
  assert.equal(guide.apis.length, 7);
  assert.equal(guide.roles.length, 7);
  assert.equal(new Set(guide.apis.map((a) => a.serviceId)).size, 7, 'no API is listed twice');
  assert.equal(new Set(guide.roles.map((r) => r.roleId)).size, 7, 'no role is listed twice');
  assert.ok(guide.steps.length >= 5);
  assert.match(guide.steps[0].body, /has not been used in project/);
  assert.match(guide.steps.map((s) => s.body).join(' '), /--deploy/, 'it says how to get the deploy scope, which this form cannot set');
  assert.ok(guide.troubleshooting.some((t) => /artifactregistry\.writer/.test(t.fix)));
  assert.ok(guide.troubleshooting.some((t) => /act as service account/.test(t.problem) && /roles\/iam\.serviceAccountUser/.test(t.fix)), 'the actAs error names the role that fixes it');
  assert.ok(guide.troubleshooting.some((t) => /instead of adding/.test(t.fix)), 'a role that disappears is explained');
  assert.match(guide.steps[1].body, /all seven at once/);
  assert.ok(!/BEGIN PRIVATE KEY/.test(JSON.stringify(plain(guide))));
});

test('the APIs and roles match what the CLI guide and the backend check use', () => {
  const cli = new URL('../../../sdk/cli/src/lib/cloud-connection.ts', import.meta.url);
  if (!fs.existsSync(cli)) return; // the sibling CLI is not checked out here
  const source = fs.readFileSync(cli, 'utf8');
  const cliRoles = [...source.matchAll(/\{ role: '(roles\/[A-Za-z.]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(plain(guide.roles.map((r) => r.roleId).sort()), cliRoles, 'the workbench lists the same roles as the CLI');
  const cliApis = [...source.matchAll(/'([a-z]+\.googleapis\.com)'/g)].map((m) => m[1]);
  for (const api of guide.apis) assert.ok(cliApis.includes(api.serviceId), `${api.serviceId} is an API the CLI guide asks for`);
});

test('links open the right console page for the project', () => {
  assert.equal(gcpApiEnableUrl('run.googleapis.com', 'my-proj'), 'https://console.cloud.google.com/apis/library/run.googleapis.com?project=my-proj');
  assert.equal(gcpApiEnableUrl('run.googleapis.com'), 'https://console.cloud.google.com/apis/library/run.googleapis.com');
  assert.equal(gcpIamUrl('my-proj'), 'https://console.cloud.google.com/iam-admin/iam?project=my-proj');
  assert.equal(gcpIamUrl('  '), 'https://console.cloud.google.com/iam-admin/iam');
  assert.equal(gcpIamUrl('a b'), 'https://console.cloud.google.com/iam-admin/iam?project=a%20b', 'the project id is encoded');
});

test('only GCP has a deploy guide, because only GCP can deploy today', () => {
  for (const provider of ['aws', 'azure', 'mongodb_atlas', 'neo4j_aura']) assert.equal(CLOUD_PROVIDER_GUIDES[provider].deployGuide, undefined, provider);
});
