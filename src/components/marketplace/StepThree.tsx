import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntegration } from '@/context/integration-context';
import { Variable } from 'lucide-react';
import { useEffect } from 'react';

const variableSchema = z.object({
  isSelected: z.boolean().default(false),
  key: z.string().min(1, "Variable name is required"),
  value: z.string().optional(),
  environment: z.string().min(1, "Environment is required"),
  environmentValues: z.record(z.string(), z.string()).optional(),
});

const formSchema = z.object({
  variables: z
    .array(variableSchema)
    .min(1, "At least one variable is required"),
});

interface StepProps {
  goToNextStep: VoidFunction;
  goToPreviousStep: VoidFunction;
  app: any;
}

export default function StepThree({
  goToNextStep,
  goToPreviousStep,
  app,
}: StepProps) {
  const { data: integrationData, setVariables } = useIntegration();
  const latestVersion = app.versions?.find((v: any) => v.latest);
  const appVariables = latestVersion?.variables || [];
  const appEnvs = latestVersion?.envs || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variables: []
    }
  });

  // Update form when variables are loaded
  useEffect(() => {
    if (appVariables.length > 0) {
      const defaultVariables = Object.keys(integrationData.variables).length > 0
        ? appVariables.map((variable: any) => {
            const savedVariable = integrationData.variables[variable.key];
            return {
              key: variable.key,
              isSelected: savedVariable?.isSelected ?? false,
              value: savedVariable?.value ?? '',
              environment: savedVariable?.environment ?? 'all',
              environmentValues: savedVariable?.environmentValues ?? {}
            };
          })
        : appVariables.map((variable: any) => ({
            key: variable.key,
            isSelected: false,
            value: '',
            environment: 'all',
            environmentValues: {}
          }));

      form.reset({ variables: defaultVariables });
    }
  }, [appVariables.length, integrationData.variables]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const selectedVariables = values.variables
      .filter((v: any) => v.isSelected)
      .reduce((acc: any, v: any) => ({
        ...acc,
        [v.key]: {
          isSelected: v.isSelected,
          value: v.value,
          environment: v.environment,
          environmentValues: v.environmentValues
        }
      }), {});

    setVariables(selectedVariables);
    goToNextStep();
  };

  const handleNext = () => {
    if (appVariables.length === 0) {
      setVariables({});
      goToNextStep();
    } else {
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <div className="space-y-6 max-h-[70vh] flex flex-col">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-orange/10 flex items-center justify-center mb-4">
          <Variable className="h-8 w-8 text-orange" />
        </div>
        <h2 className="text-xl font-bold text-grey mb-2">Application Variable Setup</h2>
        <p className="text-grey-600">
          Setup selected application's variables
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleNext();
        }} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            {appVariables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <p className="text-grey-600 text-center">No variables are required for this application.</p>
                <p className="text-grey-500 text-sm text-center">You can proceed to the next step.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {form.watch('variables').map((_, index) => (
                  <div key={index}>
                    <div className="flex items-start gap-4">
                      <FormField
                        control={form.control}
                        name={`variables.${index}.isSelected`}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 m-auto pt-8">
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
                        <div className="flex gap-6">
                          <FormItem className="flex-1">
                            <FormLabel className="text-grey-700">Variable Name</FormLabel>
                            <div className="h-10 px-3 rounded-md border border-grey-200 bg-grey-50 text-grey-700 flex items-center">
                              {appVariables[index]?.key || 'Unknown Variable'}
                            </div>
                          </FormItem>

                          <FormField
                            control={form.control}
                            name={`variables.${index}.value`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className="text-grey-700">Value</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter value"
                                    {...field}
                                    disabled={!form.watch(`variables.${index}.isSelected`)}
                                    className="h-10"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`variables.${index}.environment`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className="text-grey-700">Environment</FormLabel>
                                <Select
                                  disabled={!form.watch(`variables.${index}.isSelected`)}
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select environment" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="all">All Environments</SelectItem>
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

                        {form.watch(`variables.${index}.environment`) !== 'all' && (
                          <div className="mt-4 space-y-4">
                            {appEnvs
                              .filter((env: any) => env.slug !== form.watch(`variables.${index}.environment`))
                              .map((env: any) => (
                                <div key={env.slug} className="flex gap-6">
                                  <FormItem className="flex-1">
                                    <FormLabel className="text-grey-700">Variable Name</FormLabel>
                                    <div className="h-10 px-3 rounded-md border border-grey-200 bg-grey-50 text-grey-700 flex items-center">
                                      {appVariables[index]?.key || 'Unknown Variable'}
                                    </div>
                                  </FormItem>

                                  <FormField
                                    control={form.control}
                                    name={`variables.${index}.environmentValues.${env.slug}`}
                                    render={({ field }) => (
                                      <FormItem className="flex-1">
                                        <FormLabel className="text-grey-700">Value</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Enter value"
                                            {...field}
                                            disabled={!form.watch(`variables.${index}.isSelected`)}
                                            className="h-10"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6 border-t border-grey-200 mt-4">
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
