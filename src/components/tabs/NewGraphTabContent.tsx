import { useState, useEffect } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Share2, Save, ChevronRight, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import productServicesReal from '@/services/productServicesReal';
import productServices from '@/services/productServices';
import { useDuctape } from '@/hooks/useDuctape';
import { useTabState, getInitialTabState } from '@/hooks/useTabState';

interface NewGraphTabContentProps {
  tabId: string;
  data?: any;
}

interface EnvConnection {
  slug: string;
  env_name: string;
  connection_url: string;
  database?: string;
  graphName?: string;
  region?: string;
}

export default function NewGraphTabContent({ tabId, data }: NewGraphTabContentProps) {
  const { closeTab, openTab, tabs, updateTab, setActiveTab } = useWorkbenchStore();
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

  // Restore saved state
  const savedTabState = getInitialTabState(tabId, null as any);

  const [formData, setFormData] = useState(
    savedTabState?.formData || {
      name: '',
      tag: '',
      type: 'neo4j',
    }
  );

  const [envConnections, setEnvConnections] = useState<EnvConnection[]>(
    savedTabState?.envConnections || []
  );
  const [showEnvs, setShowEnvs] = useState(savedTabState?.showEnvs || false);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>(
    savedTabState?.showPasswords || {}
  );

  // Persist tab state automatically
  useTabState(
    tabId,
    'new-graph',
    formData.name || 'New Graph',
    {},
    { formData, envConnections, showEnvs, showPasswords }
  );

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
          database: '',
          graphName: '',
          region: '',
        }))
      );
    }
  }, [productEnvs]);

  const graphTypeDefaults: Record<string, { protocol: string; port: string; example: string }> = {
    neo4j: {
      protocol: 'bolt',
      port: '7687',
      example: 'bolt://username:password@localhost:7687',
    },
    neptune: {
      protocol: 'wss',
      port: '8182',
      example: 'wss://your-neptune-endpoint.region.neptune.amazonaws.com:8182/gremlin',
    },
    arangodb: {
      protocol: 'http',
      port: '8529',
      example: 'http://username:password@localhost:8529',
    },
    memgraph: {
      protocol: 'bolt',
      port: '7687',
      example: 'bolt://username:password@localhost:7687',
    },
  };

  // Create graph mutation
  const { mutateAsync: createGraph, isPending: isCreating } = useMutation({
    mutationFn: async (values: { name: string; tag: string; type: string; envs: Array<{ slug: string; connection_url: string; database?: string; graphName?: string; region?: string }> }) => {
      if (!ductape) throw new Error('Product not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      await ductape.init(product.tag);
      const graph = await ductape.graphs.create({
        name: values.name,
        tag: values.tag,
        type: values.type.toLowerCase(),
        envs: values.envs,
      });
      return graph;
    },
    onSuccess: async () => {
      if (!product?._id || !user?._id || !user?.public_key || !currentWorkspaceId) {
        toast.error('Missing product or user information');
        return;
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['graphs'] });
      queryClient.invalidateQueries({ queryKey: ['products', currentWorkspaceId] });

      // Close the graph creation tab
      closeTab(tabId);

      // Fetch updated product data
      try {
        const productResponse = await productServices.fetchProduct({
          product_id: product._id,
          user_id: user._id,
          public_key: user.public_key,
          workspace_id: currentWorkspaceId,
        });

        if (productResponse?.data) {
          const updatedProduct = productResponse.data;

          // Find existing product tab
          const existingProductTab = tabs.find(
            (tab) => tab.type === 'product' && (tab.itemId === product._id || tab.data?._id === product._id)
          );

          if (existingProductTab) {
            // Update existing product tab with fresh data
            updateTab(existingProductTab.id, {
              data: updatedProduct,
            });
            // Switch to the product tab
            setActiveTab(existingProductTab.id);
          } else {
            // Open new product tab with fresh data
            openTab({
              id: `product-${product._id}-${Date.now()}`,
              type: 'product',
              title: updatedProduct.name || product.name || 'Product',
              itemId: product._id,
              data: updatedProduct,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch updated product:', error);
        // Still try to open product tab even if fetch fails
        const existingProductTab = tabs.find(
          (tab) => tab.type === 'product' && (tab.itemId === product._id || tab.data?._id === product._id)
        );

        if (existingProductTab) {
          setActiveTab(existingProductTab.id);
        } else {
          // Fallback: open product tab with existing data
          openTab({
            id: `product-${product._id}-${Date.now()}`,
            type: 'product',
            title: product.name || 'Product',
            itemId: product._id,
            data: product,
          });
        }
      }

      toast.success('Graph database created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create graph database');
    },
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a graph name');
      return;
    }

    if (!formData.tag.trim()) {
      toast.error('Please enter a graph tag');
      return;
    }

    // Validate at least one environment is configured
    const hasConfiguredEnv = envConnections.some(env => env.connection_url.trim());
    if (!hasConfiguredEnv) {
      toast.error('Please configure at least one environment connection');
      return;
    }

    if (!data?.productId || !product) {
      toast.error('No product selected');
      return;
    }

    try {
      await createGraph({
        name: formData.name,
        tag: formData.tag,
        type: formData.type,
        envs: envConnections
          .filter(env => env.connection_url.trim())
          .map(env => ({
            slug: env.slug,
            connection_url: env.connection_url,
            ...(env.database && { database: env.database }),
            ...(env.graphName && { graphName: env.graphName }),
            ...(env.region && { region: env.region }),
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

  const updateEnvConnection = (index: number, field: keyof EnvConnection, value: string) => {
    const updated = [...envConnections];
    updated[index] = { ...updated[index], [field]: value };
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

  const showAdditionalFields = formData.type === 'arangodb' || formData.type === 'neptune';

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
                  <h2 className="text-xl font-bold text-grey">Creating graph for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This graph database will be automatically connected to your product and configured for its environments
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
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Share2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Graph Database</h1>
              <p className="text-sm text-grey-600">
                {product?.name ? `Adding to ${product.name}` : 'Configure a graph database connection for your product'}
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
                placeholder="e.g., Social Graph"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">A friendly name for this graph database configuration</p>
            </div>

            <div>
              <Label htmlFor="tag" className="required">
                Tag
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tag"
                  placeholder="e.g., social_graph"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                />
                <Button variant="outline" onClick={() => handleNameChange(formData.name)} size="sm">
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Unique identifier for this graph (auto-generated from name)
              </p>
            </div>

            <div>
              <Label htmlFor="type" className="required">
                Graph Database Type
              </Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger id="type" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neo4j">Neo4j</SelectItem>
                  <SelectItem value="neptune">AWS Neptune</SelectItem>
                  <SelectItem value="arangodb">ArangoDB</SelectItem>
                  <SelectItem value="memgraph">Memgraph</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-grey-600 mt-1">Select your graph database system</p>
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
              <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                <Label className="text-sm font-medium text-grey mb-2 block">
                  Example {formData.type.toUpperCase()} Connection URL:
                </Label>
                <code className="text-xs text-grey-600 break-all">
                  {graphTypeDefaults[formData.type]?.example}
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
                    <div className="relative mt-2">
                      <Input
                        id={`connection-${index}`}
                        type={showPasswords[index] ? 'text' : 'password'}
                        placeholder={graphTypeDefaults[formData.type]?.example}
                        value={env.connection_url}
                        onChange={(e) => updateEnvConnection(index, 'connection_url', e.target.value)}
                        className="bg-white font-mono text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, [index]: !prev[index] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
                        aria-label={showPasswords[index] ? 'Hide password' : 'Show password'}
                      >
                        {showPasswords[index] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-grey-600 mt-1">Full graph database connection string with credentials</p>
                  </div>

                  {/* Additional fields for ArangoDB and Neptune */}
                  {showAdditionalFields && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                      {formData.type === 'arangodb' && (
                        <>
                          <div>
                            <Label htmlFor={`database-${index}`} className="text-xs">Database Name</Label>
                            <Input
                              id={`database-${index}`}
                              placeholder="e.g., mydb"
                              value={env.database || ''}
                              onChange={(e) => updateEnvConnection(index, 'database', e.target.value)}
                              className="bg-white mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`graphName-${index}`} className="text-xs">Graph Name</Label>
                            <Input
                              id={`graphName-${index}`}
                              placeholder="e.g., social_graph"
                              value={env.graphName || ''}
                              onChange={(e) => updateEnvConnection(index, 'graphName', e.target.value)}
                              className="bg-white mt-1"
                            />
                          </div>
                        </>
                      )}
                      {formData.type === 'neptune' && (
                        <div>
                          <Label htmlFor={`region-${index}`} className="text-xs">AWS Region</Label>
                          <Input
                            id={`region-${index}`}
                            placeholder="e.g., us-east-1"
                            value={env.region || ''}
                            onChange={(e) => updateEnvConnection(index, 'region', e.target.value)}
                            className="bg-white mt-1"
                          />
                        </div>
                      )}
                    </div>
                  )}
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
                    Create Graph
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Help Text */}
        {showEnvs && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-900 mb-2">Graph Database Best Practices</h3>
            <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
              <li>Use encrypted connections (TLS/SSL) for production environments</li>
              <li>Neo4j: Use bolt+s:// or neo4j+s:// for secure connections</li>
              <li>Neptune: Ensure IAM authentication is properly configured</li>
              <li>ArangoDB: Specify database and graph name for multi-tenant setups</li>
              <li>Never commit connection strings to version control</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
