export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'cloudflare' | 'mongodb_atlas' | 'neo4j_aura';

export type CloudSetupLink = {
  label: string;
  href: string;
  description?: string;
};

export type CloudSetupStep = {
  title: string;
  body: string;
};

/** Optional per-feature networking notes (e.g. RDS security groups). */
export type CloudNetworkingGuide = {
  id: string;
  title: string;
  feature: string;
  summary: string;
  steps: CloudSetupStep[];
  optional?: boolean;
};

export type CloudRecommendedRole = {
  roleName: string;
  purpose: string;
  feature: string;
};

export type CloudRecommendedApi = {
  apiLabel: string;
  serviceId: string;
  feature: string;
  purpose: string;
  /** Ductape connection scope that requires this API (storage, broker, database, graph, vector). */
  scope: string;
};

/** What it takes to deploy code from Ductape into the customer's own project. Optional on top of connecting for resources. */
export type CloudDeployGuide = {
  title: string;
  summary: string;
  /** What Ductape will and will not do in the project. */
  safety: string;
  /** Where a deploy leaves its resources: a Google project, an AWS account. */
  container: 'project' | 'account' | 'resource group';
  /** What a deploy leaves there. */
  creates: string[];
  /** APIs to switch on first (Google). */
  apis?: Array<{ apiLabel: string; serviceId: string; purpose: string }>;
  /** Roles to grant (Google). */
  roles?: Array<{ roleName: string; roleId: string; purpose: string }>;
  /** The roles a person creates (AWS) or assigns (Azure), named as the setup names them. */
  accountRoles?: Array<{ roleName: string; purpose: string }>;
  /** A step can carry the list it refers to: the APIs, the roles to grant, or the roles to create. */
  steps: Array<CloudSetupStep & { attach?: 'apis' | 'roles' | 'accountRoles'; command?: string }>;
  troubleshooting: Array<{ problem: string; fix: string }>;
};

export type CloudProviderGuide = {
  label: string;
  shortLabel: string;
  description: string;
  consoleLinks: CloudSetupLink[];
  docLinks: CloudSetupLink[];
  cloudSteps: CloudSetupStep[];
  ductapeFieldHint: string;
  recommendedRoles?: CloudRecommendedRole[];
  recommendedRolesHint?: string;
  recommendedApis?: CloudRecommendedApi[];
  recommendedApisHint?: string;
  networkingGuides?: CloudNetworkingGuide[];
  deployGuide?: CloudDeployGuide;
};

/** Google Cloud Console → IAM for a project, where roles are granted to a service account. */
export function gcpIamUrl(projectId?: string): string {
  const base = 'https://console.cloud.google.com/iam-admin/iam';
  const trimmed = projectId?.trim();
  return trimmed ? `${base}?project=${encodeURIComponent(trimmed)}` : base;
}

/** Google Cloud Console → APIs & Services → Enable API for a project. */
export function gcpApiEnableUrl(serviceId: string, projectId?: string): string {
  const base = `https://console.cloud.google.com/apis/library/${serviceId}`;
  const trimmed = projectId?.trim();
  return trimmed ? `${base}?project=${encodeURIComponent(trimmed)}` : base;
}

export function providerBadgeClass(provider: string) {
  switch (provider) {
    case 'aws':
      return 'bg-orange-500/10 text-orange-700';
    case 'gcp':
      return 'bg-blue-500/10 text-blue-700';
    case 'azure':
      return 'bg-sky-500/10 text-sky-700';
    case 'cloudflare':
      return 'bg-amber-500/10 text-amber-700';
    case 'mongodb_atlas':
      return 'bg-emerald-500/10 text-emerald-700';
    case 'neo4j_aura':
      return 'bg-lime-500/10 text-lime-800';
    default:
      return 'bg-grey-100 text-grey-600';
  }
}

