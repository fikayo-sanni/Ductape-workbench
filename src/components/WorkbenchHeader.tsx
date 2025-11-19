import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFetchWorkspaces } from '@/hooks/useWorkspaceQueries';
import workspaceServices from '@/services/workspaceServices';
import productServices from '@/services/productServices';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  ChevronDown,
  LogOut,
  Settings,
  Plus,
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import NewItemDropdown from './NewItemDropdown';
import ImportDialog from './ImportDialog';
import ProductSelectionModal from './modals/ProductSelectionModal';
import AppSelectionModal from './modals/AppSelectionModal';
import CreateAccountModal from './CreateAccountModal';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import ThemeToggle from './ThemeToggle';

interface ApiError {
  message: string;
}

export default function WorkbenchHeader() {
  const { user, logout, setUser, setCurrentWorkspaceId, currentWorkspaceId } = useAuth();
  const { openTab, activeView, setActiveView } = useWorkbenchStore();
  const queryClient = useQueryClient();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAppModal, setShowAppModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [pendingItemType, setPendingItemType] = useState<string | null>(null);

  // Fetch real workspaces
  const { data: workspacesData, status: workspacesStatus } = useFetchWorkspaces({
    user_id: user?._id ?? '',
    public_key: user?.public_key ?? '',
  });

  // Get the default workspace
  const defaultWorkspace = workspacesData?.data?.find(
    workspace => workspace.default === true,
  );

  const [selectedWorkspace, setSelectedWorkspace] = useState<string | undefined>(
    undefined
  );

  const selectedWorkspaceName =
    workspacesData?.data?.find(
      workspace => workspace.workspace_id === selectedWorkspace,
    )?.workspace_name || 'Select workspace';

  // Mutation for changing workspace
  const { mutate: changeDefaultWorkspace } = useMutation({
    mutationFn: (workspace_id: string) =>
      workspaceServices.changeDefaultWorkspace({
        user_id: user?._id ?? '',
        workspace_id,
        public_key: user?.public_key ?? '',
      }),

    onSuccess: async (data, variables) => {
      if (user && user._id && data?.data) {
        const updatedUser = { ...user, workspaces: data.data };
        setUser(updatedUser as any);
        // Set the current workspace ID in auth store
        setCurrentWorkspaceId(variables);

        // Clear all queries to ensure fresh data for the new workspace
        await queryClient.clear();

        toast.success('Workspace changed successfully');
        // Reload to apply workspace change across app
        window.location.reload();
      }
    },
    onError: (error: ApiError) => {
      toast.error(`Failed to change workspace: ${error.message}`);
    },
  });

  const handleChangeWorkspace = useCallback(
    (workspace_id: string) => {
      if (workspace_id === '__create__') {
        // TODO: Open create workspace modal
        console.log('Create new workspace');
        return;
      }
      setSelectedWorkspace(workspace_id);
      changeDefaultWorkspace(workspace_id);
    },
    [changeDefaultWorkspace],
  );

  useEffect(() => {
    if (defaultWorkspace) {
      setSelectedWorkspace(defaultWorkspace.workspace_id);
      // Also update the auth store
      setCurrentWorkspaceId(defaultWorkspace.workspace_id);
    } else if (workspacesData?.data?.length === 1) {
      const singleWorkspace = workspacesData.data[0];
      if (selectedWorkspace !== singleWorkspace.workspace_id) {
        handleChangeWorkspace(singleWorkspace.workspace_id);
      }
    }
  }, [
    defaultWorkspace,
    workspacesData?.data,
    handleChangeWorkspace,
    selectedWorkspace,
    setCurrentWorkspaceId,
  ]);

  const handleLogout = () => {
    logout();
    window.location.reload(); // Refresh to show login modal
  };

  const handleNewItem = async (itemId: string) => {
    // If on dashboard, switch to products view first
    if (activeView === 'dashboard') {
      setActiveView('products');
    }

    // Store the pending item type
    setPendingItemType(itemId);

    // Special handling for "request" and "auth" - goes directly to app selection
    if (itemId === 'request' || itemId === 'auth') {
      setShowAppModal(true);
      return;
    }

    // For "product" and "app", don't need product selection modal
    if (itemId === 'product' || itemId === 'app') {
      await createTab(itemId, null, null);
      return;
    }

    // All other items need product selection
    setShowProductModal(true);
  };

  const handleProductSelect = async (productId: string) => {
    setSelectedProductId(productId);
    setShowProductModal(false);

    // If it's a request, show app selection next
    if (pendingItemType === 'request') {
      setShowAppModal(true);
    } else {
      // For other items, create the tab directly
      await createTab(pendingItemType!, productId, null);
      setPendingItemType(null);
      setSelectedProductId(null);
    }
  };

  const handleAppSelect = async (appId: string, app?: any) => {
    setShowAppModal(false);

    // For requests, create a request tab with app context (no product required)
    if (pendingItemType === 'request') {
      const requestTabId = `request-${Date.now()}`;
      openTab({
        id: requestTabId,
        type: 'request',
        title: 'New Request',
        data: {
          appId,
          isNew: true,
          componentType: 'request',
        },
        isDirty: true,
      });
    } else if (pendingItemType === 'auth') {
      // For auth, create an auth tab with app context
      const authTabId = `auth-${Date.now()}`;
      openTab({
        id: authTabId,
        type: 'auth',
        title: 'New Auth',
        data: {
          appId,
          appName: app?.app_name,
          appTag: app?.tag,
          isNew: true,
          componentType: 'auth',
        },
        isDirty: true,
      });
    } else {
      await createTab(pendingItemType!, selectedProductId, appId);
    }

    setPendingItemType(null);
    setSelectedProductId(null);
  };

  const handleCreateNewApp = () => {
    setShowAppModal(false);
    // Create a new app tab first, then create the request
    const appTabId = `app-${Date.now()}`;
    openTab({
      id: appTabId,
      type: 'app',
      title: 'New App',
      data: { productId: selectedProductId },
      isDirty: true,
    });
    setPendingItemType(null);
    setSelectedProductId(null);
  };

  const handleCreateNewProduct = () => {
    setShowProductModal(false);
    // Create a new product tab
    const productTabId = `product-${Date.now()}`;
    openTab({
      id: productTabId,
      type: 'product',
      title: 'New Product',
      data: { isNew: true },
      isDirty: true,
    });
    // Don't clear pendingItemType - we'll reopen the modal after product is created
  };

  const createTab = async (itemType: string, productId: string | null, appId: string | null) => {
    const tabId = `${itemType}-${Date.now()}`;
    const titleMap: Record<string, string> = {
      request: 'New Request',
      app: 'New App',
      product: 'New Product',
      storage: 'New Storage',
      session: 'New Session',
      feature: 'New Feature',
      cache: 'New Cache',
      healthcheck: 'New Healthcheck',
      database: 'New Database',
      'message-broker': 'New Message Broker',
      notification: 'New Notification',
      fallback: 'New Fallback',
      quota: 'New Quota',
      job: 'New Job',
    };

    let productData = null;
    
    // Fetch complete product data if productId is provided
    if (productId && user?._id && user?.public_key) {
      try {
        const productResponse = await productServices.fetchProduct({
          product_id: productId,
          user_id: user._id,
          public_key: user.public_key,
          workspace_id: currentWorkspaceId || '',
        });
        
        if (productResponse?.data) {
          productData = productResponse.data;
        }
      } catch (error) {
        console.error('Failed to fetch product data:', error);
        toast.error('Failed to load product information');
      }
    }

    // Fetch connected apps if we have product data
    let connectedApps = [];
    if (productData && user?._id && user?.public_key) {
      try {
        const appsResponse = await productServices.fetchProductApps({
          product_id: productId!,
          user_id: user._id,
          public_key: user.public_key,
          workspace_id: currentWorkspaceId || '',
        });
        connectedApps = appsResponse?.data || [];
      } catch (error) {
        console.error('Failed to fetch product apps:', error);
        // Don't show error toast for apps, just continue with empty array
      }
    }

    openTab({
      id: tabId,
      type: itemType as any,
      title: titleMap[itemType] || `New ${itemType}`,
      data: {
        // Basic data
        productId,
        appId,
        isNew: true,
        componentType: itemType,
        
        // Complete product context (if available)
        ...(productData && {
          productName: productData.name,
          productTag: productData.tag,
          productLogo: productData.logo,
          productEnvs: productData.envs || [],
          workspaceId: currentWorkspaceId || '',
          productApps: connectedApps,
          productDatabases: productData.databases || [],
          productMessageBroker: productData.messageBrokers || [],
          productNotifications: productData.notifications || [],
          productStorage: productData.storage || [],
          productJobs: productData.jobs || [],
          productQuota: productData.quota || [],
          productFallback: productData.fallback || [],
          productCaches: productData.caches || [],
          productFeatures: productData.features || [],
        }),
      },
      isDirty: true,
    });
  };

  const handleImport = (data: { type: 'postman' | 'openapi'; source: 'file' | 'url'; content: string }) => {
    console.log('Importing:', data);
    // TODO: Implement import logic
    // For now, create a new app tab
    const tabId = `app-import-${Date.now()}`;
    openTab({
      id: tabId,
      type: 'app',
      title: `Imported ${data.type === 'postman' ? 'Postman' : 'OpenAPI'}`,
      data: { importData: data },
      isDirty: true,
    });
  };

  const handleWorkspaceCreated = (workspace: any) => {
    // Switch to the newly created workspace
    setCurrentWorkspaceId(workspace.workspace_id);
    toast.success(`Switched to ${workspace.workspace_name}`);
  };

  return (
    <header className="h-14 md:h-16 border-b border-grey-400 bg-white flex items-center px-3 md:px-6 flex-shrink-0 shadow-sm" data-intro="header">
      {/* Logo/Brand */}
      <div className="flex items-center gap-2 md:gap-3 pr-3 md:pr-8 md:border-r border-grey-400">
        <div className="text-lg md:text-xl font-bold text-primary">Ductape</div>
        <span className="hidden sm:inline text-sm text-grey-600 font-medium">Workbench</span>
      </div>

      {/* Workspace Selector - Hidden on small mobile */}
      <div className="hidden sm:flex items-center gap-2 md:gap-3 px-3 md:px-8">
        {workspacesStatus === 'pending' ? (
          <Skeleton className="w-[180px] md:w-[280px] h-9 md:h-10 bg-slate-200" />
        ) : (
          <Select
            value={selectedWorkspace}
            onValueChange={handleChangeWorkspace}
          >
            <SelectTrigger className="w-[180px] md:w-[280px] h-9 md:h-10 shadow-sm">
              <SelectValue>{selectedWorkspaceName}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {workspacesData?.data?.map(workspace => (
                <SelectItem
                  key={workspace.workspace_id}
                  value={workspace.workspace_id}
                  className="pl-4 font-semibold"
                >
                  {workspace.workspace_name}
                </SelectItem>
              ))}
              <Button
                className="pt-4.5 pl-4 h-fit gap-2 w-full items-center justify-start"
                variant="ghost"
                onClick={() => setShowCreateWorkspaceModal(true)}
              >
                <Plus className="h-5 w-5" />
                <span className="text-grey text-xs font-semibold">
                  Add a workspace
                </span>
              </Button>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action Buttons - Compact on mobile */}
      <div className="flex items-center gap-2 md:gap-3 pr-3 md:pr-6 md:border-r border-grey-400">
        <ThemeToggle />
        <NewItemDropdown onSelect={handleNewItem} />
        {/*<Button
          onClick={() => setShowImportDialog(true)}
          variant="outline"
          size="sm"
          className="h-auto px-2 md:px-4 py-1.5 md:py-2 shadow-sm hover:shadow"
        >
          <Upload className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Import</span>
        </Button>*/}
      </div>

      {/* User Section */}
      {user && (
        <div className="flex items-center pl-3 md:pl-6">
          {/* User Info */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-grey-100 transition-colors shadow-sm hover:shadow"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                {user.firstname?.[0]}{user.lastname?.[0]}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-sm font-medium text-grey">
                  {user.firstname} {user.lastname}
                </div>
                <div className="text-xs text-grey-600">{user.email}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-grey-600 ml-1 hidden md:block" />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-grey-400 rounded-lg shadow-lg z-20">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        openTab({
                          id: `settings-${Date.now()}`,
                          type: 'settings',
                          title: 'Settings',
                        });
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-grey hover:bg-grey-100 flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                  </div>

                  <div className="py-1 border-t border-grey-400">
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 text-left text-sm text-red hover:bg-grey-100 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Guest State */}
      {!user && (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCreateAccountModal(true)}
          >
            Create Account
          </Button>
          <Button size="sm" onClick={() => window.location.reload()}>
            Login
          </Button>
        </div>
      )}

      {/* Import Dialog */}
      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImport}
      />

      {/* Product Selection Modal */}
      <ProductSelectionModal
        open={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setPendingItemType(null);
        }}
        onSelect={handleProductSelect}
        onCreateNew={handleCreateNewProduct}
        title="Select Product"
        description={`Choose which product to add this ${pendingItemType} to`}
      />

      {/* App Selection Modal */}
      <AppSelectionModal
        open={showAppModal}
        onClose={() => {
          setShowAppModal(false);
          setPendingItemType(null);
          setSelectedProductId(null);
        }}
        onSelect={handleAppSelect}
        onCreateNew={handleCreateNewApp}
        productId={pendingItemType === 'request' || pendingItemType === 'auth' ? undefined : selectedProductId || ''}
        title={pendingItemType === 'request' ? 'Select App for Request' : pendingItemType === 'auth' ? 'Select App for Auth' : 'Select or Create App'}
        description={pendingItemType === 'request' 
          ? 'Choose an app from your workspace to create a new request'
          : pendingItemType === 'auth'
          ? 'Choose an app from your workspace to create authentication'
          : 'Choose an existing app or create a new one for this request'
        }
      />

      {/* Create Account Modal */}
      <CreateAccountModal
        open={showCreateAccountModal}
        onClose={() => setShowCreateAccountModal(false)}
        onSuccess={() => {
          // Optionally handle success (e.g., redirect to login)
          toast.success("Account created! Please log in to continue.");
        }}
      />

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        open={showCreateWorkspaceModal}
        onOpenChange={setShowCreateWorkspaceModal}
        onSuccess={handleWorkspaceCreated}
      />
    </header>
  );
}
