import { Button } from "@/components/ui/button";
import {
  DialogContent,
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntegration } from '@/context/integration-context';
import { useQuery } from '@tanstack/react-query';
import productServices from '@/services/productServices';
import { useAuth } from '@/store/useAuth';
import { Loader, ArrowRight, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

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
}

export default function StepOne({
  goToNextStep,
  productTag,
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

  const products = productsData?.data ?? [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_tag: integrationData?.productTag || productTag || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?._id || !user?.public_key || !currentWorkspaceId) {
      toast.error('Missing required configuration');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // For now, we'll simulate the product builder connection
      // In a real implementation, this would use the Ductape SDK
      const mockAccessTag = `access_${Date.now()}`;
      
      setProductTag(values.product_tag);
      setAccessTag(mockAccessTag);
      
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
    if (productTag) {
      form.setValue('product_tag', productTag);
      // Auto submit if product tag is provided
      form.handleSubmit(onSubmit)();
    }
  }, [productTag, form, onSubmit]);

  // Early return if required data is missing or still loading
  if (!user?._id || !user?.public_key || !currentWorkspaceId) {
    return (
      <DialogContent className="px-7 pb-7 pt-4 max-w-[730px] border-b-4 border-b-primary sm:rounded-none">
        <div className="flex items-center justify-center p-8">
          <p className="text-grey-600">Missing required configuration</p>
        </div>
      </DialogContent>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-blue/10 flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-blue" />
        </div>
        <h2 className="text-xl font-bold text-grey mb-2">Select Product</h2>
        <p className="text-grey-600">
          Choose which product to integrate this app with
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
                      {products.map((product: any) => (
                        <SelectItem key={product._id} value={product.tag}>
                          {product.name}
                        </SelectItem>
                      ))}
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
              disabled={isSubmitting}
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
