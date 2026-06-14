import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Cloud, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/store/useAuth';
import { useSDKProxy } from '@/services/sdkProxy';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { CLOUD_PROVIDER_GUIDES, type CloudProvider } from '@/components/cloud/cloudSetupGuide';
import { defaultScopesForProvider } from '@/components/cloud/cloudConnection.constants';
import { cloudTabTitle } from '@/components/cloud/CloudConnectionTagBadge';
import { tagFromDisplayName } from '@/utils/cloudConnectionTag';

type Provider = CloudProvider;

interface NewCloudConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewCloudConnectionModal({
  open,
  onOpenChange,
}: NewCloudConnectionModalProps) {
  const { user, currentWorkspaceId } = useAuth();
  const { openTab, setSidebarCollapsed } = useWorkbenchStore();
  const queryClient = useQueryClient();

  const proxyConfig =
    currentWorkspaceId && user?._id
      ? {
          workspace_id: currentWorkspaceId,
          user_id: user._id,
          token: user.auth_token || '',
          public_key: user.public_key || '',
        }
      : null;
  const sdkProxy = useSDKProxy(proxyConfig);

  const [provider, setProvider] = useState<Provider>('aws');
  const [displayName, setDisplayName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [tagManuallyEdited, setTagManuallyEdited] = useState(false);

  useEffect(() => {
    if (!open) {
      setProvider('aws');
      setDisplayName('');
      setTag('');
      setDescription('');
      setTagManuallyEdited(false);
    }
  }, [open]);

  useEffect(() => {
    if (!tagManuallyEdited && displayName) {
      setTag(tagFromDisplayName(displayName));
    }
  }, [displayName, tagManuallyEdited]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!sdkProxy) throw new Error('SDK proxy not available');
      return sdkProxy.cloud.connections.create({
        provider,
        name: displayName.trim(),
        tag: tag.trim(),
        description: description.trim(),
        scopes: defaultScopesForProvider(provider),
      });
    },
    onSuccess: (setup: Record<string, unknown>) => {
      const conn = (setup?.connection || setup) as {
        id?: string;
        display_name?: string;
        provider?: string;
        status?: string;
        tag?: string;
      };
      if (!conn?.id) {
        toast.error('Connection created but no id returned');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['cloud-connections'] });
      onOpenChange(false);
      openTab({
        id: `cloud-${conn.id}`,
        type: 'cloud',
        title: cloudTabTitle(conn),
        itemId: conn.id,
        data: { ...conn, isSetup: true, setupPayload: setup },
      });
      setSidebarCollapsed(true);
      toast.success('Continue setup in the new tab');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Failed to create connection');
    },
  });

  const canSubmit = Boolean(displayName.trim() && tag.trim() && sdkProxy);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-grey">
            <Cloud className="h-5 w-5 text-primary" />
            New cloud connection
          </DialogTitle>
          <DialogDescription className="text-sm text-grey-600">
            Choose a provider and name this connection. You will complete cloud console setup in
            the next step.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="modal-cloud-provider">Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
              <SelectTrigger id="modal-cloud-provider" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aws">Amazon Web Services</SelectItem>
                <SelectItem value="gcp">Google Cloud</SelectItem>
                <SelectItem value="azure">Microsoft Azure</SelectItem>
                <SelectItem value="mongodb_atlas">MongoDB Atlas</SelectItem>
                <SelectItem value="neo4j_aura">Neo4j Aura</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-grey-600 mt-1">{CLOUD_PROVIDER_GUIDES[provider].description}</p>
          </div>

          <div>
            <Label htmlFor="modal-cloud-name">Display name</Label>
            <Input
              id="modal-cloud-name"
              className="mt-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Production AWS"
            />
          </div>

          <div>
            <Label htmlFor="modal-cloud-tag">Tag</Label>
            <Input
              id="modal-cloud-tag"
              className="mt-2 font-mono text-sm"
              value={tag}
              onChange={(e) => {
                setTagManuallyEdited(true);
                setTag(e.target.value);
              }}
              placeholder="production_aws"
            />
            <p className="text-xs text-grey-600 mt-1">Auto-generated from the display name; used as a stable identifier</p>
          </div>

          <div>
            <Label htmlFor="modal-cloud-description">Description</Label>
            <Textarea
              id="modal-cloud-description"
              className="mt-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this account is used for in your workspace"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit || createMutation.isPending}
            className="gap-2"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Start setup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
