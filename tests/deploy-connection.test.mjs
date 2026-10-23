import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Math, Number, String, Set, Array, Object, Error, Map, JSON, RegExp }, {});
  return exports;
}

const c = load('../src/utils/deployConnection.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

test('only GCP, AWS and Azure can deploy, and a deploy connection carries the deploy scope alone', () => {
  for (const p of ['gcp', 'aws', 'azure', 'cloudflare']) assert.equal(c.isDeployProvider(p), true, p);
  for (const p of ['mongodb_atlas', 'neo4j_aura', undefined, '']) assert.equal(c.isDeployProvider(p), false, String(p));
  const defaults = ['storage', 'broker'];
  assert.deepEqual(plain(c.scopesFor('aws', true, defaults)), ['deploy']);
  assert.deepEqual(plain(c.scopesFor('aws', false, defaults)), defaults);
  assert.deepEqual(plain(c.scopesFor('mongodb_atlas', true, ['database'])), ['database'], 'asking for deploy on a cloud that cannot deploy changes nothing');
  assert.deepEqual(plain(c.scopesFor('cloudflare', false, ['storage'])), ['deploy'], 'a Cloudflare connection is for deploys whatever was asked');
  assert.equal(c.hasDeployScope(['deploy']), true);
  assert.equal(c.hasDeployScope(['storage']), false);
  assert.equal(c.hasDeployScope(undefined), false);
});

test('each cloud asks for the fields the server needs, with the required ones marked', () => {
  assert.deepEqual(plain(c.deployFields('gcp').map((f) => [f.key, f.required])), [['runtime_service_account', false]]);
  assert.deepEqual(plain(c.deployFields('aws').map((f) => [f.key, f.required])), [['runtime_role_arn', true], ['build_role_arn', true], ['default_region', true]]);
  assert.deepEqual(plain(c.deployFields('azure').map((f) => [f.key, f.required])), [['resource_group', true], ['registry_name', true], ['environment_name', false], ['key_vault_uri', false], ['runtime_identity_id', true]]);
  assert.deepEqual(plain(c.deployFields('mongodb_atlas')), []);
  assert.deepEqual(plain(c.deployFields('cloudflare').map((f) => [f.key, f.required])), [['secrets_store_id', false]], 'the account id and token are the connection\'s own credentials; only the optional Secrets Store is a deploy field');
});

const IDENTITY = '/subscriptions/11111111-2222-3333-4444-555555555555/resourceGroups/ductape-deploy/providers/Microsoft.ManagedIdentity/userAssignedIdentities/ductape-runtime';

test('what is typed is checked with the same rules the server applies', () => {
  const good = c.deployBody('aws', { runtime_role_arn: 'arn:aws:iam::123456789012:role/DuctapeFunctionRuntime', build_role_arn: ' arn:aws:iam::123456789012:role/DuctapeBuild ', default_region: 'eu-west-2' }, true);
  assert.deepEqual(plain(good.errors), {});
  assert.equal(good.body.build_role_arn, 'arn:aws:iam::123456789012:role/DuctapeBuild', 'trimmed');
  const bad = c.deployBody('aws', { runtime_role_arn: 'not-an-arn', build_role_arn: 'arn:aws:iam::123456789012:user/me', default_region: 'europe' });
  assert.deepEqual(plain(Object.keys(bad.errors)), ['runtime_role_arn', 'build_role_arn', 'default_region']);
  assert.deepEqual(plain(bad.body), {}, 'nothing invalid is sent');
  assert.match(c.deployBody('gcp', { runtime_service_account: 'someone@gmail.com' }).errors.runtime_service_account, /service account email/);
  assert.deepEqual(plain(c.deployBody('gcp', { runtime_service_account: '123456-compute@developer.gserviceaccount.com' }).errors), {});
  const azure = c.deployBody('azure', { resource_group: 'ductape-deploy', registry_name: 'ductapeabcde', environment_name: 'ductape-env', runtime_identity_id: IDENTITY }, true);
  assert.deepEqual(plain(azure.errors), {});
  assert.equal(Object.keys(azure.body).length, 4);
  const azureBad = c.deployBody('azure', { resource_group: 'bad group', registry_name: 'ab', environment_name: 'Has Spaces', runtime_identity_id: 'ductape-runtime' });
  assert.equal(Object.keys(azureBad.errors).length, 4);
});

test('a required field left empty is an error only when the connection is being made ready, and an empty field is never sent', () => {
  const relaxed = c.deployBody('aws', { runtime_role_arn: '', build_role_arn: '', default_region: 'eu-west-2' });
  assert.deepEqual(plain(relaxed.errors), {});
  assert.deepEqual(plain(relaxed.body), { default_region: 'eu-west-2' }, 'empty fields are left out, so saving does not wipe what is stored');
  const strict = c.deployBody('aws', { runtime_role_arn: '', build_role_arn: '', default_region: 'eu-west-2' }, true);
  assert.deepEqual(plain(Object.keys(strict.errors)), ['runtime_role_arn', 'build_role_arn']);
  assert.match(strict.errors.runtime_role_arn, /Runtime role is needed/);
  assert.deepEqual(plain(c.deployBody('azure', { resource_group: 'g', registry_name: 'ductapeabcde', environment_name: '', runtime_identity_id: IDENTITY }, true).errors), {}, 'the optional field may stay empty');
});

test('stored values fill the form, and gaps name what is still missing', () => {
  assert.deepEqual(plain(c.readDeployValues('aws', { runtime_role_arn: 'r', default_region: 'eu-west-2', other: 'x' })), { runtime_role_arn: 'r', build_role_arn: '', default_region: 'eu-west-2' });
  assert.deepEqual(plain(c.readDeployValues('aws', undefined)), { runtime_role_arn: '', build_role_arn: '', default_region: '' });
  assert.deepEqual(plain(c.deployGaps('aws', { runtime_role_arn: 'r' })), ['Build role', 'Region']);
  assert.deepEqual(plain(c.deployGaps('gcp', {})), [], 'GCP needs nothing extra');
  assert.deepEqual(plain(c.deployGaps('azure', { resource_group: 'g', registry_name: 'ductapeabcde', runtime_identity_id: IDENTITY })), []);
});

test('a failed validation is explained for each cloud, and other failures are left alone', () => {
  assert.equal(c.describeAccessGaps('gcp', { valid: true }), undefined);
  assert.equal(c.describeAccessGaps('gcp', { valid: false, message: 'bad key' }), undefined, 'not a permissions problem');
  assert.equal(c.describeAccessGaps('gcp', undefined), undefined);
  const gcp = c.describeAccessGaps('gcp', { valid: false, deploy: { checked: 40, missing: ['run.services.create', 'run.services.get'], grantRoles: [{ role: 'roles/run.admin', covers: 'Cloud Run', permissions: ['run.services.create', 'run.services.get'] }] } });
  assert.equal(gcp.title, 'Missing 2 permissions of 40 checked');
  assert.equal(gcp.items[0].label, 'roles/run.admin');
  assert.match(gcp.items[0].detail, /Gives 2 of the missing permissions/);
  assert.match(gcp.fix, /all at once/);
  const aws = c.describeAccessGaps('aws', { valid: false, deploy: { checked: 44, missing: ['lambda:CreateFunction'], grantStatements: [{ sid: 'Lambda', covers: 'Functions', actions: ['lambda:CreateFunction'], resources: ['*'] }] } });
  assert.equal(aws.title, 'Missing 1 permission of 44 checked');
  assert.match(aws.items[0].detail, /lambda:CreateFunction/);
  assert.match(aws.fix, /CloudFormation stack/);
  const azure = c.describeAccessGaps('azure', { valid: false, deploy: { checked: 16, missing: ['Microsoft.App/containerApps/write'], assignRole: 'Contributor', customRole: 'Ductape Deploy Operator', resourceGroup: 'ductape-deploy' } });
  assert.equal(azure.items[0].label, 'Microsoft.App/containerApps/write');
  assert.match(azure.fix, /Contributor.*resource group ductape-deploy.*Ductape Deploy Operator/);
  const cfGaps = c.describeAccessGaps('cloudflare', { valid: false, deploy: { checked: 2, missing: ['Account / Workers KV Storage / Edit'] } });
  assert.equal(cfGaps.title, 'Missing 1 permission of 2 checked');
  assert.match(cfGaps.fix, /Edit the API token/);
  assert.match(c.describeAccessGaps('mystery', { valid: false, deploy: { missing: ['x'] } }).fix, /Grant these permissions/);
});

test('the setup file is offered where one exists, and holds exactly what the server sent', () => {
  assert.deepEqual(plain(c.setupFiles('gcp', { template: {} })), [], 'GCP has no template');
  assert.deepEqual(plain(c.setupFiles('aws', undefined)), []);
  const aws = c.setupFiles('aws', { cloudformationTemplate: 'AWSTemplateFormatVersion: x\n', command: 'aws cloudformation deploy --stack-name ductape-deploy' });
  assert.equal(aws.length, 1);
  assert.equal(aws[0].filename, 'ductape-deploy.yaml');
  assert.equal(aws[0].text, 'AWSTemplateFormatVersion: x\n');
  const azure = c.setupFiles('azure', { template: { resources: [1] }, roleDefinition: { Name: 'Ductape Deploy Operator' }, command: 'az deployment group create --resource-group g --template-file ductape-deploy.json' });
  assert.deepEqual(plain(azure.map((f) => f.filename)), ['ductape-deploy.json', 'ductape-deploy-role.json']);
  assert.deepEqual(JSON.parse(azure[0].text), { resources: [1] }, 'saved as JSON');
  assert.match(azure[0].howTo, /az deployment group create .*--query properties.outputs/);
  assert.equal(c.setupFiles('azure', { template: { resources: [1] } }).length, 1, 'the custom role only appears once the resource group is known');
  assert.deepEqual(plain(c.setupFiles('aws', { template: {} })), [], 'a template for another cloud is not offered');
});

const FARGATE_OUTPUTS = [
  ['ClusterName', 'ductape'], ['ListenerArn', 'arn:aws:elasticloadbalancing:eu-west-2:123456789012:listener/app/ductape/50dc6c495c0c9188/f2f7dc8efc522ab2'], ['BaseDomain', 'deploy.example.com'],
  ['VpcId', 'vpc-0abc123'], ['SubnetIds', 'subnet-0a1,subnet-0b2'], ['SecurityGroupId', 'sg-0abc'], ['TaskRoleArn', 'arn:aws:iam::123456789012:role/DuctapeFargateTask'],
  ['ExecutionRoleArn', 'arn:aws:iam::123456789012:role/DuctapeFargateExecution'], ['LogGroup', '/ecs/ductape'], ['LoadBalancerDnsName', 'ductape-1.elb.amazonaws.com'],
].map(([OutputKey, OutputValue]) => ({ OutputKey, OutputValue }));

test('Fargate is an optional set of fields on AWS only, and never changes the Lambda ones', () => {
  assert.deepEqual(plain(c.fargateFields('aws').map((f) => f.required)), Array(9).fill(false), 'all optional');
  for (const p of ['gcp', 'azure', 'cloudflare', undefined]) assert.deepEqual(plain(c.fargateFields(p)), [], String(p));
  assert.deepEqual(plain(c.deployFields('aws').map((f) => f.key)), ['runtime_role_arn', 'build_role_arn', 'default_region'], 'the Lambda fields are untouched');
  assert.deepEqual(plain(c.deployGaps('aws', { runtime_role_arn: 'r', build_role_arn: 'b', default_region: 'eu-west-2' })), [], 'a Lambda-only connection is not missing anything');
});

test('Fargate values are checked with the server\'s rules, empty ones are never sent, and stored lists show as comma separated text', () => {
  const values = Object.fromEntries(FARGATE_OUTPUTS.filter((o) => o.OutputKey !== 'LoadBalancerDnsName').map((o) => [c.fargateFields('aws').find((f) => f.key.replace('fargate_', '') && true) && ({
    ClusterName: 'fargate_cluster', ListenerArn: 'fargate_listener_arn', BaseDomain: 'fargate_base_domain', VpcId: 'fargate_vpc_id', SubnetIds: 'fargate_subnets',
    SecurityGroupId: 'fargate_security_groups', TaskRoleArn: 'fargate_task_role_arn', ExecutionRoleArn: 'fargate_execution_role_arn', LogGroup: 'fargate_log_group',
  })[o.OutputKey], o.OutputValue]));
  const good = c.fargateBody('aws', values);
  assert.deepEqual(plain(good.errors), {});
  assert.equal(Object.keys(good.body).length, 9);
  assert.deepEqual(plain(c.fargateBody('aws', { fargate_cluster: '', fargate_vpc_id: '  ' })), { body: {}, errors: {} }, 'empty fields are left out, so saving never wipes what is stored');
  const bad = c.fargateBody('aws', { fargate_cluster: 'has space', fargate_listener_arn: 'arn:aws:elasticloadbalancing:eu-west-2:123456789012:loadbalancer/app/x/1', fargate_base_domain: 'localhost', fargate_vpc_id: 'subnet-1', fargate_subnets: 'vpc-1', fargate_security_groups: 'x', fargate_task_role_arn: 'nope', fargate_execution_role_arn: 'arn:aws:iam::123456789012:user/me', fargate_log_group: '' });
  assert.deepEqual(plain(Object.keys(bad.errors)), ['fargate_cluster', 'fargate_listener_arn', 'fargate_base_domain', 'fargate_vpc_id', 'fargate_subnets', 'fargate_security_groups', 'fargate_task_role_arn', 'fargate_execution_role_arn']);
  assert.deepEqual(plain(bad.body), {}, 'nothing invalid is sent');
  assert.deepEqual(plain(c.fargateBody('gcp', values)), { body: {}, errors: {} }, 'other clouds ignore them');
  const stored = c.readFargateValues('aws', { fargate_subnets: ['subnet-0a1', 'subnet-0b2'], fargate_cluster: 'ductape', other: 'x' });
  assert.equal(stored.fargate_subnets, 'subnet-0a1,subnet-0b2');
  assert.equal(stored.fargate_cluster, 'ductape');
  assert.equal(stored.fargate_vpc_id, '');
  assert.deepEqual(plain(c.readFargateValues('gcp', { fargate_cluster: 'x' })), {});
});

test('pasted stack outputs fill the fields, and anything else says what is wrong instead of guessing', () => {
  const full = c.parseFargateOutputs(JSON.stringify({ Stacks: [{ StackName: 'ductape-fargate', Outputs: FARGATE_OUTPUTS }] }));
  assert.equal(full.error, undefined);
  assert.equal(full.values.fargate_cluster, 'ductape');
  assert.equal(full.values.fargate_subnets, 'subnet-0a1,subnet-0b2');
  assert.equal(Object.keys(full.values).length, 9, 'the DNS name is not a field');
  assert.deepEqual(plain(c.parseFargateOutputs(JSON.stringify(FARGATE_OUTPUTS))), plain(full), 'the bare list works too');
  assert.match(c.parseFargateOutputs('not json').error, /not JSON/);
  assert.match(c.parseFargateOutputs(JSON.stringify({ Stacks: [{ Outputs: [{ OutputKey: 'AccessRoleArn', OutputValue: 'x' }] }] })).error, /None of the ductape-fargate stack outputs/);
  const partial = c.parseFargateOutputs(JSON.stringify(FARGATE_OUTPUTS.slice(0, 3)));
  assert.equal(Object.keys(partial.values).length, 3);
  assert.match(partial.error, /Missing from the outputs: VpcId, SubnetIds/);
  // What it fills passes the same checks the server applies.
  assert.deepEqual(plain(c.fargateBody('aws', full.values).errors), {});
});

test('the connection says whether Fargate is set up, and what is missing, without treating its absence as a problem', () => {
  assert.deepEqual(plain(c.fargateState({ runtime_role_arn: 'r' })), { configured: false, missing: [] }, 'Lambda only is fine');
  assert.deepEqual(plain(c.fargateState({ fargate_cluster: 'ductape' })).configured, false);
  assert.match(c.fargateState({ fargate_cluster: 'ductape' }).missing.join(','), /HTTPS listener/);
  const all = { fargate_cluster: 'c', fargate_listener_arn: 'l', fargate_base_domain: 'd', fargate_vpc_id: 'v', fargate_subnets: ['s'], fargate_security_groups: ['g'], fargate_task_role_arn: 't', fargate_execution_role_arn: 'e', fargate_log_group: 'g' };
  assert.deepEqual(plain(c.fargateState(all)), { configured: true, missing: [] });
});

test('the Fargate stack is offered as a second file next to the first, and only for AWS', () => {
  const files = c.setupFiles('aws', { cloudformationTemplate: 'a: 1\n', command: 'first', fargate: { cloudformationTemplate: 'b: 2\n', command: 'second' } });
  assert.deepEqual(plain(files.map((f) => [f.filename, f.howTo])), [['ductape-deploy.yaml', 'first'], ['ductape-fargate.yaml', 'second']]);
  assert.equal(files[1].text, 'b: 2\n');
  assert.deepEqual(plain(c.setupFiles('aws', { cloudformationTemplate: 'a: 1\n', command: 'first' }).map((f) => f.filename)), ['ductape-deploy.yaml'], 'no Fargate stack, no second file');
  assert.deepEqual(plain(c.setupFiles('gcp', { fargate: { cloudformationTemplate: 'b' } })), []);
});

test('the Express role is one optional AWS field, checked like the server checks it, and filled from pasted stack outputs', () => {
  assert.deepEqual(plain(c.expressFields('aws').map((f) => [f.key, f.required])), [['express_infrastructure_role_arn', false]]);
  for (const p of ['gcp', 'azure', 'cloudflare', undefined]) assert.deepEqual(plain(c.expressFields(p)), [], String(p));
  const role = 'arn:aws:iam::123456789012:role/DuctapeExpressInfrastructure';
  assert.deepEqual(plain(c.expressBody('aws', { express_infrastructure_role_arn: ` ${role} ` })), { body: { express_infrastructure_role_arn: role }, errors: {} });
  assert.deepEqual(plain(c.expressBody('aws', { express_infrastructure_role_arn: '' })), { body: {}, errors: {} }, 'empty is left out, so saving never wipes it');
  assert.match(c.expressBody('aws', { express_infrastructure_role_arn: 'nope' }).errors.express_infrastructure_role_arn, /role ARN/);
  assert.deepEqual(plain(c.expressBody('gcp', { express_infrastructure_role_arn: role })), { body: {}, errors: {} });
  assert.deepEqual(plain(c.readExpressValues('aws', { express_infrastructure_role_arn: role })), { express_infrastructure_role_arn: role });
  assert.deepEqual(plain(c.readExpressValues('gcp', { express_infrastructure_role_arn: role })), {});
  assert.deepEqual(plain(c.parseExpressOutputs(JSON.stringify({ Stacks: [{ Outputs: [{ OutputKey: 'InfrastructureRoleArn', OutputValue: role }] }] })).values), { express_infrastructure_role_arn: role });
  assert.deepEqual(plain(c.parseExpressOutputs(JSON.stringify([{ OutputKey: 'InfrastructureRoleArn', OutputValue: role }])).values), { express_infrastructure_role_arn: role });
  assert.match(c.parseExpressOutputs('nope').error, /not JSON/);
  assert.match(c.parseExpressOutputs(JSON.stringify({ Stacks: [{ Outputs: [{ OutputKey: 'ClusterName', OutputValue: 'x' }] }] })).error, /no InfrastructureRoleArn|There is no/);
  const files = c.setupFiles('aws', { cloudformationTemplate: 'a', fargate: { cloudformationTemplate: 'b' }, express: { cloudformationTemplate: 'c', command: 'third' } });
  assert.deepEqual(plain(files.map((f) => f.filename)), ['ductape-deploy.yaml', 'ductape-fargate.yaml', 'ductape-ecs-express.yaml']);
  assert.equal(files[2].howTo, 'third');
});

test('scale-down of idle Fargate releases is an AWS switch that is off unless chosen, and turning it off is sent', () => {
  assert.equal(c.readFargateValues('aws', {}).fargate_scale_down_idle, 'false', 'off when nothing is stored');
  assert.equal(c.readFargateValues('aws', { fargate_scale_down_idle: true }).fargate_scale_down_idle, 'true');
  assert.equal(c.readFargateValues('aws', { fargate_scale_down_idle: 'true' }).fargate_scale_down_idle, 'true');
  assert.equal(c.readFargateValues('gcp', { fargate_scale_down_idle: true }).fargate_scale_down_idle, undefined, 'only AWS has it');
  assert.equal(c.fargateBody('aws', { fargate_scale_down_idle: 'true' }).body.fargate_scale_down_idle, 'true');
  assert.equal(c.fargateBody('aws', { fargate_scale_down_idle: 'false' }).body.fargate_scale_down_idle, 'false', 'unchecking it has to reach the server');
  assert.equal(c.fargateBody('aws', {}).body.fargate_scale_down_idle, undefined, 'a form that never mentions it changes nothing');
  assert.equal(c.fargateBody('gcp', { fargate_scale_down_idle: 'true' }).body.fargate_scale_down_idle, undefined);
  assert.equal(c.SCALE_DOWN_KEY, 'fargate_scale_down_idle');
  // The internal load balancer: a switch, and a relay function that must be named when it is on.
  assert.equal(c.readFargateValues('aws', {}).fargate_internal, 'false');
  assert.equal(c.readFargateValues('aws', { fargate_internal: true, fargate_verifier_function: 'ductape-verifier' }).fargate_verifier_function, 'ductape-verifier');
  assert.equal(c.readFargateValues('gcp', { fargate_internal: true }).fargate_internal, undefined, 'only AWS has it');
  assert.equal(JSON.stringify(c.fargateBody('aws', { fargate_internal: 'true', fargate_verifier_function: 'ductape-verifier' }).body), JSON.stringify({ fargate_internal: 'true', fargate_verifier_function: 'ductape-verifier' }));
  assert.equal(c.fargateBody('aws', { fargate_internal: 'true' }).errors.fargate_verifier_function !== undefined, true, 'internal without a relay is said before saving');
  assert.equal(c.fargateBody('aws', { fargate_internal: 'false' }).body.fargate_internal, 'false', 'switching it off has to reach the server');
  assert.equal(c.fargateBody('aws', { fargate_verifier_function: 'bad name!' }).errors.fargate_verifier_function !== undefined, true);
  assert.equal(c.fargateBody('aws', {}).body.fargate_internal, undefined, 'a form that never mentions it changes nothing');
  const relayOut = c.parseFargateOutputs(JSON.stringify({ ClusterName: 'ductape', VerifierFunctionName: 'ductape-verifier' }));
  assert.equal(relayOut.values.fargate_verifier_function, 'ductape-verifier');
  assert.equal(relayOut.values.fargate_internal, 'true', 'a stack with a relay is an internal one');
  assert.equal(c.parseFargateOutputs(JSON.stringify({ ClusterName: 'ductape' })).values.fargate_internal, undefined);
  assert.equal(c.fargateFields('aws').some((f) => f.key === 'fargate_scale_down_idle'), false, 'it is a switch, not a text field, and not one of the fields that make Fargate ready');
});

test('the Azure Key Vault for secret references is optional, checked, and never needed to deploy', () => {
  assert.equal(c.deployFields('azure').find((f) => f.key === 'key_vault_uri').required, false);
  assert.deepEqual(plain(c.deployBody('azure', { resource_group: 'g', registry_name: 'ductapeabcde', runtime_identity_id: IDENTITY, key_vault_uri: 'https://my-vault.vault.azure.net/' }, true).errors), {});
  assert.match(c.deployBody('azure', { key_vault_uri: 'https://example.com' }).errors.key_vault_uri, /vault address/);
  assert.match(c.deployBody('azure', { key_vault_uri: 'http://my-vault.vault.azure.net' }).errors.key_vault_uri, /vault address/);
  assert.deepEqual(plain(c.deployGaps('azure', { resource_group: 'g', registry_name: 'ductapeabcde', runtime_identity_id: IDENTITY })), [], 'a connection without one is not missing anything');
});

test('the Cloudflare Secrets Store is optional and checked, and a Cloudflare connection is never missing anything for lacking one', () => {
  assert.deepEqual(plain(c.deployBody('cloudflare', { secrets_store_id: '0123456789abcdef0123456789abcdef' }, true).errors), {});
  assert.match(c.deployBody('cloudflare', { secrets_store_id: 'my-store' }).errors.secrets_store_id, /32-character id/);
  assert.deepEqual(plain(c.deployGaps('cloudflare', {})), []);
  assert.equal(c.readDeployValues('cloudflare', { secrets_store_id: 'abc' }).secrets_store_id, 'abc');
});
