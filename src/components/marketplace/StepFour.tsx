import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Loader, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useIntegration } from '@/context/integration-context';

interface TokenData {
  key: string;
  sampleValue?: string;
  category?: string;
}

interface IAuth {
  tag: string;
  name: string;
  setup_type: string;
  action_tag?: string;
  tokens?: {
    params: { sample: string; data: TokenData[] };
    body: { sample: string; data: TokenData[] };
    query: { sample: string; data: TokenData[] };
    headers: { sample: string; data: TokenData[] };
  };
}

interface IAction {
  tag: string;
  name: string;
  description?: string;
  setup_type: string;
  body?: {
    type?: string;
    sample?: string;
    data?: TokenData[];
  };
  query?: {
    type?: string;
    sample?: string;
    data?: TokenData[];
  };
  headers?: {
    type?: string;
    sample?: string;
    data?: TokenData[];
  };
  params?: {
    type?: string;
    sample?: string;
    data?: TokenData[];
  };
}

interface IEnv {
  slug: string;
  env_name: string;
}

interface StepProps {
  goToPreviousStep: () => void;
  handleFinish: () => void;
  app: {
    tag: string;
    access_tag?: string;
    versions?: Array<{
      latest?: boolean;
      auths?: IAuth[];
      envs?: IEnv[];
      actions?: IAction[];
    }>;
  };
}

const formSchema = z.object({
  auth_tag: z.string({
    required_error: "Please select an authorization to display.",
  }),
  fields: z.array(z.object({
    key: z.string().min(1, "Key is required"),
    value: z.string().optional(),
    addTo: z.enum(["headers", "body", "params", "query"]),
    environment: z.string().min(1, "Environment is required"),
    environmentValues: z.record(z.string(), z.string()).default({}),
    sampleValue: z.string().optional(),
  })).default([]),
});

type FormValues = z.infer<typeof formSchema>;

