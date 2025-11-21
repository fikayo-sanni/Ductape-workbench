import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Settings2, Loader2, Search, AlertCircle } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import appServices from '@/services/appServices';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { cn } from '@/lib/utils';

interface CreateSharedVariableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appId?: string;
  actions?: any[];
  onSuccess?: () => void;
}

export default function CreateSharedVariableModal({
  open,
  onOpenChange,
  appId,
  actions = [],
  onSuccess,
}: CreateSharedVariableModalProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const { updateTab, tabs } = useWorkbenchStore();

  const [variableType, setVariableType] = useState<'query' | 'headers'>('query');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setVariableType('query');
      setKey('');
      setValue('');
      setSelectedActions(new Set());
      setSearchTerm('');
    }
  }, [open]);

  // Filter actions by search term
  const filteredActions = actions.filter(action =>
    action.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleAction = (actionTag: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionTag)) {
      newSelected.delete(actionTag);
    } else {
      newSelected.add(actionTag);
    }
    setSelectedActions(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedActions.size === filteredActions.length) {
      setSelectedActions(new Set());
    } else {
      setSelectedActions(new Set(filteredActions.map(a => a.tag)));
    }
  };

  const { mutate: createSharedVariable, isPending } = useMutation({
    mutationFn: async () => {
      if (!appId) throw new Error('App ID not found');
      if (!user?._id || !user?.public_key) throw new Error('User credentials not found');
      if (!currentWorkspaceId) throw new Error('Workspace ID not found');
      if (!key.trim()) throw new Error('Key is required');
      if (selectedActions.size === 0) throw new Error('Please select at least one action');

      const payload = {
        component: 'action_bulk',
        action: 'update_multiple_shared_variable',
        workspace_id: currentWorkspaceId,
        user_id: user._id,
        public_key: user.public_key,
        variable_type: variableType,
        variable_key: key,
        variable_value: value,
        action_tags: Array.from(selectedActions),
      };

      return appServices.updateApp({
        app_id: appId,
        user_id: user._id,
        public_key: user.public_key,
        payload,
      });
    },
    onSuccess: async () => {
      toast.success(`Shared ${variableType === 'query' ? 'query parameter' : 'header'} added to ${selectedActions.size} action(s)!`);

      // Invalidate queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['app', appId] });

      // Fetch fresh app data and update the tab immediately
      try {
        const response = await appServices.fetchApp({
          app_id: String(appId),
          user_id: user?._id || '',
          public_key: user?.public_key || '',
        });
        const updatedApp = response.data;

        // Find and update the app tab with fresh data
        const appTab = tabs.find(t => t.type === 'app' && t.itemId === appId);
        if (appTab) {
          updateTab(appTab.id, { data: updatedApp });
        }

        // Call parent onSuccess callback if provided
        onSuccess?.();
      } catch (error) {
        console.error('Failed to fetch updated app data:', error);
        toast.error('Shared variable added but failed to refresh app data');
      }

      // Close modal
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.errors || error.message || 'Failed to create shared variable');
    },
  });

  const handleSubmit = () => {
    if (!key.trim()) {
      toast.error('Please enter a key');
      return;
    }

    if (selectedActions.size === 0) {
      toast.error('Please select at least one action');
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    createSharedVariable();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className='text-grey'>Add Shared Variable</DialogTitle>
              <DialogDescription>
                Add a query parameter or header to multiple actions at once
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4 flex-1 overflow-y-auto">
          {/* Variable Type */}
          <div>
            <Label htmlFor="variableType" className="required">
              Variable Type
            </Label>
            <Select
              value={variableType}
              onValueChange={(value: 'query' | 'headers') => setVariableType(value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="query">Query</SelectItem>
                <SelectItem value="headers">Header</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-grey-600 mt-1">
              {variableType === 'query' ? 'URL query parameters (e.g., ?key=value)' : 'HTTP request headers'}
            </p>
          </div>

          {/* Key */}
          <div>
            <Label htmlFor="key" className="required">
              Key
            </Label>
            <Input
              id="key"
              placeholder={variableType === 'query' ? 'e.g., page, limit' : 'e.g., Authorization, Content-Type'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="mt-2"
              autoFocus
            />
          </div>

          {/* Value */}
          <div>
            <Label htmlFor="value">
              Sample Value
            </Label>
            <Input
              id="value"
              placeholder="e.g., 1, application/json"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-grey-600 mt-1">
              Leave empty to use variables or set dynamically
            </p>
          </div>

          {/* Actions Selection */}
          <div className="border border-grey-400 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="required">Select Actions ({selectedActions.size} of {filteredActions.length} selected)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="text-xs"
              >
                {selectedActions.size === filteredActions.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {/* Search */}
            {actions.length > 5 && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
                <Input
                  placeholder="Search actions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}

            {/* Actions List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredActions.length === 0 ? (
                <p className="text-sm text-grey-600 text-center py-4">
                  {searchTerm ? 'No actions match your search' : 'No actions available'}
                </p>
              ) : (
                filteredActions.map((action) => (
                  <div
                    key={action.tag}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                      selectedActions.has(action.tag)
                        ? 'border-primary bg-primary/5'
                        : 'border-grey-400 hover:border-grey-500'
                    )}
                    onClick={() => toggleAction(action.tag)}
                  >
                    <Checkbox
                      checked={selectedActions.has(action.tag)}
                      onCheckedChange={() => toggleAction(action.tag)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-grey truncate">
                          {action.name || action.tag}
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
                        <p className="text-xs text-grey-600 mt-1 line-clamp-1">
                          {action.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-grey-400">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedActions.size === 0 || !key.trim()}
            className="gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Settings2 className="h-4 w-4" />
                Add to {selectedActions.size} Action{selectedActions.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <DialogTitle className='text-grey'>Confirm Action</DialogTitle>
                <DialogDescription>
                  Please confirm this operation
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-grey">
              Are you sure you want to add the {variableType === 'query' ? 'query parameter' : 'header'}{' '}
              <span className="font-semibold text-grey">"{key}"</span> to{' '}
              <span className="font-semibold text-grey">{selectedActions.size}</span> action
              {selectedActions.size !== 1 ? 's' : ''}?
            </p>
            <p className="text-xs text-grey-600 mt-2">
              This will update all selected actions immediately.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className="gap-2 bg-orange-500 hover:bg-orange-600"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
