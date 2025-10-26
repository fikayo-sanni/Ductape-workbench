import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
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
import { FileCode, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';

interface CreateConstantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appTag: string;
  appId: string;
  constant?: any;
  onSuccess?: (constant: any) => void;
}

export default function CreateConstantModal({
  open,
  onOpenChange,
  appTag,
  appId,
  constant,
  onSuccess,
}: CreateConstantModalProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    key: '',
    description: '',
    type: 'string',
    value: '',
  });

  // Populate form when editing
  useEffect(() => {
    if (constant) {
      setFormData({
        key: constant.key || '',
        description: constant.description || '',
        type: constant.type || 'string',
        value: constant.value || '',
      });
    } else {
      setFormData({
        key: '',
        description: '',
        type: 'string',
        value: '',
      });
    }
  }, [constant, open]);

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'app',
  }) as any;

  const handleKeyChange = (value: string) => {
    // Auto-uppercase for constants
    setFormData({ ...formData, key: value.toUpperCase() });
  };

  const { mutate: createConstant, isPending: isCreating } = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!ductape) throw new Error('App not initialized');
      if (!appTag) throw new Error('App tag not found');
      if (!data.key.trim()) throw new Error('Key is required');
      if (!data.value.trim()) throw new Error('Value is required');

      await ductape.init(appTag);

      const payload = {
        key: data.key,
        type: data.type.toUpperCase(),
        description: data.description,
        value: data.value,
      };

      if (constant) {
        return ductape.constants.update(constant._id, payload);
      }
      return ductape.constants.create(payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['app', appId] });
      toast.success(constant ? 'Constant updated successfully!' : 'Constant created successfully!');
      onSuccess?.(result);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create constant');
    },
  });

  const { mutate: deleteConstant, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      if (!ductape) throw new Error('App not initialized');
      if (!appTag) throw new Error('App tag not found');
      if (!constant?._id) throw new Error('Constant ID not found');

      await ductape.init(appTag);
      return ductape.constants.delete(constant._id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app', appId] });
      toast.success('Constant deleted successfully!');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete constant');
    },
  });

  const handleSubmit = () => {
    if (!formData.key.trim()) {
      toast.error('Please enter a constant key');
      return;
    }

    if (!formData.value.trim()) {
      toast.error('Please enter a constant value');
      return;
    }

    createConstant(formData);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the constant "${formData.key}"?`)) {
      deleteConstant();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileCode className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{constant ? 'Update Constant' : 'Create Constant'}</DialogTitle>
              <DialogDescription>
                {constant ? 'Update the constant configuration' : 'Add a new constant to store fixed configuration values'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="key" className="required">
              Constant Key
            </Label>
            <Input
              id="key"
              placeholder="e.g., API_VERSION, MAX_RETRIES"
              value={formData.key}
              onChange={(e) => handleKeyChange(e.target.value)}
              disabled={!!constant}
              className="mt-2"
              autoFocus={!constant}
            />
            <p className="text-xs text-grey-600 mt-1">
              A unique identifier for this constant
            </p>
          </div>

          <div>
            <Label htmlFor="description">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe this constant..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="value" className="required">
              Value
            </Label>
            <Input
              id="value"
              placeholder="Enter the constant value"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="mt-2"
            />
            <p className="text-xs text-grey-600 mt-1">
              The fixed value for this constant
            </p>
          </div>

          <div>
            <Label htmlFor="type">
              Constant Type
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">STRING</SelectItem>
                <SelectItem value="object">OBJECT</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-grey-600 mt-1">
              The data type for this constant
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-grey-400">
            {constant && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting || isCreating}
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
                    Delete Constant
                  </>
                )}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating || isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isCreating || isDeleting}
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {constant ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <FileCode className="h-4 w-4" />
                    {constant ? 'Update Constant' : 'Create Constant'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
