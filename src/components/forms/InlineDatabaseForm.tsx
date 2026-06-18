import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database as DatabaseIcon, Save, ChevronRight, Loader2, CheckCircle, Eye, EyeOff, X, Share2, Boxes, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDatabaseProxy } from '@/services/databaseProxy';
import { useGraphProxy } from '@/services/graphProxy';
import { useSDKProxy } from '@/services/sdkProxy';
import { cn } from '@/lib/utils';
import CloudLinkPanel from '@/components/cloud/CloudLinkPanel';
import OverageLimitBanner from '@/components/billing/OverageLimitBanner';
import { isSecretRef, shouldHideManualCloudCredentials, mergeDatabaseEnvFromDraft, mergeGraphEnvFromDraft, mergeVectorEnvFromDraft } from '@/utils/cloudDraftMerge';

interface InlineDatabaseFormProps {
  product: {
    _id: string;
    name: string;
    tag: string;
    logo?: string;
    envs: Array<{ slug: string; name?: string; env_name?: string }>;
    workspace_id?: string;
  };
  databaseType: 'database' | 'graph' | 'vector';
  onCancel: () => void;
  onSuccess: () => void;
}

interface EnvConnection {
  slug: string;
  env_name: string;
  connection_url: string;
  // Additional fields for graph databases
  username?: string;
  password?: string;
  database?: string;
  // Neptune-specific fields
  region?: string;
  iamAuth?: boolean;
  // Vector database-specific fields
  endpoint?: string;
  apiKey?: string;
  index?: string;
  namespace?: string;
  /** RDS instance when linking via cloud */
  instance?: string;
  cloud?: string;
  linkedFromCloud?: boolean;
  /** Required for AWS RDS / Neptune provision — tags registered on the cloud connection */
  securityGroups?: string[];
  /** True when Ductape-managed or VPC connector groups apply without manual tag selection */
  securityGroupsAuto?: boolean;
  /** Linking an existing cloud database (requires masterPassword) */
  importExisting?: boolean;
  /** Master password for existing RDS / Cloud SQL import (create input only) */
  masterPassword?: string;
  /** Password already in workspace secrets from a prior Ductape link */
  credentialsStored?: boolean;
}

