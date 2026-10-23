/**
 * What a cloud connection needs to be used for Ductape Deploy, as plain functions: which providers can deploy, the extra fields each
 * needs, how they are checked before they are sent (the same rules the server applies, so a typo is caught here and not after a
 * round trip), how a failed validation is explained, and which setup file a person can save. Nothing here holds a secret.
 */

export type DeployProvider = 'gcp' | 'aws' | 'azure' | 'cloudflare';

export const isDeployProvider = (provider: string | undefined): provider is DeployProvider => provider === 'gcp' || provider === 'aws' || provider === 'azure' || provider === 'cloudflare';

/** A deploy connection carries the deploy scope and nothing else, so it has one purpose and one set of roles. */
/** A Cloudflare connection is for deploys and nothing else, so it always carries the deploy scope. */
export const scopesFor = (provider: string, deploy: boolean, defaults: string[]): string[] => ((deploy || provider === 'cloudflare') && isDeployProvider(provider) ? ['deploy'] : defaults);

export const hasDeployScope = (scopes: readonly string[] | undefined): boolean => Boolean(scopes?.includes('deploy'));

export interface IDeployField {
  /** The field the server takes. */
  key: string;
  label: string;
  placeholder: string;
  help: string;
  required: boolean;
}

const FIELDS: Record<DeployProvider, IDeployField[]> = {
  gcp: [
    { key: 'runtime_service_account', label: 'Runtime service account', placeholder: 'app-runtime@my-project.iam.gserviceaccount.com', help: 'The account your deployed services run as. Leave empty to use the project\'s default compute account.', required: false },
  ],
  aws: [
    { key: 'runtime_role_arn', label: 'Runtime role', placeholder: 'arn:aws:iam::123456789012:role/DuctapeFunctionRuntime', help: 'The role your deployed functions run as. The setup template creates it.', required: true },
    { key: 'build_role_arn', label: 'Build role', placeholder: 'arn:aws:iam::123456789012:role/DuctapeBuild', help: 'The role your builds run as. The setup template creates it.', required: true },
    { key: 'default_region', label: 'Region', placeholder: 'eu-west-2', help: 'Where functions and builds go when a plan does not say.', required: true },
  ],
  // The account id and the token are the connection's own credentials, entered with them. The Secrets Store is only for { secret: NAME } references.
  cloudflare: [
    { key: 'secrets_store_id', label: 'Secrets Store for secret references', placeholder: '0123456789abcdef0123456789abcdef', help: 'The 32-character id of your Cloudflare Secrets Store (still in beta). A { secret: NAME } reference in a release\'s configuration is bound from it; Ductape never reads the value. The token also needs the Secrets Store permission. Leave empty if you do not use references.', required: false },
  ],
  azure: [
    { key: 'resource_group', label: 'Resource group', placeholder: 'ductape-deploy', help: 'The one group Ductape works in. Everything it adds goes here.', required: true },
    { key: 'registry_name', label: 'Container registry', placeholder: 'ductapeabcde12345', help: 'The registryName output of the setup template.', required: true },
    { key: 'environment_name', label: 'Container apps environment', placeholder: 'ductape-env', help: 'The environmentName output of the setup template. Defaults to ductape-env.', required: false },
    { key: 'key_vault_uri', label: 'Key Vault for secret references', placeholder: 'https://my-vault.vault.azure.net', help: 'Where { secret: NAME } references in a release\'s configuration are read from, by the app\'s identity (give it Key Vault Secrets User). Ductape never reads the values. Leave empty if you do not use them.', required: false },
    { key: 'runtime_identity_id', label: 'Runtime identity', placeholder: '/subscriptions/.../userAssignedIdentities/ductape-runtime', help: 'The runtimeIdentityId output of the setup template, the full resource id.', required: true },
  ],
};

export const deployFields = (provider: string | undefined): IDeployField[] => (isDeployProvider(provider) ? FIELDS[provider] : []);

