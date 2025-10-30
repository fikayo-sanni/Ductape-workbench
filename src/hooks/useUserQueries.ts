import { useQuery } from '@tanstack/react-query';
import { userServices } from '@/services/userServices';

export function useFetchUserDetails({
  user_id,
  public_key,
}: {
  user_id: string;
  public_key: string;
}) {
  return useQuery({
    queryKey: ['user-details', user_id],
    queryFn: () =>
      userServices.fetchUserDetails({
        user_id,
        public_key,
      }),
    enabled: !!user_id && !!public_key,
  });
}

