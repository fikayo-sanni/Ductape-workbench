import { useState, useMemo, useEffect } from 'react';
import { IApp } from '@/types/app';
import { Zap, Settings2, Key, FileCode, Globe, Pencil, Search, Folder, Plus, ExternalLink, Building2, Grid3x3, Webhook, Filter, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useAuth } from '@/store/useAuth';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownViewer } from '@/components/ui/markdown-editor';
import { IntegrationProvider } from '@/context/integration-context';
import AppIntegrationModal from '@/components/marketplace/AppIntegrationModal';
import AppCreatedModal from '@/components/modals/AppCreatedModal';
import CreateAppEnvironmentModal from '@/components/modals/CreateAppEnvironmentModal';
import UpdateAppEnvironmentModal from '@/components/modals/UpdateAppEnvironmentModal';
import CreateVariableModal from '@/components/modals/CreateVariableModal';
import CreateConstantModal from '@/components/modals/CreateConstantModal';
import { useQuery } from '@tanstack/react-query';
import appServices from '@/services/appServices';

interface AppTabContentProps {
  app?: IApp;
  appId?: string;
}

export default function AppTabContent({ app, appId }: AppTabContentProps) {
  const { openTab, tabs, activeTabId } = useWorkbenchStore();
  const { currentWorkspaceId, user } = useAuth();

  // Get itemId and initialization data from active tab if app is undefined (after refresh)
  const activeTab = tabs.find(t => t.id === activeTabId);
  const effectiveAppId = app?._id || appId || activeTab?.itemId;
  const initialActiveSection = (activeTab?.data as any)?.activeSection || 'overview';

  const [selectedVersionTag, setSelectedVersionTag] = useState<string>(
    app?.versions?.find(v => v.latest)?.tag || app?.versions?.[0]?.tag || ''
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

  // Actions search and filter state
  const [actionsSearch, setActionsSearch] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Content filter state - initialize from persisted data
  const [activeFilter, setActiveFilter] = useState<string>(initialActiveSection);

  // Determine if app is internal or third-party
  const isInternalApp = app?.workspace_id === currentWorkspaceId;

  // Check if app data is incomplete (missing versions, actions, app_name, etc.)
  const isAppDataIncomplete = app && (!app.versions || app.versions.length === 0 || !app.app_name);

  // Fetch app details if app data is missing or incomplete
  const { data: appDetails, isLoading, error } = useQuery({
    queryKey: ['app', effectiveAppId],
    queryFn: () => appServices.fetchApp({
      app_id: effectiveAppId || '',
      user_id: user?._id || '',
      public_key: user?.public_key || '',
    }),
    enabled: !!effectiveAppId && !!user?._id && !!user?.public_key && (!app || isAppDataIncomplete),
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Use fetched app details if available, otherwise use the passed app
  const currentApp = appDetails?.data || app;

  // Debug logging
  useEffect(() => {
    console.log('AppTabContent Debug:', {
      effectiveAppId,
      hasApp: !!app,
      hasAppDetails: !!appDetails?.data,
      hasCurrentApp: !!currentApp,
      isLoading,
      error,
      userId: user?._id,
      publicKey: user?.public_key,
    });
  }, [effectiveAppId, app, appDetails, currentApp, isLoading, error, user]);

  // Update tab with fetched data
  useEffect(() => {
    if (appDetails?.data && activeTabId && !app) {
      const { updateTab } = useWorkbenchStore.getState();
      updateTab(activeTabId, { data: appDetails.data });
    }
  }, [appDetails, activeTabId, app]);

  // ALL HOOKS AND COMPUTED VALUES MUST BE BEFORE EARLY RETURNS!

  // Calculate selected version
  const selectedVersion = currentApp?.versions?.find(v => v.tag === selectedVersionTag) ||
    (currentApp?.versions && currentApp?.versions.length > 0 ?
      (currentApp?.versions.find(v => v.latest) || currentApp?.versions[0]) :
      null);

  const actionsCount = selectedVersion?.actions?.length || currentApp?.actions_count || 0;
  const envsCount = selectedVersion?.envs?.length || currentApp?.envs_count || 0;
  const authsCount = selectedVersion?.auths?.length || 0;
  const variablesCount = selectedVersion?.variables?.length || 0;
  const constantsCount = selectedVersion?.constants?.length|| 0;
  const webhooksCount = selectedVersion?.webhooks?.length || (currentApp as any)?.webhooks_count || 0;

  // Build folder tree structure
  const folderTree = useMemo(() => {
    if (!selectedVersion?.folders) return [];

    const buildTree = (parentId: string | null = null): any[] => {
      return selectedVersion.folders
        ?.filter(f => f.parent_id === parentId)
        .map(folder => ({
          ...folder,
          children: buildTree(folder._id),
        })) || [];
    };

    return buildTree(null);
  }, [selectedVersion?.folders]);

  // Filter actions by search and folder
  const filteredActions = useMemo(() => {
    if (!selectedVersion?.actions) return [];

    let filtered = selectedVersion.actions;

    // Filter by search
    if (actionsSearch) {
      filtered = filtered.filter(action =>
        action.name?.toLowerCase().includes(actionsSearch.toLowerCase()) ||
        action.tag?.toLowerCase().includes(actionsSearch.toLowerCase()) ||
        action.description?.toLowerCase().includes(actionsSearch.toLowerCase())
      );
    }

    // Filter by folder
    if (selectedFolderId !== null) {
      filtered = filtered.filter(action => action.folder_id === selectedFolderId);
    }

    return filtered;
  }, [selectedVersion?.actions, actionsSearch, selectedFolderId]);

  // Flatten folder tree for dropdown with indentation
  const flattenedFolders = useMemo(() => {
    const flattened: Array<{ folder: any; level: number }> = [];

    const flatten = (folders: any[], level: number = 0) => {
      folders.forEach(folder => {
        flattened.push({ folder, level });
        if (folder.children && folder.children.length > 0) {
          flatten(folder.children, level + 1);
        }
      });
    };

    flatten(folderTree);
    return flattened;
  }, [folderTree]);

  // Get selected folder name for display
  const selectedFolderName = useMemo(() => {
    if (!selectedFolderId) return 'All Actions';
    const found = flattenedFolders.find(f => f.folder._id === selectedFolderId);
    return found?.folder.name || 'All Actions';
  }, [selectedFolderId, flattenedFolders]);

  // Auto-select latest version when app data changes
  useEffect(() => {
    if (currentApp?.versions && currentApp?.versions.length > 0) {
      // Find the latest version
      const latestVersion = currentApp?.versions.find(v => v.latest) || currentApp?.versions[0];
      if (latestVersion && latestVersion.tag !== selectedVersionTag) {
        setSelectedVersionTag(latestVersion.tag);
      }
    }
  }, [currentApp?.versions, selectedVersionTag]);

  // Show AppCreatedModal for internal apps with no actions
  useEffect(() => {
    const hasActions = (selectedVersion?.actions && selectedVersion.actions.length > 0) ||
      (currentApp?.actions_count && currentApp?.actions_count > 0);

    if (isInternalApp && selectedVersion && !hasActions) {
      setShowAppCreatedModal(true);
    }
  }, [isInternalApp, selectedVersion, currentApp?.actions_count]);

  // NOW WE CAN HAVE EARLY RETURNS - ALL HOOKS HAVE BEEN CALLED!

  // Show skeleton loading state while fetching or when data is incomplete
  if ((isLoading && !currentApp) || (currentApp && !currentApp.app_name)) {
    return (
      <div className="bg-grey-100 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-grey-300 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-8 w-48 bg-grey-300 rounded animate-pulse" />
                <div className="h-4 w-32 bg-grey-300 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-grey-300 rounded-lg animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-6 w-12 bg-grey-300 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-grey-300 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="p-3 rounded-lg border border-grey-400">
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

  // Show error state if app couldn't be loaded
  if (!currentApp && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-grey-100">
        <div className="text-center">
          <p className="text-red text-lg mb-2">Failed to load app</p>
          <p className="text-grey-600">
            {error ? `Error: ${error instanceof Error ? error.message : 'Unknown error'}` : 'The app data could not be retrieved.'}
          </p>
          {effectiveAppId && (
            <p className="text-grey-500 text-sm mt-2">App ID: {effectiveAppId}</p>
          )}
        </div>
      </div>
    );
  }

  // Helper functions (not hooks, can be after early returns)
  const getInitials = (name: string) => {
    return name?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleOpenAuth = (auth: any) => {
    openTab({
      id: `auth-${auth._id}-${Date.now()}`,
      type: 'feature',
      title: auth.name,
      itemId: auth._id,
      data: { ...auth, componentType: 'auth', appName: currentApp?.app_name, version: selectedVersionTag },
    });
  };

  const handleOpenVariable = (variable: any, constant: boolean = false) => {
    if (constant) {
      setEditingConstant(variable);
      setShowCreateConstantModal(true);
    } else {
      setEditingVariable(variable);
      setShowCreateVariableModal(true);
    }
  };

  const handleOpenAction = (action: any) => {
    openTab({
      id: `action-${action.tag}-${Date.now()}`,
      type: 'request',
      title: action.name || action.tag,
      itemId: action.tag,
      data: {
        ...action,
        componentType: 'action',
        appName: currentApp?.app_name,
        appTag: currentApp?.tag,
        version: selectedVersionTag,
        envs: selectedVersion?.envs || [],
        variables: selectedVersion?.variables || [],
        constants: selectedVersion?.constants || [],
        auths: selectedVersion?.auths || [],
      },
    });
  };

  const handleIntegrateApp = () => {
    setShowIntegrationModal(true);
  };

  return (
    <div className="bg-grey-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* App Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-lg bg-green/10 flex items-center justify-center text-green text-xl font-semibold flex-shrink-0">
              {currentApp?.logo ? (
                <img
                  src={currentApp?.logo}
                  alt={currentApp?.app_name}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                getInitials(String(currentApp?.app_name))
              )}
            </div>

            {/* App Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-grey">{currentApp?.app_name}</h1>
                {currentApp?.status && (
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    currentApp?.status === 'active' ? 'bg-green/10 text-green' : 'bg-grey-400 text-grey-600'
                  )}>
                    {currentApp?.status}
                  </span>
                )}
                {/* App Type Badge */}
                <span className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1',
                  isInternalApp
                    ? 'bg-blue-500/10 text-blue-600'
                    : 'bg-orange-500/10 text-orange-600'
                )}>
                  {isInternalApp ? (
                    <>
                      <Building2 className="h-3 w-3" />
                      Internal
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-3 w-3" />
                      Third-party
                    </>
                  )}
                </span>
                {currentApp?.access_tag && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-primary">
                    {currentApp?.access_tag}
                  </span>
                )}
              </div>
              <p className="text-sm text-grey-600 mb-3">{currentApp?.tag}</p>
              {currentApp?.description && (
                <div className="text-grey-600 mb-4">
                  <MarkdownViewer content={currentApp?.description} />
                </div>
              )}

              {/* Version Selector */}
              {currentApp?.versions && currentApp?.versions.length > 0 && (
                <div className="flex items-center gap-3 mt-4">
                  <label className="text-sm font-medium text-grey-600">Version:</label>
                  <Select value={selectedVersionTag} onValueChange={setSelectedVersionTag}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentApp?.versions.map((version) => (
                        <SelectItem key={version.tag} value={version.tag}>
                          {version.tag} {version.latest && '(Latest)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Integration Actions */}
              {selectedVersion?.active && (
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    onClick={handleIntegrateApp}
                    className="gap-2"
                    size="sm"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Integrate
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showAppCreatedModal ? <AppCreatedModal
          app={currentApp}
          open={showAppCreatedModal}
          onOpenChange={setShowAppCreatedModal}
        /> : <></>}

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
                variant={activeFilter === 'actions' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('actions')}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Actions ({actionsCount})
              </Button>
              <Button
                variant={activeFilter === 'environments' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('environments')}
                className="gap-2"
              >
                <Settings2 className="h-4 w-4" />
                Environments ({envsCount})
              </Button>
              <Button
                variant={activeFilter === 'webhooks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('webhooks')}
                className="gap-2"
              >
                <Webhook className="h-4 w-4" />
                Webhooks ({webhooksCount})
              </Button>
              <Button
                variant={activeFilter === 'auths' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('auths')}
                className="gap-2"
              >
                <Key className="h-4 w-4" />
                Auth ({authsCount})
              </Button>
              <Button
                variant={activeFilter === 'variables' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('variables')}
                className="gap-2"
              >
                <FileCode className="h-4 w-4" />
                Variables ({variablesCount + constantsCount})
              </Button>
            </div>
          </div>
        </div>

        {/* App Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button
            onClick={() => setActiveFilter('actions')}
            className={cn(
              "bg-white rounded-lg border p-4 shadow-sm transition-colors hover:border-primary/50",
              activeFilter === 'actions' ? 'border-primary bg-primary/5' : 'border-grey-400'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{actionsCount}</p>
                <p className="text-sm text-grey-600">Actions</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveFilter('environments')}
            className={cn(
              "bg-white rounded-lg border p-4 shadow-sm transition-colors hover:border-primary/50",
              activeFilter === 'environments' ? 'border-primary bg-primary/5' : 'border-grey-400'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{envsCount}</p>
                <p className="text-sm text-grey-600">Environments</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveFilter('webhooks')}
            className={cn(
              "bg-white rounded-lg border p-4 shadow-sm transition-colors hover:border-primary/50",
              activeFilter === 'webhooks' ? 'border-primary bg-primary/5' : 'border-grey-400'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Webhook className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{webhooksCount}</p>
                <p className="text-sm text-grey-600">Webhooks</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveFilter('auths')}
            className={cn(
              "bg-white rounded-lg border p-4 shadow-sm transition-colors hover:border-primary/50",
              activeFilter === 'auths' ? 'border-primary bg-primary/5' : 'border-grey-400'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-yellow" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{authsCount}</p>
                <p className="text-sm text-grey-600">Auths</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveFilter('variables')}
            className={cn(
              "bg-white rounded-lg border p-4 shadow-sm transition-colors hover:border-primary/50",
              activeFilter === 'variables' ? 'border-primary bg-primary/5' : 'border-grey-400'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileCode className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{variablesCount + constantsCount}</p>
                <p className="text-sm text-grey-600">Variables</p>
              </div>
            </div>
          </button>
        </div>

        {/* Content Sections with Filtering */}
        {activeFilter === 'overview' && (
          <div className="space-y-6">
            {/* Show all sections in overview mode */}
            {renderEnvironmentsCard()}
            {renderWebhooksCard()}
            {renderAuthsCard()}
            {renderActionsCard()}
            {renderVariablesCard()}
          </div>
        )}

        {activeFilter === 'environments' && renderEnvironmentsCard()}
        {activeFilter === 'webhooks' && renderWebhooksCard()}
        {activeFilter === 'auths' && renderAuthsCard()}
        {activeFilter === 'actions' && renderActionsCard()}
        {activeFilter === 'variables' && renderVariablesCard()}
      </div>

      {showAppCreatedModal && (
        <AppCreatedModal
          app={currentApp}
          open={showAppCreatedModal}
          onOpenChange={setShowAppCreatedModal}
        />
      )}

      {/* Create Environment Modal */}
      <CreateAppEnvironmentModal
        open={showCreateEnvModal}
        onOpenChange={setShowCreateEnvModal}
        appTag={currentApp?.tag}
        appId={currentApp?._id}
      />

      {/* Update Environment Modal */}
      <UpdateAppEnvironmentModal
        open={showUpdateEnvModal}
        onOpenChange={(open) => {
          setShowUpdateEnvModal(open);
          if (!open) setEditingEnv(null);
        }}
        appTag={currentApp?.tag}
        environment={editingEnv}
        onSuccess={() => {
          setEditingEnv(null);
        }}
      />

      {/* Create Variable Modal */}
      <CreateVariableModal
        open={showCreateVariableModal}
        onOpenChange={(open) => {
          setShowCreateVariableModal(open);
          if (!open) setEditingVariable(null);
        }}
        appTag={currentApp?.tag}
        appId={currentApp?._id}
        variable={editingVariable}
      />

      {/* Create Constant Modal */}
      <CreateConstantModal
        open={showCreateConstantModal}
        onOpenChange={(open) => {
          setShowCreateConstantModal(open);
          if (!open) setEditingConstant(null);
        }}
        appTag={String(currentApp?.tag)}
        appId={String(currentApp?._id)}
        constant={editingConstant}
      />

      {/* Integration Modal */}
      {showIntegrationModal && currentApp && (
        <IntegrationProvider>
          <AppIntegrationModal
            app={{
              _id: currentApp._id,
              app_name: currentApp.app_name,
              domain_name: currentApp.tag,
              description: currentApp.description,
              logo: currentApp.logo,
              tag: currentApp.tag,
              versions: currentApp.versions || [],
              created_at: currentApp.created_at || new Date().toISOString(),
              updated_at: currentApp.updated_at || new Date().toISOString(),
            } as any}
            open={showIntegrationModal}
            onOpenChange={setShowIntegrationModal}
          />
        </IntegrationProvider>
      )}
    </div>
  );

  // Render functions for each section
  function renderEnvironmentsCard() {
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-grey-600" />
            <h2 className="text-lg font-semibold text-grey">Environments</h2>
            <span className="text-sm text-grey-600">({envsCount})</span>
          </div>
          {isInternalApp && (
            <Button
              size="sm"
              className="gap-2"
              variant="outline"
              onClick={() => setShowCreateEnvModal(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}
        </div>

        {selectedVersion?.envs && selectedVersion.envs.length > 0 ? (
          <div className="space-y-3">
            {selectedVersion.envs.map((env) => (
              <div
                key={env._id}
                className="flex items-center justify-between p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-grey">{env.env_name}</h3>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      env.active ? 'bg-green/10 text-green' : 'bg-grey-400 text-grey-600'
                    )}>
                      {env.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-grey-600">{env.slug}</p>
                  {env.base_url && (
                    <div className="flex items-center gap-1 mt-1">
                      <Globe className="h-3 w-3 text-grey-600" />
                      <p className="text-xs text-grey-600">{env.base_url}</p>
                    </div>
                  )}
                </div>
                {isInternalApp && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingEnv(env);
                      setShowUpdateEnvModal(true);
                    }}
                    className="ml-3"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Settings2 className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-sm text-grey-600 mb-2">No environments configured yet</p>
            <p className="text-xs text-grey-500">
              Add environments to organize your app's different deployment stages
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderWebhooksCard() {
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-grey-600" />
            <h2 className="text-lg font-semibold text-grey">Webhooks</h2>
            <span className="text-sm text-grey-600">({webhooksCount})</span>
          </div>
          {isInternalApp && (
            <Button 
              size="sm" 
              className="gap-2" 
              variant="outline"
              onClick={() => {
                openTab({
                  id: `new-webhook-${Date.now()}`,
                  type: 'webhook',
                  title: 'New Webhook',
                  data: { isNew: true, app: currentApp, product: null },
                  isDirty: true,
                });
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}
        </div>

        {selectedVersion?.webhooks && selectedVersion.webhooks.length > 0 ? (
          <div className="space-y-3">
            {selectedVersion.webhooks.map((webhook: any) => (
              <button
                key={webhook._id}
                onClick={() => {
                  openTab({
                    id: `webhook-${webhook._id}-${Date.now()}`,
                    type: 'webhook',
                    title: webhook.name || webhook.tag,
                    itemId: webhook._id,
                    data: { ...webhook, appName: currentApp?.app_name, version: selectedVersionTag },
                  });
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-grey">{webhook.name || webhook.tag}</h3>
                  <p className="text-xs text-grey-600">{webhook.url || webhook.tag}</p>
                </div>
                <Pencil className="h-4 w-4 text-grey-400" />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Webhook className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-sm text-grey-600 mb-2">No webhooks configured yet</p>
            <p className="text-xs text-grey-500">
              Add webhooks to receive real-time notifications from external services
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderAuthsCard() {
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-grey-600" />
            <h2 className="text-lg font-semibold text-grey">Authentication Methods</h2>
            <span className="text-sm text-grey-600">({authsCount})</span>
          </div>
          {isInternalApp && (
            <Button 
              size="sm" 
              className="gap-2" 
              variant="outline"
              onClick={() => {
                openTab({
                  id: `new-auth-${Date.now()}`,
                  type: 'auth',
                  title: 'New Authorization',
                  data: { 
                    isNew: true, 
                    app: currentApp, 
                    product: null,
                    actions: selectedVersion?.actions || [],
                    appId: currentApp?._id,
                    appTag: currentApp?.tag,
                    appName: currentApp?.app_name,
                    workspaceId: currentApp?.workspace_id,
                  },
                  isDirty: true,
                });
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}
        </div>

        {selectedVersion?.auths && selectedVersion.auths.length > 0 ? (
          <div className="space-y-3">
            {selectedVersion.auths.map((auth) => (
              <button
                key={auth._id}
                onClick={() => handleOpenAuth(auth)}
                className="w-full p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Key className="h-4 w-4 text-yellow" />
                  <h3 className="text-sm font-medium text-grey">{auth.name}</h3>
                </div>
                <p className="text-xs text-grey-600">{auth.tag}</p>
                {auth.description && (
                  <p className="text-xs text-grey-600 mt-1">{auth.description}</p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Key className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-sm text-grey-600 mb-2">No authentication methods configured yet</p>
            <p className="text-xs text-grey-500">
              Add authentication methods to secure your app's API endpoints
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderActionsCard() {
    return (
      <div className="bg-white rounded-lg border border-grey-400 shadow-sm overflow-hidden flex flex-col" style={actionsCount > 10 ? { height: '600px' } : { height: 'auto' }}>
        <div className="p-6 border-b border-grey-400">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Actions</h2>
              <span className="text-sm text-grey-600">({actionsCount})</span>
            </div>
            {isInternalApp && (
              <Button 
                size="sm" 
                className="gap-2" 
                variant="outline"
                onClick={() => {
                  openTab({
                    id: `new-action-${Date.now()}`,
                    type: 'request',
                    title: 'New Action',
                    data: {
                      isNew: true,
                      app: currentApp,
                      appId: currentApp?._id,
                      appTag: currentApp?.tag,
                      appName: currentApp?.app_name,
                      version: selectedVersionTag,
                      envs: selectedVersion?.envs || [],
                      variables: selectedVersion?.variables || [],
                      constants: selectedVersion?.constants || [],
                      auths: selectedVersion?.auths || [],
                    },
                    isDirty: true,
                  });
                }}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                placeholder="Search actions..."
                value={actionsSearch}
                onChange={(e) => setActionsSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {folderTree.length > 0 && (
              <Select
                value={selectedFolderId || 'all'}
                onValueChange={(value) => setSelectedFolderId(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span>{selectedFolderName}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Grid3x3 className="h-4 w-4" />
                      <span>All Actions</span>
                    </div>
                  </SelectItem>
                  {flattenedFolders.map(({ folder, level }) => (
                    <SelectItem key={folder._id} value={folder._id}>
                      <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 16}px` }}>
                        <Folder className="h-4 w-4 flex-shrink-0" />
                        <span>{folder.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {(actionsSearch || selectedFolderId) && (
            <button
              onClick={() => {
                setActionsSearch('');
                setSelectedFolderId(null);
              }}
              className="text-xs text-primary hover:underline mt-3"
            >
              Clear filters ({filteredActions.length} of {selectedVersion?.actions?.length || 0} shown)
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {filteredActions.length === 0 ? (
            <div className="text-center py-8 text-grey-600">
              <Zap className="h-12 w-12 mx-auto mb-4 text-grey-400" />
              <p className="text-sm">
                {actionsSearch || selectedFolderId ? 'No matching actions' : 'No actions configured'}
              </p>
     
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleOpenAction(action)}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {action.name || action.tag || `Action ${index + 1}`}
                    </p>
                    {action.method && (
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
                        action.method === 'GET' && 'bg-green/10 text-green',
                        action.method === 'POST' && 'bg-blue/10 text-blue',
                        action.method === 'PUT' && 'bg-orange-500/10 text-orange-500',
                        action.method === 'DELETE' && 'bg-red/10 text-red',
                        action.method === 'PATCH' && 'bg-purple-500/10 text-purple-500'
                      )}>
                        {action.method}
                      </span>
                    )}
                  </div>
                  {action.description && (
                    <p className="text-xs text-grey-600 line-clamp-2">
                      {action.description}
                    </p>
                  )}
                  {action.resource && (
                    <p className="text-xs text-grey-600 mt-1 font-mono truncate">
                      {action.resource}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderVariablesCard() {
    return (
      <div className="space-y-6">
        {/* Variables */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Variables</h2>
              <span className="text-sm text-grey-600">({variablesCount})</span>
            </div>
            {isInternalApp && (
              <Button 
                size="sm" 
                className="gap-2" 
                variant="outline"
                onClick={() => {
                  setEditingVariable(null);
                  setShowCreateVariableModal(true);
                }}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            )}
          </div>

          {selectedVersion?.variables && selectedVersion.variables.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedVersion.variables.map((variable) => (
                <button
                  key={variable._id}
                  onClick={() => handleOpenVariable(variable, false)}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileCode className="h-4 w-4 text-purple-500" />
                    <h3 className="text-sm font-medium text-grey">{variable.key}</h3>
                    {variable.required && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red/10 text-red">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-grey-600">{variable.type}</p>
                  {variable.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">{variable.description}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileCode className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No variables configured yet</p>
              <p className="text-xs text-grey-500">
                Add variables to store dynamic configuration values
              </p>

            </div>
          )}
        </div>

        {/* Constants */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Constants</h2>
              <span className="text-sm text-grey-600">({constantsCount})</span>
            </div>
            {isInternalApp && (
              <Button 
                size="sm" 
                className="gap-2" 
                variant="outline"
                onClick={() => {
                  setEditingConstant(null);
                  setShowCreateConstantModal(true);
                }}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            )}
          </div>

          {selectedVersion?.constants && selectedVersion.constants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedVersion.constants.map((constant) => (
                <button
                  key={constant._id}
                  onClick={() => handleOpenVariable(constant, true)}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileCode className="h-4 w-4 text-purple-500" />
                    <h3 className="text-sm font-medium text-grey">{constant.key}</h3>
                  </div>
                  <p className="text-xs text-grey-600">{constant.type}</p>
                  {constant.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">{constant.description}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileCode className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No constants configured yet</p>
              <p className="text-xs text-grey-500">
                Add constants to store fixed configuration values
              </p>

            </div>
          )}
        </div>
      </div>
    );
  }
}
