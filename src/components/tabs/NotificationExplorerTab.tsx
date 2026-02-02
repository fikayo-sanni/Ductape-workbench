import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Webhook,
  Plus,
  Search,
  RefreshCw,
  ChevronRight,
  Settings,
  Send,
  Loader2,
  LayoutDashboard,
  FileText,
  Smartphone,
  Activity,
  CheckCircle,
  XCircle,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useSDKProxy } from '@/services/sdkProxy';
import toast from 'react-hot-toast';
import { cn, getLast7DaysNormalized } from '@/lib/utils';
import {
  fetchNotificationLogs,
  fetchNotificationMessageLogs,
  fetchNotificationActivityLogs,
  type NotificationActivityLog as INotificationActivityLog,
  type NotificationLogEntry,
} from '@/services/logsServices';

/** SDK notification message log item (decrypted input from notifications.getMessages) */
export interface NotificationMessageLogItemSDK {
  _id?: string;
  workspace_id?: string;
  product_id?: string;
  product_tag: string;
  env: string;
  notification_tag: string;
  input?: Record<string, unknown>;
  output?: unknown;
  status: string;
  type: string;
  process_id?: string;
  error?: string;
  created_at?: string;
  updated_at?: string;
}

interface NotificationMessage {
  _id?: string;
  name: string;
  tag: string;
  email?: boolean | { subject?: string; template?: string };
  push_notification?: boolean | { title?: string; body?: string };
  sms?: boolean;
  callback?: boolean;
  email_data?: any[];
  push_notification_data?: any[];
  sms_data?: any[];
  callback_data?: any[];
  created_at?: string | Date;
}

interface Notification {
  _id?: string;
  name: string;
  tag: string;
  description?: string;
  messages?: NotificationMessage[];
  envs?: Array<{
    slug: string;
    name?: string;
    emails?: any;
    push_notifications?: any;
    sms?: any;
    callbacks?: any;
  }>;
  created_at?: string | Date;
}

/** Tab data: product only = Product Mode (notifier cards); product + notification + env + isExplorer = Notifier+Env Mode (sidebar + overview/templates) */
interface NotificationExplorerTabData {
  product?: {
    tag: string;
    name: string;
    logo?: string;
    envs?: Array<{ slug: string; name?: string }>;
  };
  notification?: Notification | null;
  env?: { slug: string; name?: string };
  isExplorer?: boolean;
}

interface NotificationExplorerTabProps {
  data?: NotificationExplorerTabData | null;
}

type ChannelFilter = 'all' | 'email' | 'push' | 'sms' | 'webhook';
type ViewMode = 'overview' | 'activity';

