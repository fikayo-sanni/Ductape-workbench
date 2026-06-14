import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { fetchLogs } from '@/services/logsServices';
import { cn } from '@/lib/utils';

export function WebhookEnvMetrics({
  webhookTag,
  env,
}: {
  webhookTag: string;
  appTag: string;
  env: string;
  productTag?: string;
}) {
  const { user, currentWorkspaceId } = useAuth();

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['webhook-env-metrics', webhookTag, env],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key) {
        throw new Error('Missing auth parameters');
      }

      const response = await fetchLogs(
        {
          workspace_id: currentWorkspaceId,
          user_id: user._id,
          public_key: user.public_key,
        },
        {
          type: 'webhook',
          parent_tag: webhookTag,
          app_env: env,
          groupBy: 'week',
          limit: 100,
        }
      );

      const logs = response.data?.logs?.data || [];
      const successCount = logs.filter((l: { status?: string }) => l.status === 'success').length;
      const failedCount = logs.filter((l: { status?: string }) => l.status === 'fail').length;
      const totalCount = logs.length;

      return {
        totalRequests: totalCount,
        successfulRequests: successCount,
        failedRequests: failedCount,
        successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
      };
    },
    enabled: !!webhookTag && !!env && !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  const cells = [
    { label: 'Requests', value: metricsData?.totalRequests ?? 0, className: 'text-grey' },
    { label: 'Success', value: metricsData?.successfulRequests ?? 0, className: 'text-green' },
    { label: 'Failed', value: metricsData?.failedRequests ?? 0, className: 'text-red' },
    {
      label: 'Rate',
      value: isLoading ? '…' : `${metricsData?.successRate ?? 0}%`,
      className: cn(
        (metricsData?.successRate ?? 0) >= 90
          ? 'text-green'
          : (metricsData?.successRate ?? 0) >= 70
            ? 'text-orange-500'
            : 'text-red'
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cells.map((cell) => (
        <div key={cell.label} className="rounded-lg bg-grey-50 border border-grey-200 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-grey-500 font-medium">{cell.label}</p>
          <p className={cn('text-lg font-semibold tabular-nums', cell.className)}>
            {isLoading ? '…' : cell.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function useWebhookGlobalMetrics(webhookTag: string, appTag: string) {
  const { user, currentWorkspaceId } = useAuth();

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['webhook-global-metrics', webhookTag, appTag],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key) {
        throw new Error('Missing auth parameters');
      }

      const response = await fetchLogs(
        {
          workspace_id: currentWorkspaceId,
          user_id: user._id,
          public_key: user.public_key,
        },
        {
          type: 'webhook',
          parent_tag: webhookTag,
          groupBy: 'week',
          limit: 500,
        }
      );

      const logs = response.data?.logs?.data || [];
      const successCount = logs.filter((l: { status?: string }) => l.status === 'success').length;
      const failedCount = logs.filter((l: { status?: string }) => l.status === 'fail').length;
      const totalCount = logs.length;

      const now = new Date();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dailyActivity: Array<{ day: string; requests: number; successful: number; failed: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayStr = days[date.getDay()];
        const dayLogs = logs.filter((l: { timestamp?: string; created_at?: string; status?: string }) => {
          const logDate = new Date(l.timestamp || l.created_at || '');
          return (
            logDate.getDate() === date.getDate() &&
            logDate.getMonth() === date.getMonth() &&
            logDate.getFullYear() === date.getFullYear()
          );
        });
        dailyActivity.push({
          day: dayStr,
          requests: dayLogs.length,
          successful: dayLogs.filter((l) => l.status === 'success').length,
          failed: dayLogs.filter((l) => l.status === 'fail').length,
        });
      }

      return {
        totalRequests: totalCount,
        successfulRequests: successCount,
        failedRequests: failedCount,
        successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
        dailyActivity,
      };
    },
    enabled: !!webhookTag && !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  return { metricsData, isLoading };
}
