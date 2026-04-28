import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspaceProductBriefAppOptions, getLabelForAppId } from '@/hooks/useWorkspaceProductBriefAppOptions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MarkdownEditor, MarkdownViewer } from '@/components/ui/markdown-editor';
import { Plus, X, Save, FileText, Edit } from 'lucide-react';
import { IProductBrief, BriefStatus, IOnboardingStep } from '@/types/partnership';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import partnershipServices, { getPartnershipsApiError } from '@/services/partnershipServices';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTabState, getInitialTabState } from '@/hooks/useTabState';

interface BriefTabContentProps {
  tab: {
    id: string;
    itemId?: string;
    data: (IProductBrief & { isNew?: boolean; isEdit?: boolean }) | { isNew: true };
  };
}

export default function BriefTabContent({ tab }: BriefTabContentProps) {
  const queryClient = useQueryClient();
  const { user, currentWorkspaceId } = useAuth();
  const { options: appOptions, isLoading: appsLoading, isEmpty: noApps } =
    useWorkspaceProductBriefAppOptions();

  const brief = 'isNew' in tab.data && tab.data.isNew ? null : (tab.data as IProductBrief);
  const isEdit = 'isEdit' in tab.data && tab.data.isEdit;
  const isNew = !brief;
  const isViewOnly = !isNew && !isEdit;

  // Restore saved state
  const savedTabState = getInitialTabState(tab.id, null as any);

  const [formData, setFormData] = useState(
    savedTabState?.formData || {
      product_id: brief?.product_id || '',
      title: brief?.title || '',
      description: brief?.description || '',
      product_details: brief?.product_details || '',
      usage_instructions: brief?.usage_instructions || '',
    }
  );

  const [onboardingSteps, setOnboardingSteps] = useState<IOnboardingStep[]>(() => {
    if (savedTabState?.onboardingSteps) {
      return savedTabState.onboardingSteps;
    }
    if (brief?.onboarding_steps && brief.onboarding_steps.length > 0) {
      return brief.onboarding_steps;
    }
    return [{ name: '', description: '', message_template: '' }];
  });

  const [isSaving, setIsSaving] = useState(false);

  // Persist tab state automatically
  useTabState(
    tab.id,
    'brief',
    formData.title || 'New Product Brief',
    {},
    { formData, onboardingSteps }
  );

  const addOnboardingStep = () => {
    setOnboardingSteps([...onboardingSteps, { name: '', description: '', message_template: '' }]);
  };

  const removeOnboardingStep = (index: number) => {
    if (onboardingSteps.length > 1) {
      setOnboardingSteps(onboardingSteps.filter((_, i) => i !== index));
    }
  };

  const updateOnboardingStep = (index: number, field: keyof IOnboardingStep, value: string) => {
    const newSteps = [...onboardingSteps];
    newSteps[index][field] = value;
    setOnboardingSteps(newSteps);
  };

  const handleSave = async (asDraft: boolean) => {
    if (!formData.product_id || !formData.title || !formData.description || !formData.product_details) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate onboarding steps if they're filled in
    const hasAnyStepData = onboardingSteps.some(
      step => step.name || step.description || step.message_template
    );

    if (hasAnyStepData) {
      const hasIncompleteSteps = onboardingSteps.some(
        step => !step.name || !step.description
      );

      if (hasIncompleteSteps) {
        toast.error('Please complete all onboarding steps or remove empty ones');
        return;
      }
    }

    if (!currentWorkspaceId || !user?._id || !user?.public_key) {
      toast.error('Select a workspace and sign in to save.');
      return;
    }

    const briefId = brief?._id ?? tab.itemId;
    setIsSaving(true);
    try {
      const base = {
        workspace_id: currentWorkspaceId,
        user_id: user._id,
        public_key: user.public_key,
        title: formData.title,
        description: formData.description,
        product_details: formData.product_details,
        usage_instructions: formData.usage_instructions,
        onboarding_steps: onboardingSteps,
      };

      if (briefId) {
        await partnershipServices.updateProductBrief({
          brief_id: briefId,
          ...base,
          product_id: formData.product_id,
        });
        if (!asDraft) {
          await partnershipServices.publishProductBrief({
            brief_id: briefId,
            workspace_id: currentWorkspaceId,
            user_id: user._id,
            public_key: user.public_key,
          });
        }
      } else {
        const { data: created } = await partnershipServices.createProductBrief({
          ...base,
          product_id: formData.product_id,
          status: asDraft ? BriefStatus.DRAFT : BriefStatus.PUBLISHED,
        });
        if (!asDraft && created.status !== BriefStatus.PUBLISHED) {
          await partnershipServices.publishProductBrief({
            brief_id: created._id,
            workspace_id: currentWorkspaceId,
            user_id: user._id,
            public_key: user.public_key,
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['workspace-briefs'] });
      await queryClient.invalidateQueries({ queryKey: ['published-briefs'] });

      const action = briefId ? 'updated' : 'created';
      const status = asDraft ? 'draft' : 'published';
      toast.success(`Brief ${action} successfully as ${status}!`);
    } catch (e) {
      toast.error(getPartnershipsApiError(e));
    } finally {
      setIsSaving(false);
    }
  };

  const getBriefStatusColor = (status: BriefStatus) => {
    switch (status) {
      case BriefStatus.PUBLISHED:
        return 'bg-green/10 text-green';
      case BriefStatus.DRAFT:
        return 'bg-yellow/10 text-yellow';
      case BriefStatus.UNPUBLISHED:
        return 'bg-grey-400/10 text-grey-600';
      default:
        return 'bg-grey-400/10 text-grey-600';
    }
  };

  if (isViewOnly) {
    // View-only mode
    return (
      <div className="h-full overflow-auto bg-grey-100 p-6 pt-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <MarkdownViewer
                    content={brief?.title || ''}
                    className={cn(
                      '!my-0 leading-tight',
                      '[&_h1]:!text-2xl [&_h1]:!font-bold [&_h1]:!my-1 [&_h1]:!leading-tight',
                      '[&_h2]:!text-xl [&_h2]:!font-semibold [&_h2]:!my-1',
                      '[&_h3]:!text-lg [&_h3]:!font-semibold [&_h3]:!my-1',
                      '[&_p]:!text-2xl [&_p]:!font-bold [&_p]:!my-0 [&_p]:!leading-tight',
                      '[&_ul]:!my-1 [&_ol]:!my-1'
                    )}
                  />
                  <MarkdownViewer
                    content={brief?.description || ''}
                    className="text-sm text-grey-600 mt-2 !my-0 [&_p]:!text-sm [&_li]:!text-sm"
                  />
                </div>
              </div>
              <Badge
                variant="secondary"
                className={cn('text-sm', getBriefStatusColor(brief?.status || BriefStatus.DRAFT))}
              >
                {brief?.status}
              </Badge>
            </div>
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h3 className="font-semibold text-grey mb-3">Product</h3>
            <div className="p-4 bg-grey-50 rounded-lg">
              <p className="text-sm text-grey-600">
                {appsLoading
                  ? 'Loading app…'
                  : getLabelForAppId(brief?.product_id, appOptions)}
              </p>
            </div>
          </div>

          {/* Product Details */}
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h3 className="font-semibold text-grey mb-3">What the Product Does</h3>
            <MarkdownViewer content={brief?.product_details || ''} className="text-grey-600" />
          </div>

          {/* Usage Instructions */}
          {brief?.usage_instructions && (
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <h3 className="font-semibold text-grey mb-3">How to Use the Product</h3>
              <MarkdownViewer content={brief.usage_instructions} className="text-grey-600" />
            </div>
          )}

          {/* Onboarding Steps */}
          {onboardingSteps.length > 0 && onboardingSteps[0].name && (
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <h3 className="font-semibold text-grey mb-4">Onboarding Steps (Sales Funnel)</h3>
              <div className="space-y-3">
                {onboardingSteps.map((step, index) => (
                  <div key={index} className="p-4 bg-grey-100 rounded-lg">
                    <h4 className="font-semibold text-grey mb-2">Step {index + 1}: {step.name}</h4>
                    <MarkdownViewer content={step.description} className="text-sm text-grey-600" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Edit/Create mode
  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              {isNew ? <Plus className="h-6 w-6 text-primary" /> : <Edit className="h-6 w-6 text-primary" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">
                {isNew ? 'Create Product Brief' : 'Edit Product Brief'}
              </h1>
              <p className="text-sm text-grey-600">
                Create a comprehensive brief to showcase your product to potential partners
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product">Public app (linked to public products) *</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              disabled={appsLoading || noApps}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    appsLoading
                      ? 'Loading apps…'
                      : noApps
                        ? 'No apps in this workspace'
                        : 'Select an app'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {appOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {noApps && !appsLoading && (
              <p className="text-xs text-grey-600">
                Publish an app (and product) first — briefs only list public apps.
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Brief Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., API Gateway Pro - Enterprise Integration Solution"
            />
          </div>

          {/* Description */}
          <div>
            <MarkdownEditor
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              placeholder="A concise overview of what your product offers..."
              label="Brief Description *"
            />
          </div>

          {/* Product Details */}
          <div>
            <MarkdownEditor
              value={formData.product_details}
              onChange={(value) => setFormData({ ...formData, product_details: value })}
              placeholder="Explain the core functionality and features of your product... Describe the key capabilities and what problems your product solves."
              label="What the Product Does *"
              minHeight="min-h-[150px]"
            />
          </div>

          {/* Usage Instructions */}
          <div>
            <MarkdownEditor
              value={formData.usage_instructions}
              onChange={(value) => setFormData({ ...formData, usage_instructions: value })}
              placeholder="Step-by-step guide on how to use your product... Provide clear instructions on how clients can use your product."
              label="How to Use the Product"
              minHeight="min-h-[150px]"
            />
          </div>

          {/* Onboarding Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Onboarding Steps (Sales Funnel)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOnboardingStep}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Step
              </Button>
            </div>
            <p className="text-xs text-grey-600">
              Define the step-by-step process for onboarding clients. These will become your sales funnel.
            </p>

            {onboardingSteps.map((step, index) => (
              <div key={index} className="border border-grey-400 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-grey">Step {index + 1}</h4>
                  {onboardingSteps.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOnboardingStep(index)}
                      className="h-8 w-8 p-0 text-grey-600 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`step-name-${index}`}>Step Name *</Label>
                  <Input
                    id={`step-name-${index}`}
                    value={step.name}
                    onChange={(e) => updateOnboardingStep(index, 'name', e.target.value)}
                    placeholder="e.g., Initial Contact, Requirements Gathering, Demo"
                  />
                </div>

                <div>
                  <MarkdownEditor
                    value={step.description}
                    onChange={(value) => updateOnboardingStep(index, 'description', value)}
                    placeholder="Describe what happens in this step..."
                    label="Description *"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-6 border-t border-grey-400">
            <Button variant="outline" onClick={() => handleSave(true)} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button onClick={() => handleSave(false)} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Publishing...' : isNew ? 'Create & Publish' : 'Save & Publish'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
