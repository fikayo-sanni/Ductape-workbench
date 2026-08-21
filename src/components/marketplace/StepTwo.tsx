import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Settings, Loader } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntegration } from '@/context/integration-context';
import { useQuery } from '@tanstack/react-query';
import productServices from '@/services/productServices';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { toast } from 'react-hot-toast';

const variableSchema = z.object({ key: z.string(), value: z.string() });

const mapEnvironmentsSchema = z
  .object({
    isSelected: z.boolean().default(false),
    product_env_slug: z.string(),
    app_env_slug: z.string(),
    variables: z.array(variableSchema).optional().default([]),
  })
  .superRefine((env, ctx) => {
    if (!env.isSelected) return;
    env.variables?.forEach((v, i) => {
      if (!v.value.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Required',
          path: ['variables', i, 'value'],
        });
      }
    });
  });

const formSchema = z.object({
  environments: z.array(mapEnvironmentsSchema),
});

interface StepTwoProps {
  goToPreviousStep: () => void;
  handleFinish: () => void;
  app: any;
}

export default function StepTwo({ goToPreviousStep, handleFinish, app }: StepTwoProps) {
  const { data: integrationData, setEnvironmentMappings } = useIntegration();
  const { user, currentWorkspaceId } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productBuilder = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

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
    if (productEnvs.length > 0 && appEnvs.length > 0) {
      const defaultEnvironments = integrationData.environmentMappings.length > 0
        ? integrationData.environmentMappings.map((m: any) => ({
            ...m,
            variables: m.variables ?? [],
          }))
        : productEnvs.map((env: any) => {
            const appEnv = appEnvs.find((a: any) => a.slug === env.slug);
            const variables = (appEnv?.base_url_variables ?? []).map((v: { key: string }) => ({ key: v.key, value: '' }));
            return {
              isSelected: true,
              product_env_slug: env.slug,
              app_env_slug: env.slug,
              variables,
            };
          });

      form.reset({ environments: defaultEnvironments });
    }
  }, [productEnvs.length, appEnvs.length, integrationData.environmentMappings.length]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setEnvironmentMappings(values.environments);

    // Perform integration directly
    if (!productBuilder || !integrationData.productTag) {
      toast.error('Missing product configuration');
      return;
    }

    try {
      setIsSubmitting(true);

      // Build environment mappings for integration (include base_url variable values)
      const envs = values.environments
        .filter((mapping: any) => mapping.isSelected)
        .map((mapping: any) => ({
          app_env_slug: mapping.app_env_slug,
          product_env_slug: mapping.product_env_slug,
          variables: (mapping.variables ?? []).filter((v: { key: string; value: string }) => v.key).map((v: { key: string; value: string }) => ({ key: v.key, value: v.value })),
        }));

      const integrationDetails = {
        access_tag: app.access_tag || integrationData.accessTag,
        envs
      };

      // await productBuilder.init(integrationData.productTag);
      await productBuilder.apps.add(integrationData.productTag, integrationDetails);
      toast.success('App integrated successfully!');
      handleFinish();
    } catch (error) {
      console.error('Integration error:', error);
      toast.error('Failed to integrate app');
    } finally {
      setIsSubmitting(false);
    }
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
                      render={({ field }) => {
                        const selectedAppEnv = appEnvs.find((e: any) => e.slug === field.value);
                        const baseUrlVars = selectedAppEnv?.base_url_variables ?? [];
                        return (
                          <FormItem className="flex-1">
                            <FormLabel className="text-grey-700">App Environment</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(val);
                                const env = appEnvs.find((e: any) => e.slug === val);
                                const vars = (env?.base_url_variables ?? []).map((v: { key: string }) => ({ key: v.key, value: '' }));
                                form.setValue(`environments.${index}.variables`, vars);
                              }}
                              value={field.value}
                            >
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
                        );
                      }}
                    />
                  </div>
                  {/* Base URL variables for parameterized envs (e.g. https://{{prefix}}-checkout.example.com) */}
                  {(() => {
                    const selectedSlug = form.watch(`environments.${index}.app_env_slug`);
                    const selectedAppEnv = appEnvs.find((e: any) => e.slug === selectedSlug);
                    const baseUrlVars = selectedAppEnv?.base_url_variables ?? [];
                    if (baseUrlVars.length === 0) return null;
                    return (
                      <div className="mt-3 pl-12 space-y-2 border-l-2 border-grey-200 dark:border-grey-700">
                        <p className="text-xs font-medium text-grey-600 dark:text-grey-400 mt-1">Base URL variables</p>
                        {baseUrlVars.map((v: { key: string }, vIdx: number) => (
                          <FormField
                            key={v.key}
                            control={form.control}
                            name={`environments.${index}.variables.${vIdx}.value`}
                            render={({ field: vField }) => (
                              <FormItem className="ml-2">
                                <FormLabel className="text-xs text-grey-600">{v.key}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={`Value for {{${v.key}}}`}
                                    {...vField}
                                    value={vField.value ?? ''}
                                    className="h-9"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    );
                  })()}
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
              disabled={isSubmitting}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Integrating...
                </>
              ) : (
                'Finish'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}