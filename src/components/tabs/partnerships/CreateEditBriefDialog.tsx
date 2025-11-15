import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { IProductBrief } from '@/types/partnership';
import { dummyProducts } from '@/data/partnerships.dummy';
import toast from 'react-hot-toast';

interface OnboardingStep {
  name: string;
  description: string;
  message_template: string;
}

interface CreateEditBriefDialogProps {
  brief: IProductBrief | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateEditBriefDialog({
  brief,
  open,
  onOpenChange,
}: CreateEditBriefDialogProps) {
  const [formData, setFormData] = useState({
    product_id: '',
    title: '',
    description: '',
    product_details: '',
    usage_instructions: '',
  });
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([
    { name: '', description: '', message_template: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (brief) {
      setFormData({
        product_id: brief.product_id,
        title: brief.title,
        description: brief.description,
        product_details: brief.product_details,
        usage_instructions: brief.usage_instructions || '',
      });

      // Parse onboarding_steps if it's a JSON string, otherwise initialize with default
      try {
        const steps = brief.onboarding_steps
          ? JSON.parse(brief.onboarding_steps)
          : [{ name: '', description: '', message_template: '' }];
        setOnboardingSteps(steps);
      } catch (e) {
        setOnboardingSteps([{ name: '', description: '', message_template: '' }]);
      }
    } else {
      setFormData({
        product_id: '',
        title: '',
        description: '',
        product_details: '',
        usage_instructions: '',
      });
      setOnboardingSteps([{ name: '', description: '', message_template: '' }]);
    }
  }, [brief, open]);

  const addOnboardingStep = () => {
    setOnboardingSteps([...onboardingSteps, { name: '', description: '', message_template: '' }]);
  };

  const removeOnboardingStep = (index: number) => {
    if (onboardingSteps.length > 1) {
      setOnboardingSteps(onboardingSteps.filter((_, i) => i !== index));
    }
  };

  const updateOnboardingStep = (index: number, field: keyof OnboardingStep, value: string) => {
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

    setIsSaving(true);

    // TODO: Send brief data to API
    // const briefData = {
    //   ...formData,
    //   onboarding_steps: JSON.stringify(onboardingSteps),
    // };

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const action = brief ? 'updated' : 'created';
    const status = asDraft ? 'draft' : 'published';

    toast.success(`Brief ${action} successfully as ${status}!`);
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-grey">
            {brief ? 'Edit Product Brief' : 'Create Product Brief'}
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive brief to showcase your product to potential partners
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product">Product/App *</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData({ ...formData, product_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {dummyProducts.map((product) => (
                  <SelectItem key={product._id} value={product._id}>
                    {product.app_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="space-y-2">
            <Label htmlFor="description">Brief Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="A concise overview of what your product offers..."
              rows={3}
            />
          </div>

          {/* Product Details (What it does) */}
          <div className="space-y-2">
            <Label htmlFor="product_details">What the Product Does *</Label>
            <Textarea
              id="product_details"
              value={formData.product_details}
              onChange={(e) => setFormData({ ...formData, product_details: e.target.value })}
              placeholder="Explain the core functionality and features of your product..."
              rows={5}
            />
            <p className="text-xs text-grey-600">
              Describe the key capabilities and what problems your product solves
            </p>
          </div>

          {/* Usage Instructions (How to use) */}
          <div className="space-y-2">
            <Label htmlFor="usage_instructions">How to Use the Product</Label>
            <Textarea
              id="usage_instructions"
              value={formData.usage_instructions}
              onChange={(e) =>
                setFormData({ ...formData, usage_instructions: e.target.value })
              }
              placeholder="Step-by-step guide on how to use your product..."
              rows={5}
            />
            <p className="text-xs text-grey-600">
              Provide clear instructions on how clients can use your product
            </p>
          </div>

          {/* Onboarding Steps - Sales Funnel Builder */}
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

                <div className="space-y-2">
                  <Label htmlFor={`step-description-${index}`}>Description *</Label>
                  <Textarea
                    id={`step-description-${index}`}
                    value={step.description}
                    onChange={(e) => updateOnboardingStep(index, 'description', e.target.value)}
                    placeholder="Describe what happens in this step..."
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button onClick={() => handleSave(false)} disabled={isSaving}>
            {isSaving ? 'Publishing...' : brief ? 'Save & Publish' : 'Create & Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
