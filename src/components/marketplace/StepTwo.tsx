import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntegration } from '@/context/integration-context';

const mapEnvironmentsSchema = z.object({
  isSelected: z.boolean().default(false),
  app_env_slug: z.string(),
  product_env_slug: z.string(),
});

const formSchema = z.object({
  environments: z.array(mapEnvironmentsSchema),
});

interface StepTwoProps {
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  app: any;
}

export default function StepTwo({ goToNextStep, goToPreviousStep }: StepTwoProps) {
  const { setEnvironmentMappings } = useIntegration();

  // Mock data for app environments
  const appEnvs = [
    { slug: 'development', env_name: 'Development' },
    { slug: 'staging', env_name: 'Staging' },
    { slug: 'production', env_name: 'Production' },
  ];

  // Mock data for product environments
  const productEnvs = [
    { slug: 'dev', name: 'Development' },
    { slug: 'staging', name: 'Staging' },
    { slug: 'prod', name: 'Production' },
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      environments: appEnvs.map((env: any) => ({
        isSelected: true,
        app_env_slug: env.slug,
        product_env_slug: env.slug,
      }))
    }
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setEnvironmentMappings(values.environments);
    goToNextStep();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-green/10 flex items-center justify-center mb-4">
          <Settings className="h-8 w-8 text-green" />
        </div>
        <h2 className="text-xl font-bold text-grey mb-2">Map Integration Environments</h2>
        <p className="text-grey-600">
          Map selected application's environments to integration environments
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
                      <FormLabel className="text-grey-700">App Environment</FormLabel>
                      <div className="h-10 px-3 rounded-md border border-grey-200 bg-grey-50 text-grey-700 flex items-center">
                        {appEnvs[index]?.env_name || 'Unknown Environment'}
                      </div>
                    </FormItem>

                    <div className="flex flex-col items-center px-2 mt-6">
                      <span className="text-[0.625rem] text-grey-700 font-semibold">
                        maps to
                      </span>
                    </div>

                    <FormField
                      control={form.control}
                      name={`environments.${index}.product_env_slug`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-grey-700">Product Environment</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select environment" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {productEnvs.map((env: any) => (
                                <SelectItem key={env.slug} value={env.slug}>
                                  {env.name}
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