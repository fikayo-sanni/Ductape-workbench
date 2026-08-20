import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Building2,
  Loader,
} from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import workspaceServices from '@/services/workspaceServices';

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (workspace: any) => void | Promise<void>;
}

export default function CreateWorkspaceModal({
  open,
  onOpenChange,
  onSuccess
}: CreateWorkspaceModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Auto-generate description when workspace name changes
  useEffect(() => {
    if (formData.name.trim()) {
      const generatedDescription = `Workspace for ${formData.name} - organize and manage your products, apps, and integrations`;
      setFormData(prev => ({ ...prev, description: generatedDescription }));
    }
  }, [formData.name]);

  const { mutate: createWorkspace, status: creatingWorkspace } = useMutation({
    mutationFn: (data: {
      user_id: string;
      name: string;
      public_key: string;
      description: string;
    }) => workspaceServices.createWorkspace(data),
    onSuccess: async (response) => {
      console.log('Workspace creation response:', response);
      if (response?.data && response.data._id) {
        try {
          await onSuccess?.(response.data);
          await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
          onOpenChange(false);
          setFormData({ name: '', description: '' });
        } catch (error) {
          console.error('Workspace created but activation failed:', error);
          toast.error('Workspace created, but switching to it failed. Please select it from the workspace menu.');
        }
      } else {
        console.error('Invalid workspace response:', response);
        toast.error('Failed to create workspace - invalid response');
      }
    },
    onError: (error: any) => {
      console.error('Error creating workspace:', error);
      toast.error('Error creating workspace, try again');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id || !user?.public_key) {
      console.error('Missing user data:', { user: !!user });
      toast.error('Missing user data - please ensure you are logged in');
      return;
    }
    
    if (!formData.name.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }
    
    createWorkspace({
      user_id: user._id,
      name: formData.name.trim(),
      public_key: user.public_key,
      description: formData.description.trim(),
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData({ name: '', description: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue" />
            </div>
            <div>
              <DialogTitle className='text-grey'>Create New Workspace</DialogTitle>
              <DialogDescription>
                Set up a new workspace for your projects
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="required">
              Workspace Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., My Company"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-2"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe your workspace..."
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
              className="mt-2"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              className="flex-1"
              disabled={creatingWorkspace === 'pending'}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={creatingWorkspace === 'pending' || !formData.name.trim()}
            >
              {creatingWorkspace === 'pending' ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Workspace'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
