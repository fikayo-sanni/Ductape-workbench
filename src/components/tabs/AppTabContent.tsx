import { useState, useMemo } from 'react';
import { IApp } from '@/types/app';
import { Grid3x3, Zap, Settings2, Key, FileCode, Globe, Pencil, Search, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkbenchStore } from '@/stores/workbench-store';
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

interface AppTabContentProps {
  app: IApp;
}

export default function AppTabContent({ app }: AppTabContentProps) {
  const { openTab } = useWorkbenchStore();
  const [selectedVersionTag, setSelectedVersionTag] = useState<string>(
    app.versions?.find(v => v.latest)?.tag || app.versions?.[0]?.tag || ''
  );
  const [editingEnv, setEditingEnv] = useState<any | null>(null);
  const [editingVariable, setEditingVariable] = useState<any | null>(null);
  const [isConstant, setIsConstant] = useState(false);

  // Actions search and filter state
  const [actionsSearch, setActionsSearch] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const selectedVersion = app.versions?.find(v => v.tag === selectedVersionTag);
  const actionsCount = selectedVersion?.actions?.length || app.actions_count || 0;
  const envsCount = selectedVersion?.envs?.length || app.envs_count || 0;
  const authsCount = selectedVersion?.auths_count || 0;
  const variablesCount = selectedVersion?.variables_count || 0;
  const constantsCount = selectedVersion?.constants_count || 0;

  const handleOpenAuth = (auth: any) => {
    openTab({
      id: `auth-${auth._id}-${Date.now()}`,
      type: 'feature',
      title: auth.name,
      itemId: auth._id,
      data: { ...auth, componentType: 'auth', appName: app.app_name, version: selectedVersionTag },
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
        appName: app.app_name,
        appTag: app.tag,
        version: selectedVersionTag,
        envs: selectedVersion?.envs || [],
        variables: selectedVersion?.variables || [],
        constants: selectedVersion?.constants || [],
        auths: selectedVersion?.auths || [],
      },
    });
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
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* App Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-lg bg-green/10 flex items-center justify-center text-green text-xl font-semibold flex-shrink-0">
              {app.logo ? (
                <img
                  src={app.logo}
                  alt={app.app_name}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                getInitials(app.app_name)
              )}
            </div>

            {/* App Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-grey">{app.app_name}</h1>
                {app.status && (
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    app.status === 'active' ? 'bg-green/10 text-green' : 'bg-grey-400 text-grey-600'
                  )}>
                    {app.status}
                  </span>
                )}
                {app.access_tag && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-primary">
                    {app.access_tag}
                  </span>
                )}
              </div>
              <p className="text-sm text-grey-600 mb-3">{app.tag}</p>
              {app.description && (
                <p className="text-grey-600 mb-4">{app.description}</p>
              )}

              {/* Version Selector */}
              {app.versions && app.versions.length > 0 && (
                <div className="flex items-center gap-3 mt-4">
                  <label className="text-sm font-medium text-grey-600">Version:</label>
                  <Select value={selectedVersionTag} onValueChange={setSelectedVersionTag}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {app.versions.map((version) => (
                        <SelectItem key={version.tag} value={version.tag}>
                          {version.tag} {version.latest && '(Latest)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* App Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{actionsCount}</p>
                <p className="text-sm text-grey-600">Actions</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{envsCount}</p>
                <p className="text-sm text-grey-600">Environments</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-yellow" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{authsCount}</p>
                <p className="text-sm text-grey-600">Auths</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileCode className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{variablesCount + constantsCount}</p>
                <p className="text-sm text-grey-600">Variables</p>
              </div>
            </div>
          </div>
        </div>

        {/* Environments */}
        {selectedVersion?.envs && selectedVersion.envs.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Environments</h2>
            <div className="space-y-3">
              {selectedVersion.envs.map((env) => (
                <div
                  key={env._id}
                  className="flex items-center justify-between p-3 rounded-lg border border-grey-400"
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingEnv(env)}
                    className="ml-3"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auths */}
        {selectedVersion?.auths && selectedVersion.auths.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Authentication Methods</h2>
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
          </div>
        )}

        {/* Actions */}
        {selectedVersion?.actions && selectedVersion.actions.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-400 shadow-sm overflow-hidden flex flex-col" style={{ height: '600px' }}>
            {/* Header */}
            <div className="p-6 border-b border-grey-400">
              <h2 className="text-lg font-semibold text-grey mb-4">Actions</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
                  <Input
                    placeholder="Search actions..."
                    value={actionsSearch}
                    onChange={(e) => setActionsSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Folder Dropdown */}
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

              {/* Clear Filters Button */}
              {(actionsSearch || selectedFolderId) && (
                <button
                  onClick={() => {
                    setActionsSearch('');
                    setSelectedFolderId(null);
                  }}
                  className="text-xs text-primary hover:underline mt-3"
                >
                  Clear filters ({filteredActions.length} of {selectedVersion.actions.length} shown)
                </button>
              )}
            </div>

            {/* Actions List */}
            <div className="flex-1 overflow-auto p-4">
              {filteredActions.length === 0 ? (
                <div className="text-center py-8 text-grey-600 text-sm">
                  {actionsSearch || selectedFolderId ? 'No matching actions' : 'No actions in this folder'}
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
        )}

        {/* Variables */}
        {selectedVersion?.variables && selectedVersion.variables.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Variables</h2>
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
          </div>
        )}

        {/* Constants */}
        {selectedVersion?.constants && selectedVersion.constants.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Constants</h2>
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
          </div>
        )}

        {/* Empty State */}
        {(!selectedVersion ||
          (!selectedVersion.actions || selectedVersion.actions.length === 0) &&
          (!selectedVersion.envs || selectedVersion.envs.length === 0) &&
          (!selectedVersion.auths || selectedVersion.auths.length === 0) &&
          (!selectedVersion.variables || selectedVersion.variables.length === 0) &&
          (!selectedVersion.constants || selectedVersion.constants.length === 0)) && (
          <div className="bg-white rounded-lg border border-grey-400 p-12 shadow-sm text-center">
            <Grid3x3 className="h-12 w-12 text-grey-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-grey mb-2">No Version Data</h3>
            <p className="text-grey-600">
              This app doesn't have any version data yet. Configure environments, actions, and auth methods to get started.
            </p>
          </div>
        )}

        {/* Variable/Constant Edit Dialog */}
        <Dialog open={!!editingVariable} onOpenChange={(open) => !open && setEditingVariable(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {isConstant ? 'Constant' : 'Variable'}: {editingVariable?.key}
              </DialogTitle>
              <DialogDescription>
                {isConstant ? 'View constant details' : 'Update variable configuration'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Key</Label>
                <Input value={editingVariable?.key || ''} disabled className="mt-1" />
              </div>

              <div>
                <Label>Type</Label>
                <Input value={editingVariable?.type || ''} disabled className="mt-1" />
              </div>

              {editingVariable?.description && (
                <div>
                  <Label>Description</Label>
                  <Input value={editingVariable.description} disabled className="mt-1" />
                </div>
              )}

              {isConstant ? (
                <div>
                  <Label>Value</Label>
                  <Input value={editingVariable?.value || ''} disabled className="mt-1" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        Required
                        {editingVariable?.required && (
                          <span className="text-xs text-green">Yes</span>
                        )}
                      </Label>
                      <Input
                        value={editingVariable?.required ? 'Yes' : 'No'}
                        disabled
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Input value={editingVariable?.type || ''} disabled className="mt-1" />
                    </div>
                  </div>

                  {(editingVariable?.minlength || editingVariable?.maxlength) && (
                    <div className="grid grid-cols-2 gap-4">
                      {editingVariable?.minlength && (
                        <div>
                          <Label>Min Length</Label>
                          <Input value={editingVariable.minlength} disabled className="mt-1" />
                        </div>
                      )}
                      {editingVariable?.maxlength && (
                        <div>
                          <Label>Max Length</Label>
                          <Input value={editingVariable.maxlength} disabled className="mt-1" />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <Label>Default Value (Optional)</Label>
                    <Input
                      placeholder="Enter default value for this variable"
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-grey-400">
                <Button variant="outline" onClick={() => setEditingVariable(null)}>
                  {isConstant ? 'Close' : 'Cancel'}
                </Button>
                {!isConstant && (
                  <Button onClick={() => setEditingVariable(null)}>
                    Save Changes
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Environment Edit Modal */}
        <Dialog open={!!editingEnv} onOpenChange={(open) => !open && setEditingEnv(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Environment: {editingEnv?.env_name}</DialogTitle>
              <DialogDescription>
                Configure variables for the {editingEnv?.slug} environment
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Environment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Environment Name</Label>
                  <Input value={editingEnv?.env_name || ''} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={editingEnv?.slug || ''} disabled className="mt-1" />
                </div>
              </div>

              {editingEnv?.base_url && (
                <div>
                  <Label>Base URL</Label>
                  <Input value={editingEnv.base_url} disabled className="mt-1" />
                </div>
              )}

              {/* Variables Section */}
              {selectedVersion?.variables && selectedVersion.variables.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-grey mb-3">Environment Variables</h3>
                  <div className="space-y-3">
                    {selectedVersion.variables.map((variable) => (
                      <div key={variable._id} className="border border-grey-400 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor={`var-${variable._id}`} className="flex items-center gap-2">
                            {variable.key}
                            {variable.required && (
                              <span className="text-xs text-red">*</span>
                            )}
                          </Label>
                          <span className="text-xs text-grey-600">{variable.type}</span>
                        </div>
                        {variable.description && (
                          <p className="text-xs text-grey-600 mb-2">{variable.description}</p>
                        )}
                        <Input
                          id={`var-${variable._id}`}
                          type={variable.type === 'string' ? 'text' : 'text'}
                          placeholder={`Enter ${variable.key}`}
                          className="mt-1"
                        />
                        {(variable.minlength || variable.maxlength) && (
                          <p className="text-xs text-grey-600 mt-1">
                            {variable.minlength && `Min: ${variable.minlength}`}
                            {variable.minlength && variable.maxlength && ' | '}
                            {variable.maxlength && `Max: ${variable.maxlength}`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Constants Section (Read-only) */}
              {selectedVersion?.constants && selectedVersion.constants.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-grey mb-3">Constants (Read-only)</h3>
                  <div className="space-y-2">
                    {selectedVersion.constants.map((constant) => (
                      <div key={constant._id} className="flex items-center justify-between p-2 bg-grey-100 rounded">
                        <div>
                          <p className="text-sm font-medium text-grey">{constant.key}</p>
                          {constant.description && (
                            <p className="text-xs text-grey-600">{constant.description}</p>
                          )}
                        </div>
                        <code className="text-xs bg-white px-2 py-1 rounded border border-grey-400">
                          {constant.value}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-grey-400">
                <Button variant="outline" onClick={() => setEditingEnv(null)}>
                  Cancel
                </Button>
                <Button onClick={() => setEditingEnv(null)}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
