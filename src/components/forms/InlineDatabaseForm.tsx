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

  // Initialize SDK Proxy (for vectors)
  const sdkProxy = useSDKProxy(databaseType === 'vector' ? proxyConfig : null);

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
      { value: 'redis', label: 'Redis' },
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
    onSuccess: async () => {
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

      toast.success(`${getTypeTitle()} created successfully`);
      onSuccess();
    },
    onError: (error: any) => {
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
    const hasConfiguredEnv = databaseType === 'vector'
      ? envConnections.some(env => env.endpoint?.trim())
      : envConnections.some(env => env.connection_url.trim());

    if (!hasConfiguredEnv) {
      toast.error('Please configure at least one environment connection');
      return;
    }

    // Validate connection URLs or endpoints
    for (const env of envConnections) {
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
      await createDatabase({
        name: formData.name,
        tag: formData.tag,
        type: formData.type,
        ...(databaseType === 'vector' && {
          dimensions: formData.dimensions,
          metric: formData.metric,
        }),
        envs: envConnections
          .filter(env => databaseType === 'vector' ? env.endpoint?.trim() : env.connection_url.trim())
          .map(env => {
            const envConfig: any = {
              slug: env.slug,
            };

            // Vector database fields
            if (databaseType === 'vector') {
              if (env.endpoint && env.endpoint.trim()) envConfig.endpoint = env.endpoint;
              if (env.apiKey && env.apiKey.trim()) envConfig.apiKey = env.apiKey;
              if (env.index && env.index.trim()) envConfig.index = env.index;
              if (env.namespace && env.namespace.trim()) envConfig.namespace = env.namespace;
              if (env.region && env.region.trim()) envConfig.region = env.region;
            }
            // Graph database fields
            else if (databaseType === 'graph') {
              envConfig.connection_url = env.connection_url;
              if (env.username && env.username.trim()) envConfig.username = env.username;
              if (env.password && env.password.trim()) envConfig.password = env.password;
              if (env.database && env.database.trim()) envConfig.database = env.database;
              if (env.region && env.region.trim()) envConfig.region = env.region;
              if (env.iamAuth !== undefined) envConfig.iamAuth = env.iamAuth;
            }
            // Regular database fields
            else {
              envConfig.connection_url = env.connection_url;
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

  const updateEnvConnection = (index: number, field: string, value: string | boolean) => {
    const updated = [...envConnections];
    updated[index] = { ...updated[index], [field]: value };
    setEnvConnections(updated);
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6 pb-24">
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

              {envConnections.map((env, index) => (
                <div key={env.slug} className="p-4 bg-grey-100 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-grey">{env.env_name}</h4>
                    <span className="text-xs text-grey-600">{env.slug}</span>
                  </div>

                  {/* Vector database fields */}
                  {databaseType === 'vector' ? (
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
                  ) : (
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
                  )}

                  {/* Neo4j specific fields */}
                  {formData.type === 'neo4j' && (
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
                  {formData.type === 'memgraph' && (
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
                  {formData.type === 'neptune' && (
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
              ))}

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