// Channel type categorization
const CHANNEL_TYPES: { value: ChannelFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Messages', icon: <Bell className="h-4 w-4" /> },
  { value: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  { value: 'push', label: 'Push', icon: <Smartphone className="h-4 w-4" /> },
  { value: 'sms', label: 'SMS', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'webhook', label: 'Webhook', icon: <Webhook className="h-4 w-4" /> },
];

export default function NotificationExplorerTab({ data }: NotificationExplorerTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();

  const product = data?.product ?? { tag: '', name: '', envs: [] };
  const isProductMode = !data?.notification || !data?.isExplorer;
  const initialNotification = data?.notification ?? null;
  const initialEnvSlug = data?.env?.slug ?? initialNotification?.envs?.[0]?.slug ?? product.envs?.[0]?.slug ?? 'prd';

  // Collapse workbench sidebar when explorer opens
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const sdkProxy = useSDKProxy(
    product.tag && currentWorkspaceId && user?._id
      ? {
          workspace_id: currentWorkspaceId || '',
          user_id: user._id || '',
          token: user.auth_token || '',
          public_key: user.public_key || '',
        }
      : null
  );

  const queryClient = useQueryClient();

  // State (Notifier+Env mode; Product Mode uses notifications list only)
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  // Templates are shown inline on Product tab; explorer has Overview + Sent Messages only
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(initialNotification);
  const [selectedEnv, setSelectedEnv] = useState<string>(initialEnvSlug);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelFilter>('all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Sync Notifier+Env mode from tab data when opening with notification+env
  useEffect(() => {
    if (!isProductMode && initialNotification) {
      setSelectedNotification(initialNotification);
      setSelectedEnv(initialEnvSlug);
    }
  }, [isProductMode, initialNotification?.tag, initialEnvSlug]);

  // Fetch all notifications for the product
  const { data: notifications, isLoading: isLoadingNotifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', product.tag],
    queryFn: async () => {
      if (!sdkProxy || !product.tag) return [];
      try {
        const result = await sdkProxy.notifications.list(product.tag);
        return result ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!sdkProxy && !!product.tag,
    staleTime: 30000,
  });

  // Fetch selected notification details
  const { data: notificationDetails } = useQuery({
    queryKey: ['notification-details', product.tag, selectedNotification?.tag],
    queryFn: async () => {
      if (!sdkProxy || !product.tag || !selectedNotification?.tag) return null;
      try {
        return await sdkProxy.notifications.fetch(product.tag, selectedNotification.tag);
      } catch {
        return null;
      }
    },
    enabled: !!sdkProxy && !!product.tag && !!selectedNotification?.tag,
    staleTime: 30000,
  });

  // Use details if available, otherwise use selected notification
  const displayNotification = notificationDetails || selectedNotification;

  // Scope env to the selected notifier: when notifier changes, sync selectedEnv to that notifier's envs
  useEffect(() => {
    if (!displayNotification?.envs?.length) return;
    const notifierEnvSlugs = displayNotification.envs.map((e: any) => e.slug);
    const currentInNotifier = notifierEnvSlugs.includes(selectedEnv);
    if (!currentInNotifier) {
      setSelectedEnv(displayNotification.envs[0]?.slug ?? 'prd');
    }
  }, [displayNotification?.tag, displayNotification?.envs]);

  // Env list is per notifier when one is selected, else product-level for overview
  const effectiveEnvs = displayNotification?.envs?.length
    ? displayNotification.envs
    : (product.envs ?? []);

  // Get notification config for selected environment (within the selected notifier's envs)
  const notificationConfig = useMemo(() => {
    if (!displayNotification?.envs) return null;
    return displayNotification.envs.find((env: any) => env.slug === selectedEnv);
  }, [displayNotification, selectedEnv]);

  // Calculate metrics (for sidebar counts we still use notifications list; overview uses log data)
  const metrics = useMemo(() => {
    if (!notifications) return { total: 0, email: 0, push: 0, sms: 0, webhook: 0 };

    let totalMessages = 0;
    let emailCount = 0;
    let pushCount = 0;
    let smsCount = 0;
    let webhookCount = 0;

    (notifications as Notification[]).forEach((n) => {
      const messages = n.messages || [];
      totalMessages += messages.length;
      messages.forEach((m: NotificationMessage) => {
        if ((m.email_data?.length ?? 0) > 0 || (m.email && typeof m.email === 'object' && (m.email.subject || m.email.template))) emailCount++;
        if ((m.push_notification_data?.length ?? 0) > 0 || (m.push_notification && typeof m.push_notification === 'object' && (m.push_notification.title || m.push_notification.body))) pushCount++;
        if (m.sms) smsCount++;
        if (m.callback) webhookCount++;
      });
    });

    return {
      total: (notifications as Notification[]).length,
      messages: totalMessages,
      email: emailCount,
      push: pushCount,
      sms: smsCount,
      webhook: webhookCount,
    };
  }, [notifications]);

  // Fetch notification logs from log service (type = email|push|sms|callback, parent_tag = notification tag, env, product_tag)
  const today = useMemo(() => new Date(), []);
  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const { data: notificationLogsData, isLoading: isLoadingNotificationLogs, refetch: refetchNotificationLogs } = useQuery({
    queryKey: [
      'notification-logs',
      currentWorkspaceId,
      product.tag,
      displayNotification?.tag,
      selectedEnv,
    ],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key || !product.tag) {
        return { logs: [] };
      }
      return fetchNotificationLogs(currentWorkspaceId, user._id, user.public_key, {
        product_tag: product.tag,
        parent_tag: displayNotification?.tag ?? undefined,
        env: selectedEnv,
        start_date: weekAgo.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
      });
    },
    enabled:
      !!currentWorkspaceId &&
      !!user?._id &&
      !!user?.public_key &&
      !!product.tag &&
      !!displayNotification?.tag,
  });

  const notificationLogs: NotificationLogEntry[] = notificationLogsData?.logs ?? [];

  // Notification message logs via SDK (decrypted input for display + resend); fallback to integrations API when no sdkProxy
  const { data: messageLogsData, isLoading: isLoadingMessageLogs, refetch: refetchMessageLogs } = useQuery({
    queryKey: [
      'notification-message-logs',
      currentWorkspaceId,
      product.tag,
      displayNotification?.tag,
      selectedEnv,
      !!sdkProxy,
    ],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key || !product.tag || !displayNotification?.tag) {
        return { logs: [], items: [] };
      }
      if (sdkProxy) {
        try {
          const result = await sdkProxy.notifications.getMessages<{
            items: NotificationMessageLogItemSDK[];
            total: number;
            page: number;
            limit: number;
            hasMore: boolean;
          }>({
            product_tag: product.tag,
            notification_tag: displayNotification.tag,
            env: selectedEnv,
            start_date: weekAgo.toISOString(),
            end_date: today.toISOString(),
            limit: 500,
          });
          const items = result?.items ?? [];
          const logs: NotificationLogEntry[] = items.map((item) => {
            const [parent_tag, child_tag] = (item.notification_tag || '').split(':');
            return {
              _id: item._id ?? '',
              product_tag: item.product_tag,
              parent_tag: parent_tag ?? item.notification_tag,
              child_tag: child_tag ?? item.notification_tag,
              env: item.env,
              type: item.type === 'notification' ? 'callback' : item.type,
              successful_execution: item.status === 'sent',
              failed_execution: item.status === 'failed',
              timestamp: item.created_at ?? new Date().toISOString(),
              process_id: item.process_id,
            };
          });
          return { logs, items };
        } catch (e) {
          console.error('[notification-message-logs] SDK getMessages failed:', e);
          const fallback = await fetchNotificationMessageLogs(currentWorkspaceId, user._id, user.public_key, {
            product_tag: product.tag,
            parent_tag: displayNotification.tag,
            env: selectedEnv,
            start_date: weekAgo.toISOString().split('T')[0],
            end_date: today.toISOString().split('T')[0],
          });
          return { logs: fallback.logs, items: [] };
        }
      }
      const fallback = await fetchNotificationMessageLogs(currentWorkspaceId, user._id, user.public_key, {
        product_tag: product.tag,
        parent_tag: displayNotification.tag,
        env: selectedEnv,
        start_date: weekAgo.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
      });
      return { logs: fallback.logs, items: [] };
    },
    enabled:
      !!currentWorkspaceId &&
      !!user?._id &&
      !!user?.public_key &&
      !!product.tag &&
      !!displayNotification?.tag,
  });

  const messageLogs: NotificationLogEntry[] = messageLogsData?.logs ?? [];
  const messageLogItems: NotificationMessageLogItemSDK[] = messageLogsData?.items ?? [];

  // Sidebar channel filter counts from notification message log (integrations API)
  const messageLogChannelCounts = useMemo(() => {
    const total = messageLogs.length;
    const email = messageLogs.filter((l) => (l.type?.toLowerCase() ?? '') === 'email').length;
    const push = messageLogs.filter((l) => (l.type?.toLowerCase() ?? '') === 'push').length;
    const sms = messageLogs.filter((l) => (l.type?.toLowerCase() ?? '') === 'sms').length;
    const webhook = messageLogs.filter((l) => (l.type?.toLowerCase() ?? '') === 'callback').length;
    return { total, email, push, sms, webhook };
  }, [messageLogs]);

  // Activity (sent messages) status filter for the Activity view
  const [activityStatusFilter, setActivityStatusFilter] = useState<'all' | 'success' | 'fail' | 'processing'>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Map UI channel (webhook) to API channel (callback) for activity logs
  const activityChannelApi = selectedChannel === 'all' ? undefined : selectedChannel === 'webhook' ? 'callback' : selectedChannel;

  // Fetch notification activity logs (individual sent messages) — like broker messages in MessageBrokerEventsTabContent
  const {
    data: activityData,
    isLoading: activityLoading,
    fetchNextPage: fetchNextActivityPage,
    hasNextPage: hasNextActivityPage,
    isFetchingNextPage: isFetchingNextActivity,
    refetch: refetchActivity,
  } = useInfiniteQuery({
    queryKey: [
      'notification-activity-logs',
      currentWorkspaceId,
      product.tag,
      displayNotification?.tag,
      selectedEnv,
      activityStatusFilter,
      activityChannelApi,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key || !product.tag) {
        return { logs: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      }
      return fetchNotificationActivityLogs(
        currentWorkspaceId,
        user._id,
        user.public_key,
        {
          product_tag: product.tag,
          notifier_tag: displayNotification?.tag,
          env: selectedEnv,
          status: activityStatusFilter !== 'all' ? activityStatusFilter : undefined,
          channel: activityChannelApi,
          page: pageParam,
          limit: 20,
        }
      );
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
    enabled:
      !!currentWorkspaceId &&
      !!user?._id &&
      !!user?.public_key &&
      !!product.tag &&
      !!displayNotification?.tag,
  });

  const activityLogs: INotificationActivityLog[] = useMemo(() => {
    if (!activityData?.pages) return [];
    return activityData.pages.flatMap((p) => p.logs);
  }, [activityData?.pages]);
  const activityTotal = activityData?.pages?.[0]?.total ?? 0;

  // Activity "sent messages" list from SDK message log (decrypted input for display + resend); filter by channel and status
  const activityRowsFromMessages = useMemo(() => {
    let rows = messageLogItems.map((item) => {
      const [parent_tag, child_tag] = (item.notification_tag || '').split(':');
      const status = item.status === 'sent' ? 'success' : item.status === 'failed' ? 'fail' : 'processing';
      return {
        _id: item._id ?? '',
        process_id: item.process_id,
        product_tag: item.product_tag,
        parent_tag: parent_tag ?? item.notification_tag,
        child_tag: child_tag ?? item.notification_tag,
        env: item.env,
        type: item.type === 'notification' ? 'callback' : item.type,
        name: item.type,
        message: '—',
        status: status as 'success' | 'fail' | 'processing',
        successful_execution: item.status === 'sent',
        failed_execution: item.status === 'failed',
        timestamp: item.created_at ?? new Date().toISOString(),
        input: item.input,
        output: item.output,
        raw: item,
      };
    });
    if (selectedChannel !== 'all') {
      const channelType = selectedChannel === 'webhook' ? 'callback' : selectedChannel;
      rows = rows.filter((r) => (r.type?.toLowerCase() ?? '') === channelType);
    }
    if (activityStatusFilter !== 'all') {
      rows = rows.filter((r) => r.status === activityStatusFilter);
    }
    return rows;
  }, [messageLogItems, selectedChannel, activityStatusFilter]);

  // Filter notifications for sidebar
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    if (!searchQuery) return notifications;
    return (notifications as Notification[]).filter((n: Notification) =>
      n.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tag?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [notifications, searchQuery]);

  // Derive 7-day stats from notification logs (type=email|push|sms|callback, parent_tag, env, product_tag)
  const weeklyStats = useMemo(() => {
    const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (!notificationLogs.length) {
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        deliveryRate: 0,
        byChannel: {
          email: { sent: 0, delivered: 0, failed: 0 },
          push: { sent: 0, delivered: 0, failed: 0 },
          sms: { sent: 0, delivered: 0, failed: 0 },
          webhook: { sent: 0, delivered: 0, failed: 0 },
        },
        dailyTrend: daysOrder.map((day) => ({ day, sent: 0, delivered: 0, failed: 0 })),
        topTemplates: [] as Array<{ name: string; tag: string; sent: number; deliveryRate: number }>,
      };
    }

    const totalSent = notificationLogs.length;
    const totalDelivered = notificationLogs.filter((l) => l.successful_execution).length;
    const totalFailed = notificationLogs.filter((l) => l.failed_execution).length;
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

    const byType = { email: 0, push: 0, sms: 0, callback: 0 };
    const byTypeDelivered = { email: 0, push: 0, sms: 0, callback: 0 };
    const byTypeFailed = { email: 0, push: 0, sms: 0, callback: 0 };
    notificationLogs.forEach((l) => {
      const t = (l.type?.toLowerCase() || '') as keyof typeof byType;
      if (t in byType) {
        byType[t]++;
        if (l.successful_execution) byTypeDelivered[t]++;
        if (l.failed_execution) byTypeFailed[t]++;
      }
    });

    const byDay: Record<string, { sent: number; delivered: number; failed: number }> = {};
    daysOrder.forEach((d) => {
      byDay[d] = { sent: 0, delivered: 0, failed: 0 };
    });
    notificationLogs.forEach((l) => {
      if (!l.timestamp) return;
      const date = new Date(l.timestamp);
      const day = daysOrder[date.getDay() === 0 ? 6 : date.getDay() - 1] ?? daysOrder[0];
      byDay[day].sent++;
      if (l.successful_execution) byDay[day].delivered++;
      if (l.failed_execution) byDay[day].failed++;
    });
    const dailyTrend = daysOrder.map((day) => ({
      day,
      sent: byDay[day]?.sent ?? 0,
      delivered: byDay[day]?.delivered ?? 0,
      failed: byDay[day]?.failed ?? 0,
    }));

    const childCount: Record<string, number> = {};
    const childSuccess: Record<string, number> = {};
    notificationLogs.forEach((l) => {
      const tag = l.child_tag || l.parent_tag || '—';
      childCount[tag] = (childCount[tag] ?? 0) + 1;
      if (l.successful_execution) childSuccess[tag] = (childSuccess[tag] ?? 0) + 1;
    });
    const topTemplates = Object.entries(childCount)
      .map(([tag, sent]) => ({
        name: tag,
        tag,
        sent,
        deliveryRate: sent > 0 ? Math.round(((childSuccess[tag] ?? 0) / sent) * 100) : 0,
      }))
      .sort((a, b) => b.sent - a.sent)
      .slice(0, 10);

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      deliveryRate,
      byChannel: {
        email: { sent: byType.email, delivered: byTypeDelivered.email, failed: byTypeFailed.email },
        push: { sent: byType.push, delivered: byTypeDelivered.push, failed: byTypeFailed.push },
        sms: { sent: byType.sms, delivered: byTypeDelivered.sms, failed: byTypeFailed.sms },
        webhook: { sent: byType.callback, delivered: byTypeDelivered.callback, failed: byTypeFailed.callback },
      },
      dailyTrend,
      topTemplates,
    };
  }, [notificationLogs]);

  // Activity timeline content (7 days normalized) — computed outside JSX to avoid IIFE parse issues
  const activityTimelineContent = useMemo(() => {
    const normalized = getLast7DaysNormalized(weeklyStats.dailyTrend, (d) => d.sent ?? 0);
    const hasAny = normalized.some((d) => d.value > 0);
    if (!hasAny) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BarChart3 className="h-12 w-12 text-grey-300 mb-3" />
          <p className="text-sm text-grey-600 font-medium mb-1">No notification activity data available</p>
          <p className="text-xs text-grey-500">Activity charts will appear once notifications are sent</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {normalized.map((day) => {
          const maxSent = Math.max(...normalized.map((d) => d.value), 1);
          const percentage = maxSent > 0 ? (day.value / maxSent) * 100 : 0;
          return (
            <div key={day.date} className="flex items-center gap-3">
              <div className="w-12 text-xs font-medium text-grey-600">{day.date}</div>
              <div className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-lg transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
                <div className="absolute inset-0 flex items-center px-3">
                  <span className="text-xs font-semibold text-white drop-shadow-sm">
                    {day.value.toLocaleString()} messages sent
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div className="pt-4 border-t border-grey-200 flex justify-between text-sm">
          <span className="text-grey-600">Total messages</span>
          <span className="font-semibold text-grey">{normalized.reduce((sum, d) => sum + d.value, 0).toLocaleString()}</span>
        </div>
      </div>
    );
  }, [weeklyStats.dailyTrend]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchNotifications(),
      refetchActivity(),
      refetchNotificationLogs(),
      refetchMessageLogs(),
    ]);
    setIsRefreshing(false);
    toast.success('Notifications refreshed');
  };

  const handleResend = async (row: (typeof activityRowsFromMessages)[0]) => {
    const input = row.raw?.input;
    if (!sdkProxy || !input || typeof input !== 'object') {
      toast.error('Cannot resend: no input or SDK not available');
      return;
    }
    const id = row._id ?? '';
    setResendingId(id);
    try {
      await sdkProxy.notifications.send(input);
      toast.success('Notification resent');
      await refetchMessageLogs();
    } catch (e: any) {
      toast.error(e?.message ?? 'Resend failed');
    } finally {
      setResendingId(null);
    }
  };

  // Open Notifier+Env explorer tab (overview + sent messages for one notifier in one env) — used from Product Mode
  const handleViewTemplates = (notifier: Notification, env: { slug: string; name?: string }) => {
    openTab({
      id: `notification-explorer-${notifier.tag}-${env.slug}`,
      type: 'notification-explorer',
      title: `${notifier.name} (${env.slug})`,
      itemId: `${notifier.tag}-${env.slug}`,
      data: {
        product: { tag: product.tag, name: product.name, logo: product.logo, envs: product.envs || [] },
        notification: notifier,
        env: { slug: env.slug, name: env.name },
        isExplorer: true,
      },
    });
  };

  const handleCreateMessage = () => {
    toast('Create template: coming soon');
  };

  // Channel count = number of messages in that channel (from notification message log / integrations API)
  const getChannelCount = (channel: ChannelFilter) => {
    switch (channel) {
      case 'all': return messageLogChannelCounts.total;
      case 'email': return messageLogChannelCounts.email;
      case 'push': return messageLogChannelCounts.push;
      case 'sms': return messageLogChannelCounts.sms;
      case 'webhook': return messageLogChannelCounts.webhook;
      default: return 0;
    }
  };

  // Loading state
  if (isLoadingNotifications) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-background-tertiary">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  // ——— Product Mode (like StorageTabContent): notifier cards, "View templates" per env ———
  if (isProductMode) {
    const notifiers = (notifications as Notification[]) ?? [];
    return (
      <div className="h-full overflow-auto bg-grey-100 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Product Context Header — same pattern as StorageTabContent */}
          {product?.name && product?.tag && (
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                  {product.logo ? (
                    <img src={product.logo} alt={product.name} className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    product.name?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-grey">Notifications for {product.name}</h2>
                    <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">{product.tag}</span>
                  </div>
                  <p className="text-sm text-grey-600">
                    Manage notifiers and templates per environment
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-grey-600">
                  <CheckCircle className="h-4 w-4 text-green" />
                  <span>Connected</span>
                </div>
              </div>
            </div>
          )}

          {/* Header with New Template */}
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-grey mb-2">Notification Configurations</h1>
                  <p className="text-sm text-grey-600">{notifiers.length} notifier{notifiers.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                onClick={() => handleCreateMessage()}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </div>
          </div>

          {/* Notifier cards (like Storage env cards) — each with per-env "View templates" */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-grey">Notifiers</h2>
            {notifiers.length === 0 ? (
              <div className="bg-white rounded-lg border border-grey-400 p-12 text-center shadow-sm">
                <Bell className="h-12 w-12 text-grey-400 mx-auto mb-3" />
                <p className="text-grey-600 mb-2">No notifiers yet</p>
                <p className="text-sm text-grey-500 mb-4">Create a notification from your product to get started.</p>
              </div>
            ) : (
              notifiers.map((notifier) => {
                const envs = notifier.envs ?? product.envs ?? [];
                return (
                  <div key={notifier.tag} className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Bell className="h-5 w-5 text-blue-500" />
                        </div>
                        <h3 className="text-base font-semibold text-grey">{notifier.name}</h3>
                        <span className="text-xs text-grey-500 font-mono">{notifier.tag}</span>
                      </div>
                      <span className="text-sm text-grey-600">{notifier.messages?.length ?? 0} template{notifier.messages?.length !== 1 ? 's' : ''}</span>
                    </div>
                    {envs.length === 0 ? (
                      <p className="text-sm text-grey-500">No environments configured</p>
                    ) : (
                      <div className="space-y-2">
                        {envs.map((env: { slug: string; name?: string }) => (
                          <div
                            key={env.slug}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-grey-50 border border-grey-400"
                          >
                            <span className="text-sm font-medium text-grey">{env.name ?? env.slug}</span>
                            <Button
                              onClick={() => handleViewTemplates(notifier, env)}
                              className="gap-2"
                              size="sm"
                            >
                              <FileText className="h-4 w-4" />
                              View templates
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // ——— Notifier+Env Mode (like MessageBrokerEventsTabContent): sidebar + overview/templates ———
  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background-tertiary">
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-grey-400 flex flex-col flex-shrink-0 transition-all duration-300",
        isSidebarCollapsed ? "w-14" : "w-64"
      )}>
        {/* Header - collapse at top like DatabaseExplorerTab */}
        <div className={cn('flex-shrink-0 border-b border-grey-400', isSidebarCollapsed ? 'p-2' : 'p-4')}>
          <div className={cn('flex items-center', isSidebarCollapsed ? 'justify-center' : 'gap-2 mb-3')}>
            <button
              onClick={() => {
                if (isSidebarCollapsed) setIsSidebarCollapsed(false);
              }}
              className={cn(
                'flex items-center justify-center rounded-lg bg-blue-500/10 flex-shrink-0',
                isSidebarCollapsed ? 'w-8 h-8' : 'w-9 h-9'
              )}
              title={isSidebarCollapsed ? 'Expand sidebar' : product.name}
            >
              <Bell className="h-5 w-5 text-blue-500" />
            </button>
            {!isSidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-grey text-sm truncate">
                    {displayNotification ? (displayNotification.name ?? displayNotification.tag) : product.name}
                  </h2>
                  <p className="text-xs text-grey-600 truncate">
                    {displayNotification ? selectedEnv : 'Notifications'}
                  </p>
                </div>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1.5 text-grey-500 hover:text-grey hover:bg-grey-100 rounded transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Search - only when expanded */}
          {!isSidebarCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {/* Overview Link */}
          <div className="mb-2">
            <button
              onClick={() => setViewMode('overview')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                viewMode === 'overview'
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'text-grey hover:bg-background-secondary',
                isSidebarCollapsed && 'justify-center'
              )}
              title={isSidebarCollapsed ? 'Overview' : undefined}
            >
              <LayoutDashboard className={cn(
                'h-4 w-4',
                viewMode === 'overview' ? 'text-blue-500' : 'text-grey-600'
              )} />
              {!isSidebarCollapsed && <span className="flex-1 text-left font-medium">Overview</span>}
            </button>
          </div>

          {!isSidebarCollapsed && (
            <>
              <div className="flex items-center justify-between px-2 py-2">
                <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
                  Channels
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-grey-600 hover:text-blue-500 transition-colors"
                  title="Refresh notifications"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                </button>
              </div>

              <div className="space-y-0.5">
                {CHANNEL_TYPES.map((channel) => {
                  const count = getChannelCount(channel.value);
                  const isSelected = viewMode === 'activity' && selectedChannel === channel.value;

                  return (
                    <button
                      key={channel.value}
                      onClick={() => {
                        setSelectedChannel(channel.value);
                        setViewMode('activity');
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                        isSelected
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'text-grey hover:bg-background-secondary'
                      )}
                      title={`View sent messages for ${channel.label}`}
                    >
                      <span className={cn(
                        isSelected ? 'text-blue-500' : 'text-grey-600'
                      )}>
                        {channel.icon}
                      </span>
                      <span className="flex-1 text-left">{channel.label}</span>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        isSelected
                          ? 'bg-blue-500/20 text-blue-500'
                          : 'bg-background-secondary text-grey-600'
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Bottom - expand when collapsed (like DatabaseExplorerTab) */}
        <div className={cn('flex-shrink-0 border-t border-grey-400', isSidebarCollapsed ? 'p-2' : 'p-3')}>
          {isSidebarCollapsed ? (
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="w-full flex items-center justify-center p-2 text-grey-500 hover:text-grey hover:bg-grey-100 rounded transition-colors"
              title="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-white">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">
                    {displayNotification ? displayNotification.name ?? displayNotification.tag : 'Notifications'}
                    {displayNotification && (
                      <span className="text-grey-600 font-normal ml-2">({selectedEnv})</span>
                    )}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{product.tag}</code>
                    {displayNotification && (
                      <code className="text-sm text-grey-500 font-mono">{displayNotification.tag}</code>
                    )}
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-500'
                    )}>
                      {displayNotification ? `${weeklyStats.totalSent} messages (7d)` : `${metrics.total} notifications`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border-border text-grey-600 hover:text-grey hover:bg-background-secondary"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'overview' && (
          /* Overview Content */
          <div className="flex-1 overflow-auto p-6">
            {/* Key Metrics - Session Dashboard Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Total Sent */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Send className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-xs font-medium text-grey-500">—</div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{weeklyStats.totalSent.toLocaleString()}</div>
                <div className="text-xs text-grey-600 font-medium">Sent (7 days)</div>
              </div>

              {/* Delivered */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green" />
                  </div>
                  <div className="text-xs font-medium text-grey-500">—</div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{weeklyStats.totalDelivered.toLocaleString()}</div>
                <div className="text-xs text-grey-600 font-medium">Delivered (7 days)</div>
              </div>

              {/* Failed */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="text-xs font-medium text-grey-500">—</div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{weeklyStats.totalFailed.toLocaleString()}</div>
                <div className="text-xs text-grey-600 font-medium">Failed (7 days)</div>
              </div>

              {/* Delivery Rate */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-xs font-medium text-grey-500">—</div>
                </div>
                <div className={cn(
                  "text-2xl font-bold mb-1",
                  weeklyStats.deliveryRate >= 95 ? 'text-green' : weeklyStats.deliveryRate >= 85 ? 'text-orange-500' : 'text-red'
                )}>
                  {weeklyStats.deliveryRate}%
                </div>
                <div className="text-xs text-grey-600 font-medium">Delivery Rate</div>
              </div>

              {/* Email Channel */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue" />
                  </div>
                  <div className="text-xs font-medium text-grey-500">—</div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{weeklyStats.byChannel.email.sent}</div>
                <div className="text-xs text-grey-600 font-medium">Emails Sent</div>
              </div>

              {/* Push Notifications */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-xs font-medium text-grey-500">—</div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{weeklyStats.byChannel.push.sent}</div>
                <div className="text-xs text-grey-600 font-medium">Push Notifications</div>
              </div>
            </div>

            {/* Activity Timeline (7 Days) - matches DatabaseExplorerTab style */}
            <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-grey">Activity Timeline (7 Days)</h2>
                {isLoadingNotificationLogs && <Loader2 className="h-4 w-4 animate-spin text-grey-400" />}
              </div>
              {isLoadingNotificationLogs ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-12 h-4 bg-grey-200 rounded animate-pulse" />
                      <div className="flex-1 h-8 bg-grey-100 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : activityTimelineContent}
            </div>

            {/* Channel Distribution - Session Dashboard Style */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Channel Breakdown */}
              <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-grey">Channel Distribution</h2>
                </div>
                <div className="space-y-4">
                  {[
                    { channel: 'Email', sent: weeklyStats.byChannel.email.sent, icon: Mail, color: 'blue' },
                    { channel: 'Push', sent: weeklyStats.byChannel.push.sent, icon: Smartphone, color: 'purple' },
                    { channel: 'SMS', sent: weeklyStats.byChannel.sms.sent, icon: MessageSquare, color: 'green' },
                    { channel: 'Webhook', sent: weeklyStats.byChannel.webhook.sent, icon: Webhook, color: 'orange' },
                  ].map((item) => {
                    const totalSent = weeklyStats.totalSent || 1;
                    const percentage = Math.round((item.sent / totalSent) * 100);
                    const Icon = item.icon;
                    const colorClass = item.color === 'blue' ? 'bg-blue' :
                                       item.color === 'purple' ? 'bg-purple-500' :
                                       item.color === 'green' ? 'bg-green' : 'bg-orange-500';
                    return (
                      <div key={item.channel} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-grey-500" />
                            <span className="text-grey-600 font-medium">{item.channel}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-grey-600 font-medium">{item.sent.toLocaleString()}</span>
                            <span className="text-grey-700 font-bold min-w-[3rem] text-right">{percentage}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-grey-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Templates */}
              <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-grey">Top Templates (7 days)</h2>
                </div>
                <div className="space-y-3">
                  {weeklyStats.topTemplates.length === 0 ? (
                    <p className="text-sm text-grey-500 text-center py-4">No templates yet</p>
                  ) : (
                    weeklyStats.topTemplates.map((template, idx) => (
                      <div key={template.tag} className="flex items-center justify-between p-3 bg-grey-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-grey truncate">{template.name}</p>
                            <p className="text-xs text-grey-500 truncate">{template.tag}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="text-sm font-semibold text-grey">{template.sent}</p>
                            <p className="text-xs text-grey-500">sent</p>
                          </div>
                          <div className={cn(
                            "text-xs font-semibold px-2 py-1 rounded",
                            template.deliveryRate >= 95 ? 'bg-green/10 text-green' :
                            template.deliveryRate >= 85 ? 'bg-orange-500/10 text-orange-500' : 'bg-red/10 text-red'
                          )}>
                            {template.deliveryRate}%
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Messages by Channel (from log service: type=email|push|sms|callback, parent_tag, env, product_tag) */}
            <div className="mb-6">
              <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                <h3 className="text-sm font-semibold text-grey mb-4">Messages by Channel</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue" />
                      <span className="text-sm text-grey">Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-grey">{weeklyStats.byChannel.email.sent}</span>
                      <div className="w-24 h-2 bg-grey-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue rounded-full"
                          style={{ width: `${weeklyStats.totalSent ? (weeklyStats.byChannel.email.sent / weeklyStats.totalSent) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm text-grey">Push Notifications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-grey">{weeklyStats.byChannel.push.sent}</span>
                      <div className="w-24 h-2 bg-grey-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${weeklyStats.totalSent ? (weeklyStats.byChannel.push.sent / weeklyStats.totalSent) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green" />
                      <span className="text-sm text-grey">SMS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-grey">{weeklyStats.byChannel.sms.sent}</span>
                      <div className="w-24 h-2 bg-grey-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green rounded-full"
                          style={{ width: `${weeklyStats.totalSent ? (weeklyStats.byChannel.sms.sent / weeklyStats.totalSent) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="text-sm text-grey">Webhooks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-grey">{weeklyStats.byChannel.webhook.sent}</span>
                      <div className="w-24 h-2 bg-grey-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${weeklyStats.totalSent ? (weeklyStats.byChannel.webhook.sent / weeklyStats.totalSent) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* All Messages (templates/child_tags from log service) */}
            <div className="bg-white rounded-lg border border-border shadow-sm">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-grey">All Messages</h3>
              </div>
              <div className="divide-y divide-border">
                {(() => {
                  const byChild: Record<string, number> = {};
                  notificationLogs.forEach((l) => {
                    const tag = l.child_tag || l.parent_tag || '—';
                    byChild[tag] = (byChild[tag] ?? 0) + 1;
                  });
                  const allMessages = Object.entries(byChild)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10);
                  if (allMessages.length === 0) {
                    return (
                      <div className="px-5 py-8 text-center text-sm text-grey-500">
                        No sent messages in the last 7 days
                      </div>
                    );
                  }
                  return allMessages.map(([tag, count]) => (
                    <div
                      key={tag}
                      className="px-5 py-3 flex items-center justify-between hover:bg-background-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-grey font-mono">{tag}</p>
                          <p className="text-xs text-grey-500">{count} sent (7d)</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-grey-400" />
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'activity' && (
          /* Activity (Sent Messages) View — individual sent notifications, like broker messages */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 px-6 py-3 bg-white border-b border-border flex flex-wrap items-center justify-between gap-4">
              <span className="text-sm text-grey-600">
                <span className="font-medium text-grey">{activityRowsFromMessages.length}</span>
                {selectedChannel !== 'all' ? ` ${CHANNEL_TYPES.find(c => c.value === selectedChannel)?.label.toLowerCase() ?? selectedChannel}` : ''} sent message{activityRowsFromMessages.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedChannel}
                  onValueChange={(v: ChannelFilter) => setSelectedChannel(v)}
                >
                  <SelectTrigger className="w-[130px] h-9 text-sm">
                    <SelectValue placeholder="Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All channels</SelectItem>
                    {CHANNEL_TYPES.filter(c => c.value !== 'all').map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={activityStatusFilter}
                  onValueChange={(v: 'all' | 'success' | 'fail' | 'processing') => setActivityStatusFilter(v)}
                >
                  <SelectTrigger className="w-[140px] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="fail">Failed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white rounded-lg border border-border overflow-auto">
                {isLoadingMessageLogs ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="animate-spin w-8 h-8 text-blue-500 mb-4" />
                    <p className="text-sm font-medium text-grey">Loading sent messages...</p>
                  </div>
                ) : activityRowsFromMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Send className="h-12 w-12 text-grey-400 mb-3" />
                    <p className="text-grey font-medium">No sent messages yet</p>
                    <p className="text-grey-600 text-sm mt-1">Send notifications from your app to see them here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border bg-background-secondary">
                        <TableHead className="text-grey-600 font-medium text-xs uppercase tracking-wider px-6 py-3 w-8" />
                        <TableHead className="text-grey-600 font-medium text-xs uppercase tracking-wider px-6 py-3">Template</TableHead>
                        <TableHead className="text-grey-600 font-medium text-xs uppercase tracking-wider px-6 py-3">Channel</TableHead>
                        <TableHead className="text-grey-600 font-medium text-xs uppercase tracking-wider px-6 py-3">Status</TableHead>
                        <TableHead className="text-grey-600 font-medium text-xs uppercase tracking-wider px-6 py-3">Message</TableHead>
                        <TableHead className="text-grey-600 font-medium text-xs uppercase tracking-wider px-6 py-3">Time</TableHead>
                        <TableHead className="text-grey-600 font-medium text-xs uppercase tracking-wider px-6 py-3 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityRowsFromMessages.map((log) => (
                        <React.Fragment key={log._id}>
                          <TableRow className="border-b border-border hover:bg-background-secondary">
                            <TableCell className="px-2 py-2 w-8">
                              {(log.input != null || log.output != null) && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedRowId((prev) => (prev === log._id ? null : log._id ?? null))}
                                  className="p-1 rounded text-grey-500 hover:text-grey hover:bg-grey-100"
                                  title={expandedRowId === log._id ? 'Collapse input/output' : 'View input/output'}
                                >
                                  <ChevronRight className={cn('h-4 w-4 transition-transform', expandedRowId === log._id && 'rotate-90')} />
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-3 font-mono text-sm text-grey">
                              {log.child_tag ? `${log.parent_tag}:${log.child_tag}` : log.parent_tag}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <span className="text-sm text-grey-600 capitalize">{log.name?.toLowerCase().replace(' notification', '') || '—'}</span>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <span
                                className={cn(
                                  'text-xs font-medium px-2 py-1 rounded',
                                  log.status === 'success' && 'bg-green/10 text-green',
                                  log.status === 'fail' && 'bg-red/10 text-red',
                                  log.status === 'processing' && 'bg-orange-500/10 text-orange-500'
                                )}
                              >
                                {log.status}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-3 text-sm text-grey-600 max-w-[280px] truncate" title={log.message}>
                              {log.message || '—'}
                            </TableCell>
                            <TableCell className="px-6 py-3 text-sm text-grey-500">
                              {log.timestamp ? format(new Date(log.timestamp), 'MMM d, HH:mm') : '—'}
                            </TableCell>
                            <TableCell className="px-6 py-3 text-right">
                              {log.raw?.input && sdkProxy && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled
                                  className="gap-1.5"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Resend
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          {expandedRowId === log._id && (log.input != null || log.output != null) && (
                            <TableRow className="border-b border-border bg-background-secondary/50">
                              <TableCell colSpan={7} className="px-6 py-4 align-top">
                                <div className="space-y-4">
                                  {log.input != null && (
                                    <div className="rounded-lg border border-border bg-white shadow-sm p-4">
                                      <p className="text-xs font-medium text-grey-500 mb-2">Input</p>
                                      <pre className="p-4 rounded-md bg-grey-50 border border-border text-xs font-mono text-grey-700 leading-relaxed overflow-auto max-h-56 select-text">
                                        {JSON.stringify(log.input, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.output != null && (
                                    <div className="rounded-lg border border-border bg-white shadow-sm p-4">
                                      <p className="text-xs font-medium text-grey-500 mb-2">Output</p>
                                      <pre className="p-4 rounded-md bg-grey-50 border border-border text-xs font-mono text-grey-700 leading-relaxed overflow-auto max-h-56 select-text">
                                        {typeof log.output === 'object' ? JSON.stringify(log.output, null, 2) : String(log.output)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {/* Message log (integrations API) returns up to 500 items; no pagination in this view */}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
