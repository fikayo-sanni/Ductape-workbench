import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database as DatabaseIcon, Save, ChevronRight, Loader2, CheckCircle, Eye, EyeOff, X, Share2, Boxes, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
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
}

export default function InlineDatabaseForm({ product, databaseType, onCancel, onSuccess }: InlineDatabaseFormProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: product?.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product'
  }) as any;

  const getDefaultDbType = () => {
    if (databaseType === 'graph') return 'neo4j';
    if (databaseType === 'vector') return 'pinecone';
    return 'postgresql';
  };

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    type: getDefaultDbType(),
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
      example: 'bolt://username:password@localhost:7687',
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
        { value: 'neptune', label: 'Amazon Neptune' },
        { value: 'arangodb', label: 'ArangoDB' },
      ];
    }
    if (databaseType === 'vector') {
      return [
        { value: 'pinecone', label: 'Pinecone' },
        { value: 'weaviate', label: 'Weaviate' },
        { value: 'milvus', label: 'Milvus' },
        { value: 'qdrant', label: 'Qdrant' },
        { value: 'chroma', label: 'Chroma' },
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
      if (!ductape) throw new Error('Product not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      await ductape.init(product.tag);
      const database = await ductape.databases.create({
        name: values.name,
        tag: values.tag,
        type: values.type.toLowerCase(),
        envs: values.envs,
      });
      return database;
    },
    onSuccess: async () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['databases'] });
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

    // Validate at least one environment is configured
    const hasConfiguredEnv = envConnections.some(env => env.connection_url.trim());
    if (!hasConfiguredEnv) {
      toast.error('Please configure at least one environment connection');
      return;
    }

    // Validate connection URLs
    for (const env of envConnections) {
      if (env.connection_url.trim()) {
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
        envs: envConnections
          .filter(env => env.connection_url.trim())
          .map(env => ({
            slug: env.slug,
            connection_url: env.connection_url,
          })),
      });
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

  const updateEnvConnection = (index: number, url: string) => {
    const updated = [...envConnections];
    updated[index] = { ...updated[index], connection_url: url };
    setEnvConnections(updated);
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
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

            {!showEnvs && (
              <Button onClick={handleContinue} className="gap-2">
                Continue to Connection URLs
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Environment Connections */}
          {showEnvs && (
            <div className="space-y-6 pt-6 border-t border-grey-400">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-grey">Connection URLs</h3>
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

                  <div>
                    <Label htmlFor={`connection-${index}`}>Connection URL</Label>
                    <div className="relative mt-1.5">
                      <Input
                        id={`connection-${index}`}
                        type={showPasswords[index] ? 'text' : 'password'}
                        placeholder={dbTypeDefaults[formData.type]?.example || 'Enter connection URL'}
                        value={env.connection_url}
                        onChange={(e) => updateEnvConnection(index, e.target.value)}
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
