import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
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
import { Checkbox } from '../ui/checkbox';
import { Rocket, Loader2, Upload, Globe, Lock, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import marketplaceServices, { Domain } from '@/services/marketplaceServices';
import workspaceServices from '@/services/workspaceServices';
import appServices from '@/services/appServices';
import { cn } from '@/lib/utils';

interface PublishAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: {
    _id?: string;
    tag?: string;
    app_name?: string;
    description?: string;
    logo?: string;
    domains?: string[];
  };
  version?: {
    tag?: string;
    status?: string;
  };
  onSuccess?: () => void;
}

export default function PublishAppModal({
  open,
  onOpenChange,
  app,
  version,
  onSuccess,
}: PublishAppModalProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    app_name: app?.app_name || '',
    description: app?.description || '',
    logo: app?.logo || '',
    isPublic: true,
    category_ids: [] as string[],
  });
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  // Fetch marketplace domains/categories
  const { data: domainsData, isLoading: isLoadingDomains } = useQuery({
    queryKey: ['marketplace-domains'],
    queryFn: () => marketplaceServices.fetchDomains(),
    enabled: open,
  });

  const domains = domainsData?.data || [];

  // Reset form when modal opens with new app data
  useEffect(() => {
    if (open && app) {
      // Convert domain names to domain IDs
      let categoryIds: string[] = [];
      if (app.domains && app.domains.length > 0 && domains.length > 0) {
        categoryIds = domains
          .filter((domain: Domain) => app.domains?.includes(domain.domain_name))
          .map((domain: Domain) => domain._id);
      }

      setFormData({
        app_name: app.app_name || '',
        description: app.description || '',
        logo: app.logo || '',
        isPublic: true,
        category_ids: categoryIds,
      });
    }
  }, [open, app, domains]);

  // Group domains by parent
  const rootDomains = domains.filter(d => !d.parent_domain_id);
  const childDomains = domains.filter(d => d.parent_domain_id);

  const getChildDomains = (parentId: string) => {
    return childDomains.filter(d => d.parent_domain_id === parentId);
  };

  const getDomainDisplayName = (domainName: string) => {
    return domainName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const toggleDomain = (domainId: string) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(domainId)) {
      newExpanded.delete(domainId);
    } else {
      newExpanded.add(domainId);
    }
    setExpandedDomains(newExpanded);
  };

  // File upload mutation
  const { mutate: uploadLogo, status: uploadingLogo } = useMutation({
    mutationFn: (variables: {
      fileType: string;
      visibility: string;
      id: string;
      file: File;
    }) => workspaceServices.createUploadUrl(variables),
    onMutate: () => {
      toast.loading('Uploading logo...', { id: 'logoUpload' });
    },
    onSuccess: async (data, variables) => {
      const url = data?.data?.url;
      const key = data?.data?.key;

      if (!url || !key) {
        toast.error('Failed to get upload URL', { id: 'logoUpload' });
        return;
      }

      try {
        const file = variables.file;
        await workspaceServices.uploadFileToUrl({ url, file });

        // Set the key as the logo value (backend will construct full URL)
        setFormData((prev) => ({ ...prev, logo: key }));
        toast.success('Logo uploaded successfully', { id: 'logoUpload' });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error('Failed to upload file to storage', { id: 'logoUpload' });
      }
    },
    onError: (error: any) => {
      console.error('Error creating upload URL:', error);
      toast.error(error?.message || 'Failed to create upload URL', { id: 'logoUpload' });
    },
  });

  // Publish mutation
  const { mutate: publishApp, isPending: isPublishing } = useMutation({
    mutationFn: async () => {
      if (!app?._id || !user?._id || !user?.public_key) {
        throw new Error('Missing required fields');
      }

      // Build update payload
      const updatePayload: any = {
        status: formData.isPublic ? 'pending_review' : 'private',
        workspace_id: currentWorkspaceId,
      };

      // Add version if provided
      if (version?.tag) {
        updatePayload.version = version.tag;
      }

      // Only include fields that changed
      if (formData.app_name && formData.app_name !== app.app_name) {
        updatePayload.app_name = formData.app_name;
      }
      if (formData.description && formData.description !== app.description) {
        updatePayload.description = formData.description;
      }
      if (formData.logo && formData.logo !== app.logo) {
        updatePayload.logo = formData.logo;
      }
      if (formData.category_ids.length > 0) {
        updatePayload.domains = formData.category_ids;
      }

      await appServices.updateApp({
        app_id: app._id,
        user_id: user._id,
        public_key: user.public_key,
        payload: updatePayload,
        component: 'app',
      });
    },
    onSuccess: () => {
      toast.success(
        formData.isPublic
          ? 'App submitted for marketplace review'
          : 'App made private successfully',
      );
      queryClient.invalidateQueries({ queryKey: ['app', app?._id] });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to publish app');
    },
  });

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or SVG)');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!currentWorkspaceId) {
      toast.error('Workspace ID not found');
      return;
    }

    uploadLogo({
      fileType: file.type,
      visibility: 'public',
      id: currentWorkspaceId,
      file,
    });

    // Reset file input
    event.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.app_name.trim()) {
      toast.error('Please enter an app name');
      return;
    }

    publishApp();
  };

  const toggleCategorySelection = (domainId: string) => {
    setFormData(prev => {
      const isSelected = prev.category_ids.includes(domainId);
      if (isSelected) {
        return { ...prev, category_ids: prev.category_ids.filter(id => id !== domainId) };
      } else {
        return { ...prev, category_ids: [...prev.category_ids, domainId] };
      }
    });
  };

  const renderDomainItem = (domain: Domain, level: number = 0) => {
    const isSelected = formData.category_ids.includes(domain._id);
    const isExpanded = expandedDomains.has(domain._id);
    const children = getChildDomains(domain._id);
    const hasChildren = children.length > 0;

    return (
      <div key={domain._id}>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm',
            isSelected
              ? 'bg-primary/10'
              : 'hover:bg-grey-100'
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleDomain(domain._id)}
              className="p-0 hover:bg-transparent"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-grey-600" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-grey-600" />
              )}
            </button>
          )}

          {!hasChildren && (
            <Globe className="h-4 w-4 flex-shrink-0 text-grey-600" />
          )}

          <Checkbox
            id={`domain-${domain._id}`}
            checked={isSelected}
            onCheckedChange={() => toggleCategorySelection(domain._id)}
            className="flex-shrink-0"
          />

          <label
            htmlFor={`domain-${domain._id}`}
            className="flex-1 truncate cursor-pointer text-grey-600"
          >
            {getDomainDisplayName(domain.domain_name)}
          </label>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {children.map(child => renderDomainItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Find selected categories
  const selectedCategories = domains.filter(d => formData.category_ids.includes(d._id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="px-6 pt-6 pb-4 border-b border-grey-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-grey">Publish App</DialogTitle>
              <DialogDescription>
                Configure your app settings before publishing
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-grey-400 bg-grey-50">
            <div className="flex items-center gap-3">
              {formData.isPublic ? (
                <Globe className="h-5 w-5 text-green" />
              ) : (
                <Lock className="h-5 w-5 text-grey-600" />
              )}
              <div>
                <p className="text-sm font-medium text-grey">
                  {formData.isPublic ? 'Public' : 'Private'}
                </p>
                <p className="text-xs text-grey-600">
                  {formData.isPublic
                    ? 'Visible to everyone on the marketplace'
                    : 'Only visible to your workspace members'}
                </p>
              </div>
            </div>
            <Switch
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
            />
          </div>

          {/* Marketplace Category */}
          {formData.isPublic && (
            <div>
              <Label className="mb-2 block">Marketplace Category</Label>
              <div className="border border-grey-400 rounded-lg max-h-48 overflow-y-auto p-2">
                {isLoadingDomains ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-grey-400" />
                  </div>
                ) : domains.length > 0 ? (
                  <div className="space-y-1">
                    {rootDomains.map(domain => renderDomainItem(domain))}
                  </div>
                ) : (
                  <p className="text-sm text-grey-500 text-center py-4">
                    No categories available
                  </p>
                )}
              </div>
              {selectedCategories.length > 0 && (
                <p className="text-xs text-grey-600 mt-1">
                  Selected ({selectedCategories.length}): {selectedCategories.map(c => getDomainDisplayName(c.domain_name)).join(', ')}
                </p>
              )}
            </div>
          )}

          {/* App Name */}
          <div>
            <Label htmlFor="app_name">App Name</Label>
            <Input
              id="app_name"
              placeholder="e.g., GitHub API"
              value={formData.app_name}
              onChange={(e) => setFormData(prev => ({ ...prev, app_name: e.target.value }))}
              className="mt-2"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this app does..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Logo Upload */}
          <div>
            <Label htmlFor="logo">Logo</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="logo"
                placeholder="https://example.com/logo.png"
                value={formData.logo}
                onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleUploadClick}
                disabled={uploadingLogo === 'pending'}
              >
                {uploadingLogo === 'pending' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/svg+xml"
              onChange={handleLogoChange}
              className="hidden"
            />
            {formData.logo && (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={formData.logo}
                  alt="Logo preview"
                  className="w-12 h-12 rounded-lg object-cover border border-grey-400"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-xs text-grey-600">Logo preview</span>
              </div>
            )}
          </div>

          {/* Version Info */}
          <div className="p-3 rounded-lg bg-grey-50 border border-grey-400">
            <div className="flex items-center justify-between">
              <span className="text-sm text-grey-600">Version to publish</span>
              <span className="text-sm font-medium text-grey">{version?.tag || 'Latest'}</span>
            </div>
          </div>
          </div>

          {/* Actions - Fixed Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-grey-400 bg-grey-50">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPublishing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPublishing} className="gap-2">
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  {formData.isPublic ? 'Submit for review' : 'Make Private'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
