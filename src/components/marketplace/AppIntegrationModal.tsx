import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
} from 'lucide-react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useIntegration } from '@/context/integration-context';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import productServices from '@/services/productServices';
import StepOne from './StepOne';
import StepTwo from './StepTwo';
import StepThree from './StepThree';
import StepFour from './StepFour';

interface MarketplaceApp {
  _id: string;
  app_name: string;
  domain_name: string;
  description?: string;
  logo?: string;
  tag?: string;
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
  const { openTab } = useWorkbenchStore();
  const { data: integrationData, resetIntegration } = useIntegration();
  const queryClient = useQueryClient();
  const { user, currentWorkspaceId } = useAuth();

  const [integrationStep, setIntegrationStep] = useState<number>(1);
  const [appDetails, setAppDetails] = useState<any>(null);

  const handleStepComplete = () => {
    // Skip step 3 if app has no variables
    const latestVersion = appDetails?.versions?.find((v: any) => v.latest);
    const hasVariables = latestVersion?.variables && latestVersion.variables.length > 0;

    if (integrationStep === 2 && !hasVariables) {
      // Skip step 3 (variables) and go directly to step 4 (auth)
      setIntegrationStep(4);
    } else if (integrationStep < 4) {
      setIntegrationStep(integrationStep + 1);
    }
  };

  const handleStepBack = () => {
    // Skip step 3 backwards if app has no variables
    const latestVersion = appDetails?.versions?.find((v: any) => v.latest);
    const hasVariables = latestVersion?.variables && latestVersion.variables.length > 0;

    if (integrationStep === 4 && !hasVariables) {
      // Skip step 3 (variables) and go back to step 2 (environments)
      setIntegrationStep(2);
    } else if (integrationStep > 1) {
      setIntegrationStep(integrationStep - 1);
    }
  };

  const handleFinish = async () => {
    setIntegrationStep(5); // success step

    // Invalidate product queries to refresh data
    await queryClient.invalidateQueries({ queryKey: ['products'] });

    // Open the product tab if we have the product tag
    if (integrationData?.productTag && user?._id && currentWorkspaceId) {
      try {
        // Fetch fresh products data
        const productsData = await productServices.fetchProducts({
          workspace_id: currentWorkspaceId,
          user_id: user._id,
          public_key: user.public_key || '',
          status: 'all',
        });

        // Find the product by tag
        const product = productsData?.data?.find((p: any) => p.tag === integrationData.productTag);

        if (product) {
          // Invalidate specific product query
          await queryClient.invalidateQueries({ queryKey: ['product', product._id] });

          // Open the product tab
          openTab({
            id: `product-${product._id}`,
            type: 'product',
            title: product.name,
            itemId: product._id,
            data: product,
          });
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
      }
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setIntegrationStep(1);
    setAppDetails(null);
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
              <DialogTitle className="dark:text-white">Integrate {app.app_name}</DialogTitle>
              <DialogDescription className="dark:text-gray-300">
                Add this app to your product and start using its features
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {integrationStep === 1 && (
            <StepOne
              goToNextStep={handleStepComplete}
              app={app}
              setAppDetails={setAppDetails}
            />
          )}

          {integrationStep === 2 && appDetails && (
            <StepTwo
              goToNextStep={handleStepComplete}
              goToPreviousStep={handleStepBack}
              app={appDetails}
            />
          )}

          {integrationStep === 3 && appDetails && (
            <StepThree
              goToNextStep={handleStepComplete}
              goToPreviousStep={handleStepBack}
              app={appDetails}
            />
          )}

          {integrationStep === 4 && appDetails && (
            <StepFour
              goToPreviousStep={handleStepBack}
              handleFinish={handleFinish}
              app={appDetails}
            />
          )}

          {integrationStep === 5 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-green/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green" />
              </div>
              <h3 className="text-lg font-semibold text-grey dark:text-white mb-2">
                Integration Successful!
              </h3>
              <p className="text-grey-600 dark:text-gray-300 mb-6">
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
