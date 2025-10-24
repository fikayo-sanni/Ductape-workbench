import { useState, useEffect } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database as DatabaseIcon, Save, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import productServicesReal from '@/services/productServicesReal';

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

  // Find the specific product from the fetched data
  const product = productsData?.data?.find((p: any) => p._id === data?.productId);
  const productEnvs = data?.productEnvs || product?.envs || [];

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
    redis: {
      port: '6379',
      example: 'redis://username:password@localhost:6379',
    },
  };

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

    if (!data?.productId) {
      toast.error('No product selected');
      return;
    }

    try {
      const newDatabase = {
        _id: `database-${Date.now()}`,
        name: formData.name,
        tag: formData.tag,
        type: formData.type,
        envs: envConnections
          .filter(env => env.connection_url.trim())
          .map(env => ({
            slug: env.slug,
            connection_url: env.connection_url,
          })),
        product_id: data.productId,
        workspace_id: currentWorkspaceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      closeTab(tabId);
      openTab({
        id: `database-${newDatabase._id}-${Date.now()}`,
        type: 'database',
        title: formData.name,
        itemId: newDatabase._id,
        data: { ...newDatabase, componentType: 'database', productName: data.productName },
      });

      toast.success('Database created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create database');
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
              <Input
                id="tag"
                placeholder="e.g., production_database"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">Unique identifier (auto-generated from name)</p>
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
              <Button onClick={handleContinue} className="w-full gap-2">
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
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Create Database
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
