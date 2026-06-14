import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntegration } from '@/context/integration-context';
import { useQuery } from '@tanstack/react-query';
import productServices from '@/services/productServices';
import appServicesReal from '@/services/appServicesReal';
import { useAuth } from '@/store/useAuth';
import { Loader, ArrowRight, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useDuctape } from '@/hooks/useDuctape';

const formSchema = z.object({
  product_tag: z.string().min(1, "Product is required"),
});

interface StepProps {
  goToNextStep: VoidFunction;
  goToPreviousStep?: VoidFunction;
  setOpen?: (open: boolean) => void;
  handleFinish?: () => void;
  app?: any;
  productTag?: string | null;
  setAppDetails?: (app: any) => void;
  excludeProductTag?: string;
}

export default function StepOne({
  goToNextStep,
  productTag,
  app,
  setAppDetails,
  excludeProductTag,
}: StepProps) {
  const { user, currentWorkspaceId } = useAuth();
  const { data: integrationData, setProductTag, setAccessTag, resetIntegration } = useIntegration();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user's products
  const { data: productsData } = useQuery({
    queryKey: ['products', user?._id],
    queryFn: () => productServices.fetchProducts({
      workspace_id: currentWorkspaceId || '',
      user_id: user?._id || '',
      public_key: user?.public_key || '',
      status: 'all',
    }),
    enabled: !!user?._id && !!user?.public_key && !!currentWorkspaceId,
  });

  const products = (productsData?.data ?? []).filter(
    (product: { tag?: string }) => product.tag !== excludeProductTag,
  );

  const productBuilder = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_tag:
        integrationData?.productTag && integrationData.productTag !== excludeProductTag
          ? integrationData.productTag
          : productTag && productTag !== excludeProductTag
            ? productTag
            : '',
    },
  });

  useEffect(() => {
    if (excludeProductTag && form.getValues('product_tag') === excludeProductTag) {
      form.setValue('product_tag', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeProductTag]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?._id || !user?.public_key || !currentWorkspaceId) {
      toast.error('Missing required configuration');
      return;
    }

    if (!productBuilder) {
      toast.error('Failed to initialize product builder');
      return;
    }

    try {
      setIsSubmitting(true);

      // Get app tag from the marketplace app
      const appTag = app?.domain_name || app?.tag;
      if (!appTag) {
        throw new Error('App tag not found');
      }

      // Fetch full app details including versions
      const appDetails = await appServicesReal.fetchAppByTag({
        tag: appTag,
        user_id: user._id,
        public_key: user.public_key,
      });

      if (!appDetails?.data) {
        throw new Error('Failed to fetch app details');
      }

      // Initialize product builder
      await productBuilder.init(values.product_tag);
      console.log('Setting productTag:', values.product_tag);
      setProductTag(values.product_tag);

      // Connect app to product
      const { access_tag } = await productBuilder.apps.connect(values.product_tag, appTag);
      console.log('Setting accessTag:', access_tag);
      setAccessTag(access_tag);

      // Store app details with access_tag for next steps
      const appWithAccess = {
        ...appDetails.data,
        access_tag
      };

      if (setAppDetails) {
        setAppDetails(appWithAccess);
      }

      goToNextStep();
    } catch (error) {
      console.error('Failed to connect app:', error);
      toast.error('Failed to connect app');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset integration state when mounting step one
  useEffect(() => {
    if (!integrationData?.productTag) {
      resetIntegration();
    }
  }, [integrationData?.productTag, resetIntegration]);

  useEffect(() => {
    if (productTag && productTag !== excludeProductTag) {
      form.setValue('product_tag', productTag);
      // Auto submit if product tag is provided
      form.handleSubmit(onSubmit)();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productTag, excludeProductTag]);

  // Early return if required data is missing or still loading
  if (!user?._id || !user?.public_key || !currentWorkspaceId) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-grey-600">Missing required configuration</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-blue/10 flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-blue dark:text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-grey mb-2">Select Product</h2>
        <p className="text-grey-600">
          {excludeProductTag
            ? 'Choose a different product to connect this app with'
            : 'Choose which product to integrate this app with'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="product_tag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Product</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-grey-600 text-center">
                          No other products available in this workspace.
                        </div>
                      ) : (
                        products.map((product: any) => (
                          <SelectItem key={product._id} value={product.tag}>
                            {product.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || products.length === 0}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
