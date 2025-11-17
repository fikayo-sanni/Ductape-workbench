import {
  BriefStatus,
  IPartnership,
  IProductBrief,
  ISalesFunnel,
  PartnershipStatus,
  SenderType,
  IWorkspacePartnershipsResponse,
  IProductBriefsListResponse,
} from "@/types/partnership";

// Dummy Workspaces
export const dummyWorkspaces = [
  {
    _id: "ws_001",
    name: "TechFlow Solutions",
    email: "contact@techflow.com",
    logo: "/images/workspace-logos/techflow.png",
    description: "Enterprise API integration platform",
    url: "https://techflow.com",
    is_active: true,
  },
  {
    _id: "ws_002",
    name: "DataSync Inc",
    email: "hello@datasync.io",
    logo: "/images/workspace-logos/datasync.png",
    description: "Real-time data synchronization services",
    url: "https://datasync.io",
    is_active: true,
  },
  {
    _id: "ws_003",
    name: "CloudStore Pro",
    email: "support@cloudstore.pro",
    logo: "/images/workspace-logos/cloudstore.png",
    description: "Cloud storage and CDN solutions",
    url: "https://cloudstore.pro",
    is_active: true,
  },
];

// Dummy Users
export const dummyUsers = [
  {
    _id: "user_001",
    firstname: "John",
    lastname: "Doe",
    email: "john.doe@techflow.com",
  },
  {
    _id: "user_002",
    firstname: "Jane",
    lastname: "Smith",
    email: "jane.smith@datasync.io",
  },
  {
    _id: "user_003",
    firstname: "Michael",
    lastname: "Brown",
    email: "michael.brown@cloudstore.pro",
  },
];

// Dummy Products
export const dummyProducts = [
  {
    _id: "prod_001",
    tag: "api-gateway",
    app_name: "API Gateway Pro",
    description: "Enterprise-grade API gateway with advanced routing",
    logo: "/images/product-logos/api-gateway.png",
    colors: {
      primary: "#4F46E5",
      secondary: "#818CF8",
    },
    status: "active",
  },
  {
    _id: "prod_002",
    tag: "data-sync",
    app_name: "RealTime Sync",
    description: "Synchronize data across multiple databases in real-time",
    logo: "/images/product-logos/realtime-sync.png",
    colors: {
      primary: "#059669",
      secondary: "#10B981",
    },
    status: "active",
  },
  {
    _id: "prod_003",
    tag: "cloud-storage",
    app_name: "SecureCloud Storage",
    description: "Encrypted cloud storage with global CDN",
    logo: "/images/product-logos/securecloud.png",
    colors: {
      primary: "#DC2626",
      secondary: "#EF4444",
    },
    status: "active",
  },
];

