import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Input } from './ui/input';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IApp } from '@/types/app';
import appServicesReal from '@/services/appServicesReal';
import toast from 'react-hot-toast';

export default function AppsSidebar() {
  const { user, currentWorkspaceId } = useAuth();
  const { openTab } = useWorkbenchStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [loadingAppTag, setLoadingAppTag] = useState<string | null>(null);

  // Mutation to fetch full app data by tag
  const { mutate: fetchFullApp } = useMutation({
    mutationFn: (params: { tag: string; user_id: string; public_key: string }) =>
      appServicesReal.fetchAppByTag(params),
    onSuccess: (response) => {
      const fullApp = response.data;
      setSelectedAppId(fullApp._id);
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

  const handleAppClick = (app: IApp) => {
    // Set loading state
    setLoadingAppTag(app.tag);

    // Fetch full app data by tag
    fetchFullApp({
      tag: app.tag,
      user_id: user?._id || '',
      public_key: user?.public_key || '',
    });
  };

  // Fetch apps
  const { data: appsData, isLoading } = useQuery({
    queryKey: ['apps', currentWorkspaceId],
    queryFn: () =>
      appServicesReal.fetchApps({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    // Always enabled
    enabled: true,
  });

  const apps = appsData?.data || [];

  // Split apps into workspace and third-party
  const workspaceApps = apps.filter((app: IApp) => !app.access_tag || app.access_tag === 'workspace');
  const thirdPartyApps = apps.filter((app: IApp) => app.access_tag === 'third-party' || app.access_tag === 'public');

  const filteredWorkspaceApps = workspaceApps.filter((app: IApp) => {
    if (!searchQuery) return true;
    return (
      app.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredThirdPartyApps = thirdPartyApps.filter((app: IApp) => {
    if (!searchQuery) return true;
    return (
      app.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      public: 'bg-green text-white',
      private: 'bg-yellow text-white',
      draft: 'bg-grey-400 text-grey',
    };
    return colors[status?.toLowerCase()] || 'bg-grey-400 text-grey';
  };

  const renderAppCard = (app: IApp) => {
    const isLoadingThisApp = loadingAppTag === app.tag;

    return (
      <div
        key={app._id}
        className={cn(
          'group p-2 rounded-md border border-grey-400 hover:border-primary hover:bg-grey-100 transition-colors flex items-center gap-2',
          selectedAppId === app._id && 'border-primary bg-blue-400',
          isLoadingThisApp && 'opacity-70 cursor-wait'
        )}
      >
        {/* Logo or Initials */}
        <div
          onClick={() => !isLoadingThisApp && handleAppClick(app)}
          className={cn(
            'w-8 h-8 rounded-md bg-green/10 flex items-center justify-center text-green text-xs font-semibold flex-shrink-0',
            !isLoadingThisApp && 'cursor-pointer'
          )}
        >
          {isLoadingThisApp ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : app.logo ? (
            <img
              src={app.logo}
              alt={app.app_name}
              className="w-full h-full rounded-md object-cover"
            />
          ) : (
            getInitials(app.app_name)
          )}
        </div>

        {/* App Info */}
        <div
          onClick={() => !isLoadingThisApp && handleAppClick(app)}
          className={cn(
            'flex-1 min-w-0',
            !isLoadingThisApp && 'cursor-pointer'
          )}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-grey truncate">
              {app.app_name}
            </h3>
            {app.status && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0',
                  getStatusColor(app.status)
                )}
              >
                {app.status}
              </span>
            )}
          </div>
          <p className="text-xs text-grey-600 truncate">{app.tag}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-grey-400">
      {/* Header */}
      <div className="p-4 border-b border-grey-400">
        <h2 className="text-lg font-semibold text-grey mb-2">Apps</h2>
        <p className="text-xs text-grey-600">
          Manage your workspace applications
        </p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-grey-400">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
          <Input
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Apps List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredWorkspaceApps.length === 0 && filteredThirdPartyApps.length === 0 ? (
          <div className="text-center py-8 text-grey-600 text-sm">
            {searchQuery ? 'No matching apps' : 'No apps yet'}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Workspace Apps Section */}
            {filteredWorkspaceApps.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-grey-100 border-b border-grey-400">
                  <h3 className="text-xs font-semibold text-grey-600 uppercase">
                    Internal
                  </h3>
                </div>
                <div className="p-4 space-y-1">
                  {filteredWorkspaceApps.map((app: IApp) => renderAppCard(app))}
                </div>
              </div>
            )}

            {/* Third Party Apps Section */}
            {filteredThirdPartyApps.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-grey-100 border-b border-grey-400">
                  <h3 className="text-xs font-semibold text-grey-600 uppercase">
                    Third Party
                  </h3>
                </div>
                <div className="p-4 space-y-1">
                  {filteredThirdPartyApps.map((app: IApp) => renderAppCard(app))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
