import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import {
  fetchWorkContext,
  fetchWorkDependencies,
  fetchWorkItems,
  fetchWorkProducts,
  fetchWorkSessions,
  type IWorkAuth,
} from '@/services/workServices';

/** Agents move work every few seconds; the board follows at this pace while it is open. */
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

export function useWorkItems(product: string | undefined) {
  const auth = useWorkAuth();
  return useQuery({
    queryKey: ['work', 'items', auth?.workspaceId, product],
    queryFn: () => fetchWorkItems(auth!, product!),
    enabled: Boolean(auth && product),
    refetchInterval: WORK_POLL_MS,
  });
}

export function useWorkSessions(product: string | undefined) {
  const auth = useWorkAuth();
  return useQuery({
    queryKey: ['work', 'sessions', auth?.workspaceId, product],
    queryFn: () => fetchWorkSessions(auth!, product),
    enabled: Boolean(auth && product),
    refetchInterval: WORK_POLL_MS,
  });
}

export function useWorkDependencies(product: string | undefined) {
  const auth = useWorkAuth();
  return useQuery({
    queryKey: ['work', 'dependencies', auth?.workspaceId, product],
    queryFn: () => fetchWorkDependencies(auth!, product!),
    enabled: Boolean(auth && product),
    refetchInterval: WORK_POLL_MS * 2,
  });
}

export function useWorkContext(ref: string | null) {
  const auth = useWorkAuth();
  return useQuery({
    queryKey: ['work', 'context', auth?.workspaceId, ref],
    queryFn: () => fetchWorkContext(auth!, ref!),
    enabled: Boolean(auth && ref),
    refetchInterval: WORK_POLL_MS,
  });
}
