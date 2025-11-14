import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Loader } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntegration } from '@/context/integration-context';
import { useQuery } from '@tanstack/react-query';
import productServices from '@/services/productServices';
import { useAuth } from '@/store/useAuth';
import { useEffect } from 'react';

const mapEnvironmentsSchema = z.object({
  isSelected: z.boolean().default(false),
  product_env_slug: z.string(),
  app_env_slug: z.string(),
});

const formSchema = z.object({
  environments: z.array(mapEnvironmentsSchema),
});

interface StepTwoProps {
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  app: any;
}

export default function StepTwo({ goToNextStep, goToPreviousStep, app }: StepTwoProps) {
  const { data: integrationData, setEnvironmentMappings } = useIntegration();
  const { user, currentWorkspaceId } = useAuth();

  // Get app environments from latest version
  const latestVersion = app?.versions?.find((v: any) => v.latest);
  const appEnvs = latestVersion?.envs || [];

  // Fetch products list to get product ID (should be cached from StepOne)
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

  // Find the selected product to get its ID
  const selectedProduct = productsData?.data?.find((p: any) => p.tag === integrationData.productTag);

  // Fetch full product details to get environments
  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product', selectedProduct?._id],
    queryFn: async () => {
      if (!selectedProduct?._id) {
        throw new Error('Product not found');
      }

      const productResponse = await productServices.fetchProduct({
        product_id: selectedProduct._id,
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
      });

      return productResponse.data;
    },
    enabled: !!selectedProduct?._id && !!user?._id && !!user?.public_key && !!currentWorkspaceId,
  });

  const productEnvs = productData?.envs || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      environments: []
    }
  });

  // Update form when product environments are loaded
  useEffect(() => {
    if (productEnvs.length > 0) {
      const defaultEnvironments = integrationData.environmentMappings.length > 0
        ? integrationData.environmentMappings
        : productEnvs.map((env: any) => ({
            isSelected: true,
            product_env_slug: env.slug,
            app_env_slug: env.slug,
          }));

      form.reset({ environments: defaultEnvironments });
    }
  }, [productEnvs.length, integrationData.environmentMappings.length]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setEnvironmentMappings(values.environments);
    goToNextStep();
  };

  if (isLoadingProduct) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-grey-600">Loading product environments...</p>
        </div>
      </div>
    );
  }

  if (!productEnvs || productEnvs.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-grey-600">No product environments found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-green/10 flex items-center justify-center mb-4">
          <Settings className="h-8 w-8 text-green" />
        </div>
        <h2 className="text-xl font-bold text-grey mb-2">Map Integration Environments</h2>
        <p className="text-grey-600">
          Map product environments to application environments
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {form.watch('environments').map((_, index) => (
            <div key={index}>
              <div className="flex items-center gap-4">
                <FormField
                  control={form.control}
                  name={`environments.${index}.isSelected`}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 m-auto">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex flex-col gap-3 w-full pb-3">
                  <div className="flex gap-6 items-center">
                    <FormItem className="flex-1">
                      <FormLabel className="text-grey-700">Product Environment</FormLabel>
                      <div className="h-10 px-3 rounded-md border border-grey-200 bg-grey-50 text-grey-700 flex items-center">
                        {productEnvs[index]?.env_name || 'Unknown Environment'}
                      </div>
                    </FormItem>

                    <div className="flex flex-col items-center px-2 mt-6">
                      <span className="text-[0.625rem] text-grey-700 font-semibold">
                        maps to
                      </span>
                    </div>

                    <FormField
                      control={form.control}
                      name={`environments.${index}.app_env_slug`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-grey-700">App Environment</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select environment" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {appEnvs.map((env: any) => (
                                <SelectItem key={env.slug} value={env.slug}>
                                  {env.env_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                goToPreviousStep();
              }}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              Next
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}