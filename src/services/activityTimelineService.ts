import {
  fetchCacheDashboard,
  fetchDatabaseDashboard,
  fetchGraphDashboard,
  fetchMessageBrokerDashboard,
  fetchNotificationDashboard,
  fetchSessionUserDashboard,
  fetchStorageDashboard,
  fetchVectorDashboard,
  fetchLogs,
} from '@/services/logsServices';
import type { FetchLogsData, FetchLogsOptions } from '@/types/logs';
import {
  activityBucketLabel,
  bucketLogTimestamp,
  logLatencyMs,
  logOutcome,
  normalizeActivityPoints,
  normalizeTimelineDateKey,
  type ActivityDateRange,
  type ActivityGroupBy,
  type ActivityTimelinePoint,
} from '@/lib/activity-period';

export type ActivityComponentKind =
  | 'app'
  | 'database'
  | 'storage'
  | 'graph'
  | 'vector'
  | 'cache'
  | 'broker'
  | 'notification'
  | 'session'
  | 'session-user'
  | 'webhook'
  | 'agent'
  | 'job'
  | 'feature'
  | 'healthcheck'
  | 'quota'
  | 'fallback'
  | 'workspace';

export interface ActivityTimelineQuery {
  workspaceId: string;
  userId: string;
  publicKey: string;
  kind: ActivityComponentKind;
  productTag?: string;
  componentTag?: string;
  env?: string;
  appId?: string;
  sessionTag?: string;
  sessionUserId?: string;
  range: ActivityDateRange;
}

function combinedSessionTag(productTag?: string, sessionTag?: string): string | undefined {
  if (!sessionTag) return undefined;
  if (productTag && sessionTag.startsWith(`${productTag}:`)) return sessionTag;
  return productTag ? `${productTag}:${sessionTag}` : sessionTag;
}

type TimelineRow = { date: string; sessions?: number; operations?: number };
type LatencyRow = { date: string; avgLatencyMs: number | null };
type OutcomeRow = { date: string; successful: number; failed: number };

function mapDashboardTimeline(
  activity: TimelineRow[],
  latency: LatencyRow[] | undefined,
  outcome: OutcomeRow[] | undefined,
  groupBy: ActivityGroupBy,
): ActivityTimelinePoint[] {
  const activityMap = new Map<string, TimelineRow>();
  for (const row of activity) {
    activityMap.set(normalizeTimelineDateKey(row.date, groupBy), row);
  }

  const latencyMap = new Map<string, number | null>();
  for (const row of latency ?? []) {
    latencyMap.set(normalizeTimelineDateKey(row.date, groupBy), row.avgLatencyMs);
  }

  const outcomeMap = new Map<string, OutcomeRow>();
  for (const row of outcome ?? []) {
    outcomeMap.set(normalizeTimelineDateKey(row.date, groupBy), row);
  }

  const dateSet = new Set<string>();
  for (const row of activity) dateSet.add(normalizeTimelineDateKey(row.date, groupBy));
  for (const row of latency ?? []) dateSet.add(normalizeTimelineDateKey(row.date, groupBy));
  for (const row of outcome ?? []) dateSet.add(normalizeTimelineDateKey(row.date, groupBy));

  const dates = Array.from(dateSet).sort();

  return dates.map((date) => {
    const row = activityMap.get(date);
    const out = outcomeMap.get(date) ?? { successful: 0, failed: 0 };
    const volume = row?.operations ?? row?.sessions ?? out.successful + out.failed;
    return {
      date,
      label: activityBucketLabel(date, groupBy),
      count: volume,
      avgLatencyMs: latencyMap.get(date) ?? null,
      successful: out.successful,
      failed: out.failed,
    };
  });
}

const dashboardDateQuery = (range: ActivityDateRange) => ({
  start_date: range.startDate,
  end_date: range.endDate,
  groupBy: range.groupBy,
});