const RULES: Record<string, { test: (value: string) => boolean; message: string }> = {
  runtime_service_account: {
    test: (v) => /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.iam\.gserviceaccount\.com$|^\d+-compute@developer\.gserviceaccount\.com$/.test(v),
    message: 'Use a service account email such as app-runtime@my-project.iam.gserviceaccount.com.',
  },
  runtime_role_arn: { test: (v) => /^arn:aws[a-z-]*:iam::[0-9]{12}:role\/[A-Za-z0-9_+=,.@/-]+$/.test(v), message: 'Use a role ARN such as arn:aws:iam::123456789012:role/DuctapeFunctionRuntime.' },
  build_role_arn: { test: (v) => /^arn:aws[a-z-]*:iam::[0-9]{12}:role\/[A-Za-z0-9_+=,.@/-]+$/.test(v), message: 'Use a role ARN such as arn:aws:iam::123456789012:role/DuctapeBuild.' },
  default_region: { test: (v) => /^[a-z]{2}(-[a-z]+)+-[0-9]$/.test(v), message: 'Use a region such as eu-west-2.' },
  resource_group: { test: (v) => /^[A-Za-z0-9_.()-]{1,89}$/.test(v), message: 'Use a resource group name such as ductape-deploy.' },
  registry_name: { test: (v) => /^[a-zA-Z0-9]{5,50}$/.test(v), message: 'The registry name is 5 to 50 letters and digits.' },
  environment_name: { test: (v) => /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$/.test(v), message: 'Use lowercase letters, digits and hyphens.' },
  secrets_store_id: { test: (v) => /^[a-fA-F0-9]{32}$/.test(v), message: 'Use the 32-character id of the Secrets Store.' },
  key_vault_uri: { test: (v) => /^https:\/\/[a-z0-9][a-z0-9-]{1,22}[a-z0-9]\.vault\.(azure\.net|azure\.cn|usgovcloudapi\.net|microsoftazure\.de)\/?$/.test(v), message: 'Use a vault address such as https://my-vault.vault.azure.net.' },
  runtime_identity_id: {
    test: (v) => /^\/subscriptions\/[0-9a-f-]{36}\/resourceGroups\/[A-Za-z0-9_.()-]+\/providers\/Microsoft\.ManagedIdentity\/userAssignedIdentities\/[A-Za-z0-9_-]+$/i.test(v),
    message: 'Use the full resource id of the identity, as the setup template prints it.',
  },
};

/** The values already stored on a connection, for filling the form. Anything absent is an empty string. */
export function readDeployValues(provider: string | undefined, metadata: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of deployFields(provider)) {
    const value = metadata?.[field.key];
    out[field.key] = typeof value === 'string' ? value : '';
  }
  return out;
}

/**
 * Checks what was typed and builds the part of the request that carries it. A required field left empty is an error only when
 * `strict` (a connection being made ready for deploys); otherwise an empty field is simply not sent, so saving the rest of the form
 * never wipes what the connection already holds.
 */
export function deployBody(provider: string | undefined, values: Record<string, string>, strict = false): { body: Record<string, string>; errors: Record<string, string> } {
  const body: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const field of deployFields(provider)) {
    const value = (values[field.key] ?? '').trim();
    if (!value) {
      if (strict && field.required) errors[field.key] = `${field.label} is needed to deploy.`;
      continue;
    }
    const rule = RULES[field.key];
    if (rule && !rule.test(value)) errors[field.key] = rule.message;
    else body[field.key] = value;
  }
  return { body, errors };
}

/** Whether a connection made for deploys is missing something it needs before it can deploy. */
export function deployGaps(provider: string | undefined, metadata: Record<string, unknown> | undefined): string[] {
  const values = readDeployValues(provider, metadata);
  return deployFields(provider).filter((f) => f.required && !values[f.key]).map((f) => f.label);
}

// ---- AWS Fargate: an optional second path on an AWS connection ------------------------------------------------------------------------

