import {useState, useMemo, useEffect, useCallback, useRef} from 'react';
import {IApp} from '@/types/app';
import {
  Zap,
  Settings2,
  Globe,
  Search,
  Folder,
  Plus,
  ExternalLink,
  Building2,
  Webhook,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  MoreVertical,
  FolderOpen,
  Trash2,
  FolderPlus,
  Radio,
  PanelLeftClose,
  PanelLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plug,
  Home,
  Rocket,
  Loader2,
  Box,
  ArrowLeft,
  Copy,
} from 'lucide-react';
import {Link} from 'react-router-dom';
import {cn, getLast7DaysNormalized} from '@/lib/utils';
import {useWorkbenchStore} from '@/stores/workbench-store';
import {useAuth} from '@/store/useAuth';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {MarkdownViewer} from '@/components/ui/markdown-editor';
import {IntegrationProvider} from '@/context/integration-context';
import AppIntegrationModal from '@/components/marketplace/AppIntegrationModal';
import AppCreatedModal from '@/components/modals/AppCreatedModal';
import CreateAppEnvironmentModal from '@/components/modals/CreateAppEnvironmentModal';
import UpdateAppEnvironmentModal from '@/components/modals/UpdateAppEnvironmentModal';
import CreateVariableModal from '@/components/modals/CreateVariableModal';
import CreateConstantModal from '@/components/modals/CreateConstantModal';
import CreateSharedVariableModal from '@/components/modals/CreateSharedVariableModal';
import CreateFolderModal from '@/components/modals/CreateFolderModal';
import PublishAppModal from '@/components/modals/PublishAppModal';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useAppDashboard} from '@/hooks/useAnalytics';
import toast from 'react-hot-toast';
import appServices from '@/services/appServices';
import ActionViewTabContent from './ActionViewTabContent';
import WebhookTabContent from './WebhookTabContent';
import RequestBuilder from './RequestBuilder';
import InlineWebhookForm from '@/components/forms/InlineWebhookForm';

interface AppTabContentProps {
  app?: IApp;
  appId?: string;
  isMarketplace?: boolean;
}

// Sidebar view types - Overview is the main dashboard, others are resource categories
type SidebarView = 'overview' | 'environments' | 'actions' | 'webhooks';

// Folder tree node interface
interface FolderTreeNode {
  _id: string;
  name: string;
  parent_id: string | null | undefined;
  level: number;
  children: FolderTreeNode[];
  actions: any[];
}

