import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Settings2, Loader2 } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { IEnvironment } from '@/types/environment';
import workspaceServices from '@/services/workspaceServices';

interface CreateWorkspaceEnvironmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEnv: IEnvironment | null;
  environments: IEnvironment[];
}

export default function CreateWorkspaceEnvironmentModal({
  open,
  onOpenChange,
  editingEnv,
  environments,
}: CreateWorkspaceEnvironmentModalProps) {
  const { user, currentWorkspaceId, setUser } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    env_name: '',
    slug: '',
    description: '',
  });
  const [isDescriptionManuallyEdited, setIsDescriptionManuallyEdited] = useState(false);

  useEffect(() => {
    if (editingEnv) {
      setFormData({
        env_name: editingEnv.env_name,
        slug: editingEnv.slug,
        description: editingEnv.description || '',
      });
      setIsDescriptionManuallyEdited(true); // Don't auto-generate when editing
    } else {
      setFormData({
        env_name: '',
        slug: '',
        description: '',
      });
      setIsDescriptionManuallyEdited(false); // Allow auto-generation for new environments
    }
  }, [editingEnv, open]);

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

  const { mutate: saveEnvironment, isPending: isSaving } = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key) {
        throw new Error('Missing workspace or user information');
      }

      if (!data.env_name.trim()) {
        throw new Error('Please enter an environment name');
      }

      if (data.slug.length !== 3) {
        throw new Error('Slug must be exactly 3 letters');
      }

      let updatedEnvs: any[];
      
      if (editingEnv) {
        // Update existing environment - keep all existing fields including _id
        updatedEnvs = environments.map(env => 
          env.slug === editingEnv.slug 
            ? { ...env, env_name: data.env_name, slug: editingEnv.slug, description: data.description }
            : env
        );
      } else {
        // Check if slug already exists
        if (environments.some(env => env.slug === data.slug)) {
          throw new Error('An environment with this slug already exists');
        }
        // Add new environment without _id (will be generated by backend)
        updatedEnvs = [...environments, { env_name: data.env_name, slug: data.slug, description: data.description }];
      }

      const response = await workspaceServices.updateWorkspaceEnvs({
        workspace_id: currentWorkspaceId,
        payload: {
          user_id: user._id,
          public_key: user.public_key,
          envs: updatedEnvs,
        },
      });
      return response;
    },
    onSuccess: (response) => {
      if (response?.data && user) {
        // Update workspaces query cache
        queryClient.setQueryData(['workspaces', user._id], response);
        
        // Update user store with new workspaces data
        const updatedWorkspaces = response.data.map((ws: any) => ({
          workspace_id: ws.workspace_id,
          workspace_name: ws.workspace_name,
          user_id: ws.user_id,
          default: ws.default || false,
          accepted: ws.accepted || false,
          access_level: ws.access_level || '',
          defaultEnvs: ws.defaultEnvs || [],
          logo: ws.logo,
          description: ws.description,
        }));
        
        setUser({
          ...user,
          workspaces: updatedWorkspaces,
        });
      }
      
      // Invalidate as fallback
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      
      toast.success(`${editingEnv ? 'Environment updated' : 'Environment created'} successfully!`);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || `Failed to ${editingEnv ? 'update' : 'create'} environment`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveEnvironment(formData);
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
              <DialogTitle className='text-grey'>{editingEnv ? 'Edit Environment' : 'Create Environment'}</DialogTitle>
              <DialogDescription>
                {editingEnv ? 'Update workspace environment' : 'Add a new workspace environment'}
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
                disabled={!!editingEnv}
              />
              {!editingEnv && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAutoGenerateSlug}
                  size="sm"
                >
                  Auto-generate
                </Button>
              )}
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Settings2 className="h-4 w-4" />
                  {editingEnv ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