/** The fields that let an AWS connection deploy to Fargate. All optional: Lambda needs none of them, and saving the rest of the form never wipes them. */
const FARGATE_FIELDS: IDeployField[] = [
  { key: 'fargate_cluster', label: 'Cluster', placeholder: 'ductape', help: 'The ClusterName output of the ductape-fargate stack.', required: false },
  { key: 'fargate_listener_arn', label: 'HTTPS listener', placeholder: 'arn:aws:elasticloadbalancing:eu-west-2:123456789012:listener/app/ductape/...', help: 'The ListenerArn output. It must be HTTPS: Ductape never sends signed requests over plain HTTP.', required: false },
  { key: 'fargate_base_domain', label: 'Base domain', placeholder: 'deploy.example.com', help: 'The domain every deployment is a name under. Point *.<this domain> at the load balancer.', required: false },
  { key: 'fargate_vpc_id', label: 'VPC', placeholder: 'vpc-0123456789abcdef0', help: 'The VpcId output.', required: false },
  { key: 'fargate_subnets', label: 'Subnets', placeholder: 'subnet-0a1,subnet-0b2', help: 'The SubnetIds output, comma separated.', required: false },
  { key: 'fargate_security_groups', label: 'Task security group', placeholder: 'sg-0123456789abcdef0', help: 'The SecurityGroupId output. It lets the load balancer, and nothing else, reach a task.', required: false },
  { key: 'fargate_task_role_arn', label: 'Task role', placeholder: 'arn:aws:iam::123456789012:role/DuctapeFargateTask', help: 'The TaskRoleArn output: the role your containers run as.', required: false },
  { key: 'fargate_execution_role_arn', label: 'Execution role', placeholder: 'arn:aws:iam::123456789012:role/DuctapeFargateExecution', help: 'The ExecutionRoleArn output: used by ECS to pull images and read the signing key.', required: false },
  { key: 'fargate_log_group', label: 'Log group', placeholder: '/ecs/ductape', help: 'The LogGroup output.', required: false },
];