export default function StepFour({
  goToPreviousStep,
  handleFinish,
  app,
}: StepProps) {
  const { user, currentWorkspaceId } = useAuth();
  const { data: integrationData } = useIntegration();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_selectedAuth, setSelectedAuth] = useState<IAuth | null>(null);
  const [isTokenAccess, setIsTokenAccess] = useState(false);
  const [action, setAction] = useState<IAction | null>(null);

  const productBuilder = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  const latestVersion = app.versions?.find(v => v.latest);
  const appAuths = latestVersion?.auths || [];
  const appEnvs = latestVersion?.envs || [];
  const appActions = latestVersion?.actions || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      auth_tag: '',
      fields: [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "fields"
  });

  useEffect(() => {
    if (appAuths.length > 0) {
      const auth = appAuths[0];
      setSelectedAuth(auth);
      setIsTokenAccess(auth.setup_type === 'token_access');
      form.setValue('auth_tag', auth.tag);

      if (auth.setup_type === 'token_access' && auth.tokens) {
        // Handle token access
        const tokenFields: FormValues['fields'] = [];
        Object.entries(auth.tokens).forEach(([location, data]) => {
          data.data?.forEach(token => {
            tokenFields.push({
              key: token.key,
              value: '',
              addTo: location as "headers" | "body" | "params" | "query",
              environment: 'all',
              environmentValues: {},
              sampleValue: token.sampleValue,
            });
          });
        });
        form.setValue('fields', tokenFields);
      } else if (auth.action_tag) {
        // Handle action fields
        const foundAction = appActions?.find(a => a.tag === auth.action_tag);
        if (foundAction) {
          setAction(foundAction);
          const actionFields: FormValues['fields'] = [];

          // Add fields from body
          if (foundAction.body?.data) {
            foundAction.body.data.forEach(field => {
              actionFields.push({
                key: field.key,
                value: '',
                addTo: 'body',
                environment: 'all',
                environmentValues: {},
                sampleValue: field.sampleValue,
              });
            });
          }

          // Add fields from query
          if (foundAction.query?.data) {
            foundAction.query.data.forEach(field => {
              actionFields.push({
                key: field.key,
                value: '',
                addTo: 'query',
                environment: 'all',
                environmentValues: {},
                sampleValue: field.sampleValue,
              });
            });
          }

          // Add fields from headers
          if (foundAction.headers?.data) {
            foundAction.headers.data.forEach(field => {
              actionFields.push({
                key: field.key,
                value: '',
                addTo: 'headers',
                environment: 'all',
                environmentValues: {},
                sampleValue: field.sampleValue,
              });
            });
          }

          // Add fields from params
          if (foundAction.params?.data) {
            foundAction.params.data.forEach(field => {
              actionFields.push({
                key: field.key,
                value: '',
                addTo: 'params',
                environment: 'all',
                environmentValues: {},
                sampleValue: field.sampleValue,
              });
            });
          }

          form.setValue('fields', actionFields);
        }
      }
    }
  }, [appAuths, appActions, form]);

  const onSubmit = async (values: FormValues) => {
    // Use environment mappings from StepTwo (product env -> app env)
    const environmentMappings = integrationData.environmentMappings || [];

    const envs = environmentMappings
      .filter((mapping: any) => mapping.isSelected)
      .map((mapping: any) => {
        const authData: any = {
          headers: {},
          query: {},
          params: {},
          body: {},
        };

        if (values.fields) {
          // Handle both token and action fields
          values.fields.forEach(field => {
            const fieldValue = field.value || '';
            // Check if field applies to this app environment
            if (field.environment === 'all') {
              authData[field.addTo][field.key] = fieldValue;
            } else if (field.environment === mapping.app_env_slug) {
              authData[field.addTo][field.key] = fieldValue;
            } else if (field.environmentValues?.[mapping.app_env_slug]) {
              authData[field.addTo][field.key] = field.environmentValues[mapping.app_env_slug];
            }
          });

          // Add action_tag if it's not token access
          if (!isTokenAccess && action) {
            authData.action_tag = action.tag;
          }
        }

        // Build variables array from integrationData
        const variables: any[] = [];
        if (integrationData.variables) {
          Object.entries(integrationData.variables).forEach(([key, varData]: [string, any]) => {
            if (varData.isSelected) {
              // Check if variable applies to this app environment
              if (varData.environment === 'all') {
                variables.push({ key, value: varData.value });
              } else if (varData.environment === mapping.app_env_slug) {
                variables.push({ key, value: varData.value });
              } else if (varData.environmentValues?.[mapping.app_env_slug]) {
                variables.push({ key, value: varData.environmentValues[mapping.app_env_slug] });
              }
            }
          });
        }

        return {
          app_env_slug: mapping.app_env_slug,
          product_env_slug: mapping.product_env_slug,
          variables,
          auth: {
            auth_tag: values.auth_tag,
            data: authData,
          },
        };
      });

    const integrationDetails = { access_tag: app.access_tag || integrationData.accessTag, envs };

    // Directly integrate
    if (!productBuilder || !integrationData.productTag) {
      toast.error('Missing product configuration');
      setIsSubmitting(false);
      return;
    }

    try {
      setIsSubmitting(true);
      await productBuilder.init(integrationData.productTag);
      await productBuilder.apps.add(integrationDetails);
      toast.success('App integrated successfully!');
      handleFinish();
    } catch (error) {
      console.error('Integration error:', error);
      toast.error('Failed to integrate app');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[70vh] flex flex-col">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple/10 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-purple" />
          </div>
          <h2 className="text-xl font-bold text-grey mb-2">Authentication Setup</h2>
          <p className="text-grey-600">
            Setup selected application's authentication
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <FormField
                control={form.control}
                name="auth_tag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-grey-700">Authentication Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select authentication type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {appAuths.map(auth => (
                          <SelectItem key={auth.tag} value={auth.tag}>
                            {auth.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-3">
                    <div className="flex gap-3">
                      <FormField
                        control={form.control}
                        name={`fields.${index}.key`}
                        render={({ field: keyField }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-grey-700">Key</FormLabel>
                            <FormControl>
                              <Input {...keyField} disabled className="bg-grey-50 h-10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`fields.${index}.value`}
                        render={({ field: valueField }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-grey-700">Value</FormLabel>
                            <FormControl>
                              <Input
                                {...valueField}
                                placeholder={form.watch(`fields.${index}.sampleValue`) || "Enter value"}
                                className="h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`fields.${index}.addTo`}
                        render={({ field: addToField }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-grey-700">Add To</FormLabel>
                            <Select
                              onValueChange={addToField.onChange}
                              value={addToField.value}
                              disabled={isTokenAccess}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="headers">Headers</SelectItem>
                                <SelectItem value="params">Parameters</SelectItem>
                                <SelectItem value="query">Query</SelectItem>
                                <SelectItem value="body">Body</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`fields.${index}.environment`}
                        render={({ field: envField }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-grey-700">Environment</FormLabel>
                            <Select
                              value={envField.value}
                              onValueChange={envField.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Select environment" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">All Environments</SelectItem>
                                {appEnvs.map(env => (
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

                    {form.watch(`fields.${index}.environment`) !== 'all' && (
                      <div className="mt-4 space-y-4">
                        {appEnvs
                          .filter(env => env.slug !== form.watch(`fields.${index}.environment`))
                          .map(env => (
                            <div key={env.slug} className="flex gap-4">
                              <FormItem className="flex-1">
                                <FormLabel className="text-grey-700">Key</FormLabel>
                                <div className="h-10 px-3 rounded-md border border-grey-200 bg-grey-50 text-grey-700 flex items-center">
                                  {form.watch(`fields.${index}.key`)}
                                </div>
                              </FormItem>
                              <FormField
                                control={form.control}
                                name={`fields.${index}.environmentValues.${env.slug}`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel className="text-grey-700">Value</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder={form.watch(`fields.${index}.sampleValue`) || "Enter value"}
                                        {...field}
                                        className="h-10"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormItem className="flex-1">
                                <FormLabel className="text-grey-700">Add To</FormLabel>
                                <div className="h-10 px-3 rounded-md border border-grey-200 bg-grey-50 text-grey-700 flex items-center">
                                  {form.watch(`fields.${index}.addTo`)}
                                </div>
                              </FormItem>
                              <FormItem className="flex-1">
                                <FormLabel className="text-grey-700">Environment</FormLabel>
                                <div className="h-10 px-3 rounded-md border border-grey-200 bg-grey-50 text-grey-700 flex items-center">
                                  {env.env_name}
                                </div>
                              </FormItem>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-grey-200 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
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
