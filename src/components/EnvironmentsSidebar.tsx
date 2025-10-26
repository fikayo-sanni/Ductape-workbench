import { useState } from 'react';
import { useAuth } from '@/store/useAuth';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, Settings2, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IEnvironment } from '@/types/environment';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import workspaceServices from '@/services/workspaceServices';
import CreateWorkspaceEnvironmentModal from '@/components/modals/CreateWorkspaceEnvironmentModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export default function EnvironmentsSidebar() {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEnv, setEditingEnv] = useState<IEnvironment | null>(null);
  const [envToDelete, setEnvToDelete] = useState<IEnvironment | null>(null);

  // Get current workspace environments from user
  const currentWorkspace = user?.workspaces?.find(w => w.workspace_id === currentWorkspaceId);
  const environments: IEnvironment[] = (currentWorkspace?.defaultEnvs || []).map((env: any, idx) => ({
    env_name: env.env_name,
    slug: env.slug,
    description: env.description || '',
    _id: env._id || env.slug || `env-${idx}`, // Keep existing _id if available
  }));

  const filteredEnvironments = environments.filter(env => {
    if (!searchQuery) return true;
    return (
      env.env_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      env.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Delete environment mutation
  const { mutate: deleteEnvironment, isPending: isDeleting } = useMutation({
    mutationFn: async (slug: string) => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key) {
        throw new Error('Missing workspace or user information');
      }

      const updatedEnvs = environments.filter(env => env.slug !== slug);

      await workspaceServices.updateWorkspaceEnvs({
        workspace_id: currentWorkspaceId,
        payload: {
          user_id: user._id,
          public_key: user.public_key,
          envs: updatedEnvs,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Environment deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete environment');
    },
  });

  const handleDeleteEnv = (env: IEnvironment) => {
    setEnvToDelete(env);
  };

  const confirmDelete = () => {
    if (envToDelete) {
      deleteEnvironment(envToDelete.slug);
    }
  };

  const handleEditEnv = (env: IEnvironment) => {
    setEditingEnv(env);
    setShowCreateModal(true);
  };

  const handleAddEnv = () => {
    setEditingEnv(null);
    setShowCreateModal(true);
  };


  return (
    <div className="h-full flex flex-col bg-white border-r border-grey-400">
      {/* Header */}
      <div className="p-4 border-b border-grey-400">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-grey">Environments</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddEnv}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <p className="text-xs text-grey-600">
          Manage your workspace environments
        </p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-grey-400">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
          <Input
            placeholder="Search environments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Environments List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredEnvironments.length === 0 ? (
          <div className="text-center py-8 text-grey-600 text-sm">
            {searchQuery ? 'No matching environments' : 'No environments yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEnvironments.map((env: IEnvironment) => (
              <div
                key={env._id}
                className={cn(
                  'p-3 rounded-lg border border-grey-400 cursor-pointer hover:border-primary transition-colors',
                  selectedEnvId === env._id && 'border-primary bg-blue-400'
                )}
                onClick={() => setSelectedEnvId(env._id)}
              >
                {/* Environment Header */}
                <div className="flex items-start gap-3 mb-2">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    <Settings2 className="h-5 w-5" />
                  </div>

                  {/* Environment Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-grey truncate">
                      {env.env_name}
                    </h3>
                    <p className="text-xs text-grey-600 truncate">{env.slug}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditEnv(env);
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEnv(env);
                      }}
                      className="h-7 w-7 p-0 text-red hover:text-red"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Description */}
                {env.description && (
                  <p className="text-xs text-grey-600 mt-2 line-clamp-2">
                    {env.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Environment Modal */}
      <CreateWorkspaceEnvironmentModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        editingEnv={editingEnv}
        environments={environments}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!envToDelete} onOpenChange={(open) => !open && setEnvToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red" />
              </div>
              <div>
                <DialogTitle>Delete Environment</DialogTitle>
                <DialogDescription>
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-grey-600">
              Are you sure you want to delete <strong>{envToDelete?.env_name}</strong> ({envToDelete?.slug})?
              This will remove the environment from your workspace.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEnvToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Environment
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
