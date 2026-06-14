import { useQuery } from '@tanstack/react-query';
import {
  fetchActivityTimelineSeries,
  type ActivityComponentKind,
  type ActivityTimelineQuery,
} from '@/services/activityTimelineService';
import { resolveActivityPeriod, type ActivityPeriodPreset } from '@/lib/activity-period';
import { useAuth } from '@/store/useAuth';
import { useMemo } from 'react';

export interface UseActivityTimelineParams {
  kind: ActivityComponentKind;
  productTag?: string;
  componentTag?: string;
  env?: string;
  appId?: string;
  sessionTag?: string;
  sessionUserId?: string;
  period: ActivityPeriodPreset;
  customStart?: string;
  customEnd?: string;
  enabled?: boolean;
}

export function useActivityTimeline(params: UseActivityTimelineParams) {
  const { user, currentWorkspaceId } = useAuth();
  const range = useMemo(
    () => resolveActivityPeriod(params.period, params.customStart, params.customEnd),
    [params.period, params.customStart, params.customEnd],
  );

  const enabled =
    Boolean(params.enabled !== false) &&
    Boolean(currentWorkspaceId && user?._id && user?.public_key);

  return useQuery({
    queryKey: [
      'activity-timeline',
      params.kind,
      currentWorkspaceId,
      params.productTag,
      params.componentTag,
      params.env,
      params.appId,
      params.sessionTag,
      params.sessionUserId,
      range.startDate,
      range.endDate,
      range.groupBy,
    ],
    queryFn: async () => {
      const query: ActivityTimelineQuery = {
        workspaceId: currentWorkspaceId!,
        userId: user!._id,
        publicKey: user!.public_key,
        kind: params.kind,
        productTag: params.productTag,
        componentTag: params.componentTag,
        env: params.env,
        appId: params.appId,
        sessionTag: params.sessionTag,
        sessionUserId: params.sessionUserId,
        range,
      };
      return fetchActivityTimelineSeries(query);
    },
    enabled,
    staleTime: 60_000,
  });
}
