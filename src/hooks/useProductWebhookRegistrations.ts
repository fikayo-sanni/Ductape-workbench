import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import type { ProductWebhookWithRegistration } from '@/utils/productWebhookRegistration';

export function useProductWebhookRegistrations(
  productTag: string | undefined,
  accessTag: string | undefined,
  enabled: boolean
) {
  const { user, currentWorkspaceId } = useAuth();

  const productDuctape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  }) as {
    init: (tag: string) => Promise<void>;
    apps: {
      webhooks: {
        list: (product: string, accessTag: string) => Promise<ProductWebhookWithRegistration[]>;
      };
    };
  } | null;

  return useQuery({
    queryKey: ['product-webhook-registrations', productTag, accessTag, currentWorkspaceId],
    queryFn: async () => {
      if (!productDuctape || !productTag || !accessTag) return [];
      await productDuctape.init(productTag);
      const list = await productDuctape.apps.webhooks.list(productTag, accessTag);
      return Array.isArray(list) ? list : [];
    },
    enabled: Boolean(enabled && productDuctape && productTag && accessTag),
    staleTime: 15 * 1000,
  });
}