// Dummy Product Briefs
export const dummyProductBriefs: IProductBrief[] = [
  {
    _id: "brief_001",
    workspace_id: "ws_001",
    product_id: "prod_001",
    title: "API Gateway Pro - Enterprise Integration Solution",
    description: "A comprehensive API gateway solution designed for enterprise-scale applications. Manage, secure, and scale your APIs with ease.",
    product_details: "API Gateway Pro provides advanced routing, rate limiting, authentication, and monitoring capabilities. It supports REST, GraphQL, and WebSocket protocols with built-in caching and load balancing.",
    usage_instructions: "1. Create an API endpoint\n2. Configure authentication methods\n3. Set up rate limiting rules\n4. Deploy to production\n5. Monitor via dashboard",
    onboarding_steps: [
      { name: "Sign up and verify email", description: "Create your account and verify your email address to get started", message_template: "Welcome! Please verify your email to activate your account." },
      { name: "Create your first workspace", description: "Set up a workspace to organize your API projects", message_template: "Let's create your workspace. What would you like to call it?" },
      { name: "Configure API credentials", description: "Generate API keys and configure authentication settings", message_template: "It's time to set up your API credentials for secure access." },
      { name: "Review documentation", description: "Go through our comprehensive documentation and tutorials", message_template: "Check out our docs to learn all about API Gateway Pro's features." },
      { name: "Start integrating endpoints", description: "Begin integrating your first API endpoints", message_template: "You're all set! Ready to integrate your first endpoint?" }
    ],
    status: BriefStatus.PUBLISHED,
    created_at: new Date("2024-01-15"),
    updated_at: new Date("2024-02-20"),
    workspace: dummyWorkspaces[0],
    workspaceOwner: dummyUsers[0],
    product: dummyProducts[0],
  },
  {
    _id: "brief_002",
    workspace_id: "ws_002",
    product_id: "prod_002",
    title: "RealTime Sync - Database Synchronization Made Easy",
    description: "Keep your databases in perfect sync across multiple regions with our real-time synchronization engine.",
    product_details: "RealTime Sync monitors database changes and propagates them instantly across all configured targets. Supports PostgreSQL, MySQL, MongoDB, and more with conflict resolution.",
    usage_instructions: "1. Connect source database\n2. Configure target databases\n3. Set sync rules and filters\n4. Enable real-time replication\n5. Monitor sync status",
    onboarding_steps: [
      { name: "Request demo access", description: "Request access to our demo environment to test the platform", message_template: "Welcome to RealTime Sync! Let's get you set up with demo access." },
      { name: "Provide database schemas", description: "Share your database schema details so we can configure the sync", message_template: "Please provide your database schema information for optimal configuration." },
      { name: "Configure sync pipelines", description: "Set up your first synchronization pipeline", message_template: "Time to configure your sync pipeline. Which databases would you like to connect?" },
      { name: "Test with sample data", description: "Run a test sync with sample data to verify everything works", message_template: "Let's run a test sync to make sure everything is working perfectly." },
      { name: "Go live with monitoring", description: "Enable real-time sync and set up monitoring dashboards", message_template: "You're ready to go live! We'll set up monitoring so you can track everything." }
    ],
    status: BriefStatus.PUBLISHED,
    created_at: new Date("2024-02-01"),
    updated_at: new Date("2024-02-25"),
    workspace: dummyWorkspaces[1],
    workspaceOwner: dummyUsers[1],
    product: dummyProducts[1],
  },
  {
    _id: "brief_003",
    workspace_id: "ws_003",
    product_id: "prod_003",
    title: "SecureCloud Storage - Enterprise File Management",
    description: "Store, manage, and deliver your files securely with our encrypted cloud storage platform backed by global CDN.",
    product_details: "SecureCloud offers end-to-end encryption, version control, and lightning-fast delivery through our global CDN network. Perfect for media assets, documents, and backups.",
    usage_instructions: "1. Create storage buckets\n2. Upload files via API or dashboard\n3. Configure access permissions\n4. Enable CDN delivery\n5. Monitor usage and costs",
    onboarding_steps: [
      { name: "Create account", description: "Sign up for SecureCloud and choose your plan", message_template: "Welcome to SecureCloud! Let's create your account and get started." },
      { name: "Set up billing", description: "Configure your billing details and payment method", message_template: "Please add your billing information to activate your account." },
      { name: "Create first bucket", description: "Create your first storage bucket for your files", message_template: "Time to create your first storage bucket. What would you like to name it?" },
      { name: "Generate API keys", description: "Generate secure API keys for programmatic access", message_template: "Let's generate your API keys for secure access to your storage." },
      { name: "Integrate with your application", description: "Use our SDKs to integrate SecureCloud into your application", message_template: "You're all set! Ready to integrate SecureCloud into your app?" }
    ],
    status: BriefStatus.DRAFT,
    created_at: new Date("2024-03-01"),
    updated_at: new Date("2024-03-10"),
    workspace: dummyWorkspaces[2],
    workspaceOwner: dummyUsers[2],
    product: dummyProducts[2],
  },
];

// Dummy Sales Funnels
export const dummySalesFunnels: ISalesFunnel[] = [
  {
    _id: "funnel_001",
    workspace_id: "ws_001",
    product_brief_id: "brief_001",
    steps: [
      {
        name: "Initial Contact",
        description: "First introduction and requirement gathering",
        message_template: "Hello! Thank you for your interest in API Gateway Pro. Let's discuss your API integration needs.",
        order: 0,
      },
      {
        name: "Technical Assessment",
        description: "Review technical requirements and compatibility",
        message_template: "Please share your current API architecture and expected traffic volume so we can recommend the best setup.",
        order: 1,
      },
      {
        name: "Proposal & Pricing",
        description: "Present customized proposal and pricing",
        message_template: "Based on your requirements, here's our proposed solution and pricing structure.",
        order: 2,
      },
      {
        name: "Contract Signing",
        description: "Finalize terms and sign agreement",
        message_template: "Let's finalize the partnership agreement. Please review the contract attached.",
        order: 3,
      },
      {
        name: "Onboarding",
        description: "Technical setup and training",
        message_template: "Welcome aboard! Here are your API credentials and onboarding documentation.",
        order: 4,
      },
    ],
    created_at: new Date("2024-01-15"),
    updated_at: new Date("2024-01-15"),
  },
  {
    _id: "funnel_002",
    workspace_id: "ws_002",
    product_brief_id: "brief_002",
    steps: [
      {
        name: "Discovery Call",
        description: "Understand data sync requirements",
        message_template: "Hi! Let's schedule a call to understand your database synchronization needs.",
        order: 0,
      },
      {
        name: "Schema Review",
        description: "Analyze database schemas and structure",
        message_template: "Please provide your database schemas for compatibility analysis.",
        order: 1,
      },
      {
        name: "POC Setup",
        description: "Set up proof of concept environment",
        message_template: "We'll set up a POC environment for you to test our sync engine.",
        order: 2,
      },
      {
        name: "Full Integration",
        description: "Production integration and go-live",
        message_template: "Your POC was successful! Let's move to production integration.",
        order: 3,
      },
    ],
    created_at: new Date("2024-02-01"),
    updated_at: new Date("2024-02-01"),
  },
];

