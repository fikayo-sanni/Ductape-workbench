import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { pollInterval } from '@/utils/workStream';
import {
  fetchWorkApprovals,
  fetchWorkContext,
  fetchWorkDependencies,
  fetchWorkItems,
  fetchWorkProducts,
  fetchWorkSessions,
  type IWorkAuth,
} from '@/services/workServices';

/** Without the live stream, the board re-reads at this pace; with it, the stream says when to. */
export const WORK_POLL_MS = 5000;

/** The signed-in person's access to the work tracker in the current workspace. */
export function useWorkAuth(): IWorkAuth | undefined {
  const { user, currentWorkspaceId } = useAuth();
  return currentWorkspaceId && user?._id && user.public_key ? { workspaceId: currentWorkspaceId, userId: user._id, publicKey: user.public_key } : undefined;
}

export function useWorkProducts() {
  const auth = useWorkAuth();
  return useQuery({ queryKey: ['work', 'products', auth?.workspaceId], queryFn: () => fetchWorkProducts(auth!), enabled: Boolean(auth) });
}

export function useWorkItems(product: string | undefined, live = false) {
  const auth = useWorkAuth();
  return useQuery({
    queryKey: ['work', 'items', auth?.workspaceId, product],
    queryFn: () => fetchWorkItems(auth!, product!),
    enabled: Boolean(auth && product),
    refetchInterval: pollInterval(live),
  });
}

export function useWorkSessions(product: string | undefined, live = false) {
  const auth = useWorkAuth();
  return useQuery({
    queryKey: ['work', 'sessions', auth?.workspaceId, product],
    queryFn: () => fetchWorkSessions(auth!, product),
    enabled: Boolean(auth && product),
    // Heartbeats are not changes to work, so an agent's last sign of life is still re-read on a timer.
    refetchInterval: live ? 15_000 : WORK_POLL_MS,
  });
}

export function useWorkDependencies(product: string | undefined, live = false) {
  const auth = useWorkAuth();
  return useQuery({
    queryKey: ['work', 'dependencies', auth?.workspaceId, product],
    queryFn: () => fetchWorkDependencies(auth!, product!),
    enabled: Boolean(auth && product),
    refetchInterval: pollInterval(live),
  });
}

export function useWorkContext(ref: string | null, live = false) {
  const auth = useWorkAuth();
  return useQuery({
    queryKey: ['work', 'context', auth?.workspaceId, ref],
    queryFn: () => fetchWorkContext(auth!, ref!),
    enabled: Boolean(auth && ref),
    refetchInterval: pollInterval(live),
  });
}

/** What waits for a person's approval: every product, or one. */
export function useWorkApprovals(product?: string, live = false) {
  const auth = useWorkAuth();
  return useQuery({
    queryKey: ['work', 'approvals', auth?.workspaceId, product ?? '*'],
    queryFn: () => fetchWorkApprovals(auth!, product),
    enabled: Boolean(auth),
    refetchInterval: pollInterval(live),
  });
}
