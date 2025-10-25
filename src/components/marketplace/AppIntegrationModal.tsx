import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useIntegration } from '@/context/integration-context';
import StepOne from './StepOne';
import StepTwo from './StepTwo';

interface MarketplaceApp {
  _id: string;
  app_name: string;
  domain_name: string;
  description?: string;
  logo?: string;
  versions?: Array<{
    _id: string;
    version: string;
    latest: boolean;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface AppIntegrationModalProps {
  app: MarketplaceApp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AppIntegrationModal({ 
  app, 
  open, 
  onOpenChange 
}: AppIntegrationModalProps) {
  const { user } = useAuth();
  const { openTab } = useWorkbenchStore();
  const { data: integrationData, resetIntegration } = useIntegration();
  
  const [integrationStep, setIntegrationStep] = useState<'step1' | 'step2' | 'importing' | 'success'>('step1');



  // Integration mutation
  const { mutate: integrateApp } = useMutation({
    mutationFn: async () => {
      if (!app || !integrationData?.productTag || !user?._id || !user?.public_key) {
        throw new Error('Missing required data for integration');
      }

      // Simulate integration process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        productTag: integrationData.productTag,
        appId: app._id,
      };
    },
    onSuccess: () => {
      toast.success('App integrated successfully!');
      setIntegrationStep('success');
      
      // Open the marketplace tab to show success
      openTab({
        id: `marketplace-${Date.now()}`,
        type: 'marketplace',
        title: 'Marketplace',
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to integrate app');
      setIntegrationStep('step1');
    },
  });

  const handleStepOneComplete = () => {
    setIntegrationStep('step2');
  };

  const handleStepTwoComplete = () => {
    setIntegrationStep('importing');
    integrateApp();
  };

  const handleBackToStepOne = () => {
    setIntegrationStep('step1');
  };

  const handleClose = () => {
    onOpenChange(false);
    setIntegrationStep('step1');
    resetIntegration();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              {app.logo ? (
                <img
                  src={app.logo}
                  alt={app.app_name}
                  className="w-8 h-8 rounded object-cover"
                />
              ) : (
                <span className="text-primary font-semibold text-sm">
                  {getInitials(app.app_name)}
                </span>
              )}
            </div>
            <div>
              <DialogTitle>Integrate {app.app_name}</DialogTitle>
              <DialogDescription>
                Add this app to your product and start using its features
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {integrationStep === 'step1' && (
            <StepOne
              goToNextStep={handleStepOneComplete}
              app={app}
            />
          )}

          {integrationStep === 'step2' && (
            <StepTwo
              goToNextStep={handleStepTwoComplete}
              goToPreviousStep={handleBackToStepOne}
              app={app}
            />
          )}

          {integrationStep === 'importing' && (
            <div className="text-center py-12">
              <Loader className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-grey mb-2">
                Integrating App
              </h3>
              <p className="text-grey-600">
                Please wait while we integrate {app.app_name} into your product...
              </p>
            </div>
          )}

          {integrationStep === 'success' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-green/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green" />
              </div>
              <h3 className="text-lg font-semibold text-grey mb-2">
                Integration Successful!
              </h3>
              <p className="text-grey-600 mb-6">
                {app.app_name} has been successfully integrated into your product.
              </p>
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