export default function InlineDatabaseForm({ product, databaseType, onCancel, onSuccess }: InlineDatabaseFormProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Proxy configuration
  const proxyConfig = product?.workspace_id && user?._id
    ? {
        workspace_id: product.workspace_id || currentWorkspaceId || '',
        user_id: user._id || '',
        token: user.auth_token || '',
        public_key: user.public_key || '',
      }
    : null;

  // Initialize Database Proxy (for regular databases)
  const databaseProxy = useDatabaseProxy(databaseType === 'database' ? proxyConfig : null);

  const sdkProxy = useSDKProxy(proxyConfig);

  // Initialize Graph Proxy (for graph databases - not yet in SDK proxy)
  const graphProxy = useGraphProxy(databaseType === 'graph' ? proxyConfig : null);

  const getDefaultDbType = () => {
    if (databaseType === 'graph') return 'neo4j';
    if (databaseType === 'vector') return 'pinecone';
    return 'postgresql';
  };

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    type: getDefaultDbType(),
    // Vector-specific fields
    dimensions: databaseType === 'vector' ? 1536 : undefined,
    metric: databaseType === 'vector' ? 'cosine' : undefined,
  });

  const [envConnections, setEnvConnections] = useState<EnvConnection[]>([]);
  const [showEnvs, setShowEnvs] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  // Initialize env connections from product environments
  useEffect(() => {
    if (product?.envs && product.envs.length > 0 && envConnections.length === 0) {
      setEnvConnections(
        product.envs.map((env: any) => ({
          slug: env.slug,
          env_name: env.name || env.env_name || env.slug,
          connection_url: '',
          username: '',
          password: '',
          database: '',
          region: '',
          iamAuth: false,
          // Vector fields
          endpoint: '',
          apiKey: '',
          index: '',
          namespace: '',
        }))
      );
    }
  }, [product?.envs]);

  const dbTypeDefaults: Record<string, { port: string; example: string }> = {
    postgresql: {
      port: '5432',
      example: 'postgresql://username:password@localhost:5432/database_name',
    },
    mysql: {
      port: '3306',
      example: 'mysql://username:password@localhost:3306/database_name',
    },
    mongodb: {
      port: '27017',
      example: 'mongodb://username:password@localhost:27017/database_name',
    },
    redis: {
      port: '6379',
      example: 'redis://username:password@localhost:6379',
    },
    neo4j: {
      port: '7687',
      example: 'bolt://localhost:7687',
    },
    pinecone: {
      port: '',
      example: 'https://your-index-xxx.svc.your-environment.pinecone.io',
    },
    weaviate: {
      port: '8080',
      example: 'http://localhost:8080',
    },
  };

  const getDatabaseTypeOptions = () => {
    if (databaseType === 'graph') {
      return [
        { value: 'neo4j', label: 'Neo4j' },
        { value: 'memgraph', label: 'Memgraph' },
        { value: 'neptune', label: 'Amazon Neptune' },
        { value: 'arangodb', label: 'ArangoDB' },
      ];
    }
    if (databaseType === 'vector') {
      return [
        { value: 'pinecone', label: 'Pinecone' },
        { value: 'weaviate', label: 'Weaviate' },
        //{ value: 'milvus', label: 'Milvus' },
        { value: 'qdrant', label: 'Qdrant' },
        //{ value: 'chroma', label: 'Chroma' },
      ];
    }
    return [
      { value: 'postgresql', label: 'PostgreSQL' },
      { value: 'mysql', label: 'MySQL' },
      { value: 'mongodb', label: 'MongoDB' },
      { value: 'dynamodb', label: 'DynamoDB' },
    ];
  };

  const getTypeIcon = () => {
    if (databaseType === 'graph') return <Share2 className="h-6 w-6 text-purple-600" />;
    if (databaseType === 'vector') return <Boxes className="h-6 w-6 text-emerald-600" />;
    return <DatabaseIcon className="h-6 w-6 text-primary" />;
  };

  const getTypeTitle = () => {
    if (databaseType === 'graph') return 'Graph Database';
    if (databaseType === 'vector') return 'Vector Store';
    return 'Database';
  };

  const getTypeBgColor = () => {
    if (databaseType === 'graph') return 'bg-purple-600/10';
    if (databaseType === 'vector') return 'bg-emerald-600/10';
    return 'bg-primary/10';
  };

  // Create database mutation
  const { mutateAsync: createDatabase, isPending: isCreating } = useMutation({
    mutationFn: async (values: { name: string; tag: string; type: string; envs: Array<{ slug: string; connection_url: string }> }) => {
      if (!product?.tag) throw new Error('Product tag not found');

      // Use appropriate proxy based on database type
      if (databaseType === 'graph') {
        if (!graphProxy) throw new Error('Graph proxy not initialized');
        return await graphProxy.graph.create({
          product: product.tag,
          name: values.name,
          tag: values.tag,
          type: values.type.toLowerCase(),
          envs: values.envs,
        });
      } else if (databaseType === 'vector') {
        if (!sdkProxy) throw new Error('SDK proxy not initialized');
        return await sdkProxy.vector.create({
          product: product.tag,
          name: values.name,
          tag: values.tag,
          type: values.type.toLowerCase(),
          dimensions: (values as any).dimensions,
          metric: (values as any).metric,
          envs: values.envs,
        });
      } else {
        if (!databaseProxy) throw new Error('Database proxy not initialized');
        return await databaseProxy.databases.create({
          product: product.tag,
          name: values.name,
          tag: values.tag,
          type: values.type.toLowerCase(),
          envs: values.envs,
        });
      }
    },
    onSuccess: async (_data, variables) => {
      toast.dismiss('cloud-db-provision');
      // Invalidate queries based on database type
      if (databaseType === 'graph') {
        queryClient.invalidateQueries({ queryKey: ['graphs'] });
      } else if (databaseType === 'vector') {
        queryClient.invalidateQueries({ queryKey: ['vectors'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['databases'] });
      }
      queryClient.invalidateQueries({ queryKey: ['products', currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ['product', product._id] });

      const cloudProvisioning = (variables.envs as Array<{ cloud?: string; linkedFromCloud?: boolean; importExisting?: boolean }>).some(
        (env) => (env.cloud || (env as any).linkedFromCloud) && !(env as any).importExisting,
      );
      toast.success(
        cloudProvisioning
          ? `${getTypeTitle()} saved — cloud instances are provisioning (typically 10–15 min)`
          : `${getTypeTitle()} created successfully`,
      );
      onSuccess();
    },
    onError: (error: any) => {
      toast.dismiss('cloud-db-provision');
      toast.error(error.message || `Failed to create ${getTypeTitle().toLowerCase()}`);
    },
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    if (!formData.tag.trim()) {
      toast.error('Please enter a tag');
      return;
    }

    // Validate vector-specific fields
    if (databaseType === 'vector') {
      if (!formData.dimensions || formData.dimensions < 1) {
        toast.error('Please enter valid dimensions (minimum 1)');
        return;
      }
    }

    // Validate at least one environment is configured
    const isEnvConfigured = (env: EnvConnection) => {
      if (env.cloud?.trim() || env.linkedFromCloud) {
        return true;
      }
      if (databaseType === 'vector') {
        return Boolean(env.endpoint?.trim()) || isSecretRef(env.endpoint);
      }
      return Boolean(env.connection_url.trim()) || isSecretRef(env.connection_url);
    };

    const hasConfiguredEnv = envConnections.some(isEnvConfigured);

    if (!hasConfiguredEnv) {
      toast.error('Please configure at least one environment connection');
      return;
    }

    for (const env of envConnections) {
      if (
        databaseType === 'database' &&
        env.importExisting &&
        env.cloud?.trim() &&
        !env.credentialsStored &&
        !env.masterPassword?.trim()
      ) {
        toast.error(`Enter the master password for existing database in ${env.env_name}`);
        return;
      }
    }

    // Cloud-linked envs and workspace secret refs are resolved on save — skip URL format checks.
    for (const env of envConnections) {
      if (env.cloud?.trim() || env.linkedFromCloud) {
        continue;
      }
      if (isSecretRef(env.connection_url) || isSecretRef(env.endpoint)) {
        continue;
      }
      if (databaseType === 'vector' && env.endpoint?.trim()) {
        try {
          new URL(env.endpoint);
        } catch {
          toast.error(`Invalid endpoint URL for ${env.env_name}`);
          return;
        }
      } else if (databaseType !== 'vector' && env.connection_url.trim()) {
        try {
          new URL(env.connection_url);
        } catch {
          toast.error(`Invalid connection URL for ${env.env_name}`);
          return;
        }
      }
    }

    try {
      const importingExisting =
        databaseType === 'database' &&
        envConnections.some((env) => env.importExisting && env.cloud?.trim());
      const provisioningNew =
        databaseType === 'database' &&
        envConnections.some((env) => (env.cloud?.trim() || env.linkedFromCloud) && !env.importExisting);
      if (importingExisting) {
        toast.loading('Linking existing cloud database…', {
          id: 'cloud-db-provision',
          duration: Infinity,
        });
      } else if (provisioningNew) {
        toast.loading('Saving database and starting cloud provisioning…', {
          id: 'cloud-db-provision',
          duration: Infinity,
        });
      }

      await createDatabase({
        name: formData.name,
        tag: formData.tag,
        type: formData.type,
        ...(databaseType === 'vector' && {
          dimensions: formData.dimensions,
          metric: formData.metric,
        }),
        envs: envConnections
          .filter((env) => {
            if (env.cloud?.trim() || env.linkedFromCloud) {
              return true;
            }
            if (databaseType === 'vector') {
              return Boolean(env.endpoint?.trim()) || isSecretRef(env.endpoint);
            }
            return (
              Boolean(env.connection_url.trim()) ||
              isSecretRef(env.connection_url)
            );
          })
          .map(env => {
            const envConfig: any = {
              slug: env.slug,
            };

            // Vector database fields
            if (databaseType === 'vector') {
              if (env.cloud) {
                envConfig.cloud = env.cloud;
                envConfig.linkedFromCloud = env.linkedFromCloud ?? true;
                if (env.instance?.trim()) envConfig.instance = env.instance.trim();
              }
              if (env.endpoint && env.endpoint.trim()) envConfig.endpoint = env.endpoint;
              if (env.apiKey && env.apiKey.trim()) envConfig.apiKey = env.apiKey;
              if (env.index && env.index.trim()) envConfig.index = env.index;
              if (env.namespace && env.namespace.trim()) envConfig.namespace = env.namespace;
              if (env.region && env.region.trim()) envConfig.region = env.region;
            }
            // Graph database fields
            else if (databaseType === 'graph') {
              if (env.cloud) {
                envConfig.cloud = env.cloud;
                envConfig.linkedFromCloud = env.linkedFromCloud ?? true;
                if (env.instance?.trim()) envConfig.instance = env.instance.trim();
              }
              envConfig.connection_url = env.connection_url;
              if (env.username && env.username.trim()) envConfig.username = env.username;
              if (env.password && env.password.trim()) envConfig.password = env.password;
              if (env.database && env.database.trim()) envConfig.database = env.database;
              if (env.region && env.region.trim()) envConfig.region = env.region;
              if (env.iamAuth !== undefined) envConfig.iamAuth = env.iamAuth;
              if (env.securityGroups?.length) {
                envConfig.securityGroups = env.securityGroups;
              }
            }
            // Regular database fields
            else {
              if (env.cloud) {
                envConfig.cloud = env.cloud;
                envConfig.linkedFromCloud = env.linkedFromCloud ?? true;
                if (env.instance?.trim()) {
                  envConfig.instance = env.instance.trim();
                }
                if (env.region?.trim()) envConfig.region = env.region.trim();
                if (env.securityGroups?.length) {
                  envConfig.securityGroups = env.securityGroups;
                }
                if (env.importExisting) {
                  envConfig.importExisting = true;
                  if (env.credentialsStored) {
                    envConfig.credentialsStored = true;
                  } else if (env.masterPassword?.trim()) {
                    envConfig.masterPassword = env.masterPassword.trim();
                  }
                }
              } else {
                envConfig.connection_url = env.connection_url;
              }
            }

            return envConfig;
          }),
      } as any);
    } catch (error: any) {
      // Error already handled in mutation
    }
  };

  const handleNameChange = (value: string) => {
    // Auto-generate tag from name
    const sanitizedTag = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    setFormData({ ...formData, name: value, tag: sanitizedTag });
  };

  const handleContinue = () => {
    if (!formData.name.trim() || !formData.tag.trim()) {
      toast.error('Please fill in name and tag');
      return;
    }
    setShowEnvs(true);
  };

  const updateEnvConnection = (index: number, field: string, value: string | boolean | string[]) => {
    const updated = [...envConnections];
    updated[index] = { ...updated[index], [field]: value };
    setEnvConnections(updated);
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6 pb-24">
        <OverageLimitBanner assetType={databaseType} />
        {/* Header with Back Button */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-grey-500 hover:text-grey -ml-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', getTypeBgColor())}>
                {getTypeIcon()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey">Create New {getTypeTitle()}</h1>
                <p className="text-sm text-grey-600">
                  Adding to {product.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">
                Configuration Name
              </Label>
              <Input
                id="name"
                placeholder={`e.g., Production ${getTypeTitle()}`}
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">A friendly name for this {getTypeTitle().toLowerCase()} configuration</p>
            </div>

            <div>
              <Label htmlFor="tag" className="required">
                Tag
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tag"
                  placeholder={`e.g., ${product.tag}-${databaseType}`}
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                />
                <Button variant="outline" onClick={() => handleNameChange(formData.name)} size="sm">
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Unique identifier (auto-generated from name)
              </p>
            </div>

            <div>
              <Label htmlFor="type" className="required">
                {getTypeTitle()} Type
              </Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger id="type" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getDatabaseTypeOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-grey-600 mt-1">Select your {getTypeTitle().toLowerCase()} system</p>
            </div>

            {/* Vector-specific fields */}
            {databaseType === 'vector' && (
              <>
                <div>
                  <Label htmlFor="dimensions" className="required">
                    Vector Dimensions
                  </Label>
                  <Input
                    id="dimensions"
                    type="number"
                    min="1"
                    max="65536"
                    placeholder="e.g., 1536"
                    value={formData.dimensions || ''}
                    onChange={(e) => setFormData({ ...formData, dimensions: parseInt(e.target.value) || undefined })}
                    className="mt-2"
                  />
                  <p className="text-xs text-grey-600 mt-1">
                    Number of dimensions in your vectors (e.g., 1536 for OpenAI embeddings)
                  </p>
                </div>

                <div>
                  <Label htmlFor="metric">
                    Distance Metric
                  </Label>
                  <Select value={formData.metric} onValueChange={(value) => setFormData({ ...formData, metric: value })}>
                    <SelectTrigger id="metric" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cosine">Cosine</SelectItem>
                      <SelectItem value="euclidean">Euclidean</SelectItem>
                      <SelectItem value="dotproduct">Dot Product</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-grey-600 mt-1">
                    Similarity metric for vector comparisons
                  </p>
                </div>
              </>
            )}

            {!showEnvs && (
              <Button onClick={handleContinue} className="gap-2">
                {databaseType === 'vector' ? 'Continue to Configuration' : 'Continue to Connection URLs'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Environment Connections */}
          {showEnvs && (
            <div className="space-y-6 pt-6 border-t border-grey-400">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-grey">
                  {databaseType === 'vector' ? 'Environment Configuration' : 'Connection URLs'}
                </h3>
                <p className="text-sm text-grey-600">Configure connection for each environment</p>
              </div>

              {/* Connection URL Example */}
              {dbTypeDefaults[formData.type] && (
                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <Label className="text-sm font-medium text-grey mb-2 block">
                    Example {formData.type.toUpperCase()} Connection URL:
                  </Label>
                  <code className="text-xs text-grey-600 break-all">
                    {dbTypeDefaults[formData.type]?.example}
                  </code>
                </div>
              )}

              {envConnections.map((env, index) => {
                const showCloudLink =
                  Boolean(sdkProxy && formData.tag) &&
                  ((databaseType === 'database' &&
                    (formData.type === 'postgresql' || formData.type === 'mongodb')) ||
                    databaseType === 'graph' ||
                    databaseType === 'vector');
                const hideManualCredentials = shouldHideManualCloudCredentials(env);

                return (
                <div key={env.slug} className="p-4 bg-grey-100 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-grey">{env.env_name}</h4>
                    <span className="text-xs text-grey-600">{env.slug}</span>
                  </div>

                  {showCloudLink && sdkProxy ? (
                      <CloudLinkPanel
                        sdkProxy={sdkProxy}
                        productTag={product.tag}
                        componentTag={formData.tag}
                        componentType={
                          databaseType === 'vector'
                            ? 'vectors'
                            : databaseType === 'graph'
                              ? 'graphs'
                              : 'databases'
                        }
                        envSlug={env.slug}
                        onDraftApplied={(draft) => {
                          const updated = [...envConnections];
                          const merge =
                            databaseType === 'vector'
                              ? mergeVectorEnvFromDraft
                              : databaseType === 'graph'
                                ? mergeGraphEnvFromDraft
                                : mergeDatabaseEnvFromDraft;
                          updated[index] = {
                            ...updated[index],
                            ...(merge(
                              updated[index] as unknown as Record<string, unknown>,
                              draft as Record<string, unknown>,
                            ) as Partial<EnvConnection>),
                          };
                          setEnvConnections(updated);
                          if (draft.region && databaseType === 'graph') {
                            setFormData((prev) => ({ ...prev, type: 'neptune' }));
                          }
                        }}
                      />
                    ) : null}

                  {hideManualCredentials && (env.cloud || env.linkedFromCloud) && (
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 space-y-1">
                      <p className="text-sm font-medium text-grey flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                        Cloud account linked —{' '}
                        {env.importExisting
                          ? 'existing database will be linked on save'
                          : 'new resource will be provisioned on save'}
                      </p>
                      {env.cloud && (
                        <p className="text-xs text-grey-600 pl-6">Cloud: {env.cloud}</p>
                      )}
                      {env.instance && (
                        <p className="text-xs text-grey-600 pl-6">Instance: {env.instance}</p>
                      )}
                      {env.securityGroups?.length ? (
                        <p className="text-xs text-grey-600 pl-6">
                          Security groups: {env.securityGroups.join(', ')}
                        </p>
                      ) : env.securityGroupsAuto ? (
                        <p className="text-xs text-grey-600 pl-6">
                          Security groups: applied automatically from cloud connection Private access
                        </p>
                      ) : null}
                    </div>
                  )}

                  {/* Vector database fields */}
                  {databaseType === 'vector' && !hideManualCredentials ? (
                    <>
                      {/* Endpoint URL */}
                      <div>
                        <Label htmlFor={`endpoint-${index}`} className="required">Endpoint URL</Label>
                        <Input
                          id={`endpoint-${index}`}
                          placeholder={dbTypeDefaults[formData.type]?.example || 'https://...'}
                          value={env.endpoint || ''}
                          onChange={(e) => updateEnvConnection(index, 'endpoint', e.target.value)}
                          className="mt-1.5"
                        />
                      </div>

                      {/* API Key */}
                      {(formData.type === 'pinecone' || formData.type === 'qdrant' || formData.type === 'weaviate') && (
                        <div>
                          <Label htmlFor={`apiKey-${index}`} className={formData.type === 'pinecone' ? 'required' : ''}>
                            API Key
                          </Label>
                          <div className="relative mt-1.5">
                            <Input
                              id={`apiKey-${index}`}
                              type={showPasswords[index] ? 'text' : 'password'}
                              placeholder="Enter API key"
                              value={env.apiKey || ''}
                              onChange={(e) => updateEnvConnection(index, 'apiKey', e.target.value)}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords({ ...showPasswords, [index]: !showPasswords[index] })}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600"
                            >
                              {showPasswords[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Index/Collection Name */}
                      <div>
                        <Label htmlFor={`index-${index}`} className={formData.type === 'pinecone' ? 'required' : ''}>
                          {formData.type === 'pinecone' ? 'Index Name' : formData.type === 'qdrant' ? 'Collection Name' : 'Class Name'}
                        </Label>
                        <Input
                          id={`index-${index}`}
                          placeholder={formData.type === 'pinecone' ? 'my-index' : formData.type === 'qdrant' ? 'my-collection' : 'MyClass'}
                          value={env.index || ''}
                          onChange={(e) => updateEnvConnection(index, 'index', e.target.value)}
                          className="mt-1.5"
                        />
                      </div>

                      {/* Namespace (Pinecone) */}
                      {formData.type === 'pinecone' && (
                        <div>
                          <Label htmlFor={`namespace-${index}`}>Namespace</Label>
                          <Input
                            id={`namespace-${index}`}
                            placeholder="default"
                            value={env.namespace || ''}
                            onChange={(e) => updateEnvConnection(index, 'namespace', e.target.value)}
                            className="mt-1.5"
                          />
                        </div>
                      )}
                    </>
                  ) : !hideManualCredentials ? (
                    /* Connection URL for databases and graphs */
                    <div>
                      <Label htmlFor={`connection-${index}`}>Connection URL</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id={`connection-${index}`}
                          type={showPasswords[index] ? 'text' : 'password'}
                          placeholder={dbTypeDefaults[formData.type]?.example || 'Enter connection URL'}
                          value={env.connection_url}
                          onChange={(e) => updateEnvConnection(index, 'connection_url', e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, [index]: !showPasswords[index] })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600"
                        >
                          {showPasswords[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Neo4j specific fields */}
                  {!hideManualCredentials && formData.type === 'neo4j' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`username-${index}`}>Username</Label>
                          <Input
                            id={`username-${index}`}
                            placeholder="neo4j"
                            value={env.username || ''}
                            onChange={(e) => updateEnvConnection(index, 'username', e.target.value)}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`password-${index}`}>Password</Label>
                          <Input
                            id={`password-${index}`}
                            type="password"
                            placeholder="Enter password"
                            value={env.password || ''}
                            onChange={(e) => updateEnvConnection(index, 'password', e.target.value)}
                            className="mt-1.5"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`database-${index}`}>Database</Label>
                        <Input
                          id={`database-${index}`}
                          placeholder="neo4j"
                          value={env.database || ''}
                          onChange={(e) => updateEnvConnection(index, 'database', e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                    </>
                  )}

                  {/* Memgraph specific fields */}
                  {!hideManualCredentials && formData.type === 'memgraph' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`username-${index}`}>Username</Label>
                        <Input
                          id={`username-${index}`}
                          placeholder="Enter username"
                          value={env.username || ''}
                          onChange={(e) => updateEnvConnection(index, 'username', e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`password-${index}`}>Password</Label>
                        <Input
                          id={`password-${index}`}
                          type="password"
                          placeholder="Enter password"
                          value={env.password || ''}
                          onChange={(e) => updateEnvConnection(index, 'password', e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  )}

                  {/* Neptune specific fields */}
                  {!hideManualCredentials && formData.type === 'neptune' && (
                    <>
                      <div>
                        <Label htmlFor={`region-${index}`}>AWS Region</Label>
                        <Input
                          id={`region-${index}`}
                          placeholder="us-east-1"
                          value={env.region || ''}
                          onChange={(e) => updateEnvConnection(index, 'region', e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`iamAuth-${index}`}
                          checked={env.iamAuth || false}
                          onChange={(e) => updateEnvConnection(index, 'iamAuth', e.target.checked)}
                          className="h-4 w-4 rounded border-grey-400"
                        />
                        <Label htmlFor={`iamAuth-${index}`} className="cursor-pointer">
                          Use IAM Authentication
                        </Label>
                      </div>
                    </>
                  )}
                </div>
                );
              })}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isCreating} className="gap-2">
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create {getTypeTitle()}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
