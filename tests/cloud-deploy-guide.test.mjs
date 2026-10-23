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

test('GCP, AWS and Azure have a deploy guide, because those are the clouds that can deploy today', () => {
  for (const provider of ['mongodb_atlas', 'neo4j_aura']) assert.equal(CLOUD_PROVIDER_GUIDES[provider].deployGuide, undefined, provider);
  assert.ok(CLOUD_PROVIDER_GUIDES.gcp.deployGuide && CLOUD_PROVIDER_GUIDES.aws.deployGuide && CLOUD_PROVIDER_GUIDES.azure.deployGuide && CLOUD_PROVIDER_GUIDES.cloudflare.deployGuide);
});

test('the Cloudflare guide explains deploy setup honestly: two permissions, what is created, no cloud-level check, and the limits', () => {
  const cf = CLOUD_PROVIDER_GUIDES.cloudflare.deployGuide;
  assert.equal(cf.container, 'account');
  assert.match(cf.safety, /never deletes anything/);
  assert.match(cf.safety, /no cloud-level access check/);
  assert.match(cf.safety, /not services/);
  assert.match(cf.safety, /passes through the control plane in memory/);
  assert.deepEqual(plain(cf.accountRoles.map((r) => r.roleName)), ['Account / Workers Scripts / Edit', 'Account / Workers KV Storage / Edit']);
  assert.ok(cf.creates.some((c) => /ductape-releases/.test(c)) && cf.creates.some((c) => /preview address/.test(c)));
  const commands = cf.steps.map((s) => s.command).filter(Boolean).join('\n');
  assert.match(commands, /--account-id .*--api-token-env/);
  assert.doesNotMatch(commands, /--api-token /, 'the token never goes on a command line');
  assert.match(commands, /releases publish-worker/);
  assert.deepEqual(plain(cf.steps.map((s) => s.attach).filter(Boolean)), ['accountRoles']);
  assert.ok(cf.troubleshooting.some((t) => /100 versions/.test(t.problem)) && cf.troubleshooting.some((t) => /30 seconds of CPU/.test(t.fix)));
  assert.ok(!/api_token|Bearer /.test(JSON.stringify(plain(cf))));
});

