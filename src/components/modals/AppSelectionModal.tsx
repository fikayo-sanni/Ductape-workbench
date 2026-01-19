import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Grid3x3, Search, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IApp } from '@/types/app';
import appServicesReal from '@/services/appServicesReal';

interface AppSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (appId: string, app?: any) => void;
  onCreateNew: () => void;
  productId?: string; // Make optional since requests don't need product
  title?: string;
  description?: string;
}

export default function AppSelectionModal({
  open,
  onClose,
  onSelect,
  onCreateNew,
  productId,
  title = 'Select or Create App',
  description = 'Choose an existing app or create a new one',
}: AppSelectionModalProps) {
  const { user, currentWorkspaceId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch apps
  const { data: appsData, isLoading } = useQuery({
    queryKey: ['apps', currentWorkspaceId, open],
    queryFn: () =>
      appServicesReal.fetchApps({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    // Always enabled when modal is open
    enabled: open,
  });

  const apps = appsData?.data || [];

  // Filter apps by product (if productId provided) or show all workspace apps
  const relevantApps = productId 
    ? apps.filter((app: IApp) => app.workspace_id === productId)
    : apps; // Show all workspace apps when no productId (for requests)
    
  const filteredApps = relevantApps.filter((app: IApp) =>
    app.app_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="px-6 pt-6 pb-4 border-b border-grey-400">
          <DialogHeader>
            <DialogTitle className='text-grey'>{title}</DialogTitle>
            {description && (
              <p className="text-sm text-grey-600 mt-1">{description}</p>
            )}
          </DialogHeader>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Create New App Button */}
          <Button
            onClick={onCreateNew}
            className="w-full bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New App
          </Button>

          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-grey-400" />
            <span className="text-xs text-grey-600">OR SELECT EXISTING</span>
            <div className="flex-1 h-px bg-grey-400" />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-grey-600" />
            <Input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Apps List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="text-center py-8 text-grey-600">
                <Grid3x3 className="h-12 w-12 mx-auto mb-2 text-grey-400" />
                <p className="text-sm">
                  {relevantApps.length === 0
                    ? productId
                      ? 'No apps in this product yet'
                      : 'No apps in this workspace yet'
                    : 'No apps found'}
                </p>
              </div>
            ) : (
              filteredApps.map((app: IApp) => (
                <div
                  key={app._id}
                  onClick={() => onSelect(app._id, app)}
                  className={cn(
                    'p-4 rounded-lg border border-grey-400 cursor-pointer hover:border-primary hover:shadow-md transition-all',
                    'flex items-start gap-3'
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center flex-shrink-0">
                    <Grid3x3 className="h-5 w-5 text-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-grey mb-1">
                      {app.app_name}
                    </h4>
                    {app.description && (
                      <p className="text-xs text-grey-600 line-clamp-2">
                        {app.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          app.status === 'active'
                            ? 'bg-green/10 text-green'
                            : 'bg-grey-400 text-grey-600'
                        )}
                      >
                        {app.status || 'active'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions - Fixed Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-grey-400 bg-grey-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
