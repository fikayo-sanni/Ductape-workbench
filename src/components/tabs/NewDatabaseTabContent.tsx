import { useState, useEffect } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database as DatabaseIcon, Save, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import productServicesReal from '@/services/productServicesReal';
import { useDuctape } from '@/hooks/useDuctape';

interface NewDatabaseTabContentProps {
  tabId: string;
  data?: any;
}

interface EnvConnection {
  slug: string;
  env_name: string;
  connection_url: string;
}

export default function NewDatabaseTabContent({ tabId, data }: NewDatabaseTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Extract product context from data
  const product = data?.productId ? {
    _id: data.productId,
    name: data.productName,
    tag: data.productTag,
    logo: data.productLogo,
    envs: data.productEnvs || [],
    workspace_id: data.workspaceId || currentWorkspaceId
  } : null;

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: product?.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product'
  }) as any;

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    type: 'postgresql',
  });

  const [envConnections, setEnvConnections] = useState<EnvConnection[]>([]);
  const [showEnvs, setShowEnvs] = useState(false);

  // Fetch product data if productId is provided but productEnvs is not
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', currentWorkspaceId, data?.productId],
    queryFn: () =>
      productServicesReal.fetchProducts({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    enabled: !!data?.productId && !data?.productEnvs,
  });

  // Find the specific product from the fetched data (if not already extracted from context)
  const fetchedProduct = productsData?.data?.find((p: any) => p._id === data?.productId);
  const productEnvs = data?.productEnvs || fetchedProduct?.envs || product?.envs || [];

  // Initialize env connections from product environments
  useEffect(() => {
    if (productEnvs && productEnvs.length > 0 && envConnections.length === 0) {
      setEnvConnections(
        productEnvs.map((env: any) => ({
          slug: env.slug,
          env_name: env.env_name,
          connection_url: '',
        }))
      );
    }
  }, [productEnvs]);

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
    onSuccess: (database) => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      closeTab(tabId);
      openTab({
        id: `database-${database._id}-${Date.now()}`,
        type: 'database',
        title: database.name,
        itemId: database._id,
        data: { ...database, componentType: 'database', productName: product?.name },
      });
      toast.success('Database created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create database');
    },
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a database name');
      return;
    }

    if (!formData.tag.trim()) {
      toast.error('Please enter a database tag');
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

    if (!data?.productId || !product) {
      toast.error('No product selected');
      return;
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

  const handleCancel = () => {
    closeTab(tabId);
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

  // Show loading state while fetching product
  if (loadingProducts) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Product Context Header */}
        {product && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {product.logo ? (
                  <img
                    src={product.logo}
                    alt={product.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  product.name?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-grey">Creating database for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This database will be automatically connected to your product and configured for its environments
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-grey-600">
                <CheckCircle className="h-4 w-4 text-green" />
                <span>Auto-connect enabled</span>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green/10 flex items-center justify-center">
              <DatabaseIcon className="h-6 w-6 text-green" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Database</h1>
              <p className="text-sm text-grey-600">
                {product?.name ? `Adding to ${product.name}` : 'Configure a database connection for your product'}
              </p>
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
                placeholder="e.g., Production Database"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">A friendly name for this database configuration</p>
            </div>

            <div>
              <Label htmlFor="tag" className="required">
                Tag
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tag"
                  placeholder="e.g., my-product:production-database"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                />
                <Button variant="outline" onClick={() => handleNameChange(formData.name)} size="sm">
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Format: product-name:database-name (auto-generated from database name)
              </p>
            </div>

            <div>
              <Label htmlFor="type" className="required">
                Database Type
              </Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger id="type" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="mongodb">MongoDB</SelectItem>
                  <SelectItem value="redis">Redis</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-grey-600 mt-1">Select your database system</p>
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
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <Label className="text-sm font-medium text-grey mb-2 block">
                  Example {formData.type.toUpperCase()} Connection URL:
                </Label>
                <code className="text-xs text-grey-600 break-all">
                  {dbTypeDefaults[formData.type]?.example}
                </code>
              </div>

              {envConnections.map((env, index) => (
                <div key={env.slug} className="p-4 bg-grey-100 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-grey">{env.env_name}</h4>
                    <span className="text-xs text-grey-600">{env.slug}</span>
                  </div>

                  <div>
                    <Label htmlFor={`connection-${index}`}>Connection URL</Label>
                    <Input
                      id={`connection-${index}`}
                      type="password"
                      placeholder={dbTypeDefaults[formData.type]?.example}
                      value={env.connection_url}
                      onChange={(e) => updateEnvConnection(index, e.target.value)}
                      className="mt-2 bg-white font-mono text-sm"
                    />
                    <p className="text-xs text-grey-600 mt-1">Full database connection string with credentials</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {showEnvs && (
            <div className="flex items-center justify-end gap-3 pt-4 border-grey-400">
              <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="gap-2" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Database
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Help Text */}
        {showEnvs && (
          <div className="bg-yellow/5 border border-yellow/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-grey mb-2">Security Best Practices</h3>
            <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
              <li>Use environment variables for credentials in production</li>
              <li>Enable SSL/TLS for database connections</li>
              <li>Implement connection pooling for better performance</li>
              <li>Regularly rotate database passwords</li>
              <li>Never commit connection strings to version control</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