test('the Cloudflare guide names the same permissions and flags as the CLI guide', () => {
  const cli = new URL('../../../sdk/cli/src/lib/cloud-connection.ts', import.meta.url);
  if (!fs.existsSync(cli)) return;
  const source = fs.readFileSync(cli, 'utf8');
  const block = source.slice(source.indexOf('export const CLOUDFLARE_DEPLOY_ROLE_LIST'), source.indexOf('export const CLOUDFLARE_DEPLOY_CREATES'));
  const cliRoles = [...block.matchAll(/role: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(plain(CLOUD_PROVIDER_GUIDES.cloudflare.deployGuide.accountRoles.map((r) => r.roleName)), cliRoles);
  for (const flag of ['--deploy', '--account-id', '--api-token-env']) assert.ok(source.includes(flag), `${flag} is in the CLI`);
});

test('the Azure guide explains deploy setup: safety, what is created, the roles, the commands and the fixes', () => {
  const azure = CLOUD_PROVIDER_GUIDES.azure.deployGuide;
  assert.equal(azure.container, 'resource group');
  assert.match(azure.safety, /never deletes anything/);
  assert.match(azure.safety, /never registers resource providers/);
  assert.ok(azure.creates.some((c) => /container app per deployed version/.test(c)) && azure.creates.some((c) => /Container Registry Tasks/.test(c)) && azure.creates.some((c) => /sign-in check/.test(c)) && azure.creates.some((c) => /app secret/.test(c)));
  assert.ok(azure.accountRoles.some((r) => /Contributor/.test(r.roleName)) && azure.accountRoles.some((r) => /AcrPull/.test(r.roleName)));
  assert.equal(azure.apis, undefined);
  assert.equal(azure.roles, undefined);
  const commands = azure.steps.map((s) => s.command).filter(Boolean).join('\n');
  assert.match(commands, /connections create --provider azure .*--deploy --save-template/);
  assert.match(commands, /az deployment group create/);
  assert.match(commands, /--resource-group .*--registry-name .*--environment-name .*--runtime-identity-id/);
  assert.match(commands, /--client-secret-env/);
  assert.doesNotMatch(commands, /--client-secret /, 'the secret never goes on a command line');
  assert.match(commands, /connections validate/);
  assert.deepEqual(plain(azure.steps.map((s) => s.attach).filter(Boolean)), ['accountRoles']);
  assert.ok(azure.troubleshooting.some((t) => /MissingSubscriptionRegistration/.test(t.problem)) && azure.troubleshooting.some((t) => /free-credit/.test(t.fix)));
  assert.ok(!/BEGIN PRIVATE KEY|client_secret"\s*:/.test(JSON.stringify(plain(azure))));
});

test('the Azure guide names the same roles and flags as the CLI guide', () => {
  const cli = new URL('../../../sdk/cli/src/lib/cloud-connection.ts', import.meta.url);
  if (!fs.existsSync(cli)) return;
  const source = fs.readFileSync(cli, 'utf8');
  const block = source.slice(source.indexOf('export const AZURE_DEPLOY_ROLE_LIST'), source.indexOf('export const AZURE_DEPLOY_CREATES'));
  const cliRoles = [...block.matchAll(/role: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(plain(CLOUD_PROVIDER_GUIDES.azure.deployGuide.accountRoles.map((r) => r.roleName)), cliRoles);
  for (const flag of ['--deploy', '--save-template', '--resource-group', '--registry-name', '--environment-name', '--runtime-identity-id', '--client-secret-env']) assert.ok(source.includes(flag), `${flag} is in the CLI`);
});

test('the GCP guide attaches the APIs and roles to the right steps, not by position', () => {
  assert.equal(guide.container, 'project');
  assert.deepEqual(plain(guide.steps.map((s) => s.attach).filter(Boolean)), ['apis', 'roles']);
  assert.equal(guide.steps[0].attach, 'apis');
  assert.equal(guide.steps[1].attach, 'roles');
});

test('the AWS guide explains deploy setup: safety, what is created, the three roles, the commands and the fixes', () => {
  const aws = CLOUD_PROVIDER_GUIDES.aws.deployGuide;
  assert.equal(aws.container, 'account');
  assert.match(aws.safety, /never deletes anything/);
  assert.match(aws.safety, /dedicated account/);
  assert.ok(aws.creates.some((c) => /ductape-source-<account id>/.test(c)) && aws.creates.some((c) => /ECR repository/.test(c)) && aws.creates.some((c) => /Lambda function/.test(c)) && aws.creates.some((c) => /IAM authentication/.test(c)) && aws.creates.some((c) => /Secrets Manager/.test(c)));
  assert.deepEqual(plain(aws.accountRoles.map((r) => r.roleName)), ['DuctapeAccess', 'DuctapeFunctionRuntime', 'DuctapeBuild']);
  assert.equal(aws.apis, undefined, 'AWS has no APIs to switch on');
  assert.equal(aws.roles, undefined);
  const commands = aws.steps.map((s) => s.command).filter(Boolean).join('\n');
  assert.match(commands, /connections create --provider aws .*--deploy --save-template/);
  assert.match(commands, /cloudformation deploy .*CAPABILITY_NAMED_IAM/);
  assert.match(commands, /--runtime-role-arn .*--build-role-arn .*--default-region/);
  assert.match(commands, /connections validate/);
  assert.deepEqual(plain(aws.steps.map((s) => s.attach).filter(Boolean)), ['accountRoles']);
  assert.ok(aws.troubleshooting.some((t) => /cannot be assumed by Lambda/.test(t.problem)));
  assert.ok(aws.troubleshooting.some((t) => /InvokeFunctionUrl/.test(t.fix)) && aws.troubleshooting.some((t) => /PassRole/.test(t.problem)));
  assert.ok(!/AKIA|secret_access_key|BEGIN PRIVATE KEY/.test(JSON.stringify(plain(aws))));
});

test('the AWS guide names the same roles and flags as the CLI guide', () => {
  const cli = new URL('../../../sdk/cli/src/lib/cloud-connection.ts', import.meta.url);
  if (!fs.existsSync(cli)) return;
  const source = fs.readFileSync(cli, 'utf8');
  const block = source.slice(source.indexOf('export const AWS_DEPLOY_ROLE_LIST'), source.indexOf('export const AWS_DEPLOY_CREATES'));
  const cliRoles = [...block.matchAll(/role: '(Ductape[A-Za-z]+)'/g)].map((m) => m[1]);
  assert.deepEqual(plain(CLOUD_PROVIDER_GUIDES.aws.deployGuide.accountRoles.map((r) => r.roleName)), cliRoles);
  for (const flag of ['--deploy', '--save-template', '--role-arn', '--runtime-role-arn', '--build-role-arn', '--default-region']) assert.ok(source.includes(flag), `${flag} is in the CLI`);
});
