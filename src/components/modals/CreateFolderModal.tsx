import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Folder, Loader2 } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import appServices from '@/services/appServices';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface CreateFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appId?: string;
  version?: string;
  parentFolderId?: string | null;
  parentFolderName?: string;
  onSuccess?: () => void;
}

export default function CreateFolderModal({
  open,
  onOpenChange,
  appId,
  version,
  parentFolderId = null,
  parentFolderName,
  onSuccess,
}: CreateFolderModalProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const { updateTab, tabs } = useWorkbenchStore();

  const [folderName, setFolderName] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFolderName('');
    }
  }, [open]);

  const { mutate: createFolder, isPending: isCreating } = useMutation({
    mutationFn: async (name: string) => {
      if (!appId) throw new Error('App ID not found');
      if (!user?._id || !user?.public_key) throw new Error('User credentials not found');
      if (!currentWorkspaceId) throw new Error('Workspace ID not found');
      if (!name.trim()) throw new Error('Folder name is required');

      const payload: Record<string, unknown> = {
        component: 'folders',
        action: 'create',
        workspace_id: currentWorkspaceId,
        user_id: user._id,
        public_key: user.public_key,
        name: name.trim(),
        parent_id: parentFolderId,
        version,
      };

      return appServices.updateApp({
        app_id: appId,
        user_id: user._id,
        public_key: user.public_key,
        payload,
      });
    },
    onSuccess: async (response) => {
      // The updateApp response contains the updated app data
      const updatedApp = response?.data;

      if (updatedApp) {
        // Update the query cache directly with the new data
        queryClient.setQueryData(['app', appId], { data: updatedApp });

        // Also find and update the app tab with fresh data
        const appTab = tabs.find(t => t.type === 'app' && t.itemId === appId);
        if (appTab) {
          updateTab(appTab.id, { data: updatedApp });
        }
      }

      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['app', appId] });

      toast.success('Folder created successfully!');
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error
        ? error.message
        : (error as { response?: { data?: { errors?: string } } })?.response?.data?.errors || 'Failed to create folder';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      createFolder(folderName);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            {parentFolderId ? 'Create Subfolder' : 'Create Folder'}
          </DialogTitle>
          <DialogDescription>
            {parentFolderId
              ? `Create a new subfolder inside "${parentFolderName || 'folder'}".`
              : 'Create a new folder to organize your actions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !folderName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Folder'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
