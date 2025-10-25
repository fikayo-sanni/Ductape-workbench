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
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Building2,
  Package,
  Sparkles,
  Loader,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import workspaceServices from '@/services/workspaceServices';
import productServices from '@/services/productServices';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
  completed: boolean;
}

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

// Step 1: Welcome
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-grey mb-2">Welcome to Ductape Workbench!</h2>
        <p className="text-grey-600">
          Let's get you set up with your first workspace, product, and app in just a few steps.
        </p>
      </div>
      <div className="space-y-2 text-sm text-grey-600">
        <p>We'll help you:</p>
        <ul className="space-y-1">
          <li>• Create your first workspace</li>
          <li>• Set up your first product</li>
          <li>• Build your first app</li>
          <li>• Import or create API requests</li>
          <li>• Configure authentication</li>
        </ul>
      </div>
      <Button onClick={onNext} className="w-full">
        Get Started
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

// Step 2: Create Workspace
function WorkspaceStep({ onNext, onBack }: { onNext: (data: any) => void; onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    workspace_name: '',
    description: '',
  });

  const { mutate: createWorkspace, status: creatingWorkspace } = useMutation({
    mutationFn: (data: {
      user_id: string;
      name: string;
      public_key: string;
      description: string;
    }) => workspaceServices.createWorkspace(data),
    onSuccess: (response) => {
      console.log('Workspace creation response:', response);
      if (response?.data && response.data._id) {
        queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        toast.success('Workspace created successfully!');
        onNext({ workspace: response.data });
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
      toast.error('User authentication required');
      return;
    }
    
    createWorkspace({
      name: formData.workspace_name,
      public_key: user.public_key,
      user_id: user._id,
      description: formData.description,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-blue/10 flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-blue" />
        </div>
        <h2 className="text-xl font-bold text-grey mb-2">Create Your First Workspace</h2>
        <p className="text-grey-600">
          A workspace is where you'll organize all your products and apps.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="workspace_name" className="required">
            Workspace Name
          </Label>
          <Input
            id="workspace_name"
            placeholder="e.g., My Company"
            value={formData.workspace_name}
            onChange={(e) => setFormData({ ...formData, workspace_name: e.target.value })}
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
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={creatingWorkspace === 'pending'}>
            {creatingWorkspace === 'pending' ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
            Create Workspace
            <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Step 3: Create Product
function ProductStep({ onNext, onBack, workspace, onComplete }: { onNext: (data: any) => void; onBack: () => void; workspace: any; onComplete: () => void }) {
  const { user } = useAuth();
  const { openTab } = useWorkbenchStore();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
  });

  const { mutate: createProduct, status: creatingProduct } = useMutation({
    mutationFn: (data: {
      workspace_id: string;
      user_id: string;
      public_key: string;
      payload: {
        name: string;
        description: string;
        tag: string;
        workspace_id: string;
        user_id: string;
        public_key: string;
      };
    }) => productServices.createProduct(data),
    onSuccess: (response) => {
      console.log('Product creation response:', response);
      if (response?.data) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast.success('Product created successfully!');
        
        // Open the created product in a tab
        openTab({
          id: `product-${response.data._id}-${Date.now()}`,
          type: 'product',
          title: response.data.name || response.data.tag || 'Product',
          itemId: response.data._id,
          data: response.data,
        });
        
        onNext({ product: response.data });
        // Complete onboarding after product creation
        onComplete();
      } else {
        console.error('Invalid product response:', response);
        toast.error('Failed to create product - invalid response');
      }
    },
    onError: (error: any) => {
      console.error('Error creating product:', error);
      toast.error('Error creating product, try again');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id || !user?.public_key || !workspace?._id) {
      console.error('Missing required data:', { user: !!user, workspace });
      toast.error('Missing required data - please ensure workspace was created successfully');
      return;
    }
    
    console.log('Full workspace object:', workspace);
    console.log('Workspace keys:', Object.keys(workspace));
    
    // Generate tag safely
    const workspaceTag = workspace.workspace_name || workspace.name || 'workspace';
    const productTag = formData.product_name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const fullTag = `${workspaceTag.toLowerCase().replace(/[^a-z0-9]+/g, '_')}:${productTag}`;
    
    console.log('Creating product with:', {
      workspace_id: workspace._id,
      user_id: user._id,
      public_key: user.public_key,
      payload: {
        name: formData.product_name,
        description: formData.description,
        tag: fullTag,
        workspace_id: workspace._id,
        user_id: user._id,
        public_key: user.public_key,
      },
    });
     
     createProduct({
      workspace_id: workspace._id,
      user_id: user._id,
      public_key: user.public_key,
      payload: {
        name: formData.product_name,
        description: formData.description,
        tag: fullTag,
        workspace_id: workspace._id,
        user_id: user._id,
        public_key: user.public_key,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-green/10 flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-green" />
        </div>
        <h2 className="text-xl font-bold text-grey mb-2">Create Your First Product</h2>
        <p className="text-grey-600">
          A product represents an integration or service you're building.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="product_name" className="required">
            Product Name
          </Label>
          <Input
            id="product_name"
            placeholder="e.g., Payment API"
            value={formData.product_name}
            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
            className="mt-2"
            required
          />
        </div>


        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Describe your product..."
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
            className="mt-2"
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={creatingProduct === 'pending'}>
            {creatingProduct === 'pending' ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
            Create Product
            <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Step 3: Completion
function CompletionStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto rounded-full bg-green/10 flex items-center justify-center">
        <CheckCircle className="h-10 w-10 text-green" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-grey mb-2">You're All Set!</h2>
        <p className="text-grey-600">
          Congratulations! You've successfully set up your first workspace, product, and app.
        </p>
      </div>
      <div className="space-y-2 text-sm text-grey-600">
        <p>You can now:</p>
        <ul className="space-y-1">
          <li>• Create and test API requests</li>
          <li>• Manage authentication</li>
          <li>• Organize your projects</li>
          <li>• Collaborate with your team</li>
        </ul>
      </div>
      <Button onClick={onComplete} className="w-full">
        Start Using Workbench
      </Button>
    </div>
  );
}

export default function OnboardingModal({ open, onComplete, onSkip }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [onboardingData, setOnboardingData] = useState<{
    workspace?: any;
    product?: any;
    app?: any;
    auth?: any;
  }>({});

  // Load onboarding progress from localStorage on mount
  useEffect(() => {
    const savedStep = localStorage.getItem('ductape-onboarding-step');
    const savedData = localStorage.getItem('ductape-onboarding-data');
    
    if (savedStep) {
      setCurrentStep(parseInt(savedStep));
    }
    
    if (savedData) {
      try {
        setOnboardingData(JSON.parse(savedData));
      } catch (error) {
        console.error('Error parsing saved onboarding data:', error);
      }
    }
  }, []);

  // Save onboarding progress to localStorage
  useEffect(() => {
    localStorage.setItem('ductape-onboarding-step', currentStep.toString());
    
    // Create a safe copy of onboardingData to avoid cyclic references
    const safeData = {
      workspace: onboardingData.workspace ? {
        _id: onboardingData.workspace._id,
        workspace_id: onboardingData.workspace.workspace_id,
        workspace_name: onboardingData.workspace.workspace_name,
        description: onboardingData.workspace.description,
        default: onboardingData.workspace.default,
        created_at: onboardingData.workspace.created_at,
        updated_at: onboardingData.workspace.updated_at
      } : undefined,
      product: onboardingData.product ? {
        _id: onboardingData.product._id,
        name: onboardingData.product.name,
        description: onboardingData.product.description,
        tag: onboardingData.product.tag,
        workspace_id: onboardingData.product.workspace_id
      } : undefined,
      app: onboardingData.app ? {
        _id: onboardingData.app._id,
        app_name: onboardingData.app.app_name,
        description: onboardingData.app.description,
        tag: onboardingData.app.tag,
        base_url: onboardingData.app.base_url,
        workspace_id: onboardingData.app.workspace_id
      } : undefined,
      auth: onboardingData.auth ? {
        _id: onboardingData.auth._id,
        name: onboardingData.auth.name,
        tag: onboardingData.auth.tag,
        description: onboardingData.auth.description,
        setup_type: onboardingData.auth.setup_type
      } : undefined
    };
    
    localStorage.setItem('ductape-onboarding-data', JSON.stringify(safeData));
  }, [currentStep, onboardingData]);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Get started with Ductape Workbench',
      icon: Sparkles,
      component: WelcomeStep,
      completed: completedSteps.has(0),
    },
    {
      id: 'workspace',
      title: 'Create Workspace',
      description: 'Set up your first workspace',
      icon: Building2,
      component: WorkspaceStep,
      completed: completedSteps.has(1),
    },
    {
      id: 'product',
      title: 'Create Product',
      description: 'Build your first product',
      icon: Package,
      component: ProductStep,
      completed: completedSteps.has(2),
    },
    {
      id: 'complete',
      title: 'Complete',
      description: 'You\'re ready to go!',
      icon: CheckCircle,
      component: CompletionStep,
      completed: completedSteps.has(6),
    },
  ];

  const handleNext = (data?: any) => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    
    // Update onboarding data with new data
    if (data) {
      setOnboardingData(prev => ({ ...prev, ...data }));
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Clear onboarding data when completed
      localStorage.removeItem('ductape-onboarding-step');
      localStorage.removeItem('ductape-onboarding-data');
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const currentStepData = steps[currentStep];
  const CurrentComponent = currentStepData.component;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <currentStepData.icon className="h-4 w-4 text-primary" />
            </div>
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription>
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <CurrentComponent 
            onNext={handleNext} 
            onBack={currentStep > 0 ? handleBack : undefined}
            onComplete={onComplete}
            workspace={onboardingData.workspace}
            product={onboardingData.product}
            app={onboardingData.app}
            auth={onboardingData.auth}
          />
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between pt-4 border-t border-grey-400">
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index <= currentStep ? 'bg-primary' : 'bg-grey-300'
                )}
              />
            ))}
          </div>
          <div className="text-sm text-grey-600">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>

        {/* Skip Button */}
        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={handleSkip} className="text-grey-600">
            Skip Onboarding
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