// Dummy Partnerships
export const dummyPartnerships: IPartnership[] = [
  {
    _id: "partnership_001",
    service_provider_id: "ws_001",
    client_id: "ws_002",
    product_brief_id: "brief_001",
    sales_funnel_id: "funnel_001",
    current_funnel_step: 2,
    status: PartnershipStatus.PROSPECTIVE,
    partnership_confirmed_by_provider: false,
    messages: [
      {
        _id: "msg_001",
        sender_id: "user_002",
        sender_type: SenderType.CLIENT,
        content: "Hi TechFlow, I'm interested in partnering with you regarding your API Gateway Pro. We need a robust solution for our microservices architecture.",
        attachments: [],
        read: true,
        created_at: new Date("2024-03-01T10:00:00"),
        sender: dummyUsers[1],
      },
      {
        _id: "msg_002",
        sender_id: "user_001",
        sender_type: SenderType.SERVICE_PROVIDER,
        content: "Hello DataSync team! Great to hear from you. I'd be happy to discuss how API Gateway Pro can help with your microservices. Can you share more about your current setup?",
        attachments: [],
        read: true,
        created_at: new Date("2024-03-01T14:30:00"),
        sender: dummyUsers[0],
      },
      {
        _id: "msg_003",
        sender_id: "user_002",
        sender_type: SenderType.CLIENT,
        content: "We're running about 50 microservices handling 10M requests daily. We need rate limiting, auth, and monitoring.",
        attachments: ["technical-requirements.pdf"],
        read: true,
        created_at: new Date("2024-03-02T09:15:00"),
        sender: dummyUsers[1],
      },
      {
        _id: "msg_004",
        sender_id: "user_001",
        sender_type: SenderType.SERVICE_PROVIDER,
        content: "Perfect! Based on your requirements, here's our proposed solution and pricing structure.",
        attachments: ["proposal.pdf", "pricing.pdf"],
        read: false,
        created_at: new Date("2024-03-03T11:00:00"),
        sender: dummyUsers[0],
      },
      {
        _id: "msg_005",
        sender_id: "user_002",
        sender_type: SenderType.CLIENT,
        content: "Thanks for the detailed proposal! The pricing looks reasonable. A few questions: Does the Enterprise plan include 24/7 support? And what's your SLA for API uptime?",
        attachments: [],
        read: true,
        created_at: new Date("2024-03-03T15:30:00"),
        sender: dummyUsers[1],
      },
      {
        _id: "msg_006",
        sender_id: "user_001",
        sender_type: SenderType.SERVICE_PROVIDER,
        content: "Great questions! Yes, Enterprise includes 24/7 support with dedicated Slack channel. Our SLA guarantees 99.99% uptime with automatic failover. We also provide monthly reports and quarterly reviews.",
        attachments: ["sla-details.pdf"],
        read: true,
        created_at: new Date("2024-03-04T09:00:00"),
        sender: dummyUsers[0],
      },
      {
        _id: "msg_007",
        sender_id: "user_002",
        sender_type: SenderType.CLIENT,
        content: "That sounds perfect! One more thing - can we get a 2-week trial to test with our staging environment before committing?",
        attachments: [],
        read: true,
        created_at: new Date("2024-03-04T10:45:00"),
        sender: dummyUsers[1],
      },
      {
        _id: "msg_008",
        sender_id: "user_001",
        sender_type: SenderType.SERVICE_PROVIDER,
        content: "Absolutely! I'll set up a full-featured trial account for you. You'll get access to all Enterprise features. I'll send the credentials within the hour.",
        attachments: [],
        read: true,
        created_at: new Date("2024-03-04T11:00:00"),
        sender: dummyUsers[0],
      },
      {
        _id: "msg_009",
        sender_id: "user_002",
        sender_type: SenderType.CLIENT,
        content: "Excellent! Our team is really excited about this. We'll start testing tomorrow and will keep you updated on our progress.",
        attachments: [],
        read: true,
        created_at: new Date("2024-03-04T14:20:00"),
        sender: dummyUsers[1],
      },
      {
        _id: "msg_010",
        sender_id: "user_001",
        sender_type: SenderType.SERVICE_PROVIDER,
        content: "Looking forward to it! I've just sent the trial credentials to your email. Feel free to reach out if you need any help during testing. Happy to schedule a technical onboarding call if needed.",
        attachments: ["trial-credentials.txt", "quick-start-guide.pdf"],
        read: false,
        created_at: new Date("2024-03-04T14:45:00"),
        sender: dummyUsers[0],
      },
    ],
    deliverables: [],
    created_at: new Date("2024-03-01"),
    updated_at: new Date("2024-03-03"),
    serviceProvider: dummyWorkspaces[0],
    serviceProviderOwner: dummyUsers[0],
    client: dummyWorkspaces[1],
    clientOwner: dummyUsers[1],
    productBrief: dummyProductBriefs[0],
    salesFunnel: dummySalesFunnels[0],
    relationship_type: 'service_provider',
  },
  {
    _id: "partnership_002",
    service_provider_id: "ws_003",
    client_id: "ws_001",
    product_brief_id: "brief_003",
    sales_funnel_id: undefined,
    current_funnel_step: 0,
    status: PartnershipStatus.ACTIVE,
    partnership_confirmed_by_provider: true,
    messages: [
      {
        _id: "msg_005",
        sender_id: "user_001",
        sender_type: SenderType.CLIENT,
        content: "Hi CloudStore, we need secure storage for our customer data and assets.",
        attachments: [],
        read: true,
        created_at: new Date("2024-02-15T10:00:00"),
        sender: dummyUsers[0],
      },
      {
        _id: "msg_006",
        sender_id: "user_003",
        sender_type: SenderType.SERVICE_PROVIDER,
        content: "Welcome to SecureCloud! Here are your API credentials and bucket details.",
        attachments: ["credentials.txt", "getting-started.pdf"],
        read: true,
        created_at: new Date("2024-02-16T09:00:00"),
        sender: dummyUsers[2],
      },
      {
        _id: "msg_011",
        sender_id: "user_001",
        sender_type: SenderType.CLIENT,
        content: "Thanks! We've successfully uploaded our first batch of test files. The upload speeds are impressive! Quick question - how do we enable the CDN for these files?",
        attachments: [],
        read: true,
        created_at: new Date("2024-02-17T10:30:00"),
        sender: dummyUsers[0],
      },
      {
        _id: "msg_012",
        sender_id: "user_003",
        sender_type: SenderType.SERVICE_PROVIDER,
        content: "Great to hear! For CDN, just toggle the 'Enable CDN' switch in your bucket settings. Your files will be available at the CDN URL I shared. Cache invalidation is automatic within 60 seconds.",
        attachments: ["cdn-configuration-guide.pdf"],
        read: true,
        created_at: new Date("2024-02-17T11:00:00"),
        sender: dummyUsers[2],
      },
      {
        _id: "msg_013",
        sender_id: "user_001",
        sender_type: SenderType.CLIENT,
        content: "Perfect! CDN is now enabled. We're seeing sub-100ms response times globally. This is exactly what we needed. Can we discuss increasing our storage limit? We're expecting rapid growth.",
        attachments: [],
        read: true,
        created_at: new Date("2024-02-18T14:20:00"),
        sender: dummyUsers[0],
      },
      {
        _id: "msg_014",
        sender_id: "user_003",
        sender_type: SenderType.SERVICE_PROVIDER,
        content: "Absolutely! I can upgrade your plan immediately. How much storage are you anticipating? We have plans ranging from 1TB to unlimited. Also, would you like to discuss our enterprise volume pricing?",
        attachments: ["enterprise-pricing-2024.pdf"],
        read: true,
        created_at: new Date("2024-02-18T15:00:00"),
        sender: dummyUsers[2],
      },
      {
        _id: "msg_015",
        sender_id: "user_001",
        sender_type: SenderType.CLIENT,
        content: "We're projecting around 5TB in the next quarter. Let me review the enterprise pricing and get back to you by end of week. Also loving the monitoring dashboard - very intuitive!",
        attachments: [],
        read: true,
        created_at: new Date("2024-02-19T09:30:00"),
        sender: dummyUsers[0],
      },
      {
        _id: "msg_016",
        sender_id: "user_003",
        sender_type: SenderType.SERVICE_PROVIDER,
        content: "Sounds good! For 5TB, I'd recommend our Enterprise Pro plan. You'll get better rates and priority support. I've sent over a custom quote. Let me know if you'd like to schedule a call to discuss!",
        attachments: ["custom-quote-techflow.pdf"],
        read: false,
        created_at: new Date("2024-02-19T10:15:00"),
        sender: dummyUsers[2],
      },
    ],
    deliverables: [
      "API_KEY: sk_live_abc123xyz789",
      "BUCKET_ID: techflow-prod-assets",
      "CDN_URL: https://cdn.cloudstore.pro/techflow",
    ],
    created_at: new Date("2024-02-15"),
    updated_at: new Date("2024-02-20"),
    serviceProvider: dummyWorkspaces[2],
    serviceProviderOwner: dummyUsers[2],
    client: dummyWorkspaces[0],
    clientOwner: dummyUsers[0],
    productBrief: dummyProductBriefs[2],
    relationship_type: 'client',
  },
];