export const CLOUD_PROVIDER_GUIDES: Record<CloudProvider, CloudProviderGuide> = {
  aws: {
    label: 'Amazon Web Services',
    shortLabel: 'AWS',
    description:
      'Link Ductape to an IAM role in your AWS account. Two policies are required: one on the Ductape service IAM user, one on the role trust relationship.',
    consoleLinks: [
      {
        label: 'IAM Users',
        href: 'https://console.aws.amazon.com/iamv2/home#/users',
        description: 'Grant sts:AssumeRole on your service user',
      },
      {
        label: 'IAM Roles',
        href: 'https://console.aws.amazon.com/iamv2/home#/roles',
        description: 'Create and manage roles',
      },
      {
        label: 'Create role wizard',
        href: 'https://console.aws.amazon.com/iamv2/home#/roles/create',
        description: 'Start here for a new role',
      },
      {
        label: 'IAM managed policies',
        href: 'https://console.aws.amazon.com/iamv2/home#/policies',
        description: 'Search and attach S3, SQS, RDS, etc.',
      },
      {
        label: 'EC2 Security Groups',
        href: 'https://console.aws.amazon.com/ec2/home#SecurityGroups:',
        description: 'Pre-configure PostgreSQL access for RDS',
      },
    ],
    docLinks: [
      {
        label: 'IAM roles overview',
        href: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html',
      },
      {
        label: 'Create an IAM role (console)',
        href: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user.html',
      },
    ],
    cloudSteps: [
      {
        title: 'Grant the Ductape IAM user sts:AssumeRole',
        body: 'IAM → Users → select the user whose keys power integrations (local: the user in platform/.env) → Add permissions → Create inline policy → paste the IAM user policy from this tab. Without this, validation fails with “not authorized to perform: sts:AssumeRole”.',
      },
      {
        title: 'Create a role named DuctapeAccess',
        body: 'IAM → Roles → Create role → “Custom trust policy”. Name the role DuctapeAccess so it matches the Resource ARN in the Step 1 IAM user policy (arn:aws:iam::ACCOUNT:role/DuctapeAccess). This is separate from the IAM user policy — the trust policy controls who may assume the role.',
      },
      {
        title: 'Paste the trust policy from Ductape',
        body: 'Copy the trust policy shown below into the role’s trust relationship. It must allow Ductape’s AWS account with the external ID shown in this tab.',
      },
      {
        title: 'Attach permission policies to the role',
        body: 'Attach AWS managed policies for the Ductape features you use (see the list below). These permissions apply after Ductape assumes the role, not to the AssumeRole call itself.',
      },
      {
        title: 'Attach EC2 policy for IP allowlist (RDS / Neptune)',
        body: 'If you use IP allowlist under Private access, add the inline EC2 policy from Step 3 on this tab to DuctapeAccess. Skip if you use VPC connector or your own security groups only.',
      },
      {
        title: 'Copy the Role ARN into Ductape',
        body: 'Finish creating the DuctapeAccess role, copy its ARN (arn:aws:iam::ACCOUNT:role/DuctapeAccess), paste it below, and activate the connection.',
      },
    ],
    deployGuide: {
      title: 'Deploy code with Ductape (optional)',
      summary:
        'Lets Ductape build your source and deploy it to AWS Lambda in your own account, through IAM roles you create and control. This is separate from managing resources: it uses its own roles and the deploy scope on the connection, and one CloudFormation template creates everything it needs.',
      safety:
        'Ductape only adds resources it tags as its own (ductape_managed), never changes or reuses one it did not create, and never deletes anything, including what it created. Removing deployed resources is always your own action. Use a dedicated account if you can, so what Ductape adds is easy to see.',
      container: 'account',
      creates: [
        'An S3 bucket named ductape-source-<account id>-<region>, where your source is uploaded to be built (private, with public access blocked)',
        'One ECR repository per function or service, named ductape/<product>-<name>, holding the built images',
        'A CodeBuild project named ductape-build, and one build per build',
        'One Lambda function per deployed version of a function or service, with a published version for each release and two aliases: cand (a release being checked) and live (what is serving)',
        'One function URL per alias, with IAM authentication, so nobody can call a function without AWS credentials',
        'One Secrets Manager secret per deployed function, under ductape/, holding its signing key (a service gets none)',
        'Only if you also deploy to Fargate: one ECS service and one load balancer target group per release, and two load balancer rules per deployment (one holds the traffic split; the other answers a release being checked, and needs a secret header)',
      ],
      accountRoles: [
        { roleName: 'DuctapeAccess', purpose: 'The role Ductape assumes. It can only touch Lambda functions named ductape-*, ECR repositories and secrets under ductape/, the staging bucket and the build project. A small second policy, DuctapeDeployReport, lets it ask AWS which resources carry Ductape\'s tag (for the orphan report only).' },
        { roleName: 'DuctapeFunctionRuntime', purpose: 'The role your deployed functions run as: logs, and reading their own secrets under ductape/. Add what your functions need to reach.' },
        { roleName: 'DuctapeBuild', purpose: 'The role your builds run as: reading the uploaded source, pushing images and writing logs.' },
      ],
      steps: [
        { title: 'Choose a region', body: 'Pick a region where Lambda, Lambda function URLs, CodeBuild and ECR are available, for example eu-west-2. New AWS accounts have lower Lambda memory and concurrency limits and run one CodeBuild build at a time; ask for increases in Service Quotas if you need them.' },
        { title: 'Create a deploy connection and save the template', body: 'Tick "Use this connection to deploy code with Ductape" when you create the connection, or create it from a terminal or an assistant using the MCP server with the command below. Either way it carries the deploy scope. It saves a CloudFormation template that creates the roles, and prints the external id the access role will require.', command: 'ductape cloud connections create --provider aws --name "<name>" --tag <tag> --deploy --save-template ductape-deploy.yaml' },
        { attach: 'accountRoles' as const, title: 'Create the roles with one CloudFormation stack', body: 'Read the template first: nothing in it can be used by anyone but the Ductape account holding your external id. Then run the command below in your account. It creates the three roles and attaches the DuctapeDeploy policy to the access role. Without CloudFormation you can create the roles yourself; the policy is in the create response.', command: 'aws cloudformation deploy --stack-name ductape-deploy --template-file ductape-deploy.yaml --capabilities CAPABILITY_NAMED_IAM --region <region>' },
        { title: 'Complete the connection with the three roles', body: 'Give Ductape the ARNs of the roles the stack created.', command: 'ductape cloud connections complete <tag> --role-arn arn:aws:iam::<account id>:role/DuctapeAccess --runtime-role-arn arn:aws:iam::<account id>:role/DuctapeFunctionRuntime --build-role-arn arn:aws:iam::<account id>:role/DuctapeBuild --default-region <region>' },
        { title: 'Validate', body: 'A failure names each missing permission and the policy statement that grants it, and checks that the runtime and build roles trust Lambda and CodeBuild. Update the stack from the latest template and validate again.', command: 'ductape cloud connections validate <tag>' },
        { title: 'Optional: deploy to Fargate as well', body: 'Fargate runs each release as its own ECS service behind a load balancer in your account, with weighted traffic between releases. It needs a domain you own and an ACM wildcard certificate for it (*.deploy.example.com in the same region). Save the Fargate stack, run it, point the wildcard DNS record at the LoadBalancerDnsName output, then paste the stack outputs into Fargate in the form above. A release that stops taking traffic keeps running until you remove it (or switch on scale-down below), and a function is protected by its signature check alone. To limit who can reach the load balancer, pass AllowedPrefixListId (a managed prefix list that includes the addresses Ductape calls from, shown as controlPlaneAddresses in the connection response); a load balancer with no internet address (Scheme=internal) is supported too: the stack adds a relay function inside your VPC that checks each release from within.', command: 'ductape cloud connections get <tag> --save-fargate-template ductape-fargate.yaml && aws cloudformation deploy --stack-name ductape-fargate --template-file ductape-fargate.yaml --capabilities CAPABILITY_NAMED_IAM --region <region> --parameter-overrides VpcId=<vpc id> SubnetIds=<subnet a>,<subnet b> CertificateArn=<certificate arn> BaseDomain=<deploy.example.com>' },
        { title: 'Build and deploy', body: 'Once the connection is active, build with ductape deploy builds create (your Dockerfile is used), plan and apply, and watch the result under Deployments in the product.' },
      ],
      troubleshooting: [
        { problem: 'Validation lists missing permissions', fix: 'The DuctapeAccess role is missing statements of the DuctapeDeploy policy. Re-run the CloudFormation stack from the latest template, or add the statements named in the message, then validate again. IAM changes can take a minute to apply.' },
        { problem: '"The role defined for the function cannot be assumed by Lambda"', fix: 'Check that DuctapeFunctionRuntime trusts lambda.amazonaws.com. A role created moments ago can take a minute or two to be usable; a wrong trust policy will not fix itself.' },
        { problem: '403 Forbidden when Ductape checks a new release', fix: 'The access role needs both lambda:InvokeFunctionUrl and lambda:InvokeFunction. They are in the template; add them if you wrote the policy by hand, and wait a minute.' },
        { problem: '"is not authorized to perform: iam:PassRole"', fix: 'DuctapeAccess may hand only DuctapeFunctionRuntime to Lambda and only DuctapeBuild to CodeBuild. Complete the connection with exactly those role ARNs.' },
        { problem: 'Builds wait a long time or are refused', fix: 'New AWS accounts can run one CodeBuild build at a time. Wait for the running build, or ask for an increase in Service Quotas.' },
        { problem: 'A function is Failed with ImageAccessDenied or InvalidImage', fix: 'Do not add expiry rules to the ECR repositories under ductape/, and do not push images there yourself. Ductape builds images so Lambda can run them; an image pushed another way may be one Lambda cannot use.' },
        { problem: 'A function that was not called for weeks fails on its first call', fix: 'Lambda puts idle container functions to sleep and refuses the first call while it wakes. Call again; deploying a new release always wakes it.' },
        { problem: 'Fargate: validation says the listener is HTTP, not HTTPS', fix: 'Use the ListenerArn output of the ductape-fargate stack, which is HTTPS. Ductape will not send signed requests over plain HTTP.' },
        { problem: 'Fargate: a new release never becomes healthy', fix: 'Read the service events and the /ecs/ductape log group. The usual causes are a container that does not listen on the declared port (a function listens on 8080), tasks that cannot pull the image because the subnets have no route to the internet, or a security group that blocks the load balancer.' },
        { problem: 'The connection says it was not created for deploys', fix: 'Create it with --deploy so it carries the deploy scope. A connection made for resources only cannot build or deploy.' },
      ],
    },
    ductapeFieldHint:
      'Paste the DuctapeAccess role ARN after both the IAM user policy and role trust policy are in place.',
    recommendedRolesHint:
      'In IAM → Roles → your role → Add permissions → Attach policies, search for each policy by name.',
    recommendedRoles: [
      {
        roleName: 'AmazonS3FullAccess',
        purpose: 'List, read, and write S3 buckets',
        feature: 'Storage',
      },
      {
        roleName: 'AmazonSQSFullAccess',
        purpose: 'Manage SQS queues for messaging',
        feature: 'Message brokers',
      },
      {
        roleName: 'AmazonRDSFullAccess',
        purpose:
          'Manage RDS instances. Register security groups on the connection and pass securityGroups tags when provisioning.',
        feature: 'Databases',
      },
      {
        roleName: 'NeptuneFullAccess',
        purpose:
          'Manage Neptune clusters. Register security groups on the connection and pass securityGroups tags when provisioning.',
        feature: 'Graphs',
      },
      {
        roleName: 'AmazonOpenSearchServiceFullAccess',
        purpose: 'Manage OpenSearch domains for vector search',
        feature: 'Vectors',
      },
    ],
    networkingGuides: [
      {
        id: 'aws-vpc',
        title: 'AWS security groups',
        feature: 'RDS · Neptune',
        summary:
          'Required for RDS and Neptune. Allow inbound from your app servers and the Ductape proxy on TCP 5432/3306 (RDS — PostgreSQL/MySQL) and 8182 (Neptune). Ductape never calls ec2:AuthorizeSecurityGroupIngress — no EC2 write IAM on your role.',
        steps: [
          {
            title: 'Direct connections (SDK + proxy)',
            body: 'Your app servers and the Ductape proxy both connect directly to RDS/Neptune endpoints. Security groups must allow inbound from both — not just your office IP.',
          },
          {
            title: 'RDS — TCP 5432 (PostgreSQL) or 3306 (MySQL)',
            body: 'EC2 → Security Groups → inbound TCP 5432 for PostgreSQL or TCP 3306 for MySQL — match the engine of the instance you provisioned — from your app security group (same VPC) or egress IP, plus your Ductape proxy source. RDS is publicly accessible by default.',
          },
          {
            title: 'Neptune — TCP 8182',
            body: 'Inbound TCP 8182 (Gremlin/WebSocket) from app and proxy sources. Neptune is VPC-only — callers need a network path into the VPC.',
          },
          {
            title: 'Register on connection',
            body: 'Workbench → Security groups tab (or connections.updateSecurityGroups). Pass securityGroups: ["your-tag"] on provision, cloud link, and env config.',
          },
          {
            title: 'Not required for S3, SQS, OpenSearch',
            body: 'S3 buckets and SQS queues are not VPC-scoped. OpenSearch domains are provisioned with a public HTTPS endpoint.',
          },
        ],
      },
    ],
  },
  gcp: {
    label: 'Google Cloud',
    shortLabel: 'GCP',
    description:
      'Connect with a service account that has access to the GCP APIs you use in products. Enable each Google Cloud API before linking or provisioning that feature.',
    consoleLinks: [
      {
        label: 'APIs & Services library',
        href: 'https://console.cloud.google.com/apis/library',
        description: 'Enable Cloud Storage, Cloud SQL, Pub/Sub, Spanner, Vertex AI, …',
      },
      {
        label: 'Service accounts',
        href: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
        description: 'Create accounts and keys',
      },
      {
        label: 'IAM & Admin',
        href: 'https://console.cloud.google.com/iam-admin',
        description: 'Project permissions',
      },
    ],
    docLinks: [
      {
        label: 'Create service accounts',
        href: 'https://cloud.google.com/iam/docs/creating-managing-service-accounts',
      },
      {
        label: 'Create and manage keys',
        href: 'https://cloud.google.com/iam/docs/keys-create-delete',
      },
    ],
    cloudSteps: [
      {
        title: 'Enable Google Cloud APIs for your features',
        body: 'APIs & Services → Library → search and enable each API listed below for the Ductape features you use (at minimum those on your connection scopes). Activation and resource listing call these APIs directly — if an API is disabled you will see errors like “Cloud SQL Admin API has not been used in project …”. Wait a few minutes after enabling, then retry.',
      },
      {
        title: 'Create a service account',
        body: 'In Google Cloud Console → IAM & Admin → Service Accounts, create a service account for Ductape (e.g. ductape-workspace).',
      },
      {
        title: 'Grant IAM roles on your project',
        body: 'On the service account → Permissions → Grant access, add the IAM roles listed below for the same features you enabled APIs for. Storage Admin is required when the connection includes Storage scope.',
      },
      {
        title: 'Create a JSON key',
        body: 'On the service account → Keys → Add key → Create new key → JSON. Download the file — you will paste its contents below.',
      },
      {
        title: 'Enter project ID and key in Ductape',
        body: 'Copy your GCP project ID and the full contents of the JSON key file into the fields below.',
      },
    ],
    ductapeFieldHint: 'Use the same project ID and service account JSON you created in GCP.',
    deployGuide: {
      title: 'Deploy code with Ductape (optional)',
      summary:
        'Lets Ductape build your source and deploy it to Cloud Run in your own project, using the service account you create and control. This is separate from managing resources: it needs its own APIs, roles and the deploy scope on the connection.',
      safety:
        'Ductape only adds resources it labels as its own (ductape_managed), never changes or reuses one it did not create, and never deletes anything, including what it created. Removing deployed resources is always your own action. Use a dedicated project if you can, so what Ductape adds is easy to see.',
      container: 'project',
      creates: [
        'A Cloud Storage bucket named <project id>-ductape-source, where your source is uploaded to be built',
        'An Artifact Registry repository named "ductape" in the region you build in, holding the built images',
        'One Cloud Build per build',
        'One Cloud Run service per deployed version of a function or service (private: callers need an identity token)',
        'One Secret Manager secret per deployed function, holding its signing key (a service gets none)',
      ],
      apis: [
        { apiLabel: 'Cloud Run Admin API', serviceId: 'run.googleapis.com', purpose: 'Create and update the services that run your code' },
        { apiLabel: 'Cloud Build API', serviceId: 'cloudbuild.googleapis.com', purpose: 'Build your source into an image' },
        { apiLabel: 'Artifact Registry API', serviceId: 'artifactregistry.googleapis.com', purpose: 'Store the built images' },
        { apiLabel: 'Secret Manager API', serviceId: 'secretmanager.googleapis.com', purpose: 'Hold each function\'s signing key' },
        { apiLabel: 'Cloud Storage API', serviceId: 'storage.googleapis.com', purpose: 'Stage uploaded source for builds' },
        { apiLabel: 'Cloud Resource Manager API', serviceId: 'cloudresourcemanager.googleapis.com', purpose: 'Read the project to find its number' },
        { apiLabel: 'Identity and Access Management (IAM) API', serviceId: 'iam.googleapis.com', purpose: 'Run services as the runtime service account' },
      ],
      roles: [
        { roleName: 'Cloud Run Admin', roleId: 'roles/run.admin', purpose: 'Create and update Cloud Run services, move traffic, and let the service account call them' },
        { roleName: 'Cloud Build Editor', roleId: 'roles/cloudbuild.builds.editor', purpose: 'Start source builds and read their result' },
        { roleName: 'Artifact Registry Administrator', roleId: 'roles/artifactregistry.admin', purpose: 'Create the image repository and read built images' },
        { roleName: 'Secret Manager Admin', roleId: 'roles/secretmanager.admin', purpose: 'Create each deployment\'s signing-key secret and let the runtime account read it' },
        { roleName: 'Storage Admin', roleId: 'roles/storage.admin', purpose: 'Create the source staging bucket and read uploaded source' },
        { roleName: 'Service Account User', roleId: 'roles/iam.serviceAccountUser', purpose: 'Deploy a service that runs as the runtime service account' },
        { roleName: 'Browser', roleId: 'roles/browser', purpose: 'Read the project to find its number' },
      ],
      steps: [
        { attach: 'apis' as const, title: 'Enable the seven APIs', body: 'Open each API below and press Enable. A switched-off API makes a deploy fail with "has not been used in project … or it is disabled", and a freshly enabled one can take a minute or two to switch on.' },
        { attach: 'roles' as const, title: 'Grant the seven roles', body: 'In IAM, grant the roles below to the service account you created above, on the project. The account needs all seven at once: some IAM screens replace the roles an account already has instead of adding to them, so afterwards open the account and check it lists all seven. Validation names any role still missing.' },
        { title: 'Create a deploy connection', body: 'Tick "Use this connection to deploy code with Ductape" when you create the connection, or from a terminal: ductape cloud connections create --provider gcp --name "<name>" --tag <tag> --deploy. Then: ductape cloud connections complete <tag> --service-account-file <path to the key file>, and optionally --runtime-service-account <email> for the account your services run as. The key stays on your disk and is never printed or pasted.' },
        { title: 'Validate', body: 'Run ductape cloud connections validate <tag>. A failure lists exactly which permissions are missing and which roles grant them. Grant those, wait a minute, and validate again.' },
        { title: 'Build and deploy', body: 'Once the connection is active, build with ductape deploy builds create, plan and apply, and watch the result under Deployments in the product.' },
      ],
      troubleshooting: [
        { problem: '"<API> has not been used in project <id> before or it is disabled"', fix: 'Enable that API (step 1), wait a minute or two, and try again.' },
        { problem: 'Validation lists missing permissions and the roles that grant them', fix: 'Grant exactly those roles to the Ductape service account on the project (step 2) and validate again.' },
        { problem: '"caller does not have permission to act as service account …" when a build or deploy starts', fix: 'Grant roles/iam.serviceAccountUser to the Ductape service account on the project. Cloud Build and Cloud Run run as a service account, and the Ductape account must be allowed to act as it.' },
        { problem: 'A role you granted is reported missing again, or one that was there before has gone', fix: 'Some IAM screens replace the roles on an account instead of adding to them. Open the Ductape service account in IAM, check that it holds all seven roles together, and validate again.' },
        { problem: 'A build fails with a permission error', fix: 'Builds run as Cloud Build\'s own service account, shown in the build log. Give that account roles/artifactregistry.writer, roles/logging.logWriter and roles/storage.objectViewer.' },
        { problem: 'The connection says it was not created for deploys', fix: 'Create it with --deploy so it carries the deploy scope. A connection made for resources only cannot build or deploy.' },
        { problem: 'A deployed service answers 401 or 403 in a browser', fix: 'That is intended. Services are private and Ductape calls them with an identity token. Making one public is a separate, approved step that does not exist yet.' },
      ],
    },
    recommendedRolesHint:
      'In Google Cloud Console → IAM & Admin → Service Accounts → your account → Permissions → Grant access, add each role at project level for the features you use.',
    recommendedApisHint:
      'Enable these under APIs & Services → Library before activating the connection or linking resources. Match APIs and IAM roles to the connection scopes you selected.',
    recommendedApis: [
      {
        apiLabel: 'Cloud Storage API',
        serviceId: 'storage.googleapis.com',
        feature: 'Storage',
        purpose: 'List and manage GCS buckets',
        scope: 'storage',
      },
      {
        apiLabel: 'Cloud Pub/Sub API',
        serviceId: 'pubsub.googleapis.com',
        feature: 'Message brokers',
        purpose: 'List and manage Pub/Sub topics',
        scope: 'broker',
      },
      {
        apiLabel: 'Firebase Cloud Messaging API',
        serviceId: 'fcm.googleapis.com',
        feature: 'Notifications',
        purpose: 'Send Firebase push notifications using the linked service account',
        scope: 'notifications',
      },
      {
        apiLabel: 'Cloud SQL Admin API',
        serviceId: 'sqladmin.googleapis.com',
        feature: 'Databases',
        purpose: 'List and provision Cloud SQL (PostgreSQL) instances',
        scope: 'database',
      },
      {
        apiLabel: 'Cloud Spanner API',
        serviceId: 'spanner.googleapis.com',
        feature: 'Graphs',
        purpose: 'List and manage Spanner instances for graph workloads',
        scope: 'graph',
      },
      {
        apiLabel: 'Vertex AI API',
        serviceId: 'aiplatform.googleapis.com',
        feature: 'Vectors',
        purpose: 'Manage Vertex AI Vector Search index endpoints',
        scope: 'vector',
      },
    ],
    recommendedRoles: [
      {
        roleName: 'Storage Admin',
        purpose: 'Manage GCS buckets and objects (required for setup validation)',
        feature: 'Storage',
      },
      {
        roleName: 'Pub/Sub Admin',
        purpose: 'Manage Pub/Sub topics and subscriptions',
        feature: 'Message brokers',
      },
      {
        roleName: 'Cloud SQL Admin',
        purpose: 'Manage and connect to Cloud SQL instances',
        feature: 'Databases',
      },
      {
        roleName: 'Cloud Spanner Admin',
        purpose: 'Manage Spanner instances for graph workloads',
        feature: 'Graphs',
      },
      {
        roleName: 'Vertex AI Administrator',
        purpose: 'Manage Vertex AI Vector Search index endpoints',
        feature: 'Vectors',
      },
      {
        roleName: 'Firebase Cloud Messaging API Admin',
        purpose: 'Send push notifications through the Firebase Cloud Messaging API',
        feature: 'Notifications',
      },
    ],
  },
  azure: {
    label: 'Microsoft Azure',
    shortLabel: 'Azure',
    description:
      'Connect with an Azure AD app registration (service principal) to link storage, Service Bus, PostgreSQL, Cosmos DB Gremlin, and Azure AI Search.',
    consoleLinks: [
      {
        label: 'App registrations',
        href: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
        description: 'Create a service principal + client secret',
      },
      {
        label: 'Subscriptions',
        href: 'https://portal.azure.com/#view/Microsoft_Azure_Billing/SubscriptionsBlade',
        description: 'Copy subscription ID',
      },
      {
        label: 'IAM (role assignments)',
        href: 'https://portal.azure.com/#view/Microsoft_Azure_Policy/PolicyMenuBlade/~/Overview',
        description: 'Grant roles at subscription or resource group',
      },
      {
        label: 'Azure Portal home',
        href: 'https://portal.azure.com/',
      },
    ],
    docLinks: [
      {
        label: 'Register an application',
        href: 'https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app',
      },
      {
        label: 'Add a client secret',
        href: 'https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials',
      },
      {
        label: 'Assign Azure roles',
        href: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal',
      },
    ],
    cloudSteps: [
      {
        title: 'Register an app (service principal)',
        body: 'Microsoft Entra ID → App registrations → New registration. Copy the Application (client) ID and Directory (tenant) ID.',
      },
      {
        title: 'Create a client secret',
        body: 'On the app → Certificates & secrets → New client secret. Copy the value immediately — you will paste it below.',
      },
      {
        title: 'Assign RBAC roles on your subscription',
        body: 'Subscription → Access control (IAM) → Add role assignment. Grant the roles listed below for each Ductape feature you use (storage, queues, databases, graphs, vectors).',
      },
      {
        title: 'Register required resource providers',
        body: 'Subscription → Resource providers. Search and Register the providers for each Ductape feature you use: Microsoft.DBforPostgreSQL and Microsoft.DBforMySQL (databases), Microsoft.DocumentDB (graphs), Microsoft.Search (vectors), Microsoft.ServiceBus (messaging), Microsoft.Storage (storage). This is per-subscription and one-time — without it, provisioning fails with “The subscription is not registered to use namespace …”. Registration can take a few minutes.',
      },
      {
        title: 'Enter credentials in Ductape',
        body: 'Paste tenant ID, subscription ID, client ID, and client secret below. Optionally set a default region (e.g. eastus).',
      },
    ],
    deployGuide: {
      title: 'Deploy code with Ductape (optional)',
      summary:
        'Lets Ductape build your source and deploy it to Azure Container Apps in your own subscription, through a service principal that can work in one resource group you create. This is separate from managing resources: it uses the deploy scope on the connection, and one deployment template creates everything it builds on.',
      safety:
        'Ductape only adds resources it tags as its own (ductape_managed), never changes or reuses one it did not create, and never deletes anything, including what it created. It never registers resource providers or changes anything outside the one resource group. Removing deployed resources is always your own action.',
      container: 'resource group',
      creates: [
        'One container app per deployed version of a function or service, named ductape-<workspace>-<name>-<version>-<env>, in your container apps environment',
        'One revision per release, with a cand label for a release being checked; the revision serving traffic is always named explicitly, so a new release never takes traffic by accident',
        'One image per build in your registry, named <product>-<name>, built by Container Registry Tasks from your Dockerfile',
        'A sign-in check on each app (Container Apps authentication) so nobody can call it without a token from your own service principal; the app is only opened after that check is in place',
        'One app secret per deployed function holding its signing key (a service gets none)',
      ],
      accountRoles: [
        { roleName: 'Contributor (or the "Ductape Deploy Operator" custom role)', purpose: 'Assigned to the service principal on the one resource group you create for Ductape, and nowhere else. The custom role cannot delete anything, read secrets or assign roles.' },
        { roleName: 'AcrPull on the registry, for the runtime identity', purpose: 'The setup template assigns it, so your container apps can pull the images Ductape builds.' },
      ],
      steps: [
        { title: 'Make a resource group and register the providers', body: 'Pick a location where Container Apps is available, for example uksouth, and create the group. A subscription owner then registers four resource providers once (Microsoft.App, Microsoft.ContainerRegistry, Microsoft.OperationalInsights, Microsoft.ManagedIdentity); Ductape cannot do this for you. Registry builds are refused on free-credit and some trial subscriptions, so use a pay-as-you-go subscription.', command: 'az group create --name ductape-deploy --location <location>' },
        { title: 'Create a deploy connection and save the template', body: 'Tick "Use this connection to deploy code with Ductape" when you create the connection, or create it from a terminal or an assistant using the MCP server with the command below. Either way it carries the deploy scope. It saves a deployment template and prints the custom role definition once the connection knows your resource group.', command: 'ductape cloud connections create --provider azure --name "<name>" --tag <tag> --deploy --save-template ductape-deploy.json' },
        { title: 'Deploy the template into the resource group', body: 'Read it first. It creates an identity for your apps to run as, a container registry, a log workspace and a container apps environment, and lets the identity pull from the registry. The role assignment in it needs you to hold Owner or User Access Administrator on the group. The outputs give the registry name, environment name and identity id used below.', command: 'az deployment group create --resource-group ductape-deploy --template-file ductape-deploy.json --query properties.outputs' },
        { attach: 'accountRoles' as const, title: 'Create a service principal that can work in that group only', body: 'The first command prints appId (the client id), password (the client secret) and tenant. Put the password in an environment variable with the second command so it stays out of your command line and shell history.', command: 'az ad sp create-for-rbac --name ductape-deploy --role Contributor --scopes /subscriptions/<subscription id>/resourceGroups/ductape-deploy' },
        { title: 'Complete the connection with where Ductape works', body: 'Give Ductape the tenant, subscription, client id and the template outputs. The secret is read from the environment variable you set, never typed into the command.', command: 'ductape cloud connections complete <tag> --tenant-id <tenant id> --subscription-id <subscription id> --client-id <client id> --client-secret-env AZURE_CLIENT_SECRET --default-location <location> --resource-group ductape-deploy --registry-name <registry name> --environment-name <environment name> --runtime-identity-id <identity id>' },
        { title: 'Validate', body: 'A failure names each missing permission and each resource provider that is not registered, and checks that the environment, registry and identity are there. Role changes can take a few minutes to apply.', command: 'ductape cloud connections validate <tag>' },
        { title: 'Build and deploy', body: 'Once the connection is active, build with ductape deploy builds create (your Dockerfile is used, and the folder you upload is the build context), plan and apply, and watch the result under Deployments in the product.' },
      ],
      troubleshooting: [
        { problem: 'Validation lists missing permissions', fix: 'The service principal lacks actions on the resource group. Assign Contributor on it, or the "Ductape Deploy Operator" role shown by the create response, then validate again. Role changes can take a few minutes.' },
        { problem: '"MissingSubscriptionRegistration" or a resource provider is not registered', fix: 'A subscription owner registers each provider once: az provider register --namespace Microsoft.App --wait (and Microsoft.ContainerRegistry, Microsoft.OperationalInsights, Microsoft.ManagedIdentity). Ductape never changes subscription settings.' },
        { problem: 'Builds fail with "ACR tasks are not permitted" or similar', fix: 'Azure does not run registry builds on free-credit and some trial subscriptions. Use a pay-as-you-go subscription.' },
        { problem: 'A container app cannot pull its image', fix: 'The runtime identity needs AcrPull on the registry; the setup template assigns it. If you made the registry another way, assign it yourself, and check the registry has not turned off Azure Resource Manager tokens (az acr config authentication-as-arm update -r <registry> --status enabled).' },
        { problem: 'The deployed app answers 401 in a browser', fix: 'That is intended. Apps check sign-in tokens from your service principal; Ductape calls them with one.' },
        { problem: 'The connection says it was not created for deploys', fix: 'Create it with --deploy so it carries the deploy scope.' },
      ],
    },
    ductapeFieldHint:
      'Service principal credentials unlock all Azure resource types in Ductape (not storage-only).',
    recommendedRolesHint:
      'Simplest path: assign Owner or Contributor on your subscription or a dedicated resource group (e.g. ductape-cloud). That one control-plane role covers PostgreSQL Flexible Server, Cosmos DB (Gremlin), Azure AI Search, Service Bus namespaces, and storage accounts — including provision, list/import, and reading Cosmos/Search keys. Owner = Contributor plus the ability to assign roles to others. You still need the two data-plane roles below: Owner/Contributor do not grant blob or queue access when Ductape signs in with your service principal. Skip niche roles like DocumentDB Account Contributor (manage-only, no key access) — they are not sufficient on their own.',
    recommendedRoles: [
      {
        roleName: 'Owner (or Contributor)',
        purpose:
          'All control plane — PostgreSQL, Cosmos Gremlin, AI Search, resource groups, list/import, read account and admin keys. Use Contributor if the SP does not need to assign roles.',
        feature: 'Databases · Graphs · Vectors · browse',
      },
      {
        roleName: 'Storage Blob Data Contributor',
        purpose: 'Blob list/read/write via Entra ID — required in addition to Owner/Contributor',
        feature: 'Storage',
      },
      {
        roleName: 'Azure Service Bus Data Owner',
        purpose: 'Service Bus queue access via Entra ID — required in addition to Owner/Contributor',
        feature: 'Messaging',
      },
    ],
  },
  cloudflare: {
    label: 'Cloudflare',
    shortLabel: 'Cloudflare',
    description:
      'Connect a Cloudflare account to deploy TypeScript functions to Workers with an API token you create. A Cloudflare connection is for deploying code only.',
    consoleLinks: [
      { label: 'Account API tokens', href: 'https://dash.cloudflare.com/?to=/:account/api-tokens', description: 'Create the token Ductape uses' },
      { label: 'Workers & Pages', href: 'https://dash.cloudflare.com/?to=/:account/workers-and-pages', description: 'Your account id and workers.dev subdomain' },
    ],
    docLinks: [
      { label: 'Create an API token', href: 'https://developers.cloudflare.com/fundamentals/api/get-started/create-token/' },
      { label: 'Gradual deployments', href: 'https://developers.cloudflare.com/workers/configuration/versions-and-deployments/gradual-deployments/' },
    ],
    cloudSteps: [
      { title: 'Find your account id', body: 'Open Workers & Pages in the dashboard. The 32-character account id is shown on the right. Check the account has a workers.dev subdomain.' },
      { title: 'Create an API token', body: 'Manage Account, Account API Tokens, Create Token, Create Custom Token. Add Account / Workers Scripts / Edit and Account / Workers KV Storage / Edit, limit it to this account and create it. Cloudflare shows it once.' },
      { title: 'Enter them in Ductape', body: 'Paste the account id and the token below, then activate the connection.' },
    ],
    ductapeFieldHint: 'The account id and an API token with the two Workers permissions. The token is stored as a workspace secret and never shown again.',
    deployGuide: {
      title: 'Deploy code with Ductape',
      summary:
        'Lets Ductape deploy your TypeScript functions to Cloudflare Workers in your own account, through an API token you create and can read. Workers have no container: you publish a JavaScript bundle, which waits in a Workers KV namespace in your account until it is deployed.',
      safety:
        'Ductape only adds resources it tags as its own (ductape_managed), never changes or reuses one it did not create, and never deletes anything, including what it created. Removing deployed Workers is always your own action. A Worker has no cloud-level access check in front of it: the function\'s own signature check, which every call must pass, is the access control. Only functions can run on Workers, not services, and only TypeScript functions. The bundle passes through the control plane in memory on its way into your account and is not kept.',
      container: 'account',
      creates: [
        'A Workers KV namespace named ductape-releases, where each release bundle waits until it is deployed (the bundle stays in your account; Ductape keeps only its digest)',
        'One Worker per deployed version of a function, tagged ductape_managed and ductape_workspace',
        'One Worker version per release, tagged with the release hash, carrying the deployment\'s signing key as a secret binding',
        'One deployment per traffic change: Cloudflare\'s own gradual rollout, with the percentages you plan',
        'A workers.dev address for each Worker and a preview address for each version, so a release is called and checked before it takes any traffic',
      ],
      accountRoles: [
        { roleName: 'Account / Workers Scripts / Edit', purpose: 'Create Worker versions and deployments, and the placeholder that stands in until a release is checked.' },
        { roleName: 'Account / Workers KV Storage / Edit', purpose: 'Keep release bundles in a namespace named ductape-releases until they are deployed.' },
      ],
      steps: [
        { title: 'Create a deploy connection', body: 'Choose Cloudflare when you create the connection. It is made for deploys, so the deploy scope is set for you. From a terminal: ductape cloud connections create --provider cloudflare --name "<name>" --tag <tag> --deploy.' },
        { attach: 'accountRoles' as const, title: 'Create an API token with two permissions', body: 'Create the token in the dashboard with exactly the permissions below, limited to this account. Put it in an environment variable if you use the CLI: read -s CLOUDFLARE_API_TOKEN && export CLOUDFLARE_API_TOKEN.' },
        { title: 'Complete the connection', body: 'Give Ductape the account id and the token. From a terminal the token is read from the environment variable, never typed into the command.', command: 'ductape cloud connections complete <tag> --account-id <account id> --api-token-env CLOUDFLARE_API_TOKEN' },
        { title: 'Validate', body: 'It checks the token is live, that it can reach Workers and Workers KV, and that the account has a workers.dev subdomain. A missing permission is named. Write access is proved by the first deploy.', command: 'ductape cloud connections validate <tag>' },
        { title: 'Publish a release and deploy', body: 'Publish a bundle (your entry file is bundled here with esbuild, or pass one you built), then plan and apply with a target of kind cloudflare_workers on this connection.', command: 'ductape deploy releases publish-worker --file release.json --connection <tag> --entry src/index.ts' },
      ],
      troubleshooting: [
        { problem: 'Validation says the token lacks permissions', fix: 'Edit the API token and add Account / Workers Scripts / Edit and Account / Workers KV Storage / Edit, limited to this account, then validate again.' },
        { problem: '"has no workers.dev subdomain"', fix: 'Set one under Workers & Pages in the dashboard. Deployed functions are reached on it.' },
        { problem: '"not in this Cloudflare account (namespace ductape-releases)"', fix: 'Publish the bundle again with ductape deploy releases publish-worker. Releases are published through one connection and deployed through the same one.' },
        { problem: 'A plan says this release is a container image, or a Worker bundle', fix: 'A release is made of one kind of artifact. Bundles run only on Cloudflare Workers targets and images only on the others.' },
        { problem: 'A plan is blocked on timeout', fix: 'A Worker is stopped after 30 seconds of CPU time. Lower the contract\'s timeout_ms, or deploy that function to Cloud Run, Lambda or Container Apps.' },
        { problem: 'Cloudflare refuses cpu, memory or instance settings', fix: 'Cloudflare manages size and scaling. Remove the runtime block from the plan.' },
        { problem: 'Cloudflare only keeps the last 100 versions', fix: 'Rolling back to a release older than that fails with a clear message. Publish and deploy it again.' },
      ],
    },
  },
  mongodb_atlas: {
    label: 'MongoDB Atlas',
    shortLabel: 'Atlas',
    description:
      'Connect with Atlas API keys so Ductape can whitelist proxy IPs on your project network access list.',
    consoleLinks: [
      {
        label: 'Atlas Projects',
        href: 'https://cloud.mongodb.com/v2#/org',
        description: 'Open your project and copy the project ID',
      },
      {
        label: 'API Keys',
        href: 'https://www.mongodb.com/docs/atlas/configure-api-access/',
        description: 'Create programmatic API keys',
      },
      {
        label: 'Network Access',
        href: 'https://www.mongodb.com/docs/atlas/security/ip-access-list/',
        description: 'IP access list (allowlist)',
      },
    ],
    docLinks: [
      {
        label: 'Configure API access',
        href: 'https://www.mongodb.com/docs/atlas/configure-api-access/',
      },
      {
        label: 'Add IPs to the access list',
        href: 'https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/',
      },
    ],
    cloudSteps: [
      {
        title: 'Create Atlas API keys',
        body:
          'In the project sidebar, go to Security → Project Identity & Access. On that page, select Applications, then open the API Keys tab. Create an API key and under Project permissions select Project Owner.',
      },
      {
        title: 'Copy project ID',
        body: 'Open Project Settings and copy the Project ID (24-character hex).',
      },
      {
        title: 'Enter credentials in Ductape',
        body: 'Paste project ID, public key, and private key below, then activate the connection.',
      },
      {
        title: 'Whitelist workbench access IPs',
        body: 'Use Check IPs on this connection to resolve and copy /32 addresses for this workbench, then add them in Atlas Network Access (or sync automatically after activation under Private access).',
      },
    ],
    ductapeFieldHint: 'Use Atlas API keys scoped to the project that hosts your clusters.',
    networkingGuides: [
      {
        id: 'atlas-ip-access',
        title: 'Atlas IP access list',
        feature: 'MongoDB clusters',
        summary:
          'Atlas clusters block connections unless the client IP is on the project access list. Allow this workbench’s IPs so you can browse and link clusters from Ductape.',
        steps: [
          {
            title: 'Resolve workbench access IPs',
            body: 'Check IPs on this connection to resolve the /32 addresses this workbench uses to reach Atlas.',
          },
          {
            title: 'Sync to Atlas',
            body: 'Save the allowlist — Ductape calls the Atlas Admin API to append missing IPs with comment "Ductape proxy".',
          },
        ],
      },
    ],
  },
  neo4j_aura: {
    label: 'Neo4j Aura',
    shortLabel: 'Aura',
    description:
      'Connect with Aura API credentials so Ductape can track and guide IP allowlisting for Aura instances.',
    consoleLinks: [
      {
        label: 'Aura Console',
        href: 'https://console.neo4j.io/',
        description: 'Manage Aura instances',
      },
      {
        label: 'Aura API credentials',
        href: 'https://neo4j.com/docs/aura/platform/api/authentication/',
        description: 'Create client ID and secret',
      },
    ],
    docLinks: [
      {
        label: 'Aura API authentication',
        href: 'https://neo4j.com/docs/aura/platform/api/authentication/',
      },
      {
        label: 'Aura security / IP allowlist',
        href: 'https://neo4j.com/docs/aura/platform/security/',
      },
    ],
    cloudSteps: [
      {
        title: 'Create Aura API credentials',
        body:
          'Aura Console → Account → API credentials → Create. Copy the client ID and client secret (the secret is shown only once).',
      },
      {
        title: 'Optional: instance ID',
        body: 'If you manage a single Aura instance, paste its instance ID for reference in Ductape (optional).',
      },
      {
        title: 'Enter credentials in Ductape',
        body: 'Paste client ID and secret below, then activate the connection.',
      },
      {
        title: 'Whitelist Ductape proxy IPs',
        body: 'After activation, open Private access. Ductape stores the IPs to allow; add them in Aura Console → instance → IP allowlist if not applied automatically.',
      },
    ],
    ductapeFieldHint: 'Aura API credentials validate the connection; IP allowlist is configured under Private access.',
    networkingGuides: [
      {
        id: 'aura-ip-allowlist',
        title: 'Aura IP allowlist',
        feature: 'AuraDB instances',
        summary:
          'Aura instances require client IPs on an allowlist. Ductape resolves proxy IPs and records the list you should allow.',
        steps: [
          {
            title: 'Resolve proxy IPs',
            body: 'Private access shows IPv4 addresses for your Ductape workbench / proxy host.',
          },
          {
            title: 'Apply in Aura Console',
            body: 'Aura Console → your instance → Security → add each Ductape IP. Ductape saves the intended list on the connection when you sync.',
          },
        ],
      },
    ],
  },
};
