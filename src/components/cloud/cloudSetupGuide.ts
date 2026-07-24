export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'mongodb_atlas' | 'neo4j_aura';

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
};

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
