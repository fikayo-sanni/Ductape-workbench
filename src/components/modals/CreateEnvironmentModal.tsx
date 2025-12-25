import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
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

interface CreateEnvironmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTag: string;
  productId: string;
  onSuccess?: (environment: any) => void;
}

export default function CreateEnvironmentModal({
  open,
  onOpenChange,
  productTag,
  productId,
  onSuccess,
}: CreateEnvironmentModalProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    env_name: '',
    slug: '',
    description: '',
    active: true,
  });
  const [isDescriptionManuallyEdited, setIsDescriptionManuallyEdited] = useState(false);

  const generateDescription = (name: string): string => {
    const lowerName = name.toLowerCase().trim();

    // Common environment name patterns and their descriptions
    if (lowerName.includes('prod') || lowerName === 'live') {
      return 'Production environment for live applications and services';
    }
    if (lowerName.includes('stag') || lowerName === 'stg') {
      return 'Staging environment for pre-production testing and validation';
    }
    if (lowerName.includes('dev') || lowerName === 'development') {
      return 'Development environment for building and testing new features';
    }
    if (lowerName.includes('test') || lowerName === 'qa') {
      return 'Testing environment for quality assurance and automated tests';
    }
    if (lowerName.includes('sandbox') || lowerName === 'sbx') {
      return 'Sandbox environment for experimentation and isolated testing';
    }
    if (lowerName.includes('demo')) {
      return 'Demo environment for showcasing features and demonstrations';
    }
    if (lowerName.includes('local')) {
      return 'Local development environment for individual developer use';
    }
    if (lowerName.includes('uat')) {
      return 'User Acceptance Testing environment for client validation';
    }
    if (lowerName.includes('preview')) {
      return 'Preview environment for reviewing changes before deployment';
    }
    if (lowerName.includes('integration') || lowerName === 'int') {
      return 'Integration environment for testing system integrations';
    }

    // Default description if no pattern matches
    if (name.trim()) {
      return `${name.trim()} environment for your applications and services`;
    }
    return '';
  };

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  }) as any;

  const handleNameChange = (value: string) => {
    // Only auto-generate description if user hasn't manually edited it
    const newDescription = !isDescriptionManuallyEdited
      ? generateDescription(value)
      : formData.description;

    setFormData({
      ...formData,
      env_name: value,
      description: newDescription,
    });
  };

  const handleDescriptionChange = (value: string) => {
    setIsDescriptionManuallyEdited(true);
    setFormData({ ...formData, description: value });
  };

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

  const { mutate: createEnvironment, isPending: isCreating } = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!ductape) throw new Error('Product not initialized');
      if (!productTag) throw new Error('Product tag not found');
      if (data.slug.length !== 3) throw new Error('Slug must be exactly 3 letters');

      await ductape.init(productTag);

      const payload = {
        env_name: data.env_name,
        slug: data.slug,
        description: data.description,
        active: data.active,
      };

      console.dir(ductape);

      const environment = await ductape.environments.create(payload);
      return environment;
    },
    onSuccess: (environment) => {
      // Invalidate products list query with workspaceId
      queryClient.invalidateQueries({ queryKey: ['products', currentWorkspaceId] });
      // Invalidate any product-specific queries
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productTag] });
      toast.success('Environment created successfully!');
      onSuccess?.(environment);
      onOpenChange(false);
      // Reset form
      setFormData({
        env_name: '',
        slug: '',
        description: '',
        active: true,
      });
      setIsDescriptionManuallyEdited(false);
    },
    onError: (error: any) => {
      console.error('Error creating environment:', error);
      toast.error(error.message || 'Failed to create environment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.env_name.trim()) {
      toast.error('Please enter an environment name');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('Please enter a slug');
      return;
    }

    createEnvironment(formData);
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
              <DialogTitle className='text-grey'>Create Environment</DialogTitle>
              <DialogDescription>
                Add a new environment to organize deployment stages
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
              onChange={(e) => handleNameChange(e.target.value)}
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
                onChange={(e) => handleSlugChange(e.target.value)}
                maxLength={3}
                className="font-mono"
              />
              <Button
                type="button"
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
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={3}
              className="mt-2"
            />
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
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating} className="gap-2">
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Settings2 className="h-4 w-4" />
                  Create Environment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
