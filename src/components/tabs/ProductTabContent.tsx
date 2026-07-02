import {useState, useEffect, useRef, useMemo} from 'react';
import {IProduct} from '@/types/product';
import {
  Database,
  HardDrive,
  Layers,
  MessageSquare,
  Settings2,
  Box,
  Plus,
  ExternalLink,
  Loader2,
  Edit2,
  Grid3x3,
  Workflow,
  Shield,
  Timer,
  Heart,
  Bell,
  KeyRound,
  Share2,
  Bot,
  Boxes,
  Brain,
  GitBranch,
  Search,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  BarChart3,
  Activity,
  Home,
  FileText,
  Trash2,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {useWorkbenchStore} from '@/stores/workbench-store';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/store/useAuth';
import productServices from '@/services/productServices';
import {MarkdownViewer} from '@/components/ui/markdown-editor';
import AddAppModal from '@/components/modals/AddAppModal';
import CreateEnvironmentModal from '@/components/modals/CreateEnvironmentModal';
import UpdateProductEnvironmentModal from '@/components/modals/UpdateProductEnvironmentModal';
import DeleteProductModal from '@/components/modals/DeleteProductModal';
import appServicesReal from '@/services/appServicesReal';
import toast from 'react-hot-toast';
import InlineDatabaseForm from '@/components/forms/InlineDatabaseForm';
import InlineStorageForm from '@/components/forms/InlineStorageForm';
import InlineSessionForm from '@/components/forms/InlineSessionForm';
import InlineCacheForm from '@/components/forms/InlineCacheForm';
import InlineMessageBrokerForm from '@/components/forms/InlineMessageBrokerForm';
import InlineNotifierForm from '@/components/forms/InlineNotifierForm';
import CodeSidebar from '@/components/CodeSidebar';
import {saveTabState, getTabState} from '@/lib/tab-state-manager';
import { resolveProductAppAccessTag } from '@/utils/productAppAccess';

interface ProductTabContentProps {
  tabId: string;
  product?: IProduct;
  productId?: string;
}

// Resource category types for sidebar
type ResourceCategory =
  | 'overview'
  | 'apps'
  | 'environments'
  | 'databases'
  | 'storage'
  | 'caches'
  | 'messageBrokers'
  | 'jobs'
  | 'workflows'
  | 'intelligence'
  | 'resilience'
  | 'notifications'
  | 'sessions';

interface ResourceCategoryConfig {
  id: ResourceCategory;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  dataKey: string;
  componentType: string;
  disabled?: boolean;
}

const resourceCategories: ResourceCategoryConfig[] = [
  // Enabled categories first
  {
    id: 'apps',
    label: 'Connected Apps',
    icon: Grid3x3,
    color: 'text-green',
    bgColor: 'bg-green/10',
    dataKey: 'apps',
    componentType: 'app',
  },
  {
    id: 'databases',
    label: 'Databases',
    icon: Database,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    dataKey: 'databases',
    componentType: 'database',
  },
  {
    id: 'storage',
    label: 'Storage',
    icon: HardDrive,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    dataKey: 'storage',
    componentType: 'storage',
  },
  {
    id: 'sessions',
    label: 'Sessions',
    icon: KeyRound,
    color: 'text-blue-600',
    bgColor: 'bg-blue-600/10',
    dataKey: 'sessions',
    componentType: 'session',
  },
  {
    id: 'messageBrokers',
    label: 'Messaging',
    icon: MessageSquare,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-600/10',
    dataKey: 'messageBrokers',
    componentType: 'message-broker',
  },
  {
    id: 'caches',
    label: 'Caches',
    icon: Layers,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    dataKey: 'caches',
    componentType: 'cache',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    dataKey: 'notifications',
    componentType: 'notification',
  },
  {
    id: 'jobs',
    label: 'Jobs',
    icon: Box,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-600/10',
    dataKey: 'jobs',
    componentType: 'job',
  },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: GitBranch,
    color: 'text-violet-600',
    bgColor: 'bg-violet-600/10',
    dataKey: 'workflows',
    componentType: 'workflow',
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    icon: Brain,
    color: 'text-amber-600',
    bgColor: 'bg-amber-600/10',
    dataKey: 'intelligence',
    componentType: 'intelligence',
  },
  {
    id: 'resilience',
    label: 'Resilience',
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    dataKey: 'resilience',
    componentType: 'resilience',
  },
];