const ROLE = /^arn:aws[a-z-]*:iam::[0-9]{12}:role\/[A-Za-z0-9_+=,.@/-]+$/;
const ID_LIST = (prefix: string) => (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean).every((x) => new RegExp(`^${prefix}[a-f0-9]+$`).test(x)) && v.trim().length > 0;
const FARGATE_RULES: Record<string, { test: (value: string) => boolean; message: string }> = {
  fargate_cluster: { test: (v) => /^[A-Za-z0-9_-]{1,255}$/.test(v), message: 'Use the cluster name, such as ductape.' },
  fargate_listener_arn: { test: (v) => /^arn:aws[a-z-]*:elasticloadbalancing:[a-z0-9-]+:[0-9]{12}:listener\/app\/[^/]+\/[a-f0-9]+\/[a-f0-9]+$/.test(v), message: 'Use the ARN of an Application Load Balancer listener, the ListenerArn output.' },
  fargate_base_domain: { test: (v) => /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(v), message: 'Use a domain name such as deploy.example.com.' },
  fargate_vpc_id: { test: (v) => /^vpc-[a-f0-9]+$/.test(v), message: 'Use a VPC id such as vpc-0123456789abcdef0.' },
  fargate_subnets: { test: ID_LIST('subnet-'), message: 'Use subnet ids such as subnet-0a1,subnet-0b2.' },
  fargate_security_groups: { test: ID_LIST('sg-'), message: 'Use a security group id such as sg-0123456789abcdef0.' },
  fargate_task_role_arn: { test: (v) => ROLE.test(v), message: 'Use a role ARN such as arn:aws:iam::123456789012:role/DuctapeFargateTask.' },
  fargate_execution_role_arn: { test: (v) => ROLE.test(v), message: 'Use a role ARN such as arn:aws:iam::123456789012:role/DuctapeFargateExecution.' },
  fargate_log_group: { test: (v) => /^[A-Za-z0-9_\-/.#]{1,512}$/.test(v), message: 'Use a log group name such as /ecs/ductape.' },
};

export const fargateFields = (provider: string | undefined): IDeployField[] => (provider === 'aws' ? FARGATE_FIELDS : []);

/**
 * Opt-in: scale releases that no longer serve to zero tasks. Never deletes. Off unless chosen, because it makes a rollback to an older release
 * slower (the release comes back, after a wait, at the size it had).
 */
export const SCALE_DOWN_KEY = 'fargate_scale_down_idle';

/**
 * A load balancer with no internet address (the stack was made with Scheme=internal). Ductape cannot reach it, so each release is checked from
 * inside the customer's network by a small relay function, named here. It is a switch and one text field, not part of the fields that must all be filled.
 */
export const INTERNAL_KEY = 'fargate_internal';
export const VERIFIER_KEY = 'fargate_verifier_function';
export const VERIFIER_FIELD: IDeployField = {
  key: VERIFIER_KEY, label: 'Relay function', placeholder: 'ductape-verifier', required: false,
  help: 'The VerifierFunctionName output of the ductape-fargate stack. It makes each check from inside your network and holds no key.',
};
const VERIFIER_RULE = (v: string) => /^([A-Za-z0-9-_]{1,64}|arn:aws[a-z-]*:lambda:[a-z0-9-]+:[0-9]{12}:function:[A-Za-z0-9-_]{1,64})$/.test(v);

// ---- AWS ECS Express Mode: one more role on top of the Fargate details ----------------------------------------------------------------------

const EXPRESS_FIELD: IDeployField = {
  key: 'express_infrastructure_role_arn', label: 'Express infrastructure role', placeholder: 'arn:aws:iam::123456789012:role/DuctapeExpressInfrastructure',
  help: 'The InfrastructureRoleArn output of the ductape-ecs-express stack: the role AWS uses to build the load balancer. Express also needs the cluster, subnets, roles and log group above.', required: false,
};

export const expressFields = (provider: string | undefined): IDeployField[] => (provider === 'aws' ? [EXPRESS_FIELD] : []);

export function readExpressValues(provider: string | undefined, metadata: Record<string, unknown> | undefined): Record<string, string> {
  const v = metadata?.[EXPRESS_FIELD.key];
  return provider === 'aws' ? { [EXPRESS_FIELD.key]: typeof v === 'string' ? v : '' } : {};
}

/** Checks the Express role the way the server does. Empty is left out, so saving never wipes it. */
export function expressBody(provider: string | undefined, values: Record<string, string>): { body: Record<string, string>; errors: Record<string, string> } {
  const value = (values[EXPRESS_FIELD.key] ?? '').trim();
  if (provider !== 'aws' || !value) return { body: {}, errors: {} };
  return ROLE.test(value) ? { body: { [EXPRESS_FIELD.key]: value }, errors: {} } : { body: {}, errors: { [EXPRESS_FIELD.key]: 'Use a role ARN such as arn:aws:iam::123456789012:role/DuctapeExpressInfrastructure.' } };
}

/** Fills the Express role from pasted stack outputs (the ductape-ecs-express stack). */
export function parseExpressOutputs(text: string): { values: Record<string, string>; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { values: {}, error: 'This is not JSON. Paste the output of: aws cloudformation describe-stacks --stack-name ductape-ecs-express' };
  }
  const root = parsed as { Stacks?: Array<{ Outputs?: unknown }> } | unknown[] | Record<string, unknown>;
  const list = Array.isArray(root) ? root : Array.isArray((root as { Stacks?: Array<{ Outputs?: unknown }> }).Stacks) ? (root as { Stacks: Array<{ Outputs?: unknown }> }).Stacks[0]?.Outputs : undefined;
  const found = Array.isArray(list) ? (list as Array<{ OutputKey?: string; OutputValue?: string }>).find((o) => o && o.OutputKey === 'InfrastructureRoleArn')?.OutputValue : (root as Record<string, unknown>).InfrastructureRoleArn;
  if (typeof found !== 'string' || !found) return { values: {}, error: 'There is no InfrastructureRoleArn in this. Is it from the ductape-ecs-express stack?' };
  return { values: { [EXPRESS_FIELD.key]: found } };
}

/** The Fargate values stored on a connection, for the form. The server keeps lists as lists; the form shows them comma separated. */
export function readFargateValues(provider: string | undefined, metadata: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  // The scale-down switch is not a text field: it is 'true' or 'false', and unchecking it must be sent.
  if (provider === 'aws') out[SCALE_DOWN_KEY] = metadata?.[SCALE_DOWN_KEY] === true || metadata?.[SCALE_DOWN_KEY] === 'true' ? 'true' : 'false';
  if (provider === 'aws') {
    out[INTERNAL_KEY] = metadata?.[INTERNAL_KEY] === true || metadata?.[INTERNAL_KEY] === 'true' ? 'true' : 'false';
    out[VERIFIER_KEY] = typeof metadata?.[VERIFIER_KEY] === 'string' ? (metadata[VERIFIER_KEY] as string) : '';
  }
  for (const field of fargateFields(provider)) {
    const value = metadata?.[field.key];
    out[field.key] = Array.isArray(value) ? value.join(',') : typeof value === 'string' ? value : '';
  }
  return out;
}

/** Checks the Fargate fields the way the server does. An empty field is left out, so saving never wipes what is stored. */
export function fargateBody(provider: string | undefined, values: Record<string, string>): { body: Record<string, string>; errors: Record<string, string> } {
  const body: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const field of fargateFields(provider)) {
    const value = (values[field.key] ?? '').trim();
    if (!value) continue;
    if (!FARGATE_RULES[field.key].test(value)) errors[field.key] = FARGATE_RULES[field.key].message;
    else body[field.key] = value;
  }
  if (provider === 'aws' && (values[INTERNAL_KEY] === 'true' || values[INTERNAL_KEY] === 'false')) body[INTERNAL_KEY] = values[INTERNAL_KEY];
  if (provider === 'aws') {
    const relay = (values[VERIFIER_KEY] ?? '').trim();
    if (relay && !VERIFIER_RULE(relay)) errors[VERIFIER_KEY] = 'Use the relay function\'s name, such as ductape-verifier, or its ARN.';
    else if (relay) body[VERIFIER_KEY] = relay;
    if (values[INTERNAL_KEY] === 'true' && !relay) errors[VERIFIER_KEY] = 'A load balancer that is internal needs its relay function, or releases cannot be checked.';
  }
  if (provider === 'aws' && (values[SCALE_DOWN_KEY] === 'true' || values[SCALE_DOWN_KEY] === 'false')) body[SCALE_DOWN_KEY] = values[SCALE_DOWN_KEY];
  return { body, errors };
}

