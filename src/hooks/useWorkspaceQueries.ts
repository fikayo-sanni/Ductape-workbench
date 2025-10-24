import { useQuery } from '@tanstack/react-query';
import workspaceServices from '@/services/workspaceServices';

export function useFetchWorkspaces({
  user_id,
  public_key,
}: {
  user_id: string;
  public_key: string;
}) {
  return useQuery({
    queryKey: ['workspaces', user_id],
    queryFn: () =>
      workspaceServices.fetchWorkspaces({
        user_id,
        public_key,
      }),
    enabled: !!user_id && !!public_key,
  });
}
