import { useState, useEffect } from 'react';
import { IProduct } from '@/types/product';
import { Database, HardDrive, Layers, MessageSquare, Settings2, Box, Plus, ExternalLink, Loader2, Edit2, Grid3x3, Filter, Workflow, Shield, Timer, Heart, Bell, KeyRound, Share2, Network, Bot, Boxes, Brain, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import productServices from '@/services/productServices';
import { MarkdownViewer } from '@/components/ui/markdown-editor';
import AddAppModal from '@/components/modals/AddAppModal';
import CreateEnvironmentModal from '@/components/modals/CreateEnvironmentModal';
import UpdateProductEnvironmentModal from '@/components/modals/UpdateProductEnvironmentModal';
import appServicesReal from '@/services/appServicesReal';
import toast from 'react-hot-toast';

interface ProductTabContentProps {
  product?: IProduct;
  productId?: string;
}

export default function ProductTabContent({ product: initialProduct, productId }: ProductTabContentProps) {
  const { openTab, updateTab, activeTabId, tabs } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();

  // Get initialization data from active tab if product is undefined (after refresh)
  const activeTab = tabs.find(t => t.id === activeTabId);
  const initialActiveSection = (activeTab?.data as any)?.activeSection || 'overview';

  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [showCreateEnvModal, setShowCreateEnvModal] = useState(false);
  const [showUpdateEnvModal, setShowUpdateEnvModal] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<any>(null);
  const [loadingAppTag, setLoadingAppTag] = useState<string | null>(null);

  // Content filter state - initialize from persisted data
  const [activeFilter, setActiveFilter] = useState<string>(initialActiveSection);

  // Check if product data is incomplete (missing integrations, envs, name, etc.)
  const isProductDataIncomplete = initialProduct && (!initialProduct.envs || initialProduct.envs.length === 0 || !initialProduct.name);

  // Fetch product data if not provided or incomplete (when restored from localStorage)
  const { data: fetchedProductData, isLoading: isFetchingProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId || !user?._id || !user?.public_key || !currentWorkspaceId) return null;

      const response = await productServices.fetchProduct({
        product_id: productId,
        user_id: user._id,
        public_key: user.public_key,
        workspace_id: currentWorkspaceId,
      });
      return response.data;
    },
    enabled: (!initialProduct || isProductDataIncomplete) && !!productId && !!user?._id && !!user?.public_key && !!currentWorkspaceId,
  });

  // Use fetched data if available (it's more complete), otherwise use initial product
  const product = fetchedProductData || initialProduct;

  // Fetch connected apps (must be before early return)
  const { data: productAppsRes, status: productAppsStatus } = useQuery({
    queryKey: ['product-apps', product?._id],
    queryFn: () =>
      productServices.fetchProductApps({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
        product_id: product!._id,
      }),
    enabled: !!user?._id && !!user?.public_key && !!currentWorkspaceId && !!product?._id,
  });

  const connectedApps = productAppsRes?.data || [];

  // Update tab with fetched data
  useEffect(() => {
    if (fetchedProductData && activeTabId && !initialProduct) {
      updateTab(activeTabId, { data: fetchedProductData });
    }
  }, [fetchedProductData, activeTabId, initialProduct, updateTab]);

  // Mutation to fetch full app data by tag (MUST be before early return)
  const { mutate: fetchFullApp } = useMutation({
    mutationFn: (params: { tag: string; user_id: string; public_key: string }) =>
      appServicesReal.fetchAppByTag(params),
    onSuccess: (response) => {
      const fullApp = response.data;
      openTab({
        id: `app-${fullApp._id}`,
        type: 'app',
        title: fullApp.app_name,
        itemId: fullApp._id,
        data: fullApp,
      });
      setLoadingAppTag(null);
    },
    onError: (error: any) => {
      toast.error('Failed to load app details');
      console.error('Failed to fetch full app:', error);
      setLoadingAppTag(null);
    },
  });

  // Debug logging
  useEffect(() => {
    console.log('ProductTabContent Debug:', {
      productId,
      hasInitialProduct: !!initialProduct,
      hasFetchedProductData: !!fetchedProductData,
      hasProduct: !!product,
      productName: product?.name,
      isFetchingProduct,
      isProductDataIncomplete,
      userId: user?._id,
      publicKey: user?.public_key,
      currentWorkspaceId,
    });
  }, [productId, initialProduct, fetchedProductData, product, isFetchingProduct, isProductDataIncomplete, user, currentWorkspaceId]);

  // Show skeleton loading state while fetching product data or when data is incomplete (after all hooks)
  // Only show skeleton if we're loading AND don't have product yet, OR if product exists but name is missing
  if ((isFetchingProduct && !product) || (product && !product.name)) {
    return (
      <div className="bg-grey-100">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-grey-300 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-8 w-56 bg-grey-300 rounded animate-pulse" />
                <div className="h-4 w-40 bg-grey-300 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Filter Navigation Skeleton */}
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-grey-300 rounded animate-pulse" />
              <div className="h-4 w-24 bg-grey-300 rounded animate-pulse" />
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-9 w-32 bg-grey-300 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          {/* Content Cards Skeleton */}
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-grey-300 rounded animate-pulse" />
                    <div className="h-6 w-32 bg-grey-300 rounded animate-pulse" />
                  </div>
                  <div className="h-9 w-20 bg-grey-300 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="p-4 rounded-lg border border-grey-400">
                      <div className="h-5 w-3/4 bg-grey-300 rounded animate-pulse mb-2" />
                      <div className="h-4 w-1/2 bg-grey-300 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state if product couldn't be loaded
  if (!product && !isFetchingProduct) {
    return (
      <div className="flex items-center justify-center h-full bg-grey-100">
        <div className="text-center">
          <p className="text-red text-lg mb-2">Failed to load product</p>
          <p className="text-grey-600">The product data could not be retrieved.</p>
          {productId && (
            <p className="text-grey-500 text-sm mt-2">Product ID: {productId}</p>
          )}
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleOpenComponent = (component: any, type: string) => {
    openTab({
      id: `${type}-${component._id}-${Date.now()}`,
      type: type as any,
      title: component.name || component.tag || `${type}`,
      itemId: component._id,
      data: {
        ...component,
        // Explicitly preserve these core properties for localStorage restoration
        name: component.name,
        tag: component.tag,
        componentType: type,
        productName: product?.name,
        productTag: product?.tag,
        productLogo: product?.logo,
        productEnvironments: product?.envs || []
      },
    });
  };

  const handleAddComponent = (type: string) => {
    // Show modal for environment creation instead of opening a tab
    if (type === 'environment') {
      setShowCreateEnvModal(true);
      return;
    }

    // Open a new tab for creating other components
    openTab({
      id: `new-${type}-${Date.now()}`,
      type: type as any,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      data: {
        componentType: type,
        productName: product?.name,
        productId: product?._id,
        productTag: product?.tag,
        productLogo: product?.logo,
        productEnvs: product?.envs || [],
        workspaceId: currentWorkspaceId,
        // Additional data for jobs (parent/event selection)
        productApps: connectedApps || [],
        productDatabases: product?.databases || [],
        productMessageBroker: product?.messageBrokers || [],
        productNotifications: product?.notifications || [],
        productStorage: product?.storage || [],
        productSessions: product?.sessions || [],
        isNew: true
      },
      isDirty: true, // Mark as dirty to trigger new component forms
    });
  };

  const handleEditEnvironment = (env: any) => {
    setSelectedEnvironment(env);
    setShowUpdateEnvModal(true);
  };

  const handleOpenApp = (app: any) => {
    setLoadingAppTag(app.tag || app.app_tag);

    // Fetch full app data by tag
    fetchFullApp({
      tag: app.tag || app.app_tag,
      user_id: user?._id || '',
      public_key: user?.public_key || '',
    });
  };

  return (
    <div className="bg-grey-100">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Product Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
              {product?.logo ? (
                <img
                  src={product?.logo}
                  alt={product?.name}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                getInitials(String(product?.name))
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-grey">{product?.name}</h1>
                <span className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium',
                  product?.status === 'active' ? 'bg-green/10 text-green' : 'bg-grey-400 text-grey-600'
                )}>
                  {product?.status}
                </span>
              </div>
              <p className="text-sm text-grey-600 mb-3">{product?.tag}</p>
              {product?.description && (
                <div className="text-grey-600">
                  <MarkdownViewer content={product?.description} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Filter Navigation */}
        <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-grey-600" />
            <span className="text-sm font-medium text-grey-600">Quick Access:</span>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={activeFilter === 'overview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('overview')}
                className="gap-2"
              >
                <Grid3x3 className="h-4 w-4" />
                Overview
              </Button>
              <Button
                variant={activeFilter === 'apps' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('apps')}
                className="gap-2"
              >
                <Grid3x3 className="h-4 w-4" />
                Apps ({connectedApps.length})
              </Button>
              <Button
                variant={activeFilter === 'environments' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('environments')}
                className="gap-2"
              >
                <Settings2 className="h-4 w-4" />
                Environments ({product?.envs?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'databases' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('databases')}
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                Databases ({product?.databases?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'graphs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('graphs')}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Graphs ({product?.graphs?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'storage' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('storage')}
                className="gap-2"
              >
                <HardDrive className="h-4 w-4" />
                Storage ({product?.storage?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'caches' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('caches')}
                className="gap-2"
              >
                <Layers className="h-4 w-4" />
                Caches ({product?.caches?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'messageBrokers' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('messageBrokers')}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Message Brokers ({product?.messageBrokers?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'jobs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('jobs')}
                className="gap-2"
              >
                <Box className="h-4 w-4" />
                Jobs ({product?.jobs?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'workflows' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('workflows')}
                className="gap-2"
              >
                <GitBranch className="h-4 w-4" />
                Workflows ({product?.workflows?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'vectors' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('vectors')}
                className="gap-2"
              >
                <Boxes className="h-4 w-4" />
                Vectors ({product?.vectors?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'agents' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('agents')}
                className="gap-2"
              >
                <Bot className="h-4 w-4" />
                Agents ({product?.agents?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'models' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('models')}
                className="gap-2"
              >
                <Brain className="h-4 w-4" />
                Models ({product?.models?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'features' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('features')}
                className="gap-2"
              >
                <Workflow className="h-4 w-4" />
                Features ({product?.features?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'fallbacks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('fallbacks')}
                className="gap-2"
              >
                <Shield className="h-4 w-4" />
                Fallbacks ({product?.fallback?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'quotas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('quotas')}
                className="gap-2"
              >
                <Timer className="h-4 w-4" />
                Quotas ({product?.quota?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'healthchecks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('healthchecks')}
                className="gap-2"
              >
                <Heart className="h-4 w-4" />
                Health Checks ({product?.healthchecks?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'notifications' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('notifications')}
                className="gap-2"
              >
                <Bell className="h-4 w-4" />
                Notifiers ({product?.notifications?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'sessions' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('sessions')}
                className="gap-2"
              >
                <KeyRound className="h-4 w-4" />
                Sessions ({product?.sessions?.length || 0})
              </Button>
            </div>
          </div>
        </div>

        {/* Product Stats Grid */}
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="flex gap-4 min-w-max pb-2">
            {/* Environments */}
            <button
              onClick={() => setActiveFilter('environments')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Settings2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.envs?.length || 0}</p>
                  <p className="text-sm text-grey-600">Environments</p>
                </div>
              </div>
            </button>

            {/* Connected Apps */}
            <button
              onClick={() => setActiveFilter('apps')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                  <Grid3x3 className="h-5 w-5 text-green" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{connectedApps.length}</p>
                  <p className="text-sm text-grey-600">Connected Apps</p>
                </div>
              </div>
            </button>

            {/* Databases */}
            <button
              onClick={() => setActiveFilter('databases')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.databases?.length || 0}</p>
                  <p className="text-sm text-grey-600">Databases</p>
                </div>
              </div>
            </button>

            {/* Graphs */}
            <button
              onClick={() => setActiveFilter('graphs')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.graphs?.length || 0}</p>
                  <p className="text-sm text-grey-600">Graphs</p>
                </div>
              </div>
            </button>

            {/* Storage */}
            <button
              onClick={() => setActiveFilter('storage')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <HardDrive className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.storage?.length || 0}</p>
                  <p className="text-sm text-grey-600">Storage</p>
                </div>
              </div>
            </button>

            {/* Caches */}
            <button
              onClick={() => setActiveFilter('caches')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.caches?.length || 0}</p>
                  <p className="text-sm text-grey-600">Caches</p>
                </div>
              </div>
            </button>

            {/* Message Brokers */}
            <button
              onClick={() => setActiveFilter('messageBrokers')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.messageBrokers?.length || 0}</p>
                  <p className="text-sm text-grey-600">Message Brokers</p>
                </div>
              </div>
            </button>

            {/* Jobs */}
            <button
              onClick={() => setActiveFilter('jobs')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Box className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.jobs?.length || 0}</p>
                  <p className="text-sm text-grey-600">Jobs</p>
                </div>
              </div>
            </button>

            {/* Workflows */}
            <button
              onClick={() => setActiveFilter('workflows')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <GitBranch className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.workflows?.length || 0}</p>
                  <p className="text-sm text-grey-600">Workflows</p>
                </div>
              </div>
            </button>

            {/* Vectors */}
            <button
              onClick={() => setActiveFilter('vectors')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Boxes className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.vectors?.length || 0}</p>
                  <p className="text-sm text-grey-600">Vectors</p>
                </div>
              </div>
            </button>

            {/* Agents */}
            <button
              onClick={() => setActiveFilter('agents')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.agents?.length || 0}</p>
                  <p className="text-sm text-grey-600">Agents</p>
                </div>
              </div>
            </button>

            {/* Models */}
            <button
              onClick={() => setActiveFilter('models')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.models?.length || 0}</p>
                  <p className="text-sm text-grey-600">Models</p>
                </div>
              </div>
            </button>

            {/* Features */}
            <button
              onClick={() => setActiveFilter('features')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Workflow className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.features?.length || 0}</p>
                  <p className="text-sm text-grey-600">Features</p>
                </div>
              </div>
            </button>

            {/* Fallbacks */}
            <button
              onClick={() => setActiveFilter('fallbacks')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.fallback?.length || 0}</p>
                  <p className="text-sm text-grey-600">Fallbacks</p>
                </div>
              </div>
            </button>

            {/* Quotas */}
            <button
              onClick={() => setActiveFilter('quotas')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange/10 flex items-center justify-center">
                  <Timer className="h-5 w-5 text-orange" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.quota?.length || 0}</p>
                  <p className="text-sm text-grey-600">Quotas</p>
                </div>
              </div>
            </button>

            {/* Healthchecks */}
            <button
              onClick={() => setActiveFilter('healthchecks')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-grey-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.healthchecks?.length || 0}</p>
                  <p className="text-sm text-grey-600">Health Checks</p>
                </div>
              </div>
            </button>

            {/* Notifiers */}
            <button
              onClick={() => setActiveFilter('notifications')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.notifications?.length || 0}</p>
                  <p className="text-sm text-grey-600">Notifiers</p>
                </div>
              </div>
            </button>

            {/* Sessions */}
            <button
              onClick={() => setActiveFilter('sessions')}
              className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-grey">{product?.sessions?.length || 0}</p>
                  <p className="text-sm text-grey-600">Sessions</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Content Sections with Filtering */}
        {activeFilter === 'overview' && (
          <div className="space-y-6">
            {/* Show all sections in overview mode */}
            {renderConnectedAppsCard()}
            {renderEnvironmentsCard()}
            {renderDatabasesCard()}
            {renderGraphsCard()}
            {renderStorageCard()}
            {renderCachesCard()}
            {renderMessageBrokersCard()}
            {renderJobsCard()}
            {renderWorkflowsCard()}
            {renderVectorsCard()}
            {renderAgentsCard()}
            {renderModelsCard()}
            {renderFeaturesCard()}
            {renderFallbacksCard()}
            {renderQuotasCard()}
            {renderHealthchecksCard()}
            {renderNotificationsCard()}
            {renderSessionsCard()}
          </div>
        )}

        {activeFilter === 'apps' && renderConnectedAppsCard()}
        {activeFilter === 'environments' && renderEnvironmentsCard()}
        {activeFilter === 'databases' && renderDatabasesCard()}
        {activeFilter === 'graphs' && renderGraphsCard()}
        {activeFilter === 'storage' && renderStorageCard()}
        {activeFilter === 'caches' && renderCachesCard()}
        {activeFilter === 'messageBrokers' && renderMessageBrokersCard()}
        {activeFilter === 'jobs' && renderJobsCard()}
        {activeFilter === 'workflows' && renderWorkflowsCard()}
        {activeFilter === 'vectors' && renderVectorsCard()}
        {activeFilter === 'agents' && renderAgentsCard()}
        {activeFilter === 'models' && renderModelsCard()}
        {activeFilter === 'features' && renderFeaturesCard()}
        {activeFilter === 'fallbacks' && renderFallbacksCard()}
        {activeFilter === 'quotas' && renderQuotasCard()}
        {activeFilter === 'healthchecks' && renderHealthchecksCard()}
        {activeFilter === 'notifications' && renderNotificationsCard()}
        {activeFilter === 'sessions' && renderSessionsCard()}
      </div>

      {/* Add App Modal */}
      <AddAppModal
        open={showAddAppModal}
        onOpenChange={setShowAddAppModal}
        product={product}
      />

      {/* Create Environment Modal */}
      <CreateEnvironmentModal
        open={showCreateEnvModal}
        onOpenChange={setShowCreateEnvModal}
        productTag={String(product?.tag)}
        productId={String(product?._id)}
      />

      {/* Update Environment Modal */}
      <UpdateProductEnvironmentModal
        open={showUpdateEnvModal}
        onOpenChange={setShowUpdateEnvModal}
        productTag={String(product?.tag)}
        productId={product?._id}
        environment={selectedEnvironment}
        onSuccess={() => {
          setSelectedEnvironment(null);
        }}
      />
    </div>
  );

  // Render functions for each section
  function renderConnectedAppsCard() {
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5 text-grey-600" />
            <h2 className="text-lg font-semibold text-grey">Connected Apps</h2>
            <span className="text-sm text-grey-600">({connectedApps.length})</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddAppModal(true)}
            className="h-8 gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
          
          {productAppsStatus === 'pending' ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-grey-600">Loading apps...</span>
            </div>
          ) : connectedApps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedApps.map((app: any) => {
                const isLoadingThisApp = loadingAppTag === (app.tag || app.app_tag);
                return (
                <div
                  key={app._id}
                  onClick={() => !isLoadingThisApp && handleOpenApp(app)}
                  className={cn(
                    "p-4 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer",
                    isLoadingThisApp && "opacity-70 cursor-wait"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* App Logo */}
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {isLoadingThisApp ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : app.logo ? (
                        <img
                          src={app.logo}
                          alt={app.app_name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold text-sm">
                          {app.app_name?.[0]?.toUpperCase() || 'A'}
                        </span>
                      )}
                    </div>
                    
                    {/* App Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-grey truncate">
                        {app.app_name || app.name}
                      </h3>
                      <p className="text-xs text-grey-600 truncate">
                        {app.tag || app.app_tag}
                      </p>
                      {app.description && (
                        <p className="text-xs text-grey-500 mt-1 line-clamp-2">
                          {app.description}
                        </p>
                      )}
                      
                      {/* App Status */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          app.status === 'active' ? 'bg-green/10 text-green' : 'bg-grey-400 text-grey-600'
                        )}>
                          {app.status || 'Unknown'}
                        </span>
                        {app.access_tag && (
                          <span className="text-xs text-grey-500">
                            Access: {app.access_tag.split(':')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* External Link Icon */}
                    {!isLoadingThisApp && <ExternalLink className="h-4 w-4 text-grey-400 flex-shrink-0" />}
                  </div>
                </div>
              );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Grid3x3 className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No apps connected yet</p>
              <p className="text-xs text-grey-500">
                Connect apps and start building integrations
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderEnvironmentsCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Environments</h2>
              <span className="text-sm text-grey-600">({product?.envs?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('environment')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          
          {product?.envs && product?.envs.length > 0 ? (
            <div className="space-y-3">
              {product?.envs.map((env) => (
                <div
                  key={env._id}
                  className="flex items-center justify-between p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-grey">{env.env_name}</h3>
                    <p className="text-xs text-grey-600">{env.slug}</p>
                    {env.description && (
                      <p className="text-xs text-grey-500 mt-1">{env.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      env.active ? 'bg-green/10 text-green' : 'bg-grey-400 text-grey-600'
                    )}>
                      {env.active ? 'Active' : 'Inactive'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditEnvironment(env)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Settings2 className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No environments configured yet</p>
              <p className="text-xs text-grey-500">
                Add environments to organize your product's different deployment stages
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderDatabasesCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Databases</h2>
              <span className="text-sm text-grey-600">({product?.databases?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('database')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product?.databases && product?.databases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product?.databases.map((db: any) => (
                <button
                  key={db._id}
                  onClick={() => handleOpenComponent(db, 'database')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {db.name || db.tag}
                    </p>
                  </div>
                  {db.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {db.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No databases added yet</p>
              <p className="text-xs text-grey-500">
                Add databases to store your product's data
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderGraphsCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Graph Databases</h2>
              <span className="text-sm text-grey-600">({product?.graphs?.length || 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const firstGraph = product?.graphs?.[0];
                  const env = firstGraph?.envs?.[0] || { slug: 'development', connection_url: 'neo4j://localhost:7687' };
                  const graphData = firstGraph ? {
                    name: firstGraph.name,
                    tag: firstGraph.tag,
                    type: firstGraph.type,
                    env: env,
                  } : {
                    name: 'Sample Graph',
                    tag: 'sample-graph',
                    type: 'neo4j',
                    env: {
                      slug: 'development',
                      connection_url: 'neo4j://localhost:7687',
                      database: 'neo4j',
                    },
                  };
                  openTab({
                    id: `graph-explorer-${graphData.tag}-${graphData.env.slug}`,
                    type: 'graph',
                    title: `${graphData.name} (${graphData.env.slug})`,
                    itemId: `${graphData.tag}-${graphData.env.slug}`,
                    data: {
                      graph: graphData,
                      isExplorer: true,
                    },
                  });
                }}
                className="h-8 gap-1"
              >
                <Network className="h-4 w-4" />
                <span className="hidden sm:inline">Open</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddComponent('graph')}
                className="h-8 gap-1"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>
          </div>
          {product?.graphs && product?.graphs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product?.graphs.map((graph: any) => (
                <button
                  key={graph._id}
                  onClick={() => handleOpenComponent(graph, 'graph')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {graph.name || graph.tag}
                    </p>
                    {graph.type && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 uppercase">
                        {graph.type}
                      </span>
                    )}
                  </div>
                  {graph.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {graph.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Share2 className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No graph databases added yet</p>
              <p className="text-xs text-grey-500">
                Add graph databases for connected data like social networks or knowledge graphs
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderStorageCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Storage</h2>
              <span className="text-sm text-grey-600">({product?.storage?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('storage')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product?.storage && product?.storage.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product?.storage.map((storage: any) => (
                <button
                  key={storage._id}
                  onClick={() => handleOpenComponent(storage, 'storage')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {storage.name || storage.tag}
                    </p>
                  </div>
                  {storage.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {storage.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <HardDrive className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No storage added yet</p>
              <p className="text-xs text-grey-500">
                Add storage solutions for your product's files and assets
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderCachesCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Caches</h2>
              <span className="text-sm text-grey-600">({product?.caches?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('cache')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product?.caches && product?.caches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product?.caches.map((cache: any) => (
                <button
                  key={cache._id}
                  onClick={() => handleOpenComponent(cache, 'cache')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {cache.name || cache.tag}
                    </p>
                  </div>
                  <p className="text-xs text-grey-600 mt-1">
                    Expires in {cache.expiry} {cache.period}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Layers className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No caches added yet</p>
              <p className="text-xs text-grey-500">
                Add caches to improve your product's performance
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderMessageBrokersCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Message Brokers</h2>
              <span className="text-sm text-grey-600">({product?.messageBrokers?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('message-broker')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product?.messageBrokers && product?.messageBrokers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product?.messageBrokers.map((broker: any) => (
                <button
                  key={broker._id}
                  onClick={() => handleOpenComponent(broker, 'message-broker')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {broker.name || broker.tag}
                    </p>
                  </div>
                  {broker.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {broker.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No message brokers added yet</p>
              <p className="text-xs text-grey-500">
                Add message brokers for asynchronous communication
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderJobsCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Box className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Jobs</h2>
              <span className="text-sm text-grey-600">({product?.jobs?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('job')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product?.jobs && product?.jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product?.jobs.map((job: any) => (
                <button
                  key={job._id}
                  onClick={() => handleOpenComponent(job, 'job')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {job.name || job.tag}
                    </p>
                  </div>
                  {job.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {job.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Box className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No jobs added yet</p>
              <p className="text-xs text-grey-500">
                Add background jobs for your product's processing tasks
              </p>
            </div>
          )}
        </div>
    );
  }

  function renderWorkflowsCard() {
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-grey-600" />
            <h2 className="text-lg font-semibold text-grey">Workflows</h2>
            <span className="text-sm text-grey-600">({product?.workflows?.length || 0})</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddComponent('workflow')}
            className="h-8 gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
        {product?.workflows && product?.workflows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {product?.workflows.map((workflow: any) => (
              <button
                key={workflow._id}
                onClick={() => handleOpenComponent(workflow, 'workflow')}
                className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-violet-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-grey truncate">
                    {workflow.name || workflow.tag}
                  </p>
                </div>
                {workflow.description && (
                  <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                    {workflow.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <GitBranch className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-sm text-grey-600 mb-2">No workflows added yet</p>
            <p className="text-xs text-grey-500">
              Create automated workflows for your product
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderVectorsCard() {
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-grey-600" />
            <h2 className="text-lg font-semibold text-grey">Vectors</h2>
            <span className="text-sm text-grey-600">({product?.vectors?.length || 0})</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddComponent('vector')}
            className="h-8 gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
        {product?.vectors && product?.vectors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {product?.vectors.map((vector: any) => (
              <button
                key={vector._id}
                onClick={() => handleOpenComponent(vector, 'vector')}
                className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-grey truncate">
                    {vector.name || vector.tag}
                  </p>
                </div>
                {vector.description && (
                  <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                    {vector.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Boxes className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-sm text-grey-600 mb-2">No vector stores added yet</p>
            <p className="text-xs text-grey-500">
              Add vector stores for semantic search and embeddings
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderAgentsCard() {
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-grey-600" />
            <h2 className="text-lg font-semibold text-grey">Agents</h2>
            <span className="text-sm text-grey-600">({product?.agents?.length || 0})</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddComponent('agent')}
            className="h-8 gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
        {product?.agents && product?.agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {product?.agents.map((agent: any) => (
              <button
                key={agent._id}
                onClick={() => handleOpenComponent(agent, 'agent')}
                className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-grey truncate">
                    {agent.name || agent.tag}
                  </p>
                </div>
                {agent.description && (
                  <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                    {agent.description}
                  </p>
                )}
                {agent.model && (
                  <p className="text-xs text-grey-500 mt-1">
                    Model: {typeof agent.model === 'string' ? agent.model : agent.model.model}
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-sm text-grey-600 mb-2">No agents added yet</p>
            <p className="text-xs text-grey-500">
              Create AI agents to automate tasks with LLM capabilities
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderModelsCard() {
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-grey-600" />
            <h2 className="text-lg font-semibold text-grey">Models</h2>
            <span className="text-sm text-grey-600">({product?.models?.length || 0})</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddComponent('model')}
            className="h-8 gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
        {product?.models && product?.models.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {product?.models.map((model: any) => (
              <button
                key={model._id}
                onClick={() => handleOpenComponent(model, 'model')}
                className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-grey truncate">
                    {model.name || model.tag}
                  </p>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-grey-100 text-grey-600 uppercase">
                    {model.provider}
                  </span>
                </div>
                <p className="text-xs text-grey-600 mt-1">
                  {model.model}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-sm text-grey-600 mb-2">No models configured yet</p>
            <p className="text-xs text-grey-500">
              Configure LLM models for your agents to use
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderFeaturesCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Features</h2>
              <span className="text-sm text-grey-600">({product?.features?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('feature')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product?.features && product?.features.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product?.features.map((feature: any) => (
                <button
                  key={feature._id}
                  onClick={() => handleOpenComponent(feature, 'feature')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {feature.name || feature.tag}
                    </p>
                  </div>
                  {feature.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {feature.description}
                    </p>
                  )}
                  {feature.sequence && (
                    <p className="text-xs text-grey-500 mt-1">
                      {feature.sequence.reduce((acc: number, seq: any) => acc + seq.events.length, 0)} Events
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Workflow className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No features added yet</p>
              <p className="text-xs text-grey-500">
                Create workflows combining multiple actions and services
              </p>
            </div>
          )}
        </div>
    );
  }

  function renderFallbacksCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Fallbacks</h2>
              <span className="text-sm text-grey-600">({product?.fallback?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('fallback')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product?.fallback && product?.fallback.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product?.fallback.map((fallback: any) => (
                <button
                  key={fallback._id}
                  onClick={() => handleOpenComponent(fallback, 'fallback')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {fallback.name || fallback.tag}
                    </p>
                  </div>
                  {fallback.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {fallback.description}
                    </p>
                  )}
                  {fallback.options && (
                    <p className="text-xs text-grey-500 mt-1">
                      {fallback.options.length} Provider{fallback.options.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No fallbacks added yet</p>
              <p className="text-xs text-grey-500">
                Define fallback providers for redundancy and reliability
              </p>
            </div>
          )}
        </div>
    );
  }

  function renderQuotasCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Quotas</h2>
              <span className="text-sm text-grey-600">({product?.quota?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('quota')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product?.quota && product?.quota.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product?.quota.map((quota: any) => (
                <button
                  key={quota._id}
                  onClick={() => handleOpenComponent(quota, 'quota')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {quota.name || quota.tag}
                    </p>
                  </div>
                  {quota.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {quota.description}
                    </p>
                  )}
                  {quota.total_quota && (
                    <p className="text-xs text-grey-500 mt-1">
                      Limit: {quota.total_quota}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Timer className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No quotas added yet</p>
              <p className="text-xs text-grey-500">
                Set usage limits and quota management for API calls
              </p>
            </div>
          )}
        </div>
    );
  }

  function renderHealthchecksCard() {
    const healthchecksCount = product?.healthchecks?.length || 0;
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-grey-600" />
            <h2 className="text-lg font-semibold text-grey">Health Checks</h2>
            <span className="text-sm text-grey-600">({healthchecksCount})</span>
          </div>
          <Button
            size="sm"
            className="gap-2"
            variant="outline"
            onClick={() => handleAddComponent('healthcheck')}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>

        {product?.healthchecks && product?.healthchecks.length > 0 ? (
          <div className="space-y-3">
            {product?.healthchecks.map((healthcheck: any) => (
              <button
                key={healthcheck._id}
                onClick={() => handleOpenComponent(healthcheck, 'healthcheck')}
                className="w-full p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="h-4 w-4 text-grey-600" />
                  <h3 className="text-sm font-medium text-grey">{healthcheck.name}</h3>
                </div>
                <p className="text-xs text-grey-600">{healthcheck.tag}</p>
                {healthcheck.description && (
                  <p className="text-xs text-grey-600 mt-1">{healthcheck.description}</p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-sm text-grey-600 mb-2">No health checks configured yet</p>
            <p className="text-xs text-grey-500">
              Add health checks to monitor the status of your endpoints
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderNotificationsCard() {
    const notificationsCount = product?.notifications?.length || 0;
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-grey-600" />
            <h2 className="text-lg font-semibold text-grey">Notifiers</h2>
            <span className="text-sm text-grey-600">({notificationsCount})</span>
          </div>
          <Button
            size="sm"
            className="gap-2"
            variant="outline"
            onClick={() => handleAddComponent('notification')}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>

        {product?.notifications && product?.notifications.length > 0 ? (
          <div className="space-y-3">
            {product?.notifications.map((notification: any) => (
              <button
                key={notification._id}
                onClick={() => handleOpenComponent(notification, 'notification')}
                className="w-full p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-medium text-grey">{notification.name}</h3>
                </div>
                <p className="text-xs text-grey-600">{notification.tag}</p>
                {notification.description && (
                  <p className="text-xs text-grey-600 mt-1">{notification.description}</p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-sm text-grey-600 mb-2">No notifiers configured yet</p>
            <p className="text-xs text-grey-500">
              Add notifiers to send push notifications, emails, SMS, or webhooks
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderSessionsCard() {
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-grey-600" />
            <h2 className="text-lg font-semibold text-grey">Sessions</h2>
            <span className="text-sm text-grey-600">({product?.sessions?.length || 0})</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddComponent('session')}
            className="h-8 gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
        {product?.sessions && product?.sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {product?.sessions.map((session: any) => (
              <button
                key={session._id}
                onClick={() => handleOpenComponent(session, 'session')}
                className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-grey truncate">
                    {session.name || session.tag}
                  </p>
                </div>
                {session.expiry && session.period && (
                  <p className="text-xs text-grey-600 mt-1">
                    Expires in {session.expiry} {session.period}
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <KeyRound className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-sm text-grey-600 mb-2">No sessions added yet</p>
            <p className="text-xs text-grey-500">
              Add sessions to manage user authentication and tokens
            </p>
          </div>
        )}
      </div>
    );
  }
}