/** Whether a connection holds everything to deploy to Fargate, and if not, which fields are missing. Nothing configured is not an error: Lambda does not need it. */
export function fargateState(metadata: Record<string, unknown> | undefined): { configured: boolean; missing: string[] } {
  const values = readFargateValues('aws', metadata);
  const filled = FARGATE_FIELDS.filter((f) => values[f.key]);
  if (filled.length === 0) return { configured: false, missing: [] };
  return { configured: filled.length === FARGATE_FIELDS.length, missing: FARGATE_FIELDS.filter((f) => !values[f.key]).map((f) => f.label) };
}

const OUTPUT_TO_FIELD: Record<string, string> = {
  ClusterName: 'fargate_cluster', ListenerArn: 'fargate_listener_arn', BaseDomain: 'fargate_base_domain', VpcId: 'fargate_vpc_id', SubnetIds: 'fargate_subnets',
  SecurityGroupId: 'fargate_security_groups', TaskRoleArn: 'fargate_task_role_arn', ExecutionRoleArn: 'fargate_execution_role_arn', LogGroup: 'fargate_log_group',
};

/**
 * Fills the Fargate fields from pasted stack outputs: the output of `aws cloudformation describe-stacks`, the bare list of outputs, or an object.
 * Nothing is guessed: an input that holds none of the stack's outputs is refused, and a partial one says which are missing.
 */
