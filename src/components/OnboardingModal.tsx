import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
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
  Grid3x3,
  FileText,
  Key,
  Upload,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [formData, setFormData] = useState({
    workspace_name: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
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
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-2"
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button type="submit" className="flex-1">
            Create Workspace
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
}

// Step 3: Create Product
function ProductStep({ onNext, onBack }: { onNext: (data: any) => void; onBack: () => void }) {
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    category: 'api',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
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
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="api">API Integration</SelectItem>
              <SelectItem value="webhook">Webhook Service</SelectItem>
              <SelectItem value="sdk">SDK/Client Library</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Describe your product..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-2"
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button type="submit" className="flex-1">
            Create Product
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
}

// Step 4: Create App
function AppStep({ onNext, onBack }: { onNext: (data: any) => void; onBack: () => void }) {
  const [formData, setFormData] = useState({
    app_name: '',
    tag: '',
    description: '',
    base_url: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const generateTag = () => {
    if (formData.app_name) {
      const tag = formData.app_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData({ ...formData, tag });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-purple/10 flex items-center justify-center mb-4">
          <Grid3x3 className="h-8 w-8 text-purple" />
        </div>
        <h2 className="text-xl font-bold text-grey mb-2">Create Your First App</h2>
        <p className="text-grey-600">
          An app contains your API endpoints, authentication, and configurations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="app_name" className="required">
            App Name
          </Label>
          <Input
            id="app_name"
            placeholder="e.g., GitHub API"
            value={formData.app_name}
            onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
            onBlur={generateTag}
            className="mt-2"
            required
          />
        </div>

        <div>
          <Label htmlFor="tag" className="required">
            App Tag
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="tag"
              placeholder="e.g., github-api"
              value={formData.tag}
              onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              required
            />
            <Button type="button" variant="outline" onClick={generateTag} size="sm">
              Auto-generate
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="base_url">Base URL (Optional)</Label>
          <Input
            id="base_url"
            placeholder="https://api.github.com"
            value={formData.base_url}
            onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Describe your app..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-2"
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button type="submit" className="flex-1">
            Create App
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
}

// Step 5: Import/Create Requests
function RequestStep({ onNext, onBack }: { onNext: (data: any) => void; onBack: () => void }) {
  const [choice, setChoice] = useState<'import' | 'create' | null>(null);

  const handleChoice = (selectedChoice: 'import' | 'create') => {
    setChoice(selectedChoice);
    onNext({ choice: selectedChoice });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-orange/10 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-orange" />
        </div>
        <h2 className="text-xl font-bold text-grey mb-2">Add Your First API Requests</h2>
        <p className="text-grey-600">
          You can either import existing API collections or create new requests from scratch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleChoice('import')}
          className="p-6 border border-grey-400 rounded-lg hover:border-primary hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-blue/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-blue" />
            </div>
            <div>
              <h3 className="font-semibold text-grey">Import from Postman</h3>
              <p className="text-sm text-grey-600">Upload your existing Postman collection</p>
            </div>
          </div>
          <p className="text-sm text-grey-600">
            Quickly import your existing API requests and start testing immediately.
          </p>
        </button>

        <button
          onClick={() => handleChoice('create')}
          className="p-6 border border-grey-400 rounded-lg hover:border-primary hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-green/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-green" />
            </div>
            <div>
              <h3 className="font-semibold text-grey">Create New Requests</h3>
              <p className="text-sm text-grey-600">Start building requests from scratch</p>
            </div>
          </div>
          <p className="text-sm text-grey-600">
            Create and test API requests step by step with our guided interface.
          </p>
        </button>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={() => handleChoice('create')} 
          className="flex-1"
          disabled={!choice}
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 6: Create Auth
function AuthStep({ onNext, onBack }: { onNext: (data: any) => void; onBack: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'api_key',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-yellow/10 flex items-center justify-center mb-4">
          <Key className="h-8 w-8 text-yellow" />
        </div>
        <h2 className="text-xl font-bold text-grey mb-2">Set Up Authentication</h2>
        <p className="text-grey-600">
          Configure how your app will authenticate with external APIs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name" className="required">
            Auth Name
          </Label>
          <Input
            id="name"
            placeholder="e.g., API Key Authentication"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-2"
            required
          />
        </div>

        <div>
          <Label htmlFor="type">Authentication Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="api_key">API Key</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="basic">Basic Auth</SelectItem>
              <SelectItem value="oauth2">OAuth 2.0</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button type="submit" className="flex-1">
            Create Auth
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
}

// Step 7: Completion
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
      id: 'app',
      title: 'Create App',
      description: 'Set up your first app',
      icon: Grid3x3,
      component: AppStep,
      completed: completedSteps.has(3),
    },
    {
      id: 'requests',
      title: 'Add Requests',
      description: 'Import or create API requests',
      icon: FileText,
      component: RequestStep,
      completed: completedSteps.has(4),
    },
    {
      id: 'auth',
      title: 'Set Up Auth',
      description: 'Configure authentication',
      icon: Key,
      component: AuthStep,
      completed: completedSteps.has(5),
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

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
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

