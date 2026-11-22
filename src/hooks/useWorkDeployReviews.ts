import { useQuery } from '@tanstack/react-query';
import { useDeployAuth } from '@/hooks/useProductDeployments';
import { fetchPlans } from '@/services/deployServices';
import { sortPlans } from '@/utils/deployControls';

/** Deploy changes have their own lifecycle, so poll even when the Work event stream is live. */
export function useWorkDeployReviews(product?: string, enabled = true) {
  const auth = useDeployAuth();
  const plans = useQuery({
    queryKey: ['deploy', 'plans', 'work_review', auth?.workspaceId, product ?? '*'],
    queryFn: async () => {
      // Read each actionable stage separately so completed history cannot hide an older pending plan.
      const groups = await Promise.all(['pending_approval', 'approved', 'ready'].map((stage) => fetchPlans(auth!, { product, stage })));
      return sortPlans([...new Map(groups.flat().map((plan) => [plan.id, plan])).values()]);
    },
    enabled: Boolean(auth && enabled),
    refetchInterval: 15_000,
    retry: false,
  });
  return { auth, plans };
}
