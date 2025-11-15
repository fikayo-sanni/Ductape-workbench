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
import { Settings2, Loader2 } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { DataFormats } from '@ductape/sdk/dist/types';

interface UpdateAppEnvironmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appTag?: string;
  environment: any;
  onSuccess?: () => void;
}

export default function UpdateAppEnvironmentModal({
  open,
  onOpenChange,
  appTag,
  environment,
  onSuccess,
}: UpdateAppEnvironmentModalProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    env_name: '',
    slug: '',
    description: '',
    active: true,
    base_url: '',
    request_type: DataFormats.JSON,
  });

  // Populate form when editing an environment
  useEffect(() => {
    if (environment) {
      setFormData({
        env_name: environment.env_name || '',
        slug: environment.slug || '',
        description: environment.description || '',
        active: environment.active !== undefined ? environment.active : true,
        base_url: environment.base_url || '',
        request_type: environment.request_type || DataFormats.JSON,
      });
    }
  }, [environment]);

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'app',
  }) as any;

  const handleSlugChange = (value: string) => {
    // Restrict to 3 characters exactly
    const sanitized = value.toLowerCase().slice(0, 3).replace(/[^a-z]/g, '');
    setFormData({ ...formData, slug: sanitized });
  };

  const handleAutoGenerateSlug = () => {
    if (!formData.env_name) {
      toast.error('Please enter an environment name first');
      return;
    }
    // Generate a 3-letter slug from the name
    const sanitized = formData.env_name
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .slice(0, 3)
      .padEnd(3, 'x'); // Pad with 'x' if less than 3 chars
    setFormData({ ...formData, slug: sanitized });
  };

  const { mutate: updateEnvironment, isPending: isUpdating } = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!ductape) throw new Error('App not initialized');
      if (!appTag) throw new Error('App tag not found');
      if (!data.base_url.trim()) throw new Error('Base URL is required');
      if (data.slug.length !== 3) throw new Error('Slug must be exactly 3 letters');
      if (!environment?.slug) throw new Error('Environment slug not found');

      await ductape.init(appTag);

      const payload = {
        env_name: data.env_name,
        slug: data.slug,
        description: data.description,
        active: data.active,
        base_url: data.base_url,
        request_type: data.request_type,
      };

      delete (payload as any).slug;
      await ductape.environments.update(environment.slug, payload);
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app', appTag] });
      toast.success('Environment updated successfully!');
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error updating environment:', error);
      toast.error(error.message || 'Failed to update environment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.env_name.trim()) {
      toast.error('Please enter an environment name');
      return;
    }

    if (formData.slug.length !== 3) {
      toast.error('Slug must be exactly 3 letters');
      return;
    }

    if (!formData.base_url.trim()) {
      toast.error('Base URL is required');
      return;
    }

    updateEnvironment(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className='text-grey'>Update Environment</DialogTitle>
              <DialogDescription>
                Modify environment settings for this app
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="env_name" className="required">
              Environment Name
            </Label>
            <Input
              id="env_name"
              placeholder="e.g., Production, Staging, Development"
              value={formData.env_name}
              onChange={(e) => setFormData({ ...formData, env_name: e.target.value })}
              className="mt-2"
              autoFocus
            />
            <p className="text-xs text-grey-600 mt-1">
              A descriptive name for this environment
            </p>
          </div>

          <div>
            <Label htmlFor="slug" className="required">
              Slug (3 letters)
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="slug"
                placeholder="e.g., prd, stg, dev"
                value={formData.slug}
                disabled={true}
                onChange={(e) => handleSlugChange(e.target.value)}
                maxLength={3}
                className="font-mono"
              />
              <Button
                type="button"
                disabled={true}
                variant="outline"
                onClick={handleAutoGenerateSlug}
                size="sm"
              >
                Auto-generate
              </Button>
            </div>
            <p className="text-xs text-grey-600 mt-1">
              Exactly 3 lowercase letters (e.g., prd, stg, dev)
            </p>
          </div>

          <div>
            <Label htmlFor="description">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe this environment..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="base_url" className="required">
              Base URL
            </Label>
            <Input
              id="base_url"
              placeholder="https://api.example.com"
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              className="mt-2"
              type="url"
            />
            <p className="text-xs text-grey-600 mt-1">
              The base URL for this environment
            </p>
          </div>

          <div>
            <Label htmlFor="request_type">
              Request Type
            </Label>
            <Select
              value={formData.request_type}
              onValueChange={(value) => setFormData({ ...formData, request_type: value as DataFormats })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DataFormats.JSON}>JSON</SelectItem>
                <SelectItem value={DataFormats.URLENCODED}>URL Encoded</SelectItem>
                <SelectItem value={DataFormats.FORMDATA}>Form Data</SelectItem>
                <SelectItem value={DataFormats.SOAP}>SOAP</SelectItem>
                <SelectItem value={DataFormats.HTML}>HTML</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-grey-600 mt-1">
              The data format for requests in this environment
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-grey-400 p-4">
            <Checkbox
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked as boolean })}
            />
            <div className="space-y-0.5">
              <Label htmlFor="active" className="text-sm font-medium cursor-pointer">
                Active Status
              </Label>
              <p className="text-xs text-grey-600">
                Enable this environment for use
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating} className="gap-2">
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Settings2 className="h-4 w-4" />
                  Update Environment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

