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
    queryFn: async () => {
      const response = await workspaceServices.fetchWorkspaces({
        user_id,
        public_key,
      });
      if (!response) throw new Error('Could not load workspaces');
      return response;
    },
    enabled: !!user_id && !!public_key,
  });
}