export default function AppTabContent({
  app,
  appId,
  isMarketplace,
}: AppTabContentProps) {
  const {openTab, tabs, activeTabId} = useWorkbenchStore();
  const {currentWorkspaceId, user} = useAuth();
  const queryClient = useQueryClient();

  // Get itemId and initialization data from active tab if app is undefined (after refresh)
  const activeTab = tabs.find(t => t.id === activeTabId);
  const effectiveAppId = app?._id || appId || activeTab?.itemId;

  // Persistent state key based on app identifier
  const stateKey = `app-tab-state-${app?.tag || effectiveAppId}`;

  // Load persisted state from localStorage
  const getPersistedState = () => {
    try {
      const saved = localStorage.getItem(stateKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const persistedState = getPersistedState();

  const [selectedVersionTag, setSelectedVersionTag] = useState<string>(
    persistedState?.selectedVersionTag ||
      app?.versions?.find(v => v.latest)?.tag ||
      app?.versions?.[0]?.tag ||
      '',
  );
  const [editingEnv, setEditingEnv] = useState<any | null>(null);
  const [editingVariable, setEditingVariable] = useState<any | null>(null);
  const [editingConstant, setEditingConstant] = useState<any | null>(null);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [showAppCreatedModal, setShowAppCreatedModal] = useState(false);
  const [showCreateEnvModal, setShowCreateEnvModal] = useState(false);
  const [showUpdateEnvModal, setShowUpdateEnvModal] = useState(false);
  const [showCreateVariableModal, setShowCreateVariableModal] = useState(false);
  const [showCreateConstantModal, setShowCreateConstantModal] = useState(false);
  const [showCreateSharedVariableModal, setShowCreateSharedVariableModal] =
    useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(
    null,
  );
  const [newFolderParentName, setNewFolderParentName] = useState<
    string | undefined
  >(undefined);

  // Sidebar state - initialize from persisted values
  const [sidebarView, setSidebarView] = useState<SidebarView>(
    persistedState?.sidebarView || 'overview',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(persistedState?.expandedFolders || []),
  );
  const [selectedAction, setSelectedAction] = useState<any | null>(() => {
    if (persistedState?.selectedActionTag) {
      // Will be resolved after actions are loaded
      return {tag: persistedState.selectedActionTag, _pendingRestore: true};
    }
    return null;
  });
  const [selectedWebhook, setSelectedWebhook] = useState<any | null>(() => {
    if (persistedState?.selectedWebhookTag) {
      // Will be resolved after webhooks are loaded
      return {tag: persistedState.selectedWebhookTag, _pendingRestore: true};
    }
    return null;
  });
  const [isSidebarRefreshing, setIsSidebarRefreshing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    persistedState?.isSidebarCollapsed || false,
  );

  // State for creating a new action inline (instead of opening a new tab)
  const [isCreatingAction, setIsCreatingAction] = useState(false);
  const [newActionFolderId, setNewActionFolderId] = useState<string | null>(
    null,
  );
  const [inlineActionTabId, setInlineActionTabId] = useState<string>('');

  // State for creating a new webhook inline
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState<number>(
    persistedState?.sidebarWidth || 256,
  );
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth > 150 && newWidth < 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing],
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resize, stopResizing]);

  // Note: State reset when switching apps is handled by the key prop in TabContent.tsx
  // which forces a complete remount of this component

  // Check if app data is incomplete (missing versions, actions, app_name, etc.)
  const isAppDataIncomplete =
    app && (!app.versions || app.versions.length === 0 || !app.app_name);

  // Fetch app details if app data is missing or incomplete
  const {
    data: appDetails,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['app', effectiveAppId],
    queryFn: () =>
      appServices.fetchApp({
        app_id: effectiveAppId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
      }),
    enabled:
      !!effectiveAppId &&
      !!user?._id &&
      !!user?.public_key &&
      (!app || isAppDataIncomplete),
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Use fetched app details if available, otherwise use the passed app
  const currentApp = appDetails?.data || app;

  // Determine if app is internal or third-party
  // Use currentApp to ensure we have workspace_id after data is fetched (e.g., after page refresh)
  const isInternalApp = currentApp?.workspace_id === currentWorkspaceId;

  // Update tab with fetched data
  useEffect(() => {
    if (appDetails?.data && activeTabId && !app) {
      const {updateTab} = useWorkbenchStore.getState();
      updateTab(activeTabId, {data: appDetails.data});
    }
  }, [appDetails, activeTabId, app]);

  // Calculate selected version
  const selectedVersion =
    currentApp?.versions?.find(v => v.tag === selectedVersionTag) ||
    (currentApp?.versions && currentApp?.versions.length > 0
      ? currentApp?.versions.find(v => v.latest) || currentApp?.versions[0]
      : null);

  const actionsCount =
    selectedVersion?.actions?.length || currentApp?.actions_count || 0;
  const envsCount =
    selectedVersion?.envs?.length || currentApp?.envs_count || 0;
  const authsCount = selectedVersion?.auths?.length || 0;
  const variablesCount = selectedVersion?.variables?.length || 0;
  const constantsCount = selectedVersion?.constants?.length || 0;
  const webhooksCount =
    selectedVersion?.webhooks?.length ||
    (currentApp as any)?.webhooks_count ||
    0;

  // Fetch app dashboard analytics (logs filtered by parent_tag = app tag)
  const {data: dashboardMetrics, isLoading: isLoadingMetrics} = useAppDashboard(
    {
      app_id: currentApp?._id || '',
      app_tag: (currentApp as any)?.tag,
      version: selectedVersionTag || undefined,
      app_env: selectedVersion?.envs?.find((e: any) => e.active)?.slug,
      groupBy: 'day',
      enabled: !!currentApp?._id,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
    },
  );

  // Check if the selected version is unpublished (draft or private)
  const isVersionUnpublished =
    selectedVersion?.status === 'draft' ||
    selectedVersion?.status === 'private';

  // Publish requires every environment to be set as active
  const appEnvs = selectedVersion?.envs || [];
  const allEnvironmentsActive =
    appEnvs.length > 0 && appEnvs.every((e: any) => e.active);

  // Build folder tree structure with actions
  const folderTree = useMemo((): FolderTreeNode[] => {
    if (!selectedVersion?.folders && !selectedVersion?.actions) return [];

    const folders = selectedVersion?.folders || [];
    const actions = selectedVersion?.actions || [];

    const buildTree = (parentId: string | null = null): FolderTreeNode[] => {
      return folders
        .filter(f => (f.parent_id ?? null) === parentId)
        .map(folder => ({
          _id: folder._id,
          name: folder.name,
          parent_id: folder.parent_id ?? null,
          level: folder.level,
          children: buildTree(folder._id),
          actions: actions.filter(a => a.folder_id === folder._id),
        }));
    };

    return buildTree(null);
  }, [selectedVersion?.folders, selectedVersion?.actions]);

  // Helper function to recursively count all actions in a folder and its descendants
  const getTotalActionsCount = (folder: FolderTreeNode): number => {
    const directActions = folder.actions.length;
    const childrenActions = folder.children.reduce(
      (sum, child) => sum + getTotalActionsCount(child),
      0,
    );
    return directActions + childrenActions;
  };

  // Get root-level actions (actions without a folder)
  const rootActions = useMemo(() => {
    if (!selectedVersion?.actions) return [];
    return selectedVersion.actions.filter(a => !a.folder_id);
  }, [selectedVersion?.actions]);

  // Filter actions/folders by search
  const filteredRootActions = useMemo(() => {
    if (!searchQuery) return rootActions;
    return rootActions.filter(
      action =>
        action.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [rootActions, searchQuery]);

  // Check if folder contains matching actions
  const folderContainsMatch = (
    folder: FolderTreeNode,
    query: string,
  ): boolean => {
    if (!query) return true;
    const queryLower = query.toLowerCase();

    // Check folder name
    if (folder.name?.toLowerCase().includes(queryLower)) return true;

    // Check actions in this folder
    if (
      folder.actions.some(
        a =>
          a.name?.toLowerCase().includes(queryLower) ||
          a.tag?.toLowerCase().includes(queryLower) ||
          a.description?.toLowerCase().includes(queryLower),
      )
    )
      return true;

    // Check children folders recursively
    return folder.children.some(child => folderContainsMatch(child, query));
  };

  // Filter folders based on search
  const filteredFolderTree = useMemo(() => {
    if (!searchQuery) return folderTree;
    return folderTree.filter(folder =>
      folderContainsMatch(folder, searchQuery),
    );
  }, [folderTree, searchQuery]);

  // Filter webhooks based on search (must be before early returns to follow hooks rules)
  const filteredWebhooks = useMemo(() => {
    if (!selectedVersion?.webhooks) return [];
    if (!searchQuery) return selectedVersion.webhooks;
    return selectedVersion.webhooks.filter(
      (webhook: any) =>
        webhook.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        webhook.tag?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [selectedVersion?.webhooks, searchQuery]);

  // Auto-select latest version when app data changes
  useEffect(() => {
    if (currentApp?.versions && currentApp?.versions.length > 0) {
      const latestVersion =
        currentApp?.versions.find(v => v.latest) || currentApp?.versions[0];
      if (latestVersion && latestVersion.tag !== selectedVersionTag) {
        setSelectedVersionTag(latestVersion.tag);
      }
    }
  }, [currentApp?.versions, selectedVersionTag]);

  // Show AppCreatedModal for internal apps with no actions
  useEffect(() => {
    const hasActions =
      (selectedVersion?.actions && selectedVersion.actions.length > 0) ||
      (currentApp?.actions_count && currentApp?.actions_count > 0);

    if (isInternalApp && selectedVersion && !hasActions) {
      setShowAppCreatedModal(true);
    }
  }, [isInternalApp, selectedVersion, currentApp?.actions_count]);

  // Expand folders that contain matching actions when searching
  useEffect(() => {
    if (searchQuery) {
      const expandMatchingFolders = (folders: FolderTreeNode[]): string[] => {
        const idsToExpand: string[] = [];
        folders.forEach(folder => {
          if (folderContainsMatch(folder, searchQuery)) {
            idsToExpand.push(folder._id);
            idsToExpand.push(...expandMatchingFolders(folder.children));
          }
        });
        return idsToExpand;
      };
      setExpandedFolders(new Set(expandMatchingFolders(folderTree)));
    }
  }, [searchQuery, folderTree]);

  // Resolve pending action restoration after data loads
  useEffect(() => {
    if (selectedAction?._pendingRestore && selectedVersion?.actions) {
      const foundAction = selectedVersion.actions.find(
        (a: any) => a.tag === selectedAction.tag,
      );
      if (foundAction) {
        setSelectedAction({
          ...foundAction,
          componentType: 'action',
          appName: currentApp?.app_name,
          appTag: currentApp?.tag,
          version: selectedVersionTag,
          envs: selectedVersion?.envs || [],
          variables: selectedVersion?.variables || [],
          constants: selectedVersion?.constants || [],
          auths: selectedVersion?.auths || [],
        });
      } else {
        // Action not found, clear the pending restore
        setSelectedAction(null);
      }
    }
  }, [
    selectedVersion?.actions,
    selectedAction?._pendingRestore,
    selectedAction?.tag,
    currentApp,
    selectedVersionTag,
    selectedVersion,
  ]);

  // Keep selectedAction.envs in sync when selectedVersion.envs loads or updates (e.g. after refresh)
  useEffect(() => {
    if (
      !selectedAction ||
      selectedAction._pendingRestore ||
      !selectedVersion?.envs?.length
    )
      return;
    const envs = selectedVersion.envs;
    if (
      selectedAction.envs?.length === envs.length &&
      selectedAction.envs?.every(
        (e: any, i: number) => e.slug === envs[i]?.slug,
      )
    )
      return;
    setSelectedAction(prev =>
      prev && !prev._pendingRestore ? {...prev, envs} : prev,
    );
  }, [selectedVersion?.envs, selectedAction?.tag]);

  // Resolve pending webhook restoration after data loads
  useEffect(() => {
    if (selectedWebhook?._pendingRestore && selectedVersion?.webhooks) {
      const foundWebhook = selectedVersion.webhooks.find(
        (w: any) => w.tag === selectedWebhook.tag,
      );
      if (foundWebhook) {
        setSelectedWebhook({
          ...foundWebhook,
          appName: currentApp?.app_name,
          appTag: currentApp?.tag,
          appLogo: currentApp?.logo,
          version: selectedVersionTag,
          app: currentApp,
        });
      } else {
        // Webhook not found, clear the pending restore
        setSelectedWebhook(null);
      }
    }
  }, [
    selectedVersion?.webhooks,
    selectedWebhook?._pendingRestore,
    selectedWebhook?.tag,
    currentApp,
    selectedVersionTag,
  ]);

  // Persist sidebar state to localStorage
  useEffect(() => {
    // Don't persist if we don't have a valid stateKey
    if (!stateKey || stateKey === 'app-tab-state-undefined') return;
    const stateToSave = {
      sidebarView,
      selectedVersionTag,
      isSidebarCollapsed,
      expandedFolders: Array.from(expandedFolders),
      selectedActionTag: selectedAction?.tag || selectedAction?._id,
      selectedWebhookTag: selectedWebhook?.tag || selectedWebhook?._id,
      sidebarWidth,
    };
    localStorage.setItem(stateKey, JSON.stringify(stateToSave));
  }, [
    sidebarView,
    selectedVersionTag,
    expandedFolders,
    selectedAction,
    selectedWebhook,
    stateKey,
    isSidebarCollapsed,
    sidebarWidth,
  ]);

  // Show skeleton loading state while fetching or when data is incomplete
  if ((isLoading && !currentApp) || (currentApp && !currentApp.app_name)) {
    return (
      <div className="h-[calc(100vh-8rem)] flex bg-grey-100">
        {/* Sidebar Skeleton */}
        <div className="w-64 bg-white border-r border-grey-400 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-grey-400">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-grey-300 rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-grey-300 rounded animate-pulse mb-1" />
                <div className="h-3 w-16 bg-grey-300 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-9 bg-grey-300 rounded animate-pulse" />
          </div>
          <div className="flex-1 p-2 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-8 bg-grey-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
        {/* Main Content Skeleton */}
        <div className="flex-1 p-6">
          <div className="h-32 bg-grey-200 rounded-lg animate-pulse mb-4" />
          <div className="h-64 bg-grey-200 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // Show error state if app couldn't be loaded
  if (!currentApp && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-grey-100">
        <div className="text-center">
          <p className="text-red text-lg mb-2">Failed to load app</p>
          <p className="text-grey-600">
            {error
              ? `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
              : 'The app data could not be retrieved.'}
          </p>
          {effectiveAppId && (
            <p className="text-grey-500 text-sm mt-2">
              App ID: {effectiveAppId}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Helper functions
  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleSelectAction = (action: any) => {
    // Clear creating action state if active
    setIsCreatingAction(false);
    setNewActionFolderId(null);
    setSelectedWebhook(null);
    setSelectedAction({
      ...action,
      componentType: 'action',
      appName: currentApp?.app_name,
      appTag: currentApp?.tag,
      version: selectedVersionTag,
      envs: selectedVersion?.envs || [],
      variables: selectedVersion?.variables || [],
      constants: selectedVersion?.constants || [],
      auths: selectedVersion?.auths || [],
    });
  };

  const handleRefresh = async () => {
    setIsSidebarRefreshing(true);
    await refetch();
    setIsSidebarRefreshing(false);
  };

  const handleIntegrateApp = () => {
    setShowIntegrationModal(true);
  };

  // Start creating a new action inline (instead of opening a new tab)
  const handleCreateAction = (folderId: string | null = null) => {
    setSelectedAction(null);
    setSelectedWebhook(null);
    setIsCreatingAction(true);
    setNewActionFolderId(folderId);
    // Generate a stable ID for the inline action tab
    setInlineActionTabId(`inline-action-${currentApp?._id}-${Date.now()}`);
  };

  // Render folder tree item
  const renderFolderTree = (folders: FolderTreeNode[], level: number = 0) => {
    return folders.map(folder => {
      const isExpanded = expandedFolders.has(folder._id);
      const hasChildren =
        folder.children.length > 0 || folder.actions.length > 0;
      const matchingActions = searchQuery
        ? folder.actions.filter(
            a =>
              a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.tag?.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : folder.actions;

      return (
        <div key={folder._id}>
          <div className="group flex items-center">
            <button
              onClick={() => toggleFolder(folder._id)}
              className={cn(
                'flex-1 flex items-center gap-1 px-2 py-1.5 rounded text-sm transition-colors hover:bg-grey-100',
                'text-grey',
              )}
              style={{paddingLeft: `${8 + level * 12}px`}}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-grey-600 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-grey-600 flex-shrink-0" />
                )
              ) : (
                <span className="w-3.5" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-primary flex-shrink-0" />
              )}
              <span className="truncate flex-1 text-left">{folder.name}</span>
              <span className="text-xs text-grey-500">
                {getTotalActionsCount(folder)}
              </span>
            </button>

            {/* Folder context menu - only for internal apps */}
            {isInternalApp && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-grey-200 transition-all mr-1"
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5 text-grey-600" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => handleCreateAction(folder._id)}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Add Action
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setNewFolderParentId(folder._id);
                      setNewFolderParentName(folder.name);
                      setShowCreateFolderModal(true);
                    }}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Add Subfolder
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red focus:text-red"
                    onClick={() => {
                      // TODO: Implement folder deletion confirmation and API call
                      if (
                        window.confirm(
                          `Are you sure you want to delete "${folder.name}"? This will also delete all actions inside it.`,
                        )
                      ) {
                        console.log('Delete folder:', folder._id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isExpanded && (
            <div>
              {/* Nested folders */}
              {renderFolderTree(folder.children, level + 1)}

              {/* Actions in this folder */}
              {matchingActions.map(action => (
                <button
                  key={action.tag || action._id}
                  onClick={() => handleSelectAction(action)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                    selectedAction?.tag === action.tag
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-grey hover:bg-grey-100',
                  )}
                  style={{paddingLeft: `${20 + (level + 1) * 12}px`}}
                >
                  {action.method && (
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0',
                        action.method === 'GET' && 'bg-green/10 text-green',
                        action.method === 'POST' && 'bg-blue/10 text-blue',
                        action.method === 'PUT' && 'bg-blue/10 text-blue',
                        action.method === 'DELETE' && 'bg-red/10 text-red',
                        action.method === 'PATCH' &&
                          'bg-purple-500/10 text-purple-500',
                      )}
                    >
                      {action.method}
                    </span>
                  )}
                  <span className="truncate flex-1 text-left">
                    {action.name || action.tag}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  // Handle selecting a webhook
  const handleSelectWebhook = (webhook: any) => {
    // Clear creating action state if active
    setIsCreatingAction(false);
    setNewActionFolderId(null);
    setSelectedAction(null);
    setSelectedWebhook({
      ...webhook,
      appName: currentApp?.app_name,
      appTag: currentApp?.tag,
      appLogo: currentApp?.logo,
      version: selectedVersionTag,
      app: currentApp,
    });
  };

  // Render actions list for the sidebar
  const renderActionsListContent = () => {
    return (
      <div className="space-y-1">
        {/* Root-level actions (no folder) */}
        {filteredRootActions.map(action => (
          <button
            key={action.tag || action._id}
            onClick={() => {
              handleSelectAction(action);
              setSelectedWebhook(null);
            }}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
              selectedAction?.tag === action.tag
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-grey hover:bg-grey-100',
            )}
          >
            {action.method && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0',
                  action.method === 'GET' && 'bg-green/10 text-green',
                  action.method === 'POST' && 'bg-blue/10 text-blue',
                  action.method === 'PUT' && 'bg-blue/10 text-blue',
                  action.method === 'DELETE' && 'bg-red/10 text-red',
                  action.method === 'PATCH' &&
                    'bg-purple-500/10 text-purple-500',
                )}
              >
                {action.method}
              </span>
            )}
            <span className="truncate flex-1 text-left">
              {action.name || action.tag}
            </span>
          </button>
        ))}

        {/* Folder tree with nested actions */}
        {renderFolderTree(filteredFolderTree)}

        {filteredRootActions.length === 0 &&
          filteredFolderTree.length === 0 && (
            <div className="text-center py-4">
              <Zap className="h-6 w-6 text-grey-400 mx-auto mb-2" />
              <p className="text-xs text-grey-600">
                {searchQuery ? 'No matching actions' : 'No actions yet'}
              </p>
              {isInternalApp && !searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => handleCreateAction()}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create Action
                </Button>
              )}
            </div>
          )}
      </div>
    );
  };

  // Render environments content for the Environments view (matching ProductTabContent design)
  const renderEnvironmentsContent = () => {
    const envs = selectedVersion?.envs || [];
    const envsLength = envs.length;

    return (
      <div className="h-full overflow-auto bg-grey-50">
        {/* Header Section */}
        <div className="bg-white border-b border-grey-300 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-blue-500/10">
                  <Globe className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-grey">Environments</h1>
                  <p className="text-sm text-grey-500">
                    {envsLength}{' '}
                    {envsLength === 1 ? 'environment' : 'environments'}{' '}
                    configured
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isInternalApp && (
                  <Button
                    onClick={() => setShowCreateEnvModal(true)}
                    className="gap-2 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Environment
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          {envsLength > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {envs.map((env: any) => {
                const isActive = env.active;
                const envName = env.env_name || env.name || env.slug;

                return (
                  <div
                    key={env._id || env.slug}
                    onClick={() => {
                      setEditingEnv(env);
                      setShowUpdateEnvModal(true);
                    }}
                    className="bg-white rounded-lg border border-grey-400 p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/10">
                        <Globe className="h-5 w-5 text-blue-500" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium text-grey truncate">
                            {envName}
                          </h3>
                          {/* Status badge */}
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0',
                              isActive
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
                            )}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-grey-500 truncate">
                          {env.slug}
                        </p>

                        {/* Base URL */}
                        {env.base_url && (
                          <p className="text-xs text-grey-600 mt-1.5 truncate">
                            {env.base_url}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20">
              {/* Decorative background */}
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-blue-500/10">
                  <Globe className="h-12 w-12 text-blue-500" />
                </div>
                {/* Decorative dots */}
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-grey-200" />
                <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-grey-300" />
                <div className="absolute top-1/2 -right-6 w-2 h-2 rounded-full bg-grey-200" />
              </div>

              <h3 className="text-xl font-semibold text-grey mb-2">
                No environments yet
              </h3>
              <p className="text-grey-500 text-center max-w-md mb-6 leading-relaxed">
                Configure deployment environments for development, staging, and
                production.
              </p>
              {isInternalApp && (
                <Button
                  onClick={() => setShowCreateEnvModal(true)}
                  className="gap-2 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Create your first environment
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render webhooks content for the Webhooks view (matching ProductTabContent design)
  const renderWebhooksContent = () => {
    // Show inline form if creating webhook
    if (isCreatingWebhook && currentApp) {
      return (
        <InlineWebhookForm
          app={{
            _id: currentApp._id || '',
            app_name: currentApp.app_name || '',
            tag: currentApp.tag || '',
            logo: currentApp.logo,
            versions: currentApp.versions,
            envs: selectedVersion?.envs,
            workspace_id: currentApp.workspace_id,
          }}
          onCancel={() => setIsCreatingWebhook(false)}
          onSuccess={() => {
            setIsCreatingWebhook(false);
            // Refresh app data to show new webhook
            queryClient.invalidateQueries({queryKey: ['app', currentApp._id]});
          }}
        />
      );
    }

    const webhooks = selectedVersion?.webhooks || [];
    const webhooksLength = webhooks.length;

    // Filter webhooks based on search query
    const displayedWebhooks = searchQuery
      ? webhooks.filter(
          (webhook: any) =>
            webhook.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            webhook.tag?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : webhooks;

    return (
      <div className="h-full overflow-auto bg-grey-50">
        {/* Header Section */}
        <div className="bg-white border-b border-grey-300 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-blue/10">
                  <Webhook className="h-6 w-6 text-blue" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-grey">Webhooks</h1>
                  <p className="text-sm text-grey-500">
                    {webhooksLength}{' '}
                    {webhooksLength === 1 ? 'webhook' : 'webhooks'} configured
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Search bar */}
                {webhooksLength > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-400" />
                    <Input
                      type="text"
                      placeholder="Search webhooks..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10 w-64 bg-grey-50 border-grey-300 focus:bg-white"
                    />
                  </div>
                )}
                {isInternalApp && (
                  <Button
                    onClick={() => setIsCreatingWebhook(true)}
                    className="gap-2 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Webhook
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          {displayedWebhooks.length > 0 ? (
            <>
              {/* Results count when searching */}
              {searchQuery && (
                <p className="text-sm text-grey-500 mb-4">
                  Showing {displayedWebhooks.length} of {webhooksLength}{' '}
                  {webhooksLength === 1 ? 'webhook' : 'webhooks'}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {displayedWebhooks.map((webhook: any) => {
                  const eventsCount = webhook.events?.length || 0;

                  return (
                    <div
                      key={webhook._id || webhook.tag}
                      onClick={() => handleSelectWebhook(webhook)}
                      className="bg-white rounded-lg border border-grey-400 p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue/10">
                          <Webhook className="h-5 w-5 text-blue" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-medium text-grey truncate">
                              {webhook.name || webhook.tag}
                            </h3>
                            {/* Events count badge */}
                            {eventsCount > 0 && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 bg-blue/10 text-blue">
                                {eventsCount}{' '}
                                {eventsCount === 1 ? 'event' : 'events'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-grey-500 truncate">
                            {webhook.tag}
                          </p>

                          {/* Description */}
                          {webhook.description && (
                            <p className="text-xs text-grey-600 mt-1.5 line-clamp-2">
                              {webhook.description}
                            </p>
                          )}

                          {/* Events preview */}
                          {eventsCount > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {webhook.events
                                .slice(0, 3)
                                .map((event: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-grey-100 text-grey-600"
                                  >
                                    {event.name ||
                                      event.tag ||
                                      `Event ${idx + 1}`}
                                  </span>
                                ))}
                              {eventsCount > 3 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-grey-100 text-grey-600">
                                  +{eventsCount - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20">
              {/* Decorative background */}
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-blue/10">
                  <Webhook className="h-12 w-12 text-blue" />
                </div>
                {/* Decorative dots */}
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-grey-200" />
                <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-grey-300" />
                <div className="absolute top-1/2 -right-6 w-2 h-2 rounded-full bg-grey-200" />
              </div>

              {searchQuery ? (
                <>
                  <h3 className="text-xl font-semibold text-grey mb-2">
                    No results found
                  </h3>
                  <p className="text-grey-500 text-center max-w-md mb-6">
                    We couldn't find any webhooks matching "
                    <span className="font-medium text-grey">{searchQuery}</span>
                    "
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                    className="gap-2"
                  >
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-grey mb-2">
                    No webhooks yet
                  </h3>
                  <p className="text-grey-500 text-center max-w-md mb-6 leading-relaxed">
                    Set up webhooks to receive real-time notifications when
                    events occur in your application.
                  </p>
                  {isInternalApp && (
                    <Button
                      onClick={() => setIsCreatingWebhook(true)}
                      className="gap-2 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Create your first webhook
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render main content area (excluding RequestBuilder which is rendered separately)
  // Using unique keys ensures React completely unmounts/remounts when switching between content types
  const renderMainContent = () => {
    if (selectedAction) {
      // Use unique key combining type prefix + id to force remount when switching between different actions
      // Pass product context from app data (if app was opened from ProductTabContent's Connected Apps)
      return (
        <ActionViewTabContent
          key={`action-${selectedAction.tag || selectedAction._id}`}
          action={selectedAction}
          appTag={currentApp?.tag}
          productTag={(currentApp as any)?.productTag}
          envSlug={selectedVersion?.envs?.find((e: any) => e.active)?.slug}
        />
      );
    }

    if (selectedWebhook) {
      // Use unique key combining type prefix + id to force remount when switching between different webhooks
      return (
        <WebhookTabContent
          key={`webhook-${selectedWebhook.tag || selectedWebhook._id}`}
          webhook={selectedWebhook}
        />
      );
    }

    // Show environments view
    if (sidebarView === 'environments') {
      return renderEnvironmentsContent();
    }

    // Show webhooks view
    if (sidebarView === 'webhooks') {
      return renderWebhooksContent();
    }

    // Default view - API Dashboard (Overview)
    // Use real data from the dashboard metrics hook, with fallbacks for loading/empty states
    const hasMetrics = !!dashboardMetrics && !isLoadingMetrics;

    const apiAnalytics = hasMetrics
      ? {
          totalRequests: dashboardMetrics.totalRequests,
          successRate: dashboardMetrics.successRate,
          avgLatency: {
            current: `${dashboardMetrics.avgLatency.current}ms`,
            previous: `${dashboardMetrics.avgLatency.previous}ms`,
            change: dashboardMetrics.avgLatency.change,
          },
          errorRate: dashboardMetrics.errorRate,
          activeEndpoints: {
            current: actionsCount,
            previous: actionsCount,
            change: 0,
          },
          webhookEvents: dashboardMetrics.webhookEvents,
        }
      : {
          // Fallback values while loading or when no data
          totalRequests: {current: 0, previous: 0, change: 0},
          successRate: {current: 100, previous: 100, change: 0},
          avgLatency: {current: '0ms', previous: '0ms', change: 0},
          errorRate: {current: 0, previous: 0, change: 0},
          activeEndpoints: {
            current: actionsCount,
            previous: actionsCount,
            change: 0,
          },
          webhookEvents: {current: 0, previous: 0, change: 0},
        };

    // Use real method distribution or fallback to empty array
    const requestsByMethod =
      hasMetrics && dashboardMetrics.requestsByMethod.length > 0
        ? dashboardMetrics.requestsByMethod
        : [
            {method: 'GET', count: 0, percentage: 0},
            {method: 'POST', count: 0, percentage: 0},
            {method: 'PUT', count: 0, percentage: 0},
            {method: 'DELETE', count: 0, percentage: 0},
          ].filter(m => m.count > 0 || !hasMetrics);

    // Normalize to last 7 days (Mon–Sun) with 0 for days that have no activity
    const recentActivity = getLast7DaysNormalized(
      hasMetrics && dashboardMetrics.dailyActivity?.length
        ? dashboardMetrics.dailyActivity
        : [],
      (d: {day?: string; date?: string; requests?: number; count?: number}) =>
        d.requests ?? d.count ?? 0,
    );

    // Use real top endpoints or fallback to action-based placeholders
    const topEndpoints =
      hasMetrics && dashboardMetrics.topEndpoints.length > 0
        ? dashboardMetrics.topEndpoints.slice(0, 5).map(ep => ({
            name: ep.name,
            tag: ep.tag,
            method: ep.method,
            calls: ep.calls,
            avgLatency: `${ep.avgLatency}ms`,
          }))
        : (selectedVersion?.actions || []).slice(0, 5).map((action: any) => ({
            name: action.name || action.tag,
            tag: action.tag,
            method: action.method || 'GET',
            calls: 0,
            avgLatency: '0ms',
          }));

    const renderMetricCard = (
      title: string,
      value: string | number,
      change: number,
      icon: React.ReactNode,
      iconBg: string,
      suffix?: string,
      isLoading?: boolean,
    ) => (
      <div className="bg-grey-50 dark:bg-background rounded-lg border border-grey-300 dark:border-grey-400 p-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}
          >
            {icon}
          </div>
          {isLoading ? (
            <div className="flex items-center gap-1 text-xs text-grey-400">
              <Loader2 className="h-3 w-3 animate-spin" />
            </div>
          ) : (
            <div
              className={`flex items-center gap-1 text-xs font-semibold ${change >= 0 ? 'text-green' : 'text-red-500'}`}
            >
              {change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-grey mb-1">
          {isLoading ? (
            <span className="inline-block w-16 h-6 bg-grey-200 dark:bg-grey-600 rounded animate-pulse" />
          ) : (
            <>
              {value}
              {suffix}
            </>
          )}
        </div>
        <div className="text-xs text-grey-600 font-medium">{title}</div>
      </div>
    );

    const getMethodColor = (method: string) => {
      switch (method) {
        case 'GET':
          return 'bg-green text-white';
        case 'POST':
          return 'bg-blue-700 text-white';
        case 'PUT':
          return 'bg-orange-500 text-white';
        case 'DELETE':
          return 'bg-red text-white';
        case 'PATCH':
          return 'bg-purple-500 text-white';
        default:
          return 'bg-grey-500 text-white';
      }
    };

    return (
      <div
        key="overview-content"
        className="h-full overflow-auto p-3 sm:p-4 md:p-6"
      >
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          {/* Dashboard Header */}
          <div className="bg-grey-50 dark:bg-background rounded-lg border border-grey-300 dark:border-grey-400 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                  {currentApp?.logo ? (
                    <img
                      src={currentApp?.logo}
                      alt={currentApp?.app_name}
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    <BarChart3 className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-grey mb-2">
                    {currentApp?.app_name} Dashboard
                  </h1>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-grey-100 dark:bg-grey-700 text-grey-700 dark:text-grey font-mono font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      {currentApp?.tag}
                    </span>
                    <span className="text-grey-400">•</span>
                    <span className="text-grey-600 dark:text-grey-400 font-medium">
                      {selectedVersionTag}
                    </span>
                    {currentApp?.status && (
                      <>
                        <span className="text-grey-400">•</span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-semibold border',
                            currentApp?.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
                          )}
                        >
                          {currentApp?.status === 'active'
                            ? 'Active'
                            : 'Inactive'}
                        </span>
                      </>
                    )}
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1',
                        isInternalApp
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-orange-500/10 text-orange-600',
                      )}
                    >
                      {isInternalApp ? (
                        <Building2 className="h-3 w-3" />
                      ) : (
                        <ExternalLink className="h-3 w-3" />
                      )}
                      {isInternalApp ? 'Internal' : 'Third-party'}
                    </span>
                    {/* Product Context - shown when app was opened from ProductTabContent */}
                    {(currentApp as any)?.productTag && (
                      <>
                        <span className="text-grey-400">•</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 bg-purple-500/10 text-purple-600">
                          <Box className="h-3 w-3" />
                          {(currentApp as any)?.productName ||
                            (currentApp as any)?.productTag}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {/* Version Selector */}
                {currentApp?.versions && currentApp?.versions.length > 0 && (
                  <Select
                    value={selectedVersionTag}
                    onValueChange={setSelectedVersionTag}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Version" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentApp?.versions.map(version => (
                        <SelectItem key={version.tag} value={version.tag}>
                          {version.tag} {version.latest && '(Latest)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedVersion && isInternalApp && isVersionUnpublished && (
                  <Button
                    onClick={() => setShowPublishModal(true)}
                    size="sm"
                    className="w-36"
                    disabled={!allEnvironmentsActive}
                    title={
                      !allEnvironmentsActive
                        ? 'Set all environments as active to publish'
                        : undefined
                    }
                  >
                    <Rocket className="h-4 w-4 mr-1" />
                    Publish
                  </Button>
                )}
                {selectedVersion && selectedVersion.status === 'public' && (
                  <Button
                    onClick={() => {
                      const url = `${window.location.origin}/marketplace/app/${currentApp?.tag}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Marketplace URL copied to clipboard');
                    }}
                    size="sm"
                    variant="outline"
                    className="w-36"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                )}
                {selectedVersion && (
                  <Button
                    onClick={handleIntegrateApp}
                    size="sm"
                    variant="outline"
                    className="w-36"
                  >
                    <Plug className="h-4 w-4 mr-1" />
                    Integrate
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {renderMetricCard(
              'Total Requests',
              apiAnalytics.totalRequests.current.toLocaleString(),
              apiAnalytics.totalRequests.change,
              <Activity className="h-5 w-5 text-blue-600" />,
              'bg-blue-500/10',
              undefined,
              isLoadingMetrics,
            )}
            {renderMetricCard(
              'Success Rate',
              apiAnalytics.successRate.current.toFixed(1),
              apiAnalytics.successRate.change,
              <CheckCircle className="h-5 w-5 text-green" />,
              'bg-green/10',
              '%',
              isLoadingMetrics,
            )}
            {renderMetricCard(
              'Avg Latency',
              apiAnalytics.avgLatency.current,
              apiAnalytics.avgLatency.change,
              <Clock className="h-5 w-5 text-orange-600" />,
              'bg-orange-500/10',
              undefined,
              isLoadingMetrics,
            )}
            {renderMetricCard(
              'Error Rate',
              apiAnalytics.errorRate.current.toFixed(1),
              apiAnalytics.errorRate.change,
              <XCircle className="h-5 w-5 text-red-500" />,
              'bg-red-500/10',
              '%',
              isLoadingMetrics,
            )}
            {renderMetricCard(
              'Active Endpoints',
              actionsCount,
              0,
              <Zap className="h-5 w-5 text-primary" />,
              'bg-primary/10',
              undefined,
              false, // Actions count is not from metrics
            )}
            {renderMetricCard(
              'Webhook Events',
              apiAnalytics.webhookEvents.current.toLocaleString(),
              apiAnalytics.webhookEvents.change,
              <Webhook className="h-5 w-5 text-purple-600" />,
              'bg-purple-500/10',
              undefined,
              isLoadingMetrics,
            )}
          </div>

          {/* Request Activity Timeline */}
          <div className="bg-grey-50 dark:bg-background rounded-lg border border-grey-300 dark:border-grey-400 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-grey">
                Request Activity (Last 7 Days)
              </h2>
              {isLoadingMetrics && (
                <Loader2 className="h-4 w-4 animate-spin text-grey-400" />
              )}
            </div>
            <div className="space-y-3">
              {recentActivity.map(day => {
                const maxRequests = Math.max(
                  ...recentActivity.map(d => d.value),
                  1,
                );
                const percentage =
                  maxRequests > 0 ? (day.value / maxRequests) * 100 : 0;

                return (
                  <div
                    key={day.date}
                    className="flex items-center gap-3 relative"
                  >
                    <div className="w-12 text-xs font-medium text-grey-600 flex-shrink-0">
                      {day.date}
                    </div>
                    <div className="flex-1 h-8 bg-grey-200 dark:bg-grey-700 rounded-lg overflow-hidden relative">
                      {isLoadingMetrics ? (
                        <div className="h-full w-full bg-grey-300 dark:bg-grey-600 animate-pulse rounded-lg" />
                      ) : (
                        <>
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-lg transition-all duration-500"
                            style={{width: `${percentage}%`}}
                          />
                          <div className="absolute inset-0 flex items-center px-3">
                            <span className="text-xs font-semibold text-white dark:text-grey">
                              {day.value.toLocaleString()} requests
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Requests by Method */}
            <div className="bg-grey-50 dark:bg-background rounded-lg border border-grey-300 dark:border-grey-400 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-grey">
                  Requests by Method
                </h2>
                {isLoadingMetrics && (
                  <Loader2 className="h-4 w-4 animate-spin text-grey-400" />
                )}
              </div>
              {isLoadingMetrics ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-5 bg-grey-300 dark:bg-grey-600 rounded animate-pulse" />
                        <div className="w-24 h-5 bg-grey-200 dark:bg-grey-700 rounded animate-pulse" />
                      </div>
                      <div className="h-2 bg-grey-200 dark:bg-grey-700 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : requestsByMethod.length > 0 ? (
                <div className="space-y-4">
                  {requestsByMethod.map(item => (
                    <div key={item.method} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-bold',
                            getMethodColor(item.method),
                          )}
                        >
                          {item.method}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-grey-600 font-medium">
                            {item.count.toLocaleString()}
                          </span>
                          <span className="text-grey-700 dark:text-grey font-bold min-w-[3rem] text-right">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-grey-200 dark:bg-grey-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            item.method === 'GET'
                              ? 'bg-green'
                              : item.method === 'POST'
                                ? 'bg-blue'
                                : item.method === 'PUT'
                                  ? 'bg-orange-500'
                                  : 'bg-red',
                          )}
                          style={{width: `${item.percentage}%`}}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-grey-400 mx-auto mb-2" />
                  <p className="text-sm text-grey-600">
                    No request data available
                  </p>
                </div>
              )}
            </div>

            {/* Top Endpoints */}
            <div className="bg-grey-50 dark:bg-background rounded-lg border border-grey-300 dark:border-grey-400 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-grey">
                  Top Endpoints
                </h2>
                {isLoadingMetrics && (
                  <Loader2 className="h-4 w-4 animate-spin text-grey-400" />
                )}
              </div>
              {isLoadingMetrics ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-grey-100 dark:bg-grey-500 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-5 bg-grey-300 dark:bg-grey-600 rounded animate-pulse" />
                        <div className="w-32 h-4 bg-grey-200 dark:bg-grey-700 rounded animate-pulse" />
                      </div>
                      <div className="w-24 h-4 bg-grey-200 dark:bg-grey-700 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : topEndpoints.length > 0 ? (
                <div className="space-y-3">
                  {topEndpoints.map((endpoint: any, index: number) => (
                    <div
                      key={endpoint.tag || index}
                      className="flex items-center justify-between p-3 bg-grey-100 dark:bg-grey-500 rounded-lg hover:bg-grey-200 transition-colors cursor-pointer"
                      onClick={() => {
                        const action = selectedVersion?.actions?.find(
                          (a: any) =>
                            (a.name || a.tag) === endpoint.name ||
                            a.tag === endpoint.tag,
                        );
                        if (action) handleSelectAction(action);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-bold',
                            getMethodColor(endpoint.method),
                          )}
                        >
                          {endpoint.method}
                        </span>
                        <span className="text-sm dark:hover:text-grey-600 font-medium text-grey truncate max-w-[200px]">
                          {endpoint.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-grey-600">
                        <span>{endpoint.calls.toLocaleString()} calls</span>
                        <span className="text-grey-400">|</span>
                        <span>{endpoint.avgLatency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Zap className="h-8 w-8 text-grey-400 mx-auto mb-2" />
                  <p className="text-sm text-grey-600">
                    No actions configured yet
                  </p>
                  {isInternalApp && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => handleCreateAction()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create Action
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Environment Status */}
          <div className="bg-grey-50 dark:bg-background rounded-lg border border-grey-300 dark:border-grey-400 p-6">
            <h2 className="text-lg font-semibold text-grey mb-4">
              Environment Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(selectedVersion?.envs || []).map((env: any) => (
                <div
                  key={env.slug}
                  className="p-4 bg-grey-100 dark:bg-background border border-grey-200 dark:border-grey-400 rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setEditingEnv(env);
                    setShowUpdateEnvModal(true);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border',
                        env.slug === 'production'
                          ? 'bg-green/10 text-green border-green/20'
                          : env.slug === 'staging'
                            ? 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                            : 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                      )}
                    >
                      {env.env_name || env.slug}
                    </span>
                    {env.active && (
                      <span className="flex items-center gap-1 text-xs text-green font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse"></div>
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-grey-600 truncate">
                    {env.base_url || 'No base URL configured'}
                  </p>
                </div>
              ))}
              {(!selectedVersion?.envs ||
                selectedVersion.envs.length === 0) && (
                <div className="col-span-3 text-center py-8">
                  <Globe className="h-8 w-8 text-grey-400 mx-auto mb-2" />
                  <p className="text-sm text-grey-600">
                    No environments configured
                  </p>
                  {isInternalApp && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setShowCreateEnvModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Environment
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Info */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-grey mb-1">
                  Quick Actions
                </h3>
                <p className="text-sm text-grey-600">
                  Select an action from the sidebar to test API endpoints. Use
                  the tabs to switch between Actions, Webhooks, and
                  Environments.
                  {isInternalApp &&
                    ' Click the + button to create new resources.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'flex bg-grey-100 relative',
        isMarketplace ? 'h-full' : 'h-[calc(100vh-8rem)]',
      )}
    >
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        style={{width: isSidebarCollapsed ? '56px' : `${sidebarWidth}px`}}
        className={cn(
          'bg-white border-r border-grey-400 flex flex-col flex-shrink-0 transition-all duration-300 absolute z-49',
          isResizing && 'transition-none',
        )}
      >
        {/* Header - Fixed */}
        <div
          className={cn(
            'flex-shrink-0 border-b border-grey-400',
            isSidebarCollapsed ? 'p-2' : 'p-3',
          )}
        >
          <div
            className={cn(
              'flex items-center',
              isSidebarCollapsed ? 'justify-center' : 'gap-2',
            )}
          >
            {/* App Logo */}
            <button
              onClick={() => {
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                } else {
                  setSidebarView('overview');
                  setSelectedAction(null);
                  setSelectedWebhook(null);
                  setIsCreatingAction(false);
                  setIsCreatingWebhook(false);
                }
              }}
              className={cn(
                'rounded-lg bg-green/10 flex items-center justify-center text-green font-semibold flex-shrink-0 transition-all hover:ring-2 hover:ring-primary/50',
                isSidebarCollapsed ? 'w-8 h-8 text-sm' : 'w-9 h-9 text-sm',
              )}
              title={
                isSidebarCollapsed ? 'Expand sidebar' : 'Return to overview'
              }
            >
              {currentApp?.logo ? (
                <img
                  src={currentApp?.logo}
                  alt={currentApp?.app_name}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                getInitials(String(currentApp?.app_name))
              )}
            </button>
            {!isSidebarCollapsed && (
              <>
                <button
                  onClick={() => {
                    setSidebarView('overview');
                    setSelectedAction(null);
                    setSelectedWebhook(null);
                    setIsCreatingAction(false);
                    setIsCreatingWebhook(false);
                  }}
                  className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                  title="Return to overview"
                >
                  <h2 className="font-semibold text-grey text-sm truncate">
                    {currentApp?.app_name}
                  </h2>
                  <p className="text-xs text-grey-600 truncate">
                    {selectedVersionTag}
                  </p>
                </button>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1.5 rounded hover:bg-grey-100 text-grey-500 hover:text-grey transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2 min-h-0">
          {/* Overview */}
          <div className="px-2 mb-1">
            <button
              onClick={() => {
                setSidebarView('overview');
                setSelectedAction(null);
                setSelectedWebhook(null);
                setIsCreatingAction(false);
                setIsCreatingWebhook(false);
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                sidebarView === 'overview' &&
                  !selectedAction &&
                  !selectedWebhook &&
                  !isCreatingAction &&
                  !isCreatingWebhook
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-grey hover:bg-grey-100',
                isSidebarCollapsed && 'justify-center px-2',
              )}
              title={isSidebarCollapsed ? 'Overview' : undefined}
            >
              <Home className="h-4 w-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span>Overview</span>}
            </button>
          </div>

          {/* Environments - below Overview */}
          <div className="px-2 mb-1">
            <button
              onClick={() => {
                setSidebarView('environments');
                setSelectedAction(null);
                setSelectedWebhook(null);
                setIsCreatingAction(false);
                setIsCreatingWebhook(false);
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                sidebarView === 'environments'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-grey hover:bg-grey-100',
                isSidebarCollapsed && 'justify-center px-2',
              )}
              title={
                isSidebarCollapsed ? `Environments (${envsCount})` : undefined
              }
            >
              <Globe
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  sidebarView === 'environments'
                    ? 'text-primary'
                    : 'text-grey-600',
                )}
              />
              {!isSidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">Environments</span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded min-w-[20px] text-center',
                      sidebarView === 'environments'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-grey-100 text-grey-600',
                    )}
                  >
                    {envsCount}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Webhooks - below Environments */}
          <div className="px-2 mb-1">
            <button
              onClick={() => {
                setSidebarView('webhooks');
                setSelectedAction(null);
                setSelectedWebhook(null);
                setIsCreatingAction(false);
                setIsCreatingWebhook(false);
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                sidebarView === 'webhooks'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-grey hover:bg-grey-100',
                isSidebarCollapsed && 'justify-center px-2',
              )}
              title={
                isSidebarCollapsed ? `Webhooks (${webhooksCount})` : undefined
              }
            >
              <Webhook
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  sidebarView === 'webhooks' ? 'text-primary' : 'text-blue',
                )}
              />
              {!isSidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">Webhooks</span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded min-w-[20px] text-center',
                      sidebarView === 'webhooks'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-grey-100 text-grey-600',
                    )}
                  >
                    {webhooksCount}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Actions - shows icon only when collapsed */}
          <div className="px-2 mb-1">
            <button
              onClick={() => {
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                selectedAction
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-grey hover:bg-grey-100',
                isSidebarCollapsed && 'justify-center px-2',
                !isSidebarCollapsed && 'hidden',
              )}
              title={
                isSidebarCollapsed ? `Actions (${actionsCount})` : undefined
              }
            >
              <Zap
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  selectedAction ? 'text-primary' : 'text-amber-500',
                )}
              />
            </button>
          </div>

          {/* Actions Section - Resource style like Products (only shown when expanded) */}
          {!isSidebarCollapsed && (
            <div className="px-2 mt-3">
              {/* Actions Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-grey-500 uppercase tracking-wider">
                  Actions
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleRefresh}
                    disabled={isSidebarRefreshing}
                    className="p-1 text-grey-500 hover:text-primary transition-colors rounded hover:bg-grey-100"
                    title="Refresh"
                  >
                    <RefreshCw
                      className={cn(
                        'h-3.5 w-3.5',
                        isSidebarRefreshing && 'animate-spin',
                      )}
                    />
                  </button>
                  {isInternalApp && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 text-grey-500 hover:text-primary transition-colors rounded hover:bg-grey-100">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleCreateAction()}>
                          <Zap className="h-4 w-4 mr-2" />
                          New Action
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setNewFolderParentId(null);
                            setNewFolderParentName(undefined);
                            setShowCreateFolderModal(true);
                          }}
                        >
                          <FolderPlus className="h-4 w-4 mr-2" />
                          New Folder
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setShowCreateSharedVariableModal(true)}
                        >
                          <Settings2 className="h-4 w-4 mr-2" />
                          Shared Variable
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Search for actions */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grey-400" />
                <Input
                  type="text"
                  placeholder="Search actions..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {/* Actions List */}
              <div className="max-h-[calc(100vh-26rem)] overflow-y-auto">
                {renderActionsListContent()}
              </div>
            </div>
          )}

          {/* Expand button - only shown when collapsed */}
          {isSidebarCollapsed && (
            <div className="px-2 mt-4">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-full flex items-center justify-center p-2 rounded-lg text-grey-500 hover:bg-grey-100 hover:text-grey transition-colors"
                title="Expand sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Resizer Handle */}
        {!isSidebarCollapsed && (
          <div
            onMouseDown={startResizing}
            className={cn(
              'absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-20',
              isResizing && 'bg-primary/50',
            )}
          />
        )}
      </div>

      {/* Main Content - Key on wrapper div ensures proper unmount/remount when content type changes */}
      <div
        key={
          isCreatingAction
            ? `creating-${inlineActionTabId}`
            : selectedAction
              ? `action-view-${selectedAction.tag || selectedAction._id}`
              : selectedWebhook
                ? `webhook-view-${selectedWebhook.tag || selectedWebhook._id}`
                : 'overview'
        }
        className={cn(
          'flex-1 flex flex-col overflow-hidden bg-grey-50 transition-all duration-300',
          isSidebarCollapsed ? 'ml-12 sm:ml-14' : 'ml-0 sm:ml-64',
        )}
      >
        {isCreatingAction ? (
          <RequestBuilder
            tabId={inlineActionTabId}
            data={{
              isNew: true,
              app: currentApp,
              appId: currentApp?._id,
              appTag: currentApp?.tag,
              appName: currentApp?.app_name,
              version: selectedVersionTag,
              folderId: newActionFolderId,
              envs: selectedVersion?.envs || [],
              variables: selectedVersion?.variables || [],
              constants: selectedVersion?.constants || [],
              auths: selectedVersion?.auths || [],
              onSaveSuccess: () => {
                setIsCreatingAction(false);
                setNewActionFolderId(null);
                refetch();
              },
              onCancel: () => {
                setIsCreatingAction(false);
                setNewActionFolderId(null);
              },
            }}
          />
        ) : (
          renderMainContent()
        )}
      </div>

      {/* Modals */}
      {showAppCreatedModal && (
        <AppCreatedModal
          app={currentApp}
          open={showAppCreatedModal}
          onOpenChange={setShowAppCreatedModal}
        />
      )}

      <CreateAppEnvironmentModal
        open={showCreateEnvModal}
        onOpenChange={setShowCreateEnvModal}
        appTag={currentApp?.tag}
        appId={currentApp?._id}
      />

      <UpdateAppEnvironmentModal
        open={showUpdateEnvModal}
        onOpenChange={open => {
          setShowUpdateEnvModal(open);
          if (!open) setEditingEnv(null);
        }}
        appTag={currentApp?.tag}
        appId={currentApp?._id}
        environment={editingEnv}
        onSuccess={() => {
          setEditingEnv(null);
        }}
      />

      <CreateVariableModal
        open={showCreateVariableModal}
        onOpenChange={open => {
          setShowCreateVariableModal(open);
          if (!open) setEditingVariable(null);
        }}
        appTag={currentApp?.tag}
        appId={currentApp?._id}
        variable={editingVariable}
      />

      <CreateConstantModal
        open={showCreateConstantModal}
        onOpenChange={open => {
          setShowCreateConstantModal(open);
          if (!open) setEditingConstant(null);
        }}
        appTag={String(currentApp?.tag)}
        appId={String(currentApp?._id)}
        constant={editingConstant}
      />

      <CreateSharedVariableModal
        open={showCreateSharedVariableModal}
        onOpenChange={setShowCreateSharedVariableModal}
        appId={currentApp?._id}
        actions={selectedVersion?.actions || []}
      />

      <CreateFolderModal
        open={showCreateFolderModal}
        onOpenChange={setShowCreateFolderModal}
        appId={String(currentApp?._id)}
        version={selectedVersionTag}
        parentFolderId={newFolderParentId}
        parentFolderName={newFolderParentName}
        onSuccess={() => {
          // Refresh will be handled by the modal's onSuccess
        }}
      />

      {showIntegrationModal && currentApp && (
        <IntegrationProvider>
          <AppIntegrationModal
            app={
              {
                _id: currentApp._id,
                app_name: currentApp.app_name,
                domain_name: currentApp.tag,
                description: currentApp.description,
                logo: currentApp.logo,
                tag: currentApp.tag,
                versions: currentApp.versions || [],
                created_at: currentApp.created_at || new Date().toISOString(),
                updated_at: currentApp.updated_at || new Date().toISOString(),
              } as any
            }
            open={showIntegrationModal}
            onOpenChange={setShowIntegrationModal}
          />
        </IntegrationProvider>
      )}

      {showPublishModal && currentApp && selectedVersion && (
        <PublishAppModal
          open={showPublishModal}
          onOpenChange={setShowPublishModal}
          app={{
            _id: currentApp._id,
            tag: currentApp.tag,
            app_name: currentApp.app_name,
            description: currentApp.description,
            logo: currentApp.logo,
            domains: currentApp.domains,
          }}
          version={{
            tag: selectedVersion.tag,
            status: selectedVersion.status,
          }}
          onSuccess={() => {
            setShowPublishModal(false);
            queryClient.invalidateQueries({queryKey: ['app', effectiveAppId]});
            queryClient.invalidateQueries({queryKey: ['apps']});
          }}
        />
      )}
    </div>
  );
}