// Dummy API Responses
export const getDummyPublishedBriefs = (
  page: number = 1,
  limit: number = 10,
  search: string = ""
): IProductBriefsListResponse => {
  let filteredBriefs = dummyProductBriefs.filter(
    (brief) => brief.status === BriefStatus.PUBLISHED
  );

  if (search) {
    filteredBriefs = filteredBriefs.filter(
      (brief) =>
        brief.title.toLowerCase().includes(search.toLowerCase()) ||
        brief.description.toLowerCase().includes(search.toLowerCase()) ||
        brief.product?.app_name.toLowerCase().includes(search.toLowerCase())
    );
  }

  const total = filteredBriefs.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const briefs = filteredBriefs.slice(start, end);

  return {
    status: true,
    message: "Published product briefs retrieved successfully",
    data: {
      briefs,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  };
};

export const getDummyWorkspacePartnerships = (
  workspaceId: string
): IWorkspacePartnershipsResponse => {
  const myServiceProviders = dummyPartnerships.filter(
    (p) => p.client_id === workspaceId
  );
  const myClients = dummyPartnerships.filter(
    (p) => p.service_provider_id === workspaceId
  );

  return {
    status: true,
    message: "Workspace partnerships retrieved successfully",
    data: {
      myServiceProviders,
      myClients,
      total: myServiceProviders.length + myClients.length,
      summary: {
        serviceProviders: myServiceProviders.length,
        clients: myClients.length,
      },
    },
  };
};

export const getPartnershipById = (
  partnershipId: string,
  currentWorkspaceId: string
): (IPartnership & { relationship_type: 'client' | 'service_provider' }) | null => {
  console.log('[getPartnershipById] Looking for partnership:', partnershipId);
  console.log('[getPartnershipById] Current workspace:', currentWorkspaceId);
  console.log('[getPartnershipById] All partnerships:', dummyPartnerships.map(p => p._id));

  const partnership = dummyPartnerships.find(p => p._id === partnershipId);

  if (!partnership) {
    console.log('[getPartnershipById] Partnership not found!');
    return null;
  }

  console.log('[getPartnershipById] Found partnership:', partnership);
  console.log('[getPartnershipById] Partnership has messages:', partnership.messages?.length);

  // Determine relationship type based on current workspace
  const relationship_type: 'client' | 'service_provider' = partnership.client_id === currentWorkspaceId ? 'service_provider' : 'client';

  const result = {
    ...partnership,
    relationship_type,
  } as IPartnership & { relationship_type: 'client' | 'service_provider' };

  console.log('[getPartnershipById] Returning partnership with relationship_type:', relationship_type);
  console.log('[getPartnershipById] Result has messages:', result.messages?.length);

  return result;
};

export const getDummyWorkspaceBriefs = (
  workspaceId: string,
  status?: BriefStatus
) => {
  let briefs = dummyProductBriefs.filter((b) => b.workspace_id === workspaceId);

  if (status && status !== BriefStatus.ALL) {
    briefs = briefs.filter((b) => b.status === status);
  }

  return briefs;
};
