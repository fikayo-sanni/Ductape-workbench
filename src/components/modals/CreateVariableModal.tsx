import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
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
import { FileCode, Loader2 } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';

interface CreateVariableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appTag: string;
  appId: string;
  variable?: any;
  onSuccess?: (variable: any) => void;
}

export default function CreateVariableModal({
  open,
  onOpenChange,
  appTag,
  appId,
  variable,
  onSuccess,
}: CreateVariableModalProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    key: '',
    description: '',
    type: 'string',
    minlength: '',
    maxlength: '',
    required: false,
  });

  // Populate form when editing
  useEffect(() => {
    if (variable) {
      setFormData({
        key: variable.key || '',
        description: variable.description || '',
        type: variable.type || 'string',
        minlength: variable.minlength?.toString() || '',
        maxlength: variable.maxlength?.toString() || '',
        required: variable.required || false,
      });
    } else {
      setFormData({
        key: '',
        description: '',
        type: 'string',
        minlength: '',
        maxlength: '',
        required: false,
      });
    }
  }, [variable, open]);

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'app',
  }) as any;

  const handleKeyChange = (value: string) => {
    // Auto-uppercase for variables
    setFormData({ ...formData, key: value.toUpperCase() });
  };

  const { mutate: createVariable, isPending: isCreating } = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!ductape) throw new Error('App not initialized');
      if (!appTag) throw new Error('App tag not found');
      if (!data.key.trim()) throw new Error('Key is required');

      await ductape.init(appTag);

      const payload: any = {
        key: data.key,
        type: data.type.toUpperCase(),
        description: data.description,
        required: data.required,
      };

      // Add minlength/maxlength only if provided
      if (data.minlength) {
        payload.minlength = parseInt(data.minlength);
      }
      if (data.maxlength) {
        payload.maxlength = parseInt(data.maxlength);
      }

      if (variable) {
        return ductape.variables.update(variable._id, payload);
      }
      return ductape.variables.create(payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['app', appId] });
      toast.success(variable ? 'Variable updated successfully!' : 'Variable created successfully!');
      onSuccess?.(result);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create variable');
    },
  });

  const handleSubmit = () => {
    if (!formData.key.trim()) {
      toast.error('Please enter a variable key');
      return;
    }

    createVariable(formData);
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
              <DialogTitle>{variable ? 'Update Variable' : 'Create Variable'}</DialogTitle>
              <DialogDescription>
                {variable ? 'Update the variable configuration' : 'Add a new variable to store dynamic configuration values'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="key" className="required">
              Variable Key
            </Label>
            <Input
              id="key"
              placeholder="e.g., API_KEY, DATABASE_URL"
              value={formData.key}
              onChange={(e) => handleKeyChange(e.target.value)}
              disabled={!!variable}
              className="mt-2"
              autoFocus={!variable}
            />
            <p className="text-xs text-grey-600 mt-1">
              A unique identifier for this variable
            </p>
          </div>

          <div>
            <Label htmlFor="description">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe this variable..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="type">
              Variable Type
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
              The data type for this variable
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minlength">
                Minimum Length
              </Label>
              <Input
                id="minlength"
                type="number"
                min={0}
                placeholder="e.g., 5"
                value={formData.minlength}
                onChange={(e) => setFormData({ ...formData, minlength: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="maxlength">
                Maximum Length
              </Label>
              <Input
                id="maxlength"
                type="number"
                placeholder="e.g., 100"
                value={formData.maxlength}
                onChange={(e) => setFormData({ ...formData, maxlength: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-grey-400 p-4">
            <Checkbox
              id="required"
              checked={formData.required}
              onCheckedChange={(checked) => setFormData({ ...formData, required: checked as boolean })}
            />
            <div className="space-y-0.5">
              <Label htmlFor="required" className="text-sm font-medium cursor-pointer">
                Required
              </Label>
              <p className="text-xs text-grey-600">
                This variable must be provided for the app to function
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isCreating}
              className="gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {variable ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <FileCode className="h-4 w-4" />
                  {variable ? 'Update Variable' : 'Create Variable'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