export function parseFargateOutputs(text: string): { values: Record<string, string>; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { values: {}, error: 'This is not JSON. Paste the output of: aws cloudformation describe-stacks --stack-name ductape-fargate' };
  }
  const root = parsed as { Stacks?: Array<{ Outputs?: unknown }> } | unknown[] | Record<string, unknown>;
  const list = Array.isArray(root) ? root : Array.isArray((root as { Stacks?: Array<{ Outputs?: unknown }> }).Stacks) ? (root as { Stacks: Array<{ Outputs?: unknown }> }).Stacks[0]?.Outputs : undefined;
  const found: Record<string, unknown> = Array.isArray(list)
    ? Object.fromEntries((list as Array<{ OutputKey?: string; OutputValue?: string }>).filter((o) => o && o.OutputKey).map((o) => [o.OutputKey as string, o.OutputValue]))
    : (root as Record<string, unknown>);
  const present = Object.keys(OUTPUT_TO_FIELD).filter((k) => typeof found[k] === 'string' && found[k] !== '');
  // Only a stack made with an internal load balancer has a relay function; having one means the load balancer is internal.
  const relay = typeof found.VerifierFunctionName === 'string' && found.VerifierFunctionName !== '' ? String(found.VerifierFunctionName) : undefined;
  if (present.length === 0) return { values: {}, error: 'None of the ductape-fargate stack outputs are in this. Is it from the right stack?' };
  const values: Record<string, string> = {};
  for (const key of present) values[OUTPUT_TO_FIELD[key]] = String(found[key]);
  if (relay) { values[VERIFIER_KEY] = relay; values[INTERNAL_KEY] = 'true'; }
  const missing = Object.keys(OUTPUT_TO_FIELD).filter((k) => !present.includes(k));
  return missing.length > 0 ? { values, error: `Filled what was there. Missing from the outputs: ${missing.join(', ')}.` } : { values };
}

// ---- A failed validation, explained --------------------------------------------------------------------------------------------------

export interface IAccessGaps {
  title: string;
  /** What is missing, one line each. */
  items: Array<{ label: string; detail?: string }>;
  /** How to put it right, in words. */
  fix: string;
}

interface IValidationResult {
  valid?: boolean;
  message?: string;
  deploy?: {
    checked?: number;
    missing?: string[];
    grantRoles?: Array<{ role: string; covers: string; permissions: string[] }>;
    grantStatements?: Array<{ sid: string; covers: string; actions: string[]; resources: string[] }>;
    assignRole?: string;
    customRole?: string;
    resourceGroup?: string;
  };
}

/** The permissions a connection lacks and what grants them, from a failed validation. Undefined when it failed for another reason. */
export function describeAccessGaps(provider: string | undefined, result: IValidationResult | undefined): IAccessGaps | undefined {
  const deploy = result?.deploy;
  if (!result || result.valid !== false || !deploy?.missing?.length) return undefined;
  const count = deploy.missing.length;
  const title = `Missing ${count} permission${count === 1 ? '' : 's'}${deploy.checked ? ` of ${deploy.checked} checked` : ''}`;
  if (provider === 'gcp' && deploy.grantRoles?.length) {
    return {
      title,
      items: deploy.grantRoles.map((r) => ({ label: r.role, detail: `${r.covers}. Gives ${r.permissions.length} of the missing permission${r.permissions.length === 1 ? '' : 's'}.` })),
      fix: 'Grant these roles to the Ductape service account on the project, all at once, then validate again. A role change can take a minute to apply.',
    };
  }
  if (provider === 'aws' && deploy.grantStatements?.length) {
    return {
      title,
      items: deploy.grantStatements.map((s) => ({ label: s.sid, detail: `${s.covers}. Actions: ${s.actions.join(', ')}.` })),
      fix: 'Update the CloudFormation stack from the latest template, or add these statements to the DuctapeDeploy policy, then validate again. IAM changes can take a minute to apply.',
    };
  }
  if (provider === 'azure') {
    return {
      title,
      items: deploy.missing.map((action) => ({ label: action })),
      fix: `Assign ${deploy.assignRole ?? 'Contributor'} to the service principal on resource group ${deploy.resourceGroup ?? 'you made for Ductape'}, or the "${deploy.customRole ?? 'Ductape Deploy Operator'}" custom role, then validate again. Role changes can take a few minutes.`,
    };
  }
  if (provider === 'cloudflare') {
    return {
      title,
      items: deploy.missing.map((m) => ({ label: m })),
      fix: 'Edit the API token in the Cloudflare dashboard, add these permissions under Permissions (limited to this account), then validate again.',
    };
  }
  return { title, items: deploy.missing.map((m) => ({ label: m })), fix: 'Grant these permissions, then validate again.' };
}