export default function ProductTabContent({
  tabId,
  product: initialProduct,
  productId,
}: ProductTabContentProps) {
  const {openTab, updateTab, closeTab} = useWorkbenchStore();
  const {user, currentWorkspaceId} = useAuth();
  const queryClient = useQueryClient();
  const hasRestoredStateRef = useRef(false);

  // Load persisted state from tab state manager
  const getPersistedState = () => {
    const savedState = getTabState(tabId);
    // UI state is stored in formState, not data (data only has minimal product info)
    if (savedState?.formState) {
      return savedState.formState as {
        activeCategory?: ResourceCategory;
        searchQuery?: string;
        isSidebarCollapsed?: boolean;
      };
    }
    return null;
  };

  const persistedState = getPersistedState();

  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [showDeleteProductModal, setShowDeleteProductModal] = useState(false);
  const [showCreateEnvModal, setShowCreateEnvModal] = useState(false);
  const [showUpdateEnvModal, setShowUpdateEnvModal] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<any>(null);
  const [loadingAppTag, setLoadingAppTag] = useState<string | null>(null);

  // Type selection dialogs for combined categories
  const [showDatabaseTypeDialog, setShowDatabaseTypeDialog] = useState(false);
  const [showIntelligenceTypeDialog, setShowIntelligenceTypeDialog] =
    useState(false);
  const [showResilienceTypeDialog, setShowResilienceTypeDialog] =
    useState(false);
  const [showJobsCodeDialog, setShowJobsCodeDialog] = useState(false);
  const [showWorkflowsCodeDialog, setShowWorkflowsCodeDialog] = useState(false);
  const [selectedWorkflowFn, setSelectedWorkflowFn] =
    useState<string>('define');
  const [selectedJobType, setSelectedJobType] = useState<string>('app-action');

  // Inline component creation state (null = not creating, string = type being created)
  const [inlineCreateMode, setInlineCreateMode] = useState<string | null>(null);

  // Sidebar state - initialized from persisted state
  const [activeCategory, setActiveCategory] = useState<ResourceCategory>(
    persistedState?.activeCategory || 'overview',
  );
  const [searchQuery, setSearchQuery] = useState(
    persistedState?.searchQuery || '',
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    persistedState?.isSidebarCollapsed || false,
  );
  const [isSidebarRefreshing, setIsSidebarRefreshing] = useState(false);
  // Which notification card is expanded to show templates inline (tag or null)
  const [expandedNotificationTag, setExpandedNotificationTag] = useState<
    string | null
  >(null);

  // Mark state as restored after initial load
  useEffect(() => {
    hasRestoredStateRef.current = true;
  }, []);

  // Helper to change category and exit inline create mode
  const handleCategoryChange = (category: ResourceCategory) => {
    setInlineCreateMode(null);
    setActiveCategory(category);
  };

  // Persist sidebar state to tab state manager
  useEffect(() => {
    // Don't persist before initial restoration
    if (!hasRestoredStateRef.current) return;

    const productName = initialProduct?.name || 'Product';
    const uiState = {
      activeCategory,
      searchQuery,
      isSidebarCollapsed,
    };

    // Store UI state in formState (not data) so it survives minimal data extraction
    saveTabState(
      tabId,
      'product',
      productName,
      initialProduct || {_id: productId}, // Pass actual product data
      uiState, // Pass UI state as formState
      initialProduct?.tag || productId || initialProduct?._id,
    );
  }, [
    tabId,
    activeCategory,
    searchQuery,
    isSidebarCollapsed,
    initialProduct?.name,
    initialProduct?.tag,
    initialProduct?._id,
    productId,
    initialProduct,
  ]);

  // Fetch product data if not provided or incomplete
  const {
    data: fetchedProductData,
    isLoading: isFetchingProduct,
    refetch,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId || !user?._id || !user?.public_key || !currentWorkspaceId)
        return null;

      const response = await productServices.fetchProduct({
        product_id: productId,
        user_id: user._id,
        public_key: user.public_key,
        workspace_id: currentWorkspaceId,
      });
      return response.data;
    },
    enabled:
      !!productId && !!user?._id && !!user?.public_key && !!currentWorkspaceId,
    staleTime: 30 * 1000, // 30 seconds - data is considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    refetchOnMount: 'always', // Always refetch when component mounts to get latest data
    refetchInterval: (query) => {
      type Provisionable = { provisionStatus?: string; envs?: Array<{ provisionStatus?: string }> };
      const p = query.state.data as {
        databases?: Provisionable[];
        graphs?: Provisionable[];
        vectors?: Provisionable[];
        messageBrokers?: Provisionable[];
      } | null;
      const all = [
        ...(p?.databases || []),
        ...(p?.graphs || []),
        ...(p?.vectors || []),
        ...(p?.messageBrokers || []),
      ];
      const needsPoll = all.some(
        (item) =>
          item.provisionStatus === 'provisioning' ||
          item.envs?.some((env) => env.provisionStatus === 'provisioning'),
      );
      return needsPoll ? 15_000 : false;
    },
  });

  const product = fetchedProductData || initialProduct;

  // Check if product data is incomplete
  const isProductDataIncomplete =
    !product ||
    !product.tag ||
    !product.name ||
    !product.envs ||
    product.envs.length === 0;

  // Fetch connected apps
  const {
    data: productAppsRes,
    status: productAppsStatus,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ['product-apps', product?._id],
    queryFn: () =>
      productServices.fetchProductApps({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
        product_id: product!._id,
      }),
    enabled:
      !!user?._id &&
      !!user?.public_key &&
      !!currentWorkspaceId &&
      !!product?._id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always', // Always refetch when component mounts to get latest data
  });

  const connectedApps = useMemo(() => {
    const apps = productAppsRes?.data || [];
    const links = product?.apps || [];
    return apps.map((app: { tag?: string; app_tag?: string; access_tag?: string }) => ({
      ...app,
      access_tag: resolveProductAppAccessTag(
        app.tag || app.app_tag,
        links,
        app.access_tag
      ),
    }));
  }, [productAppsRes?.data, product?.apps]);

  const deleteProductMutation = useMutation({
    mutationFn: () =>
      productServices.deleteProduct({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        product_id: String(product?._id),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success('Product deleted');
      setShowDeleteProductModal(false);
      closeTab(tabId);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });

  // Update tab with fetched data (use tabId — inactive tabs stay mounted)
  useEffect(() => {
    if (!fetchedProductData || !tabId || initialProduct) return;

    const { tabs } = useWorkbenchStore.getState();
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab || tab.type !== 'product') return;

    updateTab(tabId, { data: fetchedProductData });
  }, [fetchedProductData, tabId, initialProduct, updateTab]);

  // Mutation to fetch full app data by tag
  const {mutate: fetchFullApp} = useMutation({
    mutationFn: (params: {tag: string; user_id: string; public_key: string; access_tag?: string}) =>
      appServicesReal.fetchAppByTag(params),
    onSuccess: (response, variables) => {
      const fullApp = response.data;
      openTab({
        id: `app-${fullApp._id}`,
        type: 'app',
        title: fullApp.app_name,
        itemId: fullApp._id,
        data: {
          ...fullApp,
          appViewMode: 'product' as const,
          accessTag: variables.access_tag,
          // Pass product context so actions can be run via ductape.api.run
          productTag: product?.tag,
          productId: product?._id,
          productName: product?.name,
          productEnvs: product?.envs || [],
        },
      });
      setLoadingAppTag(null);
    },
    onError: (error: any) => {
      toast.error('Failed to load app details');
      console.error('Failed to fetch full app:', error);
      setLoadingAppTag(null);
    },
  });

  // Get resources for a category
  const getResources = (category: ResourceCategoryConfig): any[] => {
    if (category.id === 'apps') return connectedApps;
    // Combined Databases category (databases + graphs + vectors)
    if (category.id === 'databases') {
      const databases = (product as any)?.databases || [];
      const graphs = (product as any)?.graphs || [];
      const vectors = (product as any)?.vectors || [];
      return [
        ...databases.map((d: any) => ({...d, _resourceType: 'database'})),
        ...graphs.map((g: any) => ({...g, _resourceType: 'graph'})),
        ...vectors.map((v: any) => ({...v, _resourceType: 'vector'})),
      ];
    }
    // Combined AI category (agents + models)
    if (category.id === 'intelligence') {
      const agents = (product as any)?.agents || [];
      const models = (product as any)?.models || [];
      return [
        ...agents.map((a: any) => ({...a, _resourceType: 'agent'})),
        ...models.map((m: any) => ({...m, _resourceType: 'model'})),
      ];
    }
    // Combined Resilience category (fallbacks + quotas + healthchecks)
    if (category.id === 'resilience') {
      const fallbacks = (product as any)?.fallback || [];
      const quotas = (product as any)?.quota || [];
      const healthchecks = (product as any)?.healthchecks || [];
      return [
        ...fallbacks.map((f: any) => ({...f, _resourceType: 'fallback'})),
        ...quotas.map((q: any) => ({...q, _resourceType: 'quota'})),
        ...healthchecks.map((h: any) => ({...h, _resourceType: 'healthcheck'})),
      ];
    }
    // Storage
    if (category.id === 'storage') {
      return (product as any)?.storage || [];
    }
    // Caches
    if (category.id === 'caches') {
      return (product as any)?.caches || [];
    }
    // Message Brokers
    if (category.id === 'messageBrokers') {
      return ((product as any)?.messageBrokers || []).map((b: any) => ({
        ...b,
        _resourceType: 'messageBroker',
      }));
    }
    // Jobs
    if (category.id === 'jobs') {
      return (product as any)?.jobs || [];
    }
    // Workflows
    if (category.id === 'workflows') {
      return (product as any)?.workflows || [];
    }
    // Notifications
    if (category.id === 'notifications') {
      return (product as any)?.notifications || [];
    }
    // Sessions
    if (category.id === 'sessions') {
      return (product as any)?.sessions || [];
    }
    const data = (product as any)?.[category.dataKey];
    return Array.isArray(data) ? data : [];
  };

  // Get resource count for a category (including dummy data)
  const getResourceCount = (category: ResourceCategoryConfig): number => {
    return getResources(category).length;
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsSidebarRefreshing(true);
    await Promise.all([refetch(), refetchApps()]);
    setIsSidebarRefreshing(false);
  };

  // Show skeleton loading state
  if ((isFetchingProduct && !product) || (product && !product.name)) {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-grey-100 md:flex-row">
        {/* Sidebar skeleton - responsive */}
        <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-grey-400 flex flex-col flex-shrink-0 min-h-0 overflow-hidden md:self-stretch">
          <div className="p-3 sm:p-4 border-b border-grey-400">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-grey-200 rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-3 sm:h-4 w-20 sm:w-24 bg-grey-200 rounded animate-pulse mb-1 sm:mb-1.5" />
                <div className="h-2 sm:h-3 w-12 sm:w-16 bg-grey-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-8 sm:h-9 bg-grey-200 rounded animate-pulse" />
          </div>

          {/* Navigation items */}
          <div className="flex-1 p-2 space-y-1">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div
                key={i}
                className="h-9 sm:h-10 bg-grey-100 rounded animate-pulse"
                style={{animationDelay: `${i * 100}ms`}}
              />
            ))}
          </div>

          <div className="p-2 sm:p-3 border-t border-grey-400">
            <div className="h-7 sm:h-8 bg-grey-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Main content skeleton with grid layout */}
        <div className="flex-1 overflow-auto bg-grey-50">
          {/* Header skeleton */}
          <div className="bg-white border-b border-grey-300 sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-grey-200 rounded-xl animate-pulse" />
                  <div>
                    <div className="h-4 sm:h-5 md:h-6 w-24 sm:w-32 bg-grey-200 rounded animate-pulse mb-1" />
                    <div className="h-3 sm:h-4 w-32 sm:w-40 bg-grey-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-8 sm:h-9 w-28 sm:w-32 bg-grey-200 rounded animate-pulse" />
                  <div className="h-8 sm:h-9 w-16 sm:w-20 bg-grey-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Content skeleton - cards grid */}
          <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
            {/* Loading indicator */}
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 md:py-16">
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base font-medium text-grey-700">
                Loading product configuration...
              </p>
              <p className="text-xs sm:text-sm text-grey-500 mt-1 sm:mt-2">
                Fetching product details and components
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 mt-4 sm:mt-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  className="bg-white border border-grey-300 rounded-lg p-3 sm:p-4 animate-pulse"
                  style={{animationDelay: `${i * 100}ms`}}
                >
                  <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-grey-200" />
                    <div className="flex-1">
                      <div className="h-3 sm:h-4 w-20 sm:w-24 bg-grey-200 rounded mb-1 sm:mb-2" />
                      <div className="h-2 sm:h-3 w-12 sm:w-16 bg-grey-100 rounded" />
                    </div>
                  </div>
                  <div className="h-2 sm:h-3 w-full bg-grey-100 rounded mb-1.5 sm:mb-2" />
                  <div className="h-2 sm:h-3 w-2/3 bg-grey-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (!product && !isFetchingProduct) {
    return (
      <div className="flex items-center justify-center h-full bg-grey-100 p-4 sm:p-6 md:p-8">
        <div className="text-center max-w-xs sm:max-w-sm md:max-w-md mx-auto">
          <p className="text-red text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3">
            Failed to load product
          </p>
          <p className="text-grey-600 text-sm sm:text-base">
            The product data could not be retrieved.
          </p>
          {productId && (
            <p className="text-grey-500 text-xs sm:text-sm mt-2 sm:mt-3 break-all">
              Product ID: {productId}
            </p>
          )}
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleOpenComponent = (component: any, type: string) => {
    const defaultEnv = product?.envs?.[0] ?? { slug: 'prd', name: 'Production' };

    // Workflows: card click opens explorer (env chips open scoped explorer)
    if (type === 'workflow') {
      openTab({
        id: `workflow-explorer-${component.tag}-${defaultEnv.slug}`,
        type: 'workflow',
        title: `${component.name || component.tag} (${defaultEnv.slug})`,
        itemId: `${component.tag}-${defaultEnv.slug}`,
        data: {
          product: {
            tag: product?.tag,
            name: product?.name,
            logo: product?.logo,
            envs: product?.envs || [],
          },
          workflow: {
            ...component,
            name: component.name,
            tag: component.tag,
            productTag: product?.tag,
            env: { slug: defaultEnv.slug },
          },
          isExplorer: true,
        },
      });
      return;
    }

    // Resilience: card click opens scoped explorer (env chips open activity explorer)
    if (type === 'healthcheck' || type === 'fallback' || type === 'quota') {
      const explorerType =
        type === 'healthcheck'
          ? 'healthcheck-explorer'
          : type === 'fallback'
            ? 'fallback-explorer'
            : 'quota-explorer';
      openTab({
        id: `${type}-explorer-${component.tag}-${defaultEnv.slug}`,
        type: explorerType,
        title: `${component.name || component.tag} (${defaultEnv.slug})`,
        itemId: `${component.tag}-${defaultEnv.slug}`,
        data: {
          product: {
            tag: product?.tag,
            name: product?.name,
            logo: product?.logo,
            envs: product?.envs || [],
          },
          [type]: component,
          env: defaultEnv,
          selectedEnv: defaultEnv,
          scopedToComponent: true,
          isExplorer: true,
        },
      });
      return;
    }

    // Jobs: open single-job + env explorer (past/future invocations, timeline, metrics)
    if (type === 'job') {
      const env = product?.envs?.[0]
        ? {
            slug: product.envs[0].slug,
            name: product.envs[0].env_name ?? product.envs[0].slug,
          }
        : {slug: 'prd', name: 'Production'};
      openTab({
        id: `job-explorer-${component.tag}-${env.slug}-${Date.now()}`,
        type: 'job-explorer',
        title: `${component.name || component.tag} (${env.slug})`,
        itemId: `${component.tag}-${env.slug}`,
        data: {
          product: {
            tag: product?.tag,
            name: product?.name,
            logo: product?.logo,
            envs: product?.envs || [],
          },
          job: {
            ...component,
            productTag: product?.tag,
            productName: product?.name,
          },
          env,
          isExplorer: true,
        },
      });
      return;
    }

    openTab({
      id: `${type}-${component._id}-${Date.now()}`,
      type: type as any,
      title: component.name || component.tag || `${type}`,
      itemId: component._id,
      data: {
        ...component,
        name: component.name,
        tag: component.tag,
        componentType: type,
        productName: product?.name,
        productTag: product?.tag,
        productLogo: product?.logo,
        productEnvironments: product?.envs || [],
      },
    });
  };

  const handleAddComponent = (type: string) => {
    if (type === 'environment') {
      setShowCreateEnvModal(true);
      return;
    }
    if (type === 'app') {
      setShowAddAppModal(true);
      return;
    }
    // Show type selection dialog for combined categories
    if (type === 'database') {
      setShowDatabaseTypeDialog(true);
      return;
    }
    if (type === 'intelligence') {
      setShowIntelligenceTypeDialog(true);
      return;
    }
    if (type === 'resilience') {
      setShowResilienceTypeDialog(true);
      return;
    }
    // Use inline forms for storage, session, cache, message-broker, and notification
    if (type === 'storage') {
      setInlineCreateMode('storage');
      return;
    }
    if (type === 'session') {
      setInlineCreateMode('session');
      return;
    }
    if (type === 'cache') {
      setInlineCreateMode('cache');
      return;
    }
    if (type === 'message-broker') {
      setInlineCreateMode('message-broker');
      return;
    }
    if (type === 'notification') {
      setInlineCreateMode('notifier');
      return;
    }
    // Jobs: "Add job" opens code sample sidebar (Dispatching Jobs)
    if (type === 'job') {
      setShowJobsCodeDialog(true);
      return;
    }
    // Workflows: "Add" opens code sample sidebar (Defining & Executing Workflows)
    if (type === 'workflow') {
      setShowWorkflowsCodeDialog(true);
      return;
    }

    openNewComponentTab(type);
  };

  // Helper to open a new component tab
  const openNewComponentTab = (type: string) => {
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
        productApps: connectedApps || [],
        productDatabases: product?.databases || [],
        productMessageBroker: product?.messageBrokers || [],
        productNotifications: product?.notifications || [],
        productStorage: product?.storage || [],
        productSessions: product?.sessions || [],
        isNew: true,
      },
      isDirty: true,
    });
  };

  const handleEditEnvironment = (env: any) => {
    setSelectedEnvironment(env);
    setShowUpdateEnvModal(true);
  };

  const handleOpenApp = (app: any) => {
    const appTag = app.tag || app.app_tag;
    const accessTag = resolveProductAppAccessTag(appTag, product?.apps, app.access_tag);

    if (!accessTag) {
      toast.error(
        'No product connection found for this app. Connect the app to this product first, then try again.'
      );
      return;
    }

    setLoadingAppTag(appTag);
    fetchFullApp({
      tag: appTag,
      user_id: user?._id || '',
      public_key: user?.public_key || '',
      access_tag: accessTag,
    });
  };

  // Open template: MessageTabContent (view) when clicking a template, NotificationTemplateTabContent when creating new
  const handleOpenNotificationTemplate = (
    notification: any,
    template?: {tag: string; name?: string; _id?: string},
  ) => {
    if (template) {
      // View existing template in MessageTabContent (message tag for SDK fetch must be full "notifier:template")
      const fullTag = template.tag?.includes(':')
        ? template.tag
        : notification?.tag
          ? `${notification.tag}:${template.tag}`
          : template.tag;
      const messageForTab = {...template, tag: fullTag};
      openTab({
        id: `message-${notification?.tag}-${fullTag}`.replace(/:/g, '-'),
        type: 'message',
        title: template.name || template.tag || 'Template',
        itemId: template._id ?? fullTag,
        data: {
          ...messageForTab,
          productTag: product?.tag,
          notifierTag: notification?.tag,
          notification: notification ?? undefined,
        },
      });
    } else {
      // Create new template: open NotificationTemplateTabContent
      openTab({
        id: `notification-template-new-${Date.now()}`,
        type: 'notification-template',
        title: 'New Template',
        itemId: 'new',
        data: {
          productTag: product?.tag,
          productName: product?.name,
          productLogo: product?.logo,
          productEnvs: product?.envs || [],
          workspaceId: currentWorkspaceId || '',
          notificationTag: notification?.tag,
          notification: notification
            ? {name: notification.name, tag: notification.tag}
            : undefined,
          isNew: true,
        },
        isDirty: true,
      });
    }
  };

  // Open database explorer for a specific environment
  const handleOpenDatabaseExplorer = (
    database: any,
    env: any,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation(); // Prevent card click
    openTab({
      id: `db-explorer-${database.tag}-${env.slug}`,
      type: 'database',
      title: `${database.name} (${env.slug})`,
      itemId: `${database.tag}-${env.slug}`,
      data: {
        database: {
          name: database.name,
          tag: database.tag,
          type: database.type,
          env: env,
          productTag: product?.tag,
          productName: product?.name,
        },
        isExplorer: true,
      },
    });
  };

  // Open resource explorer for a specific environment (generic handler for all resource types)
  const handleOpenResourceExplorer = (
    resource: any,
    resourceType: string,
    env: any,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation(); // Prevent card click

    // Map resource types to tab types
    // Some resource types open directly to their "values/events/files" views
    const typeMap: Record<string, string> = {
      database: 'database',
      graph: 'graph',
      vector: 'vector',
      storage: 'storage', // Opens StorageExplorerTab (files view)
      cache: 'cache-values', // Opens directly to cache values
      'message-broker': 'message-broker-events', // Opens directly to broker events
      session: 'session-activity', // Opens SessionActivityTab
      job: 'job-explorer', // Opens JobExplorerTab (single job: past/future invocations, timeline, metrics)
      workflow: 'workflow', // Opens WorkflowExplorerTab
      agent: 'agent', // Opens AgentExplorerTab
      fallback: 'fallback-explorer', // Opens FallbackExplorerTab
      quota: 'quota-explorer', // Opens QuotaExplorerTab
      healthcheck: 'healthcheck-explorer', // Opens HealthcheckExplorerTab
      notification: 'notification-explorer',
    };

    const tabType = typeMap[resourceType] || resourceType;

    // Build resource data object for explorer tabs
    const resourceData = {
      name: resource.name,
      tag: resource.tag,
      type: resource.type,
      env: env,
      productTag: product?.tag,
      productName: product?.name,
    };

    // Different resource types expect different data structures
    // Database, Graph, Storage explorers expect nested objects
    let data: any = {
      isExplorer: true,
      componentType: resourceType,
      productTag: product?.tag,
      productName: product?.name,
      productLogo: product?.logo,
    };

    if (
      resourceType === 'database' ||
      resourceType === 'graph' ||
      resourceType === 'vector'
    ) {
      // These use nested object structure (database/graph/vector key)
      data.database = resourceData;
      data.graph = resourceData;
      // VectorExplorerTab expects 'vector' field (not 'tag') to identify the vector config
      data.vector = {
        ...resourceData,
        vector: resource.tag, // VectorExplorerTab expects vector.vector not vector.tag
      };
    } else if (resourceType === 'storage') {
      // StorageExplorerTab expects product object with tag, name, and envs
      // The provider type (AWS, GCP, AZURE) is stored in env.type
      data = {
        product: {
          tag: product?.tag,
          name: product?.name,
          logo: product?.logo,
          envs: product?.envs || [],
        },
        storage: {
          ...resource,
          name: resource.name,
          tag: resource.tag,
          type: env.type, // Provider type from the environment config (AWS, GCP, AZURE)
          provider: env.type, // Also set as provider for clarity
          env: env,
          productTag: product?.tag,
          productName: product?.name,
        },
        isExplorer: true,
      };
    } else if (resourceType === 'cache') {
      // CacheValuesTabContent expects cache data with env info
      data = {
        ...resource,
        name: resource.name,
        tag: resource.tag,
        env: env,
        productTag: product?.tag,
        productName: product?.name,
      };
    } else if (resourceType === 'message-broker') {
      // MessageBrokerEventsTabContent expects broker data with env info
      data = {
        ...resource,
        name: resource.name,
        tag: resource.tag,
        env: env,
        productTag: product?.tag,
        productName: product?.name,
      };
    } else if (resourceType === 'workflow') {
      // WorkflowExplorerTab expects product object with tag, name, and envs
      data = {
        product: {
          tag: product?.tag,
          name: product?.name,
          logo: product?.logo,
          envs: product?.envs || [],
        },
        workflow: {
          ...resource,
          name: resource.name,
          tag: resource.tag,
          productTag: product?.tag,
          env: {slug: env.slug},
        },
        isExplorer: true,
      };
    } else if (resourceType === 'agent') {
      // AgentExplorerTab expects product object with tag, name, and envs
      data = {
        product: {
          tag: product?.tag,
          name: product?.name,
          logo: product?.logo,
          envs: product?.envs || [],
        },
        agent: {
          ...resource,
          name: resource.name,
          tag: resource.tag,
          productTag: product?.tag,
          env: {slug: env.slug},
        },
        isExplorer: true,
      };
    } else if (resourceType === 'session') {
      // SessionActivityTab expects session, sessionTag, productTag, productName
      data = {
        session: {
          ...resource,
          env: env,
        },
        sessionTag: resource.tag,
        productTag: product?.tag,
        productName: product?.name,
      };
    } else if (resourceType === 'notification') {
      // NotificationExplorerTab: product + notification + env = Notifier+Env mode (sidebar + overview/templates)
      data = {
        product: {
          tag: product?.tag,
          name: product?.name,
          logo: product?.logo,
          envs: product?.envs || [],
        },
        notification: resource,
        env: env ? {slug: env.slug, name: env.name} : undefined,
        isExplorer: true,
      };
    } else if (resourceType === 'fallback') {
      data = {
        product: {
          tag: product?.tag,
          name: product?.name,
          logo: product?.logo,
          envs: product?.envs || [],
        },
        fallback: resource,
        env: env ? { slug: env.slug, name: env.name } : undefined,
        selectedEnv: env,
        scopedToComponent: true,
        isExplorer: true,
      };
    } else if (resourceType === 'quota') {
      data = {
        product: {
          tag: product?.tag,
          name: product?.name,
          logo: product?.logo,
          envs: product?.envs || [],
        },
        quota: resource,
        env: env ? { slug: env.slug, name: env.name } : undefined,
        selectedEnv: env,
        scopedToComponent: true,
        isExplorer: true,
      };
    } else if (resourceType === 'healthcheck') {
      data = {
        product: {
          tag: product?.tag,
          name: product?.name,
          logo: product?.logo,
          envs: product?.envs || [],
        },
        healthcheck: resource,
        env: env ? { slug: env.slug, name: env.name } : undefined,
        selectedEnv: env,
        scopedToComponent: true,
        isExplorer: true,
      };
    } else if (resourceType === 'job') {
      // JobExplorerTab (single job) expects product, job, and env
      data = {
        product: {
          tag: product?.tag,
          name: product?.name,
          logo: product?.logo,
          envs: product?.envs || [],
        },
        job: {
          ...resource,
          productTag: product?.tag,
          productName: product?.name,
        },
        env: env ? {slug: env.slug, name: env.name} : undefined,
        isExplorer: true,
      };
    } else {
      // Other resource types use flat structure
      data = {
        ...resource,
        ...data,
        env: env,
        selectedEnv: env,
      };
    }

    openTab({
      id: `${tabType}-explorer-${resource.tag}-${env.slug}`,
      type: tabType as any,
      title: `${resource.name} (${env.slug})`,
      itemId: `${resource.tag}-${env.slug}`,
      data,
    });
  };

  // Render resource card (using old design style)
  const renderResourceCard = (item: any, category: ResourceCategoryConfig) => {
    const itemName = item.name || item.app_name || item.tag || item.env_name;
    const isLoadingApp =
      category.id === 'apps' && loadingAppTag === (item.tag || item.app_tag);
    const isActive = item.status === 'active' || item.active;
    const isCloudProvisioning =
      ['database', 'graph', 'vector', 'messageBroker'].includes(item._resourceType) &&
      (item.provisionStatus === 'provisioning' ||
        item.envs?.some((env: { provisionStatus?: string }) => env.provisionStatus === 'provisioning'));
    const isCloudProvisionFailed =
      ['database', 'graph', 'vector', 'messageBroker'].includes(item._resourceType) &&
      (item.provisionStatus === 'failed' ||
        item.envs?.some((env: { provisionStatus?: string }) => env.provisionStatus === 'failed'));

    // For combined categories, determine the actual resource type
    const resourceType = item._resourceType || category.componentType;

    // Check if this resource has environments configured
    // Product-level env chips for resources that run per environment
    const useProductEnvs =
      (category.id === 'caches' ||
        category.id === 'sessions' ||
        category.id === 'jobs' ||
        category.id === 'workflows' ||
        category.id === 'resilience') &&
      product?.envs?.length;
    const itemEnvs =
      Array.isArray(item.envs) && item.envs.length > 0
        ? item.envs
        : useProductEnvs
          ? product.envs.map((env: any) => ({slug: env.slug, name: env.name}))
          : [];
    const hasEnvs = itemEnvs.length > 0;

    // Resource types that should NOT show env explorer buttons (apps and environments don't make sense to have explorer)
    const excludeEnvButtons =
      category.id === 'apps' || category.id === 'environments';

    // Get the appropriate icon for combined categories
    const getItemIcon = () => {
      // Databases category
      if (item._resourceType === 'database') return Database;
      if (item._resourceType === 'graph') return Share2;
      if (item._resourceType === 'vector') return Boxes;
      // AI category
      if (item._resourceType === 'agent') return Bot;
      if (item._resourceType === 'model') return Brain;
      // Resilience category
      if (item._resourceType === 'fallback') return Shield;
      if (item._resourceType === 'quota') return Timer;
      if (item._resourceType === 'healthcheck') return Heart;
      return category.icon;
    };

    const ItemIcon = getItemIcon();

    // Get database type badge styling
    const getDatabaseTypeBadge = () => {
      if (item._resourceType === 'graph') {
        if (item.type) {
          const type = item.type.toLowerCase();
          if (type.includes('neo4j')) {
            return {
              label: 'Neo4j',
              bgColor: 'bg-purple-100',
              textColor: 'text-purple-700',
            };
          }
          if (type.includes('neptune')) {
            return {
              label: 'Neptune',
              bgColor: 'bg-blue-100',
              textColor: 'text-blue-700',
            };
          }
          if (type.includes('arango')) {
            return {
              label: 'ArangoDB',
              bgColor: 'bg-green-100',
              textColor: 'text-green-700',
            };
          }
          if (type.includes('memgraph')) {
            return {
              label: 'Memgraph',
              bgColor: 'bg-orange-100',
              textColor: 'text-orange-700',
            };
          }
          // Default for other graph types
          return {
            label: item.type,
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-700',
          };
        }
        return {
          label: 'Graph',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-700',
        };
      }
      if (item._resourceType === 'vector') {
        if (item.type) {
          const type = item.type.toLowerCase();
          if (type.includes('pinecone')) {
            return {
              label: 'Pinecone',
              bgColor: 'bg-emerald-100',
              textColor: 'text-emerald-700',
            };
          }
          if (type.includes('weaviate')) {
            return {
              label: 'Weaviate',
              bgColor: 'bg-pink-100',
              textColor: 'text-pink-700',
            };
          }
          if (type.includes('qdrant')) {
            return {
              label: 'Qdrant',
              bgColor: 'bg-red-100',
              textColor: 'text-red-700',
            };
          }
          if (type.includes('milvus')) {
            return {
              label: 'Milvus',
              bgColor: 'bg-blue-100',
              textColor: 'text-blue-700',
            };
          }
          if (type.includes('chroma')) {
            return {
              label: 'Chroma',
              bgColor: 'bg-yellow-100',
              textColor: 'text-yellow-700',
            };
          }
          if (type.includes('memory')) {
            return {
              label: 'Memory',
              bgColor: 'bg-gray-100',
              textColor: 'text-gray-700',
            };
          }
          // Default for other vector types - show the actual type
          return {
            label: item.type,
            bgColor: 'bg-emerald-100',
            textColor: 'text-emerald-700',
          };
        }
        return {
          label: 'Vector',
          bgColor: 'bg-emerald-100',
          textColor: 'text-emerald-700',
        };
      }
      if (item._resourceType === 'database' && item.type) {
        const type = item.type.toLowerCase();
        // SQL databases
        if (type.includes('postgres') || type === 'postgresql') {
          return {
            label: 'PostgreSQL',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-700',
          };
        }
        if (type.includes('mysql')) {
          return {
            label: 'MySQL',
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-700',
          };
        }
        if (type.includes('sqlite')) {
          return {
            label: 'SQLite',
            bgColor: 'bg-sky-100',
            textColor: 'text-sky-700',
          };
        }
        if (type.includes('mssql') || type.includes('sqlserver')) {
          return {
            label: 'SQL Server',
            bgColor: 'bg-red-100',
            textColor: 'text-red-700',
          };
        }
        // NoSQL databases
        if (type.includes('mongo')) {
          return {
            label: 'MongoDB',
            bgColor: 'bg-green-100',
            textColor: 'text-green-700',
          };
        }
        if (type.includes('redis')) {
          return {
            label: 'Redis',
            bgColor: 'bg-rose-100',
            textColor: 'text-rose-700',
          };
        }
        if (type.includes('dynamo')) {
          return {
            label: 'DynamoDB',
            bgColor: 'bg-amber-100',
            textColor: 'text-amber-700',
          };
        }
        if (type.includes('cassandra')) {
          return {
            label: 'Cassandra',
            bgColor: 'bg-teal-100',
            textColor: 'text-teal-700',
          };
        }
        if (type.includes('couch')) {
          return {
            label: 'CouchDB',
            bgColor: 'bg-pink-100',
            textColor: 'text-pink-700',
          };
        }
        if (type.includes('firebase') || type.includes('firestore')) {
          return {
            label: 'Firestore',
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-700',
          };
        }
        // Default for other types
        return {
          label: item.type,
          bgColor: 'bg-grey-100',
          textColor: 'text-grey-700',
        };
      }
      return null;
    };

    const databaseTypeBadge =
      item._resourceType === 'database' ||
      item._resourceType === 'graph' ||
      item._resourceType === 'vector'
        ? getDatabaseTypeBadge()
        : null;

    // Get message broker type badge
    const getMessageBrokerTypeBadge = () => {
      if (category.id !== 'messageBrokers') return null;

      // Check envs array for broker type
      const envs = item.envs || [];
      const brokerType = envs.length > 0 ? envs[0].type : null;

      if (!brokerType) return null;

      const type = brokerType.toLowerCase();
      if (type.includes('rabbitmq') || type === 'rabbitmq') {
        return {
          label: 'RabbitMQ',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-700',
        };
      }
      if (type.includes('kafka')) {
        return {
          label: 'Kafka',
          bgColor: 'bg-slate-100',
          textColor: 'text-slate-700',
        };
      }
      if (type.includes('redis')) {
        return {
          label: 'Redis',
          bgColor: 'bg-rose-100',
          textColor: 'text-rose-700',
        };
      }
      if (type.includes('sqs') || type.includes('aws_sqs')) {
        return {
          label: 'AWS SQS',
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-700',
        };
      }
      if (type.includes('pubsub') || type.includes('google_pubsub')) {
        return {
          label: 'Google Pub/Sub',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
        };
      }
      if (type.includes('nats')) {
        return {
          label: 'NATS',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
        };
      }
      // Default for other types
      return {
        label: brokerType,
        bgColor: 'bg-cyan-100',
        textColor: 'text-cyan-700',
      };
    };

    // Get storage type badge
    const getStorageTypeBadge = () => {
      if (category.id !== 'storage') return null;

      // Check envs array for storage type
      const envs = item.envs || [];
      const storageType = envs.length > 0 ? envs[0].type : null;

      if (!storageType) return null;

      const type = storageType.toLowerCase();
      if (type.includes('s3') || type.includes('aws') || type === 'aws') {
        return {
          label: 'AWS S3',
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-700',
        };
      }
      if (
        type.includes('gcp') ||
        type.includes('google') ||
        type.includes('gcs')
      ) {
        return {
          label: 'Google Cloud',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
        };
      }
      if (type.includes('azure') || type.includes('blob')) {
        return {
          label: 'Azure Blob',
          bgColor: 'bg-sky-100',
          textColor: 'text-sky-700',
        };
      }
      // Default for other types
      return {
        label: storageType,
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-700',
      };
    };

    const messageBrokerTypeBadge = getMessageBrokerTypeBadge();
    const storageTypeBadge = getStorageTypeBadge();

    // Get category-specific detail text
    const getDetailText = () => {
      if (category.id === 'caches' && item.expiry) {
        // Cache expiry is in milliseconds, format to human readable
        const seconds = item.expiry / 1000;
        if (seconds >= 86400) return `TTL: ${Math.floor(seconds / 86400)}d`;
        if (seconds >= 3600) return `TTL: ${Math.floor(seconds / 3600)}h`;
        if (seconds >= 60) return `TTL: ${Math.floor(seconds / 60)}m`;
        return `TTL: ${seconds}s`;
      }
      if (category.id === 'sessions' && item.expiry) {
        return `TTL: ${item.expiry} ${item.period || ''}`.trim();
      }
      // Skip database types - handled by badge now
      if (
        item._resourceType === 'database' ||
        item._resourceType === 'graph' ||
        item._resourceType === 'vector'
      ) {
        return null;
      }
      // AI category - models
      if (item._resourceType === 'model' && item.provider) {
        return item.provider;
      }
      // AI category - agents
      if (item._resourceType === 'agent' && item.model) {
        return typeof item.model === 'string' ? item.model : item.model.model;
      }
      if (category.id === 'jobs' && item.schedule) {
        return item.schedule;
      }
      if (category.id === 'workflows' && item.steps?.length) {
        return `${item.steps.length} steps`;
      }
      // Resilience category - show type
      if (item._resourceType === 'fallback') return 'Fallback';
      if (item._resourceType === 'quota') return 'Quota';
      if (item._resourceType === 'healthcheck') return 'Health Check';
      return null;
    };

    const detailText = getDetailText();
    const isNotifications = category.id === 'notifications';
    const isExpanded = isNotifications && expandedNotificationTag === item.tag;
    const templates = isNotifications && item.messages ? item.messages : [];

    const cardContent = (
      <div
        onClick={() => {
          if (isCloudProvisioning) return;
          if (category.id === 'apps') {
            handleOpenApp(item);
          } else if (category.id === 'environments') {
            handleEditEnvironment(item);
          } else {
            handleOpenComponent(item, resourceType);
          }
        }}
        className={cn(
          'bg-white rounded-lg border border-grey-400 transition-all',
          // Responsive padding
          'p-3 sm:p-4',
          isCloudProvisioning
            ? 'opacity-50 cursor-not-allowed border-dashed hover:border-grey-400 hover:shadow-none'
            : 'hover:border-primary hover:shadow-md cursor-pointer',
          isLoadingApp && 'opacity-70 cursor-wait',
        )}
      >
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Icon/Logo - Responsive sizing */}
          <div
            className={cn(
              'rounded-lg flex items-center justify-center flex-shrink-0',
              'w-8 h-8 sm:w-10 sm:h-10',
              category.bgColor,
            )}
          >
            {isLoadingApp ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />
            ) : item.logo ? (
              <img
                src={item.logo}
                alt={itemName}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded object-cover"
              />
            ) : (
              <ItemIcon
                className={cn('h-4 w-4 sm:h-5 sm:w-5', category.color)}
              />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1 sm:gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-medium text-grey truncate max-w-[150px] sm:max-w-none">
                {itemName}
              </h3>
              {/* Status badge - Responsive */}
              {(isCloudProvisioning || isCloudProvisionFailed) && (
                <span
                  className={cn(
                    'px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border flex-shrink-0 inline-flex items-center gap-1',
                    isCloudProvisioning
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-red-100 text-red-700 border-red-200',
                  )}
                >
                  {isCloudProvisioning && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {isCloudProvisioning ? 'Provisioning' : 'Provision failed'}
                </span>
              )}
              {!isCloudProvisioning &&
                !isCloudProvisionFailed &&
                (item.status || item.active !== undefined) && (
                <span
                  className={cn(
                    'px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border flex-shrink-0',
                    isActive
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
                  )}
                >
                  {item.status || (isActive ? 'Active' : 'Inactive')}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-grey-500 truncate">
              {item.tag || item.slug}
            </p>

            {/* Database Type Badge - Responsive */}
            {databaseTypeBadge && (
              <span
                className={cn(
                  'inline-block mt-1 sm:mt-1.5 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium',
                  databaseTypeBadge.bgColor,
                  databaseTypeBadge.textColor,
                )}
              >
                {databaseTypeBadge.label}
              </span>
            )}

            {/* Message Broker Type Badge */}
            {messageBrokerTypeBadge && (
              <span
                className={cn(
                  'inline-block mt-1 sm:mt-1.5 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium',
                  messageBrokerTypeBadge.bgColor,
                  messageBrokerTypeBadge.textColor,
                )}
              >
                {messageBrokerTypeBadge.label}
              </span>
            )}

            {/* Storage Type Badge */}
            {storageTypeBadge && (
              <span
                className={cn(
                  'inline-block mt-1 sm:mt-1.5 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium',
                  storageTypeBadge.bgColor,
                  storageTypeBadge.textColor,
                )}
              >
                {storageTypeBadge.label}
              </span>
            )}

            {/* Description - Responsive */}
            {item.description && (
              <p className="text-[10px] sm:text-xs text-grey-600 mt-1 sm:mt-1.5 line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Category-specific detail */}
            {detailText && (
              <p className="text-[10px] sm:text-xs text-grey-500 mt-1 sm:mt-1.5">
                {detailText}
              </p>
            )}

            {/* Environment Buttons - Responsive with wrapping */}
            {hasEnvs && !excludeEnvButtons && (
              <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <ItemIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-grey-400 flex-shrink-0" />
                {itemEnvs.slice(0, 3).map((env: any) => (
                  <button
                    key={env.slug}
                    onClick={e => {
                      if (isCloudProvisioning) {
                        e.stopPropagation();
                        return;
                      }
                      handleOpenResourceExplorer(item, resourceType, env, e);
                    }}
                    disabled={isCloudProvisioning}
                    className={cn(
                      'inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium transition-colors',
                      isCloudProvisioning
                        ? 'bg-grey-100 text-grey-500 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
                    )}
                    title={
                      isCloudProvisioning
                        ? 'Cloud database is still provisioning'
                        : `Open ${env.slug} in explorer`
                    }
                  >
                    {env.slug}
                    <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </button>
                ))}
                {itemEnvs.length > 3 && (
                  <span className="text-[9px] sm:text-[10px] text-grey-500">
                    +{itemEnvs.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Notifications: Templates toggle - Responsive */}
            {isNotifications && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setExpandedNotificationTag(isExpanded ? null : item.tag);
                }}
                className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md px-1.5 sm:px-2 py-1 sm:py-1.5 transition-colors"
              >
                <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden xs:inline">Templates</span>
                <span className="xs:hidden">Templates</span>({templates.length})
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                ) : (
                  <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );

    // For notifications, wrap card + expandable templates section in a container
    if (isNotifications) {
      return (
        <div key={item._id} className="space-y-0">
          {cardContent}
          {isExpanded && (
            <div
              className={cn(
                'border-l-2 border-blue-200 bg-blue-50/50 rounded-r-lg mt-1',
                'ml-2 sm:ml-4 pl-2 sm:pl-4 py-2 sm:py-3 pr-2 sm:pr-4',
              )}
              onClick={e => e.stopPropagation()}
            >
              {/* Header Section - Responsive with better mobile handling */}
              <div className="flex items-center justify-between mb-1.5 sm:mb-2 flex-wrap gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-xs font-semibold text-grey-600 uppercase tracking-wide">
                    Templates
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-grey-500 bg-grey-100 px-1.5 sm:px-2 py-0.5 rounded-full">
                    {templates.length}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-5 sm:h-6 md:h-7',
                    'text-[10px] sm:text-xs',
                    'px-1.5 sm:px-2 md:px-3',
                    'hover:bg-blue-100 transition-colors',
                  )}
                  onClick={e => {
                    e.stopPropagation();
                    handleOpenNotificationTemplate(item);
                  }}
                >
                  <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 mr-0.5 sm:mr-1" />
                  <span className="hidden xs:inline">Create template</span>
                  <span className="xs:hidden">Create</span>
                </Button>
              </div>

              {/* Empty State - Responsive with better visual */}
              {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-2 sm:py-3 text-center">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-grey-400 mb-1 sm:mb-2 opacity-50" />
                  <p className="text-[10px] sm:text-xs text-grey-500">
                    No templates yet
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-grey-400 mt-0.5">
                    Create one to get started
                  </p>
                </div>
              ) : (
                /* Templates List - Responsive with better touch targets */
                <ul className="space-y-1 sm:space-y-1.5">
                  {templates.slice(0, 5).map((msg: any) => (
                    <li key={msg.tag}>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenNotificationTemplate(item, msg);
                        }}
                        className={cn(
                          'w-full flex items-center gap-1.5 sm:gap-2 text-left',
                          'px-2 sm:px-3 py-2 sm:py-2.5', // Larger touch target for mobile
                          'rounded-md text-xs sm:text-sm',
                          'text-grey-700 hover:bg-white hover:shadow-sm',
                          'transition-all duration-200',
                          'border border-transparent hover:border-grey-200',
                          'active:bg-grey-50', // Active state for mobile
                        )}
                      >
                        <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-[10px] sm:text-xs md:text-sm">
                            {msg.name || msg.tag}
                          </div>
                          {msg.tag && (
                            <div className="text-[8px] sm:text-[9px] text-grey-400 truncate sm:hidden">
                              {msg.tag}
                            </div>
                          )}
                        </div>
                        <span className="text-[8px] sm:text-[10px] text-grey-500 truncate flex-shrink-0 hidden sm:inline">
                          {msg.tag}
                        </span>
                        <ChevronRight className="h-3 w-3 text-grey-400 flex-shrink-0 hidden sm:block" />
                      </button>
                    </li>
                  ))}
                  {templates.length > 5 && (
                    <li className="text-center pt-1">
                      <span className="text-[9px] sm:text-[10px] text-grey-500">
                        +{templates.length - 5} more templates
                      </span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      );
    }

    return <div key={item._id}>{cardContent}</div>;
  };

  // Get category description for empty states
  const getCategoryDescription = (categoryId: string) => {
    const descriptions: Record<string, string> = {
      apps: "Connect external applications and services to extend your product's capabilities.",
      environments:
        'Configure deployment environments for development, staging, and production.',
      databases:
        'Set up databases, graph stores, and vector stores to manage your application data.',
      storage:
        'Configure file storage solutions for documents, images, and media.',
      caches: 'Add caching layers to improve performance and reduce latency.',
      messageBrokers:
        'Set up message queues for asynchronous communication between services.',
      jobs: 'Schedule background tasks and automated workflows.',
      workflows: 'Design multi-step processes and business logic flows.',
      intelligence:
        'Configure AI agents and models for intelligent automation and predictions.',
      resilience:
        'Set up fallbacks, quotas, and health checks for reliable operations.',
      notifications: 'Set up notification channels and alert rules.',
      sessions: 'Manage user session configurations.',
    };
    return descriptions[categoryId] || 'Get started by adding your first item.';
  };

  // Render category content (cards view)
  const renderCategoryContent = (category: ResourceCategoryConfig) => {
    const resources = getResources(category);
    const count = getResourceCount(category);
    const Icon = category.icon;

    // Check if the category is loading
    // Apps use a separate query, other resources come from the product data
    // For non-apps categories, check if we're still fetching or if we only have initial (incomplete) product data
    const isProductResourcesLoading =
      isFetchingProduct && (!fetchedProductData || isProductDataIncomplete);
    const isCategoryLoading =
      category.id === 'apps'
        ? productAppsStatus === 'pending'
        : isProductResourcesLoading;

    // Filter by search if present
    const filteredResources = searchQuery
      ? resources.filter(
          item =>
            item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.app_name?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : resources;

    const singularLabel = category.label.replace(/s$/, '').replace(/ies$/, 'y');

    return (
      <div className="h-full overflow-auto">
        {/* Header Section - Responsive */}
        <div className="bg-white dark:bg-background border-b border-grey-300 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div
                  className={cn(
                    'rounded-xl flex items-center justify-center shadow-sm',
                    'w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12',
                    category.bgColor,
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 sm:h-5.5 sm:w-5.5 md:h-6 md:w-6',
                      category.color,
                    )}
                  />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg md:text-xl font-bold text-grey">
                    {category.label}
                  </h1>
                  <p className="text-xs sm:text-sm text-grey-500">
                    {isCategoryLoading ? (
                      <span className="flex items-center gap-1 sm:gap-1.5">
                        <Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin" />
                        <span className="text-[10px] sm:text-xs">
                          Loading...
                        </span>
                      </span>
                    ) : (
                      `${count} ${count === 1 ? singularLabel.toLowerCase() : category.label.toLowerCase()} configured`
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Search bar - responsive width */}
                {count > 0 && (
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-grey-400" />
                    <Input
                      type="text"
                      placeholder={`Search...`}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className={cn(
                        'pl-8 sm:pl-10',
                        'w-full sm:w-48 md:w-64',
                        'bg-white text-xs sm:text-sm',
                        'h-8 sm:h-9 md:h-10',
                      )}
                    />
                  </div>
                )}
                <Button
                  onClick={() => handleAddComponent(category.componentType)}
                  className="gap-1 sm:gap-2 shadow-sm text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                  size="sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Add</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section - Responsive */}
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
          {isCategoryLoading ? (
            /* Loading State - Responsive grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  className="bg-white border border-grey-300 rounded-lg p-3 sm:p-4 animate-pulse"
                  style={{animationDelay: `${i * 100}ms`}}
                >
                  <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-grey-200" />
                    <div className="flex-1">
                      <div className="h-3 sm:h-4 w-20 sm:w-24 bg-grey-200 rounded mb-1 sm:mb-2" />
                      <div className="h-2 sm:h-3 w-12 sm:w-16 bg-grey-100 rounded" />
                    </div>
                  </div>
                  <div className="h-2 sm:h-3 w-full bg-grey-100 rounded mb-1.5 sm:mb-2" />
                  <div className="h-2 sm:h-3 w-2/3 bg-grey-100 rounded" />
                </div>
              ))}
            </div>
          ) : filteredResources.length > 0 ? (
            <>
              {/* Results count when searching - Responsive */}
              {searchQuery && (
                <p className="text-xs sm:text-sm text-grey-500 mb-3 sm:mb-4">
                  Showing {filteredResources.length} of {count}{' '}
                  {count === 1
                    ? singularLabel.toLowerCase()
                    : category.label.toLowerCase()}
                </p>
              )}

              {/* Resources Grid - Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
                {filteredResources.map(item =>
                  renderResourceCard(item, category),
                )}
              </div>
            </>
          ) : (
            /* Empty State - Responsive */
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20">
              {/* Decorative background - Responsive sizing */}
              <div className="relative mb-4 sm:mb-6 md:mb-8">
                <div
                  className={cn(
                    'rounded-2xl flex items-center justify-center',
                    'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
                    category.bgColor,
                  )}
                >
                  <Icon
                    className={cn(
                      'h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12',
                      category.color,
                    )}
                  />
                </div>
                {/* Decorative dots - Responsive positioning */}
                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-grey-200" />
                <div className="absolute -bottom-0.5 -left-2 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-grey-300" />
                <div className="absolute top-1/2 -right-4 sm:-right-5 md:-right-6 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-grey-200" />
              </div>

              {searchQuery ? (
                <>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-grey mb-1 sm:mb-2 text-center px-4">
                    No results found
                  </h3>
                  <p className="text-xs sm:text-sm text-grey-500 text-center max-w-xs sm:max-w-sm md:max-w-md mb-4 sm:mb-6 px-4">
                    We couldn't find any {category.label.toLowerCase()} matching
                    "
                    <span className="font-medium text-grey">{searchQuery}</span>
                    "
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                    className="gap-2 text-xs sm:text-sm"
                    size="sm"
                  >
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-grey mb-1 sm:mb-2 text-center px-4">
                    No {category.label.toLowerCase()} yet
                  </h3>
                  <p className="text-xs sm:text-sm text-grey-500 text-center max-w-xs sm:max-w-sm md:max-w-md mb-4 sm:mb-6 px-4 leading-relaxed">
                    {getCategoryDescription(category.id)}
                  </p>
                  <Button
                    onClick={() => handleAddComponent(category.componentType)}
                    className="gap-1 sm:gap-2 shadow-sm text-xs sm:text-sm px-3 sm:px-4"
                    size="sm"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                    Add
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render overview dashboard (activity-focused)
  const renderOverview = () => {
    // Calculate some mock activity metrics (in real app, these would come from API)
    const totalResources = resourceCategories.reduce(
      (sum, cat) => sum + getResourceCount(cat),
      0,
    );
    const activeEnvCount =
      product?.envs?.filter((e: any) => e.active)?.length || 0;

    return (
      <div className="h-full overflow-auto p-3 sm:p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          {/* Product Header - Responsive */}
          <div className="bg-white rounded-lg border border-grey-400 p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              {/* Logo - Responsive sizing */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg bg-primary flex items-center justify-center text-white text-lg sm:text-xl font-semibold flex-shrink-0">
                {product?.logo ? (
                  <img
                    src={product.logo}
                    alt={product.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  getInitials(String(product?.name))
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-grey break-words">
                    {product?.name}
                  </h1>
                  {product?.status && (
                    <span
                      className={cn(
                        'px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold border flex-shrink-0',
                        product.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
                      )}
                    >
                      {product.status}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-grey-600 mb-2 sm:mb-3 break-all">
                  {product?.tag}
                </p>
                {product?.description && (
                  <div className="text-xs sm:text-sm text-grey-600">
                    <MarkdownViewer content={product.description} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Dashboard Grid - Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column - Activity Stats */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Key Metrics - Responsive */}
              <div className="bg-white rounded-lg border border-grey-400 p-4 sm:p-6 shadow-sm">
                <h2 className="text-base sm:text-lg font-semibold text-grey mb-3 sm:mb-4">
                  Overview
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-grey-50">
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">
                      {totalResources}
                    </p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-grey-600">
                      Total Resources
                    </p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-grey-50">
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green">
                      {connectedApps.length}
                    </p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-grey-600">
                      Connected Apps
                    </p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-grey-50">
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-500">
                      {product?.envs?.length || 0}
                    </p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-grey-600">
                      Environments
                    </p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-grey-50">
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-500">
                      {activeEnvCount}
                    </p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-grey-600">
                      Active Envs
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Activity - Responsive */}
              <div className="bg-white rounded-lg border border-grey-400 p-4 sm:p-6 shadow-sm">
                <h2 className="text-base sm:text-lg font-semibold text-grey mb-3 sm:mb-4">
                  Recent Activity
                </h2>
                <div className="space-y-2 sm:space-y-3">
                  {/* Activity items */}
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-grey-50">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green/10 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-grey">
                        Product initialized
                      </p>
                      <p className="text-[10px] sm:text-xs text-grey-500">
                        Ready for configuration
                      </p>
                    </div>
                  </div>

                  {connectedApps.length > 0 && (
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-grey-50">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Grid3x3 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-grey">
                          {connectedApps.length} app
                          {connectedApps.length !== 1 ? 's' : ''} connected
                        </p>
                        <p className="text-[10px] sm:text-xs text-grey-500">
                          External integrations active
                        </p>
                      </div>
                    </div>
                  )}

                  {(product?.databases?.length || 0) > 0 && (
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-grey-50">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Database className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-grey">
                          {product?.databases?.length} database
                          {(product?.databases?.length || 0) !== 1 ? 's' : ''}{' '}
                          configured
                        </p>
                        <p className="text-[10px] sm:text-xs text-grey-500">
                          Data layer ready
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Right Column - Quick Actions & Environments */}
            <div className="space-y-4 sm:space-y-6">
              {/* Quick Actions - Responsive */}
              <div className="bg-white rounded-lg border border-grey-400 p-4 sm:p-6 shadow-sm">
                <h2 className="text-base sm:text-lg font-semibold text-grey mb-3 sm:mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-1.5 sm:space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    size="sm"
                    onClick={() => setShowAddAppModal(true)}
                  >
                    <Grid3x3 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Connect App</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    size="sm"
                    onClick={() => setShowCreateEnvModal(true)}
                  >
                    <Settings2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Add Environment</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    size="sm"
                    onClick={() => handleAddComponent('database')}
                  >
                    <Database className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Add Database</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    size="sm"
                    onClick={() => handleAddComponent('workflow')}
                  >
                    <Workflow className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Create Workflow</span>
                  </Button>
                </div>
              </div>

              {/* Environments - Responsive */}
              <div className="bg-white rounded-lg border border-grey-400 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h2 className="text-base sm:text-lg font-semibold text-grey">
                      Environments
                    </h2>
                    <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-grey-100 text-grey-600">
                      {product?.envs?.length || 0}
                    </span>
                  </div>
                </div>

                {(product?.envs?.length || 0) > 0 ? (
                  <div className="space-y-1.5 sm:space-y-2">
                    {product?.envs?.slice(0, 4).map((env: any) => {
                      const envSlug = env.slug?.toLowerCase() || '';
                      const isProduction =
                        envSlug.includes('prod') || envSlug === 'live';
                      const isStaging =
                        envSlug.includes('stag') || envSlug.includes('uat');

                      return (
                        <Button
                          key={env._id}
                          onClick={() => handleEditEnvironment(env)}
                          variant="outline"
                          className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-grey-50 transition-all group text-left"
                        >
                          {/* Status dot */}
                          <div
                            className={cn(
                              'w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0',
                              env.active
                                ? 'bg-emerald-500'
                                : 'bg-gray-300 dark:bg-gray-600',
                            )}
                          />

                          {/* Name and slug */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                              <span className="text-xs sm:text-sm font-medium text-grey group-hover:text-primary transition-colors truncate">
                                {env.name}
                              </span>
                              {isProduction && (
                                <span className="px-1 py-0.5 rounded text-[8px] sm:text-[10px] font-medium bg-red/10 text-red flex-shrink-0">
                                  PROD
                                </span>
                              )}
                              {isStaging && (
                                <span className="px-1 py-0.5 rounded text-[8px] sm:text-[10px] font-medium bg-orange-500/10 text-orange-600 flex-shrink-0">
                                  STAGING
                                </span>
                              )}
                            </div>
                            {/* Slug badge */}
                            <span className="inline-block mt-0.5 px-1 sm:px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-medium bg-grey-100 text-grey-600">
                              {env.slug}
                            </span>
                          </div>

                          {/* Status badge */}
                          <span
                            className={cn(
                              'px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-semibold border flex-shrink-0',
                              env.active
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
                            )}
                          >
                            {env.active ? 'Active' : 'Inactive'}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8 border-2 border-dashed border-grey-200 rounded-lg">
                    <Settings2 className="h-6 w-6 sm:h-8 sm:w-8 text-grey-400 mx-auto mb-1 sm:mb-2" />
                    <p className="text-xs sm:text-sm text-grey-600 mb-0.5 sm:mb-1">
                      No environments yet
                    </p>
                    <p className="text-[10px] sm:text-xs text-grey-500">
                      Configure dev, staging, and production
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-lg border border-red-200 p-4 sm:p-6 shadow-sm">
            <h2 className="text-base sm:text-lg font-semibold text-red-600 mb-2">Danger zone</h2>
            <p className="text-xs sm:text-sm text-grey-600 mb-4">
              Permanently delete this product and all of its resources. This cannot be undone.
            </p>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-2"
              onClick={() => setShowDeleteProductModal(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete product
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Environments config (not a resource, handled separately)
  const environmentsConfig: ResourceCategoryConfig = {
    id: 'environments',
    label: 'Environments',
    icon: Settings2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    dataKey: 'envs',
    componentType: 'environment',
  };

  // Render main content based on active category
  const renderMainContent = () => {
    // Show loader if product is loading or data is incomplete
    if ((isFetchingProduct && isProductDataIncomplete) || !product) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 text-center space-y-3 sm:space-y-4">
          <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 animate-spin text-primary opacity-50" />
          <div>
            <h3 className="text-sm sm:text-base md:text-lg font-medium text-grey">
              Loading product configuration...
            </h3>
            <p className="text-xs sm:text-sm text-grey-600 mt-0.5 sm:mt-1">
              This will only take a moment
            </p>
          </div>
        </div>
      );
    }

    // Show inline forms if in create mode
    if (inlineCreateMode && product) {
      const productProps = {
        _id: product._id,
        name: product.name,
        tag: product.tag,
        logo: product.logo,
        envs: product.envs || [],
        workspace_id: currentWorkspaceId || undefined,
      };

      const formCallbacks = {
        onCancel: () => setInlineCreateMode(null),
        onSuccess: () => {
          setInlineCreateMode(null);
          refetch();
        },
      };

      // Database types (database, graph, vector)
      if (
        inlineCreateMode === 'database' ||
        inlineCreateMode === 'graph' ||
        inlineCreateMode === 'vector'
      ) {
        return (
          <InlineDatabaseForm
            product={productProps}
            databaseType={inlineCreateMode as 'database' | 'graph' | 'vector'}
            {...formCallbacks}
          />
        );
      }

      // Storage
      if (inlineCreateMode === 'storage') {
        return <InlineStorageForm product={productProps} {...formCallbacks} />;
      }

      // Session
      if (inlineCreateMode === 'session') {
        return <InlineSessionForm product={productProps} {...formCallbacks} />;
      }

      // Cache
      if (inlineCreateMode === 'cache') {
        return <InlineCacheForm product={productProps} {...formCallbacks} />;
      }

      // Message Broker
      if (inlineCreateMode === 'message-broker') {
        return (
          <InlineMessageBrokerForm product={productProps} {...formCallbacks} />
        );
      }

      // Notifier
      if (inlineCreateMode === 'notifier') {
        return <InlineNotifierForm product={productProps} {...formCallbacks} />;
      }
    }

    if (activeCategory === 'overview') {
      return renderOverview();
    }

    // Handle environments separately (not a resource)
    if (activeCategory === 'environments') {
      return renderCategoryContent(environmentsConfig);
    }

    const category = resourceCategories.find(c => c.id === activeCategory);
    if (category) {
      return renderCategoryContent(category);
    }

    return renderOverview();
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-row overflow-hidden bg-grey-100">
      {/* Sidebar - Responsive widths */}
      <div
        className={cn(
          'bg-white border-r border-grey-400 flex flex-col flex-shrink-0 min-h-0 overflow-hidden transition-all duration-300 absolute inset-y-0 left-0 z-25',
          isSidebarCollapsed
            ? 'w-12 sm:w-14' // Smaller on mobile, standard on tablet/desktop
            : 'w-56 sm:w-64', // Slightly narrower on mobile
        )}
      >
        {/* Header - Responsive padding */}
        <div
          className={cn(
            'flex-shrink-0 border-b border-grey-400',
            isSidebarCollapsed ? 'p-1.5 sm:p-2' : 'p-2 sm:p-3',
          )}
        >
          <div
            className={cn(
              'flex items-center',
              isSidebarCollapsed ? 'justify-center' : 'gap-1.5 sm:gap-2',
            )}
          >
            {/* Product Logo - Responsive sizing */}
            <button
              onClick={() => {
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                } else {
                  handleCategoryChange('overview');
                }
              }}
              className={cn(
                'rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0 transition-all hover:ring-2 hover:ring-primary/50',
                isSidebarCollapsed
                  ? 'w-7 h-7 sm:w-8 sm:h-8 text-[11px] sm:text-xs'
                  : 'w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm',
              )}
              title={
                isSidebarCollapsed ? 'Expand sidebar' : 'Return to overview'
              }
            >
              {product?.logo ? (
                <img
                  src={product.logo}
                  alt={product.name}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                getInitials(String(product?.name))
              )}
            </button>

            {!isSidebarCollapsed && (
              <>
                <button
                  onClick={() => handleCategoryChange('overview')}
                  className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                  title="Return to overview"
                >
                  <h2 className="font-semibold text-grey text-xs sm:text-sm truncate">
                    {product?.name}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-grey-600 truncate">
                    {product?.tag}
                  </p>
                </button>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1 rounded hover:bg-grey-100 text-grey-500 hover:text-grey transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation - Responsive */}
        {!isSidebarCollapsed ? (
          <div className="flex-1 overflow-y-auto py-2 min-h-0">
            {/* Overview */}
            <div className="px-1.5 sm:px-2 mb-0.5 sm:mb-1">
              <button
                onClick={() => handleCategoryChange('overview')}
                className={cn(
                  'w-full flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors',
                  activeCategory === 'overview'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-grey hover:bg-grey-100',
                )}
              >
                <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Overview</span>
              </button>
            </div>

            {/* Environments */}
            <div className="px-1.5 sm:px-2 mb-0.5 sm:mb-1">
              <button
                onClick={() => handleCategoryChange('environments')}
                className={cn(
                  'w-full flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors',
                  activeCategory === 'environments'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-grey hover:bg-grey-100',
                )}
              >
                <Settings2
                  className={cn(
                    'h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0',
                    activeCategory === 'environments'
                      ? 'text-primary'
                      : 'text-grey-600',
                  )}
                />
                <span className="flex-1 text-left">Environments</span>
                <span
                  className={cn(
                    'text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded min-w-[18px] sm:min-w-[20px] text-center',
                    activeCategory === 'environments'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-grey-100 text-grey-600',
                  )}
                >
                  {product?.envs?.length || 0}
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="px-3 sm:px-4 py-1.5 sm:py-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-semibold text-grey-500 uppercase tracking-wider">
                  Resources
                </span>
                <button
                  onClick={handleRefresh}
                  disabled={isSidebarRefreshing}
                  className="text-grey-500 hover:text-primary transition-colors"
                  title="Refresh"
                >
                  <RefreshCw
                    className={cn(
                      'h-3 w-3 sm:h-3.5 sm:w-3.5',
                      isSidebarRefreshing && 'animate-spin',
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Categories */}
            <div className="px-1.5 sm:px-2 space-y-0.5">
              {resourceCategories.map(category => {
                const count = getResourceCount(category);
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                const isDisabled = category.disabled;
                const isProductResourcesLoading =
                  isFetchingProduct &&
                  (!fetchedProductData || isProductDataIncomplete);
                const isCatLoading =
                  isSidebarRefreshing ||
                  (category.id === 'apps'
                    ? productAppsStatus === 'pending'
                    : isProductResourcesLoading);

                return (
                  <button
                    key={category.id}
                    onClick={() =>
                      !isDisabled && handleCategoryChange(category.id)
                    }
                    disabled={isDisabled}
                    className={cn(
                      'w-full flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors',
                      isDisabled
                        ? 'text-grey-400 cursor-not-allowed opacity-50'
                        : isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-grey hover:bg-grey-100',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0',
                        isDisabled
                          ? 'text-grey-400'
                          : isActive
                            ? 'text-primary'
                            : 'text-grey-600',
                      )}
                    />
                    <span className="flex-1 text-left truncate">
                      {category.label}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded min-w-[18px] sm:min-w-[20px] text-center',
                        isDisabled
                          ? 'bg-grey-100 text-grey-400'
                          : isActive
                            ? 'bg-primary/20 text-primary'
                            : 'bg-grey-100 text-grey-600',
                      )}
                    >
                      {isCatLoading ? (
                        <Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin mx-auto" />
                      ) : (
                        count
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-2 min-h-0">
            {/* Collapsed: Overview */}
            <div className="px-1 mb-0.5 sm:mb-1">
              <button
                onClick={() => {
                  handleCategoryChange('overview');
                  setIsSidebarCollapsed(false);
                }}
                className={cn(
                  'w-full flex items-center justify-center p-1.5 sm:p-2 rounded-lg transition-colors',
                  activeCategory === 'overview'
                    ? 'bg-primary/10 text-primary'
                    : 'text-grey hover:bg-grey-100',
                )}
                title="Overview"
              >
                <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Collapsed: Environments */}
            <div className="px-1 mb-0.5 sm:mb-1">
              <button
                onClick={() => {
                  handleCategoryChange('environments');
                  setIsSidebarCollapsed(false);
                }}
                className={cn(
                  'w-full flex items-center justify-center p-1.5 sm:p-2 rounded-lg transition-colors relative',
                  activeCategory === 'environments'
                    ? 'bg-primary/10 text-primary'
                    : 'text-grey hover:bg-grey-100',
                )}
                title={`Environments (${product?.envs?.length || 0})`}
              >
                <Settings2
                  className={cn(
                    'h-4 w-4 sm:h-5 sm:w-5',
                    activeCategory === 'environments'
                      ? 'text-primary'
                      : 'text-grey-600',
                  )}
                />
                {(product?.envs?.length || 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-primary text-white text-[8px] sm:text-[10px] rounded-full flex items-center justify-center font-medium">
                    {(product?.envs?.length || 0) > 9
                      ? '9+'
                      : product?.envs?.length}
                  </span>
                )}
              </button>
            </div>

            {/* Collapsed: Categories */}
            <div className="px-1 space-y-0.5">
              {resourceCategories.map(category => {
                const count = getResourceCount(category);
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                const isDisabled = category.disabled;
                const isProductResourcesLoading =
                  isFetchingProduct &&
                  (!fetchedProductData || isProductDataIncomplete);
                const isCatLoading =
                  isSidebarRefreshing ||
                  (category.id === 'apps'
                    ? productAppsStatus === 'pending'
                    : isProductResourcesLoading);

                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      if (!isDisabled) {
                        handleCategoryChange(category.id);
                        setIsSidebarCollapsed(false);
                      }
                    }}
                    disabled={isDisabled}
                    className={cn(
                      'w-full flex items-center justify-center p-1.5 sm:p-2 rounded-lg transition-colors relative',
                      isDisabled
                        ? 'text-grey-400 cursor-not-allowed opacity-50'
                        : isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-grey hover:bg-grey-100',
                    )}
                    title={
                      isCatLoading
                        ? `${category.label} (Loading...)`
                        : `${category.label} (${count})`
                    }
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 sm:h-5 sm:w-5',
                        isDisabled
                          ? 'text-grey-400'
                          : isActive
                            ? 'text-primary'
                            : 'text-grey-600',
                      )}
                    />
                    {isCatLoading ? (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-grey-200 rounded-full flex items-center justify-center">
                        <Loader2 className="h-2 w-2 sm:h-2.5 sm:w-2.5 animate-spin text-grey-500" />
                      </span>
                    ) : count > 0 && !isDisabled ? (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-white text-[8px] sm:text-[10px] rounded-full flex items-center justify-center font-medium">
                        {count > 9 ? '9+' : count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Expand button */}
            <div className="px-1 mt-3 sm:mt-4">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-full flex items-center justify-center p-1.5 sm:p-2 rounded-lg text-grey-500 hover:bg-grey-100 hover:text-grey transition-colors"
                title="Expand sidebar"
              >
                <PanelLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Main Content */}
      <div 
    className={cn(
      "flex-1 flex flex-col min-h-0 overflow-hidden bg-grey-50 transition-all duration-300",
       isSidebarCollapsed ? "ml-12 sm:ml-14" : "ml-0 sm:ml-64"
    )}
  >
        {renderMainContent()}
      </div>
      {/* Modals */}
      <AddAppModal
        open={showAddAppModal}
        onOpenChange={setShowAddAppModal}
        product={product}
      />
      <CreateEnvironmentModal
        open={showCreateEnvModal}
        onOpenChange={setShowCreateEnvModal}
        productTag={product?.tag || ''}
        productId={String(product?._id)}
      />
      <UpdateProductEnvironmentModal
        open={showUpdateEnvModal}
        onOpenChange={setShowUpdateEnvModal}
        productTag={product?.tag || ''}
        productId={product?._id}
        environment={selectedEnvironment}
        onSuccess={() => {
          setSelectedEnvironment(null);
        }}
      />
      <DeleteProductModal
        open={showDeleteProductModal}
        onOpenChange={setShowDeleteProductModal}
        productName={product?.name || ''}
        productTag={product?.tag}
        isDeleting={deleteProductMutation.isPending}
        onConfirm={() => deleteProductMutation.mutate()}
      />
      {/* Database Type Selection Dialog */}
      {/* Database Type Selection Dialog - Responsive */}
      <Dialog
        open={showDatabaseTypeDialog}
        onOpenChange={setShowDatabaseTypeDialog}
      >
        <DialogContent className="sm:max-w-md mx-4 p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base md:text-lg text-grey">
              What type of database would you like to add?
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 sm:gap-3 py-2 sm:py-4">
            <button
              onClick={() => {
                setShowDatabaseTypeDialog(false);
                setInlineCreateMode('database');
              }}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-grey-300 hover:border-primary hover:bg-primary/5 transition-colors text-left active:bg-primary/10"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Database className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-medium text-grey">
                  Database
                </h3>
                <p className="text-xs sm:text-sm text-grey-500">
                  SQL, NoSQL, or other traditional databases
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setShowDatabaseTypeDialog(false);
                setInlineCreateMode('graph');
              }}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-grey-300 hover:border-primary hover:bg-primary/5 transition-colors text-left active:bg-primary/10"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-600/10 flex items-center justify-center flex-shrink-0">
                <Share2 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-medium text-grey">
                  Graph Database
                </h3>
                <p className="text-xs sm:text-sm text-grey-500">
                  Neo4j, Neptune, or graph-based stores
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setShowDatabaseTypeDialog(false);
                setInlineCreateMode('vector');
              }}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-grey-300 hover:border-primary hover:bg-primary/5 transition-colors text-left active:bg-primary/10"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-600/10 flex items-center justify-center flex-shrink-0">
                <Boxes className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-medium text-grey">
                  Vector Store
                </h3>
                <p className="text-xs sm:text-sm text-grey-500">
                  Pinecone, Weaviate, or embedding stores
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Intelligence Type Selection Dialog - Responsive */}
      <Dialog
        open={showIntelligenceTypeDialog}
        onOpenChange={setShowIntelligenceTypeDialog}
      >
        <DialogContent className="sm:max-w-md mx-4 p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base md:text-lg">
              What would you like to add?
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 sm:gap-3 py-2 sm:py-4">
            <button
              onClick={() => {
                setShowIntelligenceTypeDialog(false);
                openNewComponentTab('agent');
              }}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-grey-300 hover:border-primary hover:bg-primary/5 transition-colors text-left active:bg-primary/10"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-600/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-medium text-grey">
                  Agent
                </h3>
                <p className="text-xs sm:text-sm text-grey-500">
                  AI agents for automated tasks and workflows
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setShowIntelligenceTypeDialog(false);
                openNewComponentTab('model');
              }}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-grey-300 hover:border-primary hover:bg-primary/5 transition-colors text-left active:bg-primary/10"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-600/10 flex items-center justify-center flex-shrink-0">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-medium text-grey">
                  Model
                </h3>
                <p className="text-xs sm:text-sm text-grey-500">
                  ML models for inference and predictions
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Resilience Type Selection Dialog - Responsive */}
      <Dialog
        open={showResilienceTypeDialog}
        onOpenChange={setShowResilienceTypeDialog}
      >
        <DialogContent className="sm:max-w-md mx-4 p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base md:text-lg">
              What would you like to configure?
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 sm:gap-3 py-2 sm:py-4">
            <button
              onClick={() => {
                setShowResilienceTypeDialog(false);
                openNewComponentTab('fallback');
              }}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-grey-300 hover:border-primary hover:bg-primary/5 transition-colors text-left active:bg-primary/10"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-medium text-grey">
                  Fallback
                </h3>
                <p className="text-xs sm:text-sm text-grey-500">
                  Backup strategies for error handling
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setShowResilienceTypeDialog(false);
                openNewComponentTab('quota');
              }}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-grey-300 hover:border-primary hover:bg-primary/5 transition-colors text-left active:bg-primary/10"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-600/10 flex items-center justify-center flex-shrink-0">
                <Timer className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-medium text-grey">
                  Quota
                </h3>
                <p className="text-xs sm:text-sm text-grey-500">
                  Rate limits and usage quotas
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setShowResilienceTypeDialog(false);
                openNewComponentTab('healthcheck');
              }}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-grey-300 hover:border-primary hover:bg-primary/5 transition-colors text-left active:bg-primary/10"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-400/10 flex items-center justify-center flex-shrink-0">
                <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-medium text-grey">
                  Health Check
                </h3>
                <p className="text-xs sm:text-sm text-grey-500">
                  Service health monitoring
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Jobs Code Sidebar */}
      {showJobsCodeDialog && (
        <CodeSidebar
          title="Dispatching Jobs"
          subtitle="Jobs in Ductape are background tasks that run asynchronously. They are dispatched from your code using the SDK and can be scheduled, delayed, or run immediately."
          tag={product?.tag}
          onClose={() => setShowJobsCodeDialog(false)}
          environments={product?.envs || []}
          additionalControls={
            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-grey-700 mb-1.5 sm:mb-2 block">
                  Job Type
                </Label>
                <Select
                  value={selectedJobType}
                  onValueChange={setSelectedJobType}
                >
                  <SelectTrigger className="w-full text-xs sm:text-sm h-8 sm:h-9 md:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="app-action">App Action</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="messaging">Messaging</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <a
                href="https://docs.ductape.app/jobs/scheduling-jobs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                View full documentation
              </a>
            </div>
          }
          generateCodeSections={(language, env) => {
            const productTag = product?.tag || 'your-product';
            const envSlug = env || 'prd';

            // Generate code sections based on selected job type
            const jobTypeSections: Record<
              string,
              Array<{title: string; code: string}>
            > = {
              'app-action': [
                {
                  title: 'Dispatch App Action Job',
                  code: `import ductape from '@ductape/sdk';

// Dispatch a job that calls an app action
const job = await ductape.api.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  app: 'email-service',
  event: 'send_welcome_email',
  input: {
    userId: 'user_123',
    email: 'john@example.com'
  },
  retries: 3
});`,
                },
                {
                  title: 'Delayed App Action',
                  code: `// Schedule an app action to run after 1 hour
const job = await ductape.api.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  app: 'payment-service',
  event: 'process_refund',
  input: { orderId: 'order_456', amount: 99.99 },
  retries: 3,
  schedule: {
    start_at: Date.now() + 3600000 // 1 hour from now
  }
});`,
                },
                {
                  title: 'Recurring App Action (Cron)',
                  code: `// Schedule a recurring app action job
const job = await ductape.api.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  app: 'analytics-service',
  event: 'sync_data',
  input: { fullSync: false },
  retries: 3,
  schedule: {
    cron: '0 */6 * * *', // Every 6 hours
    tz: 'America/New_York'
  }
});`,
                },
              ],
              database: [
                {
                  title: 'Dispatch Database Job',
                  code: `import ductape from '@ductape/sdk';

// Dispatch a job that performs database operations
const job = await ductape.database.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  database: 'main-db',
  operation: 'insert',
  input: {
    table: 'audit_logs',
    data: { action: 'user_login', userId: 'user_123' }
  },
  retries: 3
});`,
                },
                {
                  title: 'Scheduled Database Sync',
                  code: `// Schedule a recurring database sync job
const job = await ductape.database.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  database: 'inventory-db',
  operation: 'sync',
  input: { table: 'products', source: 'external_api' },
  retries: 3,
  schedule: {
    every: 86400000, // Every 24 hours
    limit: 30 // Run max 30 times
  }
});`,
                },
                {
                  title: 'Database Cleanup Job',
                  code: `// Schedule a database cleanup job
const job = await ductape.database.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  database: 'sessions-db',
  operation: 'delete',
  input: {
    table: 'expired_sessions',
    filter: { expiresAt: { $lt: new Date() } }
  },
  retries: 3,
  schedule: {
    cron: '0 3 * * *', // Every day at 3 AM
    tz: 'UTC'
  }
});`,
                },
              ],
              storage: [
                {
                  title: 'Dispatch Storage Job',
                  code: `import ductape from '@ductape/sdk';

// Dispatch a job that processes files in storage
const job = await ductape.storage.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  storage: 'media-bucket',
  operation: 'process',
  input: {
    sourcePath: 'uploads/raw/',
    destPath: 'uploads/processed/',
    transform: { resize: { width: 800, height: 600 } }
  },
  retries: 3
});`,
                },
                {
                  title: 'Delayed Storage Operation',
                  code: `// Schedule a storage operation after a delay
const job = await ductape.storage.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  storage: 'backup-bucket',
  operation: 'copy',
  input: {
    source: 'data/reports/',
    destination: 'archives/2024/'
  },
  retries: 3,
  schedule: {
    start_at: Date.now() + 7200000 // 2 hours from now
  }
});`,
                },
                {
                  title: 'Scheduled Storage Cleanup',
                  code: `// Schedule a recurring storage cleanup job
const job = await ductape.storage.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  storage: 'temp-bucket',
  operation: 'delete',
  input: {
    path: 'temp/',
    olderThan: '7d'
  },
  retries: 3,
  schedule: {
    cron: '0 4 * * 0', // Every Sunday at 4 AM
    tz: 'UTC'
  }
});`,
                },
              ],
              messaging: [
                {
                  title: 'Dispatch Message Broker Job',
                  code: `import ductape from '@ductape/sdk';

// Dispatch a job that publishes to a message broker
const job = await ductape.events.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  broker: 'order-events',
  event: 'order.created',
  input: {
    orderId: 'order-123',
    customerId: 'cust-456',
    items: [{ sku: 'ITEM-001', qty: 2 }]
  },
  retries: 3
});`,
                },
                {
                  title: 'Delayed Message Publishing',
                  code: `// Schedule a message to be published after a delay
const job = await ductape.events.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  broker: 'notifications',
  event: 'reminder.send',
  input: {
    userId: 'user_123',
    message: 'Your trial expires tomorrow'
  },
  retries: 3,
  schedule: {
    start_at: Date.now() + 86400000 // 24 hours from now
  }
});`,
                },
                {
                  title: 'Recurring Event Publishing',
                  code: `// Schedule recurring event publishing
const job = await ductape.events.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  broker: 'metrics',
  event: 'heartbeat',
  input: { service: '${productTag}', status: 'healthy' },
  retries: 3,
  schedule: {
    every: 60000, // Every minute
    endDate: Date.now() + 86400000 // Stop after 24 hours
  }
});`,
                },
              ],
              notification: [
                {
                  title: 'Dispatch Notification Job',
                  code: `import ductape from '@ductape/sdk';

// Dispatch a job that sends notifications
const job = await ductape.notifications.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  notifier: 'email-service',
  event: 'welcome_email',
  input: {
    to: 'user@example.com',
    data: {
      userName: 'John Doe',
      activationLink: 'https://app.example.com/activate'
    }
  },
  retries: 3
});`,
                },
                {
                  title: 'Delayed Notification',
                  code: `// Schedule a notification after a delay
const job = await ductape.notifications.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  notifier: 'sms-service',
  event: 'appointment_reminder',
  input: {
    to: '+1234567890',
    data: { appointmentTime: '2:00 PM' }
  },
  retries: 3,
  schedule: {
    start_at: Date.now() + 3600000 // 1 hour from now
  }
});`,
                },
                {
                  title: 'Scheduled Recurring Notification',
                  code: `// Schedule a recurring notification job
const job = await ductape.notifications.dispatch({
  env: '${envSlug}',
  product: '${productTag}',
  notifier: 'slack-alerts',
  event: 'weekly_summary',
  input: {
    channel: '#team-updates',
    data: { reportType: 'weekly' }
  },
  retries: 3,
  schedule: {
    cron: '0 9 * * 1', // Every Monday at 9 AM
    tz: 'America/New_York'
  }
});`,
                },
              ],
            };

            return (
              jobTypeSections[selectedJobType] || jobTypeSections['app-action']
            );
          }}
        />
      )}
      {/* Workflows Code Sidebar */}
      {showWorkflowsCodeDialog && (
        <CodeSidebar
          title="Workflow API"
          subtitle="Define, execute, and manage workflows with ductape.workflow.*. Select a function below for sample code."
          tag={product?.tag}
          onClose={() => setShowWorkflowsCodeDialog(false)}
          environments={product?.envs || []}
          additionalControls={
            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-grey-700 mb-1.5 sm:mb-2 block">
                  Workflow function
                </Label>
                <Select
                  value={selectedWorkflowFn}
                  onValueChange={setSelectedWorkflowFn}
                >
                  <SelectTrigger className="w-full text-xs sm:text-sm h-8 sm:h-9 md:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="define">define</SelectItem>
                    <SelectItem value="execute">execute</SelectItem>
                    <SelectItem value="fetchAll">fetchAll</SelectItem>
                    <SelectItem value="fetch">fetch</SelectItem>
                    <SelectItem value="create">create</SelectItem>
                    <SelectItem value="update">update</SelectItem>
                    <SelectItem value="delete">delete</SelectItem>
                    <SelectItem value="dispatch">dispatch</SelectItem>
                    <SelectItem value="signal">signal</SelectItem>
                    <SelectItem value="query">query</SelectItem>
                    <SelectItem value="status">status</SelectItem>
                    <SelectItem value="cancel">cancel</SelectItem>
                    <SelectItem value="replay">replay</SelectItem>
                    <SelectItem value="restart">restart</SelectItem>
                    <SelectItem value="resume">resume</SelectItem>
                    <SelectItem value="replayFromStep">
                      replayFromStep
                    </SelectItem>
                    <SelectItem value="history">history</SelectItem>
                    <SelectItem value="stepDetail">stepDetail</SelectItem>
                    <SelectItem value="relatedExecutions">
                      relatedExecutions
                    </SelectItem>
                    <SelectItem value="compare">compare</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <a
                href="https://docs.ductape.app/workflows/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                View workflow documentation
              </a>
            </div>
          }
          generateCodeSections={(language, env) => {
            const productTag = product?.tag || 'your-product';
            const envSlug = env || 'prd';
            const workflowFnSections: Record<
              string,
              Array<{title: string; code: string}>
            > = {
              define: [
                {
                  title: 'Define a workflow (code-first)',
                  code: `import ductape from '@ductape/sdk';

await ductape.workflow.define({
  product: '${productTag}',
  tag: 'order-processing-workflow',
  name: 'Order Processing Workflow',
  description: 'Validate, pay, and fulfill orders',
  input: {
    orderId: { type: 'string', required: true },
    customerId: { type: 'string', required: true },
    items: { type: 'array', required: true },
    total: { type: 'number', required: true },
  },
  handler: async (ctx) => {
    const validated = await ctx.step('validate-order', async () => ({
      valid: true,
      orderId: ctx.input.orderId,
    }));
    const payment = await ctx.step('process-payment', async () => ({
      success: true,
      transactionId: \`TXN-\${Date.now()}\`,
    }));
    return { orderId: ctx.input.orderId, transactionId: payment.transactionId };
  },
});`,
                },
              ],
              execute: [
                {
                  title: 'Execute a workflow',
                  code: `import ductape from '@ductape/sdk';

const result = await ductape.workflow.execute({
  product: '${productTag}',
  env: '${envSlug}',
  tag: 'order-processing-workflow',
  input: {
    orderId: 'ORD-001',
    customerId: 'cust-123',
    items: [{ productId: 'P1', quantity: 2, price: 29.99 }],
    total: 59.98,
  },
});

console.log('Status:', result.status);
console.log('Output:', result.output);`,
                },
              ],
              fetchAll: [
                {
                  title: 'List all workflows',
                  code: `import ductape from '@ductape/sdk';

const workflows = await ductape.workflow.fetchAll('${productTag}');

for (const w of workflows || []) {
  console.log(w.tag, '-', w.name);
}`,
                },
              ],
              fetch: [
                {
                  title: 'Fetch a workflow by tag',
                  code: `import ductape from '@ductape/sdk';

const workflow = await ductape.workflow.fetch('order-processing-workflow', '${productTag}');

if (workflow) {
  console.log(workflow.name, workflow.steps?.length, 'steps');
}`,
                },
              ],
              create: [
                {
                  title: 'Create workflow from JSON schema',
                  code: `import ductape from '@ductape/sdk';

await ductape.workflow.create('${productTag}', {
  tag: 'manual-workflow',
  name: 'Manual Workflow',
  steps: [
    { tag: 'step-1', type: 'action', event: 'run', input: {} },
    { tag: 'step-2', type: 'action', event: 'run', input: {} },
  ],
  envs: [{ slug: '${envSlug}' }],
});`,
                },
              ],
              update: [
                {
                  title: 'Update a workflow',
                  code: `import ductape from '@ductape/sdk';

await ductape.workflow.update('order-processing-workflow', '${productTag}', {
  name: 'Order Processing (v2)',
  description: 'Updated description',
});`,
                },
              ],
              delete: [
                {
                  title: 'Delete a workflow',
                  code: `import ductape from '@ductape/sdk';

await ductape.workflow.delete('old-workflow-tag', '${productTag}');`,
                },
              ],
              dispatch: [
                {
                  title: 'Dispatch workflow as job',
                  code: `import ductape from '@ductape/sdk';

const job = await ductape.workflow.dispatch({
  product: '${productTag}',
  env: '${envSlug}',
  workflow: 'order-processing-workflow',
  input: { orderId: 'ORD-1', customerId: 'c1', items: [], total: 0 },
});

console.log('Job ID:', job.job_id);`,
                },
              ],
              signal: [
                {
                  title: 'Send signal to a workflow',
                  code: `import ductape from '@ductape/sdk';

await ductape.workflow.signal({
  product: '${productTag}',
  env: '${envSlug}',
  workflow_id: 'your-workflow-run-id',
  signal: 'approve',
  payload: { comment: 'Approved by admin' },
});`,
                },
              ],
              query: [
                {
                  title: 'Query workflow (e.g. getStatus)',
                  code: `import ductape from '@ductape/sdk';

const result = await ductape.workflow.query({
  product: '${productTag}',
  env: '${envSlug}',
  workflow_id: 'your-workflow-run-id',
  query: 'getStatus',
});

console.log(result);`,
                },
              ],
              status: [
                {
                  title: 'Get workflow run status',
                  code: `import ductape from '@ductape/sdk';

const status = await ductape.workflow.status({
  product: '${productTag}',
  env: '${envSlug}',
  workflow_id: 'your-workflow-run-id',
});

console.log(status?.status, status?.completed_steps);`,
                },
              ],
              cancel: [
                {
                  title: 'Cancel a workflow run',
                  code: `import ductape from '@ductape/sdk';

await ductape.workflow.cancel({
  product: '${productTag}',
  env: '${envSlug}',
  workflow_id: 'your-workflow-run-id',
});`,
                },
              ],
              replay: [
                {
                  title: 'Replay a workflow',
                  code: `import ductape from '@ductape/sdk';

const result = await ductape.workflow.replay({
  product: '${productTag}',
  env: '${envSlug}',
  workflow_id: 'your-workflow-run-id',
});`,
                },
              ],
              restart: [
                {
                  title: 'Restart a workflow',
                  code: `import ductape from '@ductape/sdk';

const result = await ductape.workflow.restart({
  product: '${productTag}',
  env: '${envSlug}',
  workflow_id: 'your-workflow-run-id',
});`,
                },
              ],
              resume: [
                {
                  title: 'Resume from checkpoint',
                  code: `import ductape from '@ductape/sdk';

const result = await ductape.workflow.resume({
  product: '${productTag}',
  env: '${envSlug}',
  workflow_id: 'your-workflow-run-id',
  from_step: 'checkpoint-1',
  state: { /* saved state */ },
});`,
                },
              ],
              replayFromStep: [
                {
                  title: 'Replay from a specific step',
                  code: `import ductape from '@ductape/sdk';

const result = await ductape.workflow.replayFromStep({
  product: '${productTag}',
  env: '${envSlug}',
  workflow_id: 'your-workflow-run-id',
  from_step: 'step-2',
});`,
                },
              ],
              history: [
                {
                  title: 'Get workflow run history',
                  code: `import ductape from '@ductape/sdk';

const history = await ductape.workflow.history({
  product: '${productTag}',
  env: '${envSlug}',
  workflow_id: 'your-workflow-run-id',
});

console.log(history.steps);`,
                },
              ],
              stepDetail: [
                {
                  title: 'Get step detail',
                  code: `import ductape from '@ductape/sdk';

const detail = await ductape.workflow.stepDetail({
  product: '${productTag}',
  env: '${envSlug}',
  workflow_id: 'your-workflow-run-id',
  step_tag: 'validate-order',
});`,
                },
              ],
              relatedExecutions: [
                {
                  title: 'Get related executions',
                  code: `import ductape from '@ductape/sdk';

const related = await ductape.workflow.relatedExecutions({
  product: '${productTag}',
  env: '${envSlug}',
  workflow_id: 'your-workflow-run-id',
});`,
                },
              ],
              compare: [
                {
                  title: 'Compare two workflow runs',
                  code: `import ductape from '@ductape/sdk';

const comparison = await ductape.workflow.compare({
  product: '${productTag}',
  env: '${envSlug}',
  workflows: ['workflow-run-id-1', 'workflow-run-id-2'],
});`,
                },
              ],
            };
            return (
              workflowFnSections[selectedWorkflowFn] ||
              workflowFnSections['define']
            );
          }}
        />
      )}{' '}
    </div>
  );
}