async function fetchDashboardActivityTimeline(
  query: ActivityTimelineQuery,
): Promise<ActivityTimelinePoint[] | null> {
  const { workspaceId, userId, publicKey, kind, productTag, componentTag, env, sessionTag, sessionUserId, range } =
    query;

  if (!productTag) return null;

  const dates = dashboardDateQuery(range);

  try {
    switch (kind) {
      case 'database': {
        if (!componentTag) return null;
        const data = await fetchDatabaseDashboard(workspaceId, userId, publicKey, {
          product_tag: productTag,
          database_tag: componentTag,
          env,
          ...dates,
        });
        return mapDashboardTimeline(
          data.activityTimeline,
          data.latencyTimeline,
          data.outcomeTimeline ?? [],
          range.groupBy,
        );
      }
      case 'storage': {
        if (!componentTag) return null;
        const data = await fetchStorageDashboard(workspaceId, userId, publicKey, {
          product_tag: productTag,
          storage_tag: componentTag,
          env,
          ...dates,
        });
        return mapDashboardTimeline(
          data.activityTimeline.map((r) => ({ date: r.date, sessions: r.sessions })),
          data.latencyTimeline,
          data.outcomeTimeline ?? [],
          range.groupBy,
        );
      }
      case 'graph': {
        if (!componentTag) return null;
        const data = await fetchGraphDashboard(workspaceId, userId, publicKey, {
          product_tag: productTag,
          graph_tag: componentTag,
          env,
          ...dates,
        });
        return mapDashboardTimeline(
          data.activityTimeline,
          data.latencyTimeline,
          data.outcomeTimeline ?? [],
          range.groupBy,
        );
      }
      case 'vector': {
        if (!componentTag) return null;
        const data = await fetchVectorDashboard(workspaceId, userId, publicKey, {
          product_tag: productTag,
          vector_tag: componentTag,
          env,
          ...dates,
        });
        return mapDashboardTimeline(
          data.activityTimeline,
          data.latencyTimeline,
          data.outcomeTimeline ?? [],
          range.groupBy,
        );
      }
      case 'cache': {
        if (!componentTag) return null;
        const data = await fetchCacheDashboard(workspaceId, userId, publicKey, {
          product_tag: productTag,
          cache_tag: componentTag,
          env,
          ...dates,
        });
        return mapDashboardTimeline(
          data.activityTimeline,
          data.latencyTimeline,
          data.outcomeTimeline ?? [],
          range.groupBy,
        );
      }
      case 'broker': {
        if (!componentTag) return null;
        const data = await fetchMessageBrokerDashboard(workspaceId, userId, publicKey, {
          product_tag: productTag,
          broker_tag: componentTag,
          env,
          ...dates,
        });
        return mapDashboardTimeline(
          data.activityTimeline,
          data.latencyTimeline,
          data.outcomeTimeline ?? [],
          range.groupBy,
        );
      }
      case 'notification': {
        const data = await fetchNotificationDashboard(workspaceId, userId, publicKey, {
          product_tag: productTag,
          notifier_tag: componentTag,
          env,
          ...dates,
        });
        return mapDashboardTimeline(
          data.activityTimeline,
          data.latencyTimeline,
          data.outcomeTimeline ?? [],
          range.groupBy,
        );
      }
      case 'session-user': {
        const tag = sessionTag ?? componentTag;
        if (!tag || !sessionUserId) return null;
        const data = await fetchSessionUserDashboard(workspaceId, userId, publicKey, {
          product_tag: productTag,
          session_tag: tag,
          identifier: sessionUserId,
          env,
          ...dates,
        });
        return mapDashboardTimeline(
          data.activityTimeline,
          data.latencyTimeline,
          data.outcomeTimeline ?? [],
          range.groupBy,
        );
      }
      default:
        return null;
    }
  } catch (err) {
    console.warn('[activityTimeline] dashboard fetch failed, falling back to logs', kind, err);
    return null;
  }
}