// ---- The setup file a person saves ----------------------------------------------------------------------------------------------

export interface ISetupFile { label: string; filename: string; mime: string; text: string; howTo: string }

/** The template that creates what Ductape builds on, ready to save. AWS gives text, Azure gives a document that is saved as JSON. GCP needs none. */
export function setupFiles(provider: string | undefined, setup: Record<string, unknown> | undefined): ISetupFile[] {
  if (!setup) return [];
  const files: ISetupFile[] = [];
  if (provider === 'aws' && typeof setup.cloudformationTemplate === 'string') {
    files.push({
      label: 'CloudFormation template', filename: 'ductape-deploy.yaml', mime: 'text/yaml', text: setup.cloudformationTemplate,
      howTo: typeof setup.command === 'string' ? setup.command : 'aws cloudformation deploy --stack-name ductape-deploy --template-file ductape-deploy.yaml --capabilities CAPABILITY_NAMED_IAM',
    });
  }
  if (provider === 'aws' && setup.fargate && typeof setup.fargate === 'object') {
    const fargate = setup.fargate as { cloudformationTemplate?: unknown; command?: unknown };
    if (typeof fargate.cloudformationTemplate === 'string') {
      files.push({
        label: 'AWS Fargate stack (optional, run after the first)', filename: 'ductape-fargate.yaml', mime: 'text/yaml', text: fargate.cloudformationTemplate,
        howTo: typeof fargate.command === 'string' ? fargate.command : 'aws cloudformation deploy --stack-name ductape-fargate --template-file ductape-fargate.yaml --capabilities CAPABILITY_NAMED_IAM',
      });
    }
  }
  if (provider === 'aws' && setup.express && typeof setup.express === 'object') {
    const express = setup.express as { cloudformationTemplate?: unknown; command?: unknown };
    if (typeof express.cloudformationTemplate === 'string') {
      files.push({
        label: 'ECS Express Mode stack (optional, run after the Fargate stack)', filename: 'ductape-ecs-express.yaml', mime: 'text/yaml', text: express.cloudformationTemplate,
        howTo: typeof express.command === 'string' ? express.command : 'aws cloudformation deploy --stack-name ductape-ecs-express --template-file ductape-ecs-express.yaml --capabilities CAPABILITY_NAMED_IAM',
      });
    }
  }
  if (provider === 'azure') {
    if (setup.template && typeof setup.template === 'object') {
      files.push({
        label: 'Deployment template', filename: 'ductape-deploy.json', mime: 'application/json', text: `${JSON.stringify(setup.template, null, 2)}\n`,
        howTo: typeof setup.command === 'string' ? `${setup.command} --query properties.outputs` : 'az deployment group create --resource-group <resource group> --template-file ductape-deploy.json',
      });
    }
    if (setup.roleDefinition && typeof setup.roleDefinition === 'object') {
      files.push({
        label: 'Custom role (optional)', filename: 'ductape-deploy-role.json', mime: 'application/json', text: `${JSON.stringify(setup.roleDefinition, null, 2)}\n`,
        howTo: 'az role definition create --role-definition ductape-deploy-role.json',
      });
    }
  }
  return files;
}
