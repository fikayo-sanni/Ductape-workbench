import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import appServices from '@/services/appServices';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Loader2,
  Grid3x3,
} from 'lucide-react';

interface InternalAppSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppSelected: (app: any) => void;
  product?: any; // Add product context
}

export default function InternalAppSelectionModal({ 
  open, 
  onOpenChange, 
  onAppSelected,
  product
}: InternalAppSelectionModalProps) {
  const { user, currentWorkspaceId } = useAuth();
  const { openTab } = useWorkbenchStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch workspace apps
  const { data: appsData, status: appsStatus } = useQuery({
    queryKey: ['workspace-apps', currentWorkspaceId],
    queryFn: () =>
      appServices.fetchApps({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
        status: 'all',
      }),
    enabled: !!user?._id && !!user?.public_key && !!currentWorkspaceId,
  });

  const apps = appsData?.data || [];
  const filteredApps = apps.filter((app: any) =>
    // Exclude draft apps
    app.status !== 'draft' &&
    (app.app_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.tag?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAppSelect = (app: any) => {
    onAppSelected(app);
    onOpenChange(false);
  };

  const handleCreateNewApp = () => {
    // Open a new app tab with product context
    const appTabId = `app-${Date.now()}`;
    openTab({
      id: appTabId,
      type: 'app',
      title: 'New App',
      data: { 
        isNew: true,
        productId: product?._id,
        productName: product?.name,
        productTag: product?.tag,
        productLogo: product?.logo,
        productEnvs: product?.envs || []
      },
      isDirty: true,
    });

    onOpenChange(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Grid3x3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className='text-grey'>Select Internal App</DialogTitle>
              <DialogDescription>
                Choose an existing app from your workspace or create a new one
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Create New App Button */}
          <Button
            onClick={handleCreateNewApp}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New App
          </Button>

          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-grey-400" />
            <span className="text-xs text-grey-600">OR SELECT EXISTING</span>
            <div className="flex-1 h-px bg-grey-400" />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-grey-400" />
            <Input
              placeholder="Search apps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Apps List */}
          <div className="space-y-3">
            {appsStatus === 'pending' ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-grey-600">Loading apps...</span>
              </div>
            ) : filteredApps.length > 0 ? (
              filteredApps.map((app: any) => (
                <div
                  key={app._id}
                  onClick={() => handleAppSelect(app)}
                  className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {app.logo ? (
                        <img
                          src={app.logo}
                          alt={app.app_name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold text-sm">
                          {getInitials(app.app_name || 'A')}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-grey truncate">
                        {app.app_name || app.name}
                      </h3>
                      <p className="text-sm text-grey-600 truncate">
                        {app.tag || app.app_tag}
                      </p>
                      {app.description && (
                        <p className="text-xs text-grey-500 mt-1 line-clamp-2">
                          {app.description}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      Select
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Grid3x3 className="h-12 w-12 text-grey-400 mx-auto mb-3" />
                <p className="text-sm text-grey-600 mb-2">No apps found</p>
                <p className="text-xs text-grey-500">
                  {searchTerm ? 'Try adjusting your search terms' : 'Create your first app to get started'}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
