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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IntegrationProvider } from '@/context/integration-context';
import AppIntegrationModal from '@/components/marketplace/AppIntegrationModal';
import AppCreatedModal from '@/components/modals/AppCreatedModal';
import { useQuery } from '@tanstack/react-query';
import appServices from '@/services/appServices';

interface AppTabContentProps {
  app: IApp;
}

export default function AppTabContent({ app }: AppTabContentProps) {
  const { openTab } = useWorkbenchStore();
  const { currentWorkspaceId, user } = useAuth();
  const [selectedVersionTag, setSelectedVersionTag] = useState<string>(
    app.versions?.find(v => v.latest)?.tag || app.versions?.[0]?.tag || ''
  );
  const [editingEnv, setEditingEnv] = useState<any | null>(null);
  const [editingVariable, setEditingVariable] = useState<any | null>(null);
  const [isConstant, setIsConstant] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [showAppCreatedModal, setShowAppCreatedModal] = useState(false);

  // Actions search and filter state
  const [actionsSearch, setActionsSearch] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Content filter state
  const [activeFilter, setActiveFilter] = useState<string>('overview');

  // Determine if app is internal or third-party
  const isInternalApp = app.workspace_id === currentWorkspaceId;

  // Fetch app details if it's a marketplace app
  const { data: appDetails } = useQuery({
    queryKey: ['app', app._id, app.tag],
    queryFn: () => appServices.fetchApp({
      app_id: app._id,
      user_id: user?._id || '',
      public_key: user?.public_key || '',
    }),
    enabled: !isInternalApp && !!app._id,
  });

  // Use fetched app details if available, otherwise use the passed app
  const currentApp = appDetails?.data || app;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const selectedVersion = currentApp.versions?.find(v => v.tag === selectedVersionTag) ||
    (currentApp.versions && currentApp.versions.length > 0 ?
      (currentApp.versions.find(v => v.latest) || currentApp.versions[0]) :
      null);

  const actionsCount = selectedVersion?.actions?.length || currentApp.actions_count || 0;
  const envsCount = selectedVersion?.envs?.length || currentApp.envs_count || 0;
  const authsCount = selectedVersion?.auths_count || 0;
  const variablesCount = selectedVersion?.variables_count || 0;
  const constantsCount = selectedVersion?.constants_count || 0;
  const webhooksCount = selectedVersion?.webhooks?.length || (currentApp as any).webhooks_count || 0;

  // Auto-select latest version when app data changes
  useEffect(() => {
    if (currentApp.versions && currentApp.versions.length > 0) {
      // Find the latest version
      const latestVersion = currentApp.versions.find(v => v.latest) || currentApp.versions[0];
      if (latestVersion && latestVersion.tag !== selectedVersionTag) {
        setSelectedVersionTag(latestVersion.tag);
      }
    }
  }, [currentApp.versions, selectedVersionTag]);

  // Show AppCreatedModal for internal apps with no actions
  useEffect(() => {
    const hasActions = (selectedVersion?.actions && selectedVersion.actions.length > 0) ||
      (currentApp.actions_count && currentApp.actions_count > 0);

    if (isInternalApp && selectedVersion && !hasActions) {
      setShowAppCreatedModal(true);
    }
  }, [isInternalApp, selectedVersion, currentApp.actions_count]);

  const handleOpenAuth = (auth: any) => {
    openTab({
      id: `auth-${auth._id}-${Date.now()}`,
      type: 'feature',
      title: auth.name,
      itemId: auth._id,
      data: { ...auth, componentType: 'auth', appName: currentApp.app_name, version: selectedVersionTag },
    });
  };

  const handleOpenVariable = (variable: any, constant: boolean = false) => {
    setEditingVariable(variable);
    setIsConstant(constant);
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
        appName: currentApp.app_name,
        appTag: currentApp.tag,
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

  return (
    <div className="bg-grey-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* App Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-lg bg-green/10 flex items-center justify-center text-green text-xl font-semibold flex-shrink-0">
              {currentApp.logo ? (
                <img
                  src={currentApp.logo}
                  alt={currentApp.app_name}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                getInitials(currentApp.app_name)
              )}
            </div>

            {/* App Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-grey">{currentApp.app_name}</h1>
                {currentApp.status && (
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    currentApp.status === 'active' ? 'bg-green/10 text-green' : 'bg-grey-400 text-grey-600'
                  )}>
                    {currentApp.status}
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
                {currentApp.access_tag && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-primary">
                    {currentApp.access_tag}
                  </span>
                )}
              </div>
              <p className="text-sm text-grey-600 mb-3">{currentApp.tag}</p>
              {currentApp.description && (
                <p className="text-grey-600 mb-4">{currentApp.description}</p>
              )}

              {/* Version Selector */}
              {currentApp.versions && currentApp.versions.length > 0 && (
                <div className="flex items-center gap-3 mt-4">
                  <label className="text-sm font-medium text-grey-600">Version:</label>
                  <Select value={selectedVersionTag} onValueChange={setSelectedVersionTag}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentApp.versions.map((version) => (
                        <SelectItem key={version.tag} value={version.tag}>
                          {version.tag} {version.latest && '(Latest)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Integration Actions */}
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
            <Button size="sm" className="gap-2" variant="outline">
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
                    onClick={() => setEditingEnv(env)}
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
            {isInternalApp && (
              <Button size="sm" className="mt-2" variant="outline">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            )}
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
            <Button size="sm" className="gap-2" variant="outline">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}
        </div>

        {selectedVersion?.webhooks && selectedVersion.webhooks.length > 0 ? (
          <div className="space-y-3">
            {selectedVersion.webhooks.map((webhook: any) => (
              <div
                key={webhook._id}
                className="flex items-center justify-between p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-grey">{webhook.name || webhook.tag}</h3>
                  <p className="text-xs text-grey-600">{webhook.url}</p>
                </div>
                {isInternalApp && (
                  <Button variant="ghost" size="sm">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Webhook className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-sm text-grey-600 mb-2">No webhooks configured yet</p>
            <p className="text-xs text-grey-500">
              Add webhooks to receive real-time notifications from external services
            </p>
            {isInternalApp && (
              <Button size="sm" className="mt-2" variant="outline">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            )}
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
            <Button size="sm" className="gap-2" variant="outline">
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
            {isInternalApp && (
              <Button size="sm" className="mt-2" variant="outline">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            )}
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
              <Button size="sm" className="gap-2" variant="outline">
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
              {isInternalApp && !actionsSearch && !selectedFolderId && (
                <Button size="sm" className="mt-2" variant="outline">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              )}
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
              <Button size="sm" className="gap-2" variant="outline">
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
              {isInternalApp && (
                <Button size="sm" className="mt-2" variant="outline">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              )}
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
              <Button size="sm" className="gap-2" variant="outline">
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
              {isInternalApp && (
                <Button size="sm" className="mt-2" variant="outline">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Remove the old content sections and replace with the new structure
  return (
    <div className="bg-grey-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* App Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-lg bg-green/10 flex items-center justify-center text-green text-xl font-semibold flex-shrink-0">
              {currentApp.logo ? (
                <img
                  src={currentApp.logo}
                  alt={currentApp.app_name}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                getInitials(currentApp.app_name)
              )}
            </div>

            {/* App Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-grey">{currentApp.app_name}</h1>
                {currentApp.status && (
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    currentApp.status === 'active' ? 'bg-green/10 text-green' : 'bg-grey-400 text-grey-600'
                  )}>
                    {currentApp.status}
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
                {currentApp.access_tag && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-primary">
                    {currentApp.access_tag}
                  </span>
                )}
              </div>
              <p className="text-sm text-grey-600 mb-3">{currentApp.tag}</p>
              {currentApp.description && (
                <p className="text-grey-600 mb-4">{currentApp.description}</p>
              )}

              {/* Version Selector */}
              {currentApp.versions && currentApp.versions.length > 0 && (
                <div className="flex items-center gap-3 mt-4">
                  <label className="text-sm font-medium text-grey-600">Version:</label>
                  <Select value={selectedVersionTag} onValueChange={setSelectedVersionTag}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentApp.versions.map((version) => (
                        <SelectItem key={version.tag} value={version.tag}>
                          {version.tag} {version.latest && '(Latest)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Integration Actions */}
              <div className="flex items-center gap-3 mt-4">
                <Button
                  onClick={handleIntegrateApp}
                  className="gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Integrate App
                </Button>
              </div>
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
    </div>
  );

  // Environment Edit Dialog
  if (editingEnv) {
    return (
      <Dialog open={!!editingEnv} onOpenChange={() => setEditingEnv(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Environment</DialogTitle>
            <DialogDescription>
              Update the environment configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="env_name">Environment Name</Label>
              <Input
                id="env_name"
                value={editingEnv.env_name || ''}
                onChange={(e) => setEditingEnv({ ...editingEnv, env_name: e.target.value })}
                placeholder="e.g., Development"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug (3 characters)</Label>
              <Input
                id="slug"
                value={editingEnv.slug || ''}
                disabled
                placeholder="e.g., DEV"
                className="bg-grey-100"
              />
              <p className="text-xs text-grey-600 mt-1">Slug cannot be changed</p>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editingEnv.description || ''}
                onChange={(e) => setEditingEnv({ ...editingEnv, description: e.target.value })}
                placeholder="Environment description"
              />
            </div>
            <div>
              <Label htmlFor="base_url">Base URL</Label>
              <Input
                id="base_url"
                value={editingEnv.base_url || ''}
                onChange={(e) => setEditingEnv({ ...editingEnv, base_url: e.target.value })}
                placeholder="https://api.example.com"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={editingEnv.active || false}
                onChange={(e) => setEditingEnv({ ...editingEnv, active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="active">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="whitelist"
                checked={editingEnv.whitelist || false}
                onChange={(e) => setEditingEnv({ ...editingEnv, whitelist: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="whitelist">Whitelist</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingEnv(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // TODO: Implement environment update
                console.log('Update environment:', editingEnv);
                setEditingEnv(null);
              }}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Variable Edit Dialog
  if (editingVariable) {
    return (
      <Dialog open={!!editingVariable} onOpenChange={() => setEditingVariable(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isConstant ? 'Edit Constant' : 'Edit Variable'}</DialogTitle>
            <DialogDescription>
              Update the {isConstant ? 'constant' : 'variable'} configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={editingVariable.key || ''}
                onChange={(e) => setEditingVariable({ ...editingVariable, key: e.target.value })}
                placeholder="e.g., API_KEY"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={editingVariable.type || 'string'}
                onValueChange={(value) => setEditingVariable({ ...editingVariable, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                  <SelectItem value="object">Object</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editingVariable.description || ''}
                onChange={(e) => setEditingVariable({ ...editingVariable, description: e.target.value })}
                placeholder="Variable description"
              />
            </div>
            {!isConstant && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={editingVariable.required || false}
                  onChange={(e) => setEditingVariable({ ...editingVariable, required: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="required">Required</Label>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingVariable(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // TODO: Implement variable/constant update
                console.log('Update variable/constant:', editingVariable);
                setEditingVariable(null);
              }}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Integration Modal
  if (showIntegrationModal) {
    const marketplaceApp = {
      _id: currentApp._id,
      app_name: currentApp.app_name,
      domain_name: currentApp.domains?.[0] || currentApp.app_name.toLowerCase().replace(/\s+/g, '-'),
      description: currentApp.description,
      logo: currentApp.logo,
      versions: (currentApp.versions || []).map((v: any) => ({
        _id: v._id || v.tag,
        version: v.tag,
        latest: v.latest || false,
        created_at: v.created_at || new Date().toISOString(),
      })),
      created_at: currentApp.created_at || new Date().toISOString(),
      updated_at: currentApp.updated_at || new Date().toISOString(),
    };

    return (
      <IntegrationProvider>
        <AppIntegrationModal
          app={marketplaceApp as any}
          open={showIntegrationModal}
          onOpenChange={setShowIntegrationModal}
        />
      </IntegrationProvider>
    );
  }

  // AppCreatedModal for internal apps with no actions
  if (showAppCreatedModal) {
    return (
      <AppCreatedModal
        app={currentApp}
        open={showAppCreatedModal}
        onOpenChange={setShowAppCreatedModal}
      />
    );
  }
}