function buildLogFilters(query: ActivityTimelineQuery): FetchLogsOptions {
  const { range, kind, productTag, componentTag, env, appId, sessionTag, sessionUserId } = query;

  const base: FetchLogsOptions = {
    start_date: range.startDate,
    end_date: range.endDate,
    groupBy: range.groupBy,
    limit: 500,
    only_completed_execution: true,
    env,
    product_tag: productTag,
  };

  const sessionTagValue = combinedSessionTag(productTag, componentTag ?? sessionTag);

  switch (kind) {
    case 'app':
      return {
        ...base,
        component: 'app',
        app_id: appId,
        ...(componentTag && { parent_tag: componentTag }),
      };
    case 'database':
      return { ...base, type: 'database', parent_tag: componentTag };
    case 'storage':
      return { ...base, type: 'storage', parent_tag: componentTag };
    case 'graph':
      return { ...base, type: 'graph', parent_tag: componentTag };
    case 'vector':
      return { ...base, type: 'vector', parent_tag: componentTag };
    case 'cache':
      return { ...base, type: 'cache', parent_tag: componentTag };
    case 'broker':
      return { ...base, type: 'message_broker', parent_tag: componentTag };
    case 'notification':
      return { ...base, type: 'notification', parent_tag: componentTag };
    case 'session':
      return { ...base, session_tag: sessionTagValue };
    case 'session-user':
      return {
        ...base,
        session_tag: sessionTagValue,
        session_user_id: sessionUserId,
      };
    case 'webhook':
      return { ...base, type: 'webhook', parent_tag: componentTag };
    case 'job':
      return { ...base, parent_tag: componentTag };
    case 'feature':
      return { ...base, type: 'feature', parent_tag: componentTag };
    case 'healthcheck':
      return { ...base, type: 'healthcheck', parent_tag: componentTag };
    case 'quota':
      return { ...base, type: 'quota', parent_tag: componentTag };
    case 'fallback':
      return { ...base, type: 'fallback', parent_tag: componentTag };
    case 'agent':
      return { ...base, parent_tag: componentTag };
    case 'workspace':
      return { ...base, product_tag: productTag };
    default:
      return base;
  }
}

async function fetchAllLogs(
  auth: FetchLogsData,
  filters: FetchLogsOptions,
): Promise<any[]> {
  const logs: any[] = [];
  const maxPages = 12;
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetchLogs(auth, { ...filters, page });
    const batch = res.data?.logs?.data ?? [];
    logs.push(...batch);
    const totalPages = res.data?.logs?.metadata?.totalPages ?? res.metadata?.totalPages ?? 1;
    if (page >= totalPages || batch.length === 0) break;
  }
  return logs;
}

async function fetchLogsActivityTimeline(
  query: ActivityTimelineQuery,
): Promise<ActivityTimelinePoint[]> {
  const auth: FetchLogsData = {
    workspace_id: query.workspaceId,
    user_id: query.userId,
    public_key: query.publicKey,
  };

  const filters = buildLogFilters(query);
  const logs = await fetchAllLogs(auth, filters);

  const buckets = new Map<
    string,
    { count: number; latencySum: number; latencyN: number; successful: number; failed: number }
  >();

  for (const log of logs) {
    const key = bucketLogTimestamp(log.timestamp, query.range.groupBy);
    if (!key) continue;
    const prev = buckets.get(key) ?? {
      count: 0,
      latencySum: 0,
      latencyN: 0,
      successful: 0,
      failed: 0,
    };
    prev.count += 1;
    const outcome = logOutcome(log);
    if (outcome === 'success') prev.successful += 1;
    else if (outcome === 'fail') prev.failed += 1;
    const lat = logLatencyMs(log);
    if (lat !== null) {
      prev.latencySum += lat;
      prev.latencyN += 1;
    }
    buckets.set(key, prev);
  }

  return normalizeActivityPoints(
    query.range.startDate,
    query.range.endDate,
    query.range.groupBy,
    buckets,
  );
}

export async function fetchActivityTimelineSeries(
  query: ActivityTimelineQuery,
): Promise<ActivityTimelinePoint[]> {
  const fromDashboard = await fetchDashboardActivityTimeline(query);
  if (fromDashboard) return fromDashboard;
  return fetchLogsActivityTimeline(query);
}
