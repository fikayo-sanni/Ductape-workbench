import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import {
  MessageSquare,
  Search,
  ChevronDown,
  ChevronRight,
  Activity,
  Users,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Code2,
  Shield,
  RefreshCw,
  LayoutDashboard,
  LayoutGrid,
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  XCircle,
  Loader2,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { fetchMessageBrokerDashboard, MessageBrokerDashboardMetrics } from '@/services/logsServices';

interface MessageBrokerEvent {
  id: string;
  event_type: string;
  category: 'consumer' | 'producer' | 'dead-letter' | 'message' | 'error';
  topic: string;
  message: string;
  timestamp: Date;
  status: 'success' | 'failed' | 'pending' | 'duplicate';
  idempotent?: boolean;
  request_data?: any;
  response_data?: any;
  metadata?: {
    consumer_id?: string;
    producer_id?: string;
    error_message?: string;
    retry_count?: number;
    message_id?: string;
    idempotency_key?: string;
  };
}

interface MessageBrokerEventsTabContentProps {
  broker: any;
}

// Dummy data
const DUMMY_BROKER_EVENTS: MessageBrokerEvent[] = [
  {
    id: '1',
    event_type: 'message.consumed',
    category: 'consumer',
    topic: 'user-registration',
    message: 'Consumer "email-service" processed message successfully',
    timestamp: new Date(Date.now() - 30000),
    status: 'success',
    idempotent: false,
    request_data: {
      userId: 'user-12345',
      email: 'john@example.com',
      name: 'John Doe',
      registeredAt: '2024-01-15T10:30:00Z'
    },
    response_data: {
      emailSent: true,
      messageId: 'email-msg-789',
      deliveryStatus: 'delivered'
    },
    metadata: {
      consumer_id: 'email-service-001',
      message_id: 'msg-123456',
    },
  },
  {
    id: '2',
    event_type: 'message.published',
    category: 'producer',
    topic: 'order-created',
    message: 'Producer "order-service" published message',
    timestamp: new Date(Date.now() - 120000),
    status: 'success',
    idempotent: true,
    request_data: {
      orderId: 'order-987654',
      customerId: 'cust-456',
      items: [
        { productId: 'prod-123', quantity: 2, price: 49.99 },
        { productId: 'prod-456', quantity: 1, price: 29.99 }
      ],
      totalAmount: 129.97
    },
    response_data: {
      published: true,
      messageId: 'msg-234567',
      partition: 2
    },
    metadata: {
      producer_id: 'order-service-002',
      message_id: 'msg-234567',
      idempotency_key: 'order-unique-123',
    },
  },
  {
    id: '3',
    event_type: 'consumer.failed',
    category: 'error',
    topic: 'payment-processing',
    message: 'Failed to process payment notification',
    timestamp: new Date(Date.now() - 300000),
    status: 'failed',
    idempotent: false,
    metadata: {
      consumer_id: 'payment-service-003',
      error_message: 'Connection timeout after 30s',
      retry_count: 3,
    },
  },
  {
    id: '4',
    event_type: 'message.deadlettered',
    category: 'dead-letter',
    topic: 'notification-failed',
    message: 'Message moved to dead letter queue after max retries',
    timestamp: new Date(Date.now() - 600000),
    status: 'failed',
    idempotent: false,
    request_data: {
      userId: 'user-789',
      notificationType: 'email',
      template: 'welcome-email',
      recipient: 'user@example.com',
      data: { name: 'John Doe', action: 'signup' }
    },
    metadata: {
      consumer_id: 'notification-service-004',
      error_message: 'Max retry attempts exceeded',
      retry_count: 5,
      message_id: 'msg-345678',
    },
  },
  {
    id: '5',
    event_type: 'message.queued',
    category: 'message',
    topic: 'inventory-update',
    message: 'Message queued for processing',
    timestamp: new Date(Date.now() - 15000),
    status: 'pending',
    idempotent: false,
    metadata: {
      message_id: 'msg-456789',
    },
  },
  {
    id: '6',
    event_type: 'duplicate.detected',
    category: 'message',
    topic: 'order-created',
    message: 'Duplicate message detected and ignored via idempotency check',
    timestamp: new Date(Date.now() - 45000),
    status: 'duplicate',
    idempotent: true,
    metadata: {
      idempotency_key: 'order-abc123-retry',
      message_id: 'msg-567890',
      producer_id: 'order-service-002',
    },
  },
  {
    id: '7',
    event_type: 'message.consumed',
    category: 'consumer',
    topic: 'user-login',
    message: 'Consumer "analytics-service" processed message',
    timestamp: new Date(Date.now() - 90000),
    status: 'success',
    idempotent: true,
    metadata: {
      consumer_id: 'analytics-service-005',
      message_id: 'msg-678901',
      idempotency_key: 'login-track-xyz',
    },
  },
  {
    id: '8',
    event_type: 'message.published',
    category: 'producer',
    topic: 'inventory-update',
    message: 'Producer "inventory-service" published message',
    timestamp: new Date(Date.now() - 180000),
    status: 'success',
    idempotent: false,
    metadata: {
      producer_id: 'inventory-service-006',
      message_id: 'msg-789012',
    },
  },
  {
    id: '9',
    event_type: 'producer.failed',
    category: 'error',
    topic: 'email-send',
    message: 'Failed to send email notification',
    timestamp: new Date(Date.now() - 420000),
    status: 'failed',
    idempotent: false,
    metadata: {
      consumer_id: 'email-service-001',
      error_message: 'SMTP server unavailable',
      retry_count: 2,
    },
  },
  {
    id: '10',
    event_type: 'message.consumed',
    category: 'consumer',
    topic: 'payment-processing',
    message: 'Payment processed successfully with idempotency guarantee',
    timestamp: new Date(Date.now() - 240000),
    status: 'success',
    idempotent: true,
    metadata: {
      idempotency_key: 'payment-xyz789-unique',
      message_id: 'msg-890123',
      consumer_id: 'payment-service-003',
    },
  },
];

type CategoryFilter = 'all' | 'consumer' | 'producer' | 'dead-letter' | 'message' | 'error';
type StatusFilter = 'all' | 'success' | 'failed' | 'pending' | 'duplicate';

// Sparkline component for mini charts
const Sparkline = ({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-broker-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} 100,${height}`}
        fill={`url(#gradient-broker-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

export default function MessageBrokerEventsTabContent({ broker }: MessageBrokerEventsTabContentProps) {
  const { user, currentWorkspaceId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [viewMode, setViewMode] = useState<'overview' | 'events'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listViewMode, setListViewMode] = useState<'list' | 'grid'>('list');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Update current time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch message broker dashboard metrics from logs service
  const { data: dashboardMetrics } = useQuery({
    queryKey: ['broker-dashboard-metrics', currentWorkspaceId, broker.productTag, broker.brokerTag || broker.tag],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key || !broker.productTag) {
        return null;
      }
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);

      return fetchMessageBrokerDashboard(
        currentWorkspaceId,
        user._id,
        user.public_key,
        {
          product_tag: broker.productTag,
          broker_tag: broker.brokerTag || broker.tag,
          groupBy: 'day',
          start_date: weekAgo.toISOString().split('T')[0],
          end_date: today.toISOString().split('T')[0],
        }
      );
    },
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key && !!broker.productTag && !!(broker.brokerTag || broker.tag),
  });

  // Show error if broker data is incomplete
  if (!broker?.name && !broker?.brokerTag) {
    return (
      <div className="h-full flex items-center justify-center bg-background-tertiary">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete messaging data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the messaging from your product to reload it.
          </p>
        </div>
      </div>
    );
  }

  const brokerEvents = DUMMY_BROKER_EVENTS;

  // Calculate metrics - use dashboard metrics from logs service when available
  const metrics = useMemo(() => {
    const total = brokerEvents.length;
    const success = brokerEvents.filter(e => e.status === 'success').length;
    const failed = brokerEvents.filter(e => e.status === 'failed').length;
    const pending = brokerEvents.filter(e => e.status === 'pending').length;
    const duplicate = brokerEvents.filter(e => e.status === 'duplicate').length;
    const idempotent = brokerEvents.filter(e => e.idempotent).length;

    const consumers = brokerEvents.filter(e => e.category === 'consumer').length;
    const producers = brokerEvents.filter(e => e.category === 'producer').length;
    const deadLetter = brokerEvents.filter(e => e.category === 'dead-letter').length;
    const errors = brokerEvents.filter(e => e.category === 'error').length;
    const messages = brokerEvents.filter(e => e.category === 'message').length;

    const successRate = dashboardMetrics?.successRate ?? (total > 0 ? (success / total) * 100 : 0);

    // Generate sparkline data
    const sparklineData = Array.from({ length: 24 }, () => Math.floor(Math.random() * 20) + 5);
    const errorSparkline = Array.from({ length: 24 }, () => Math.floor(Math.random() * 5));

    // Use real dashboard metrics if available
    if (dashboardMetrics) {
      const weeklyStats = {
        published: dashboardMetrics.totalPublished || 0,
        consumed: dashboardMetrics.totalConsumed || 0,
        failed: dashboardMetrics.failedOperations || failed,
        deadLettered: dashboardMetrics.totalRejected || deadLetter,
        throughput: Math.floor((dashboardMetrics.totalOperations || 0) / 7 / 24), // avg per hour
        avgLatency: dashboardMetrics.averageOperationDuration || 0,
        dailyTrend: dashboardMetrics.dailyActivity?.map(day => ({
          day: day.day,
          published: day.published || 0,
          consumed: day.consumed || 0,
        })) || [],
      };

      return {
        total: dashboardMetrics.totalOperations || total,
        success: dashboardMetrics.successfulOperations || success,
        failed: dashboardMetrics.failedOperations || failed,
        pending, duplicate, idempotent,
        consumers, producers, deadLetter, errors, messages,
        successRate, sparklineData, errorSparkline, weeklyStats
      };
    }

    // Fallback to generated data when no dashboard metrics
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;

    // Use seeded random based on broker tag for consistent display
    const seed = (broker?.tag || broker?.brokerTag || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const seededRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const weeklyStats = {
      published: Math.floor(seededRandom(1) * 25000) + 5000,
      consumed: Math.floor(seededRandom(2) * 23000) + 4500,
      failed: Math.floor(seededRandom(3) * 500) + 50 + failed,
      deadLettered: Math.floor(seededRandom(4) * 100) + 10 + deadLetter,
      throughput: Math.floor(seededRandom(5) * 1000) + 200,
      avgLatency: Math.floor(seededRandom(6) * 50) + 10,
      dailyTrend: days.map((day, idx) => ({
        day,
        published: idx <= dayOfWeek ? Math.floor(seededRandom(7 + idx) * 4000) + 800 : 0,
        consumed: idx <= dayOfWeek ? Math.floor(seededRandom(14 + idx) * 3800) + 750 : 0,
      })),
    };

    return {
      total, success, failed, pending, duplicate, idempotent,
      consumers, producers, deadLetter, errors, messages,
      successRate, sparklineData, errorSparkline, weeklyStats
    };
  }, [brokerEvents, broker?.tag, broker?.brokerTag, dashboardMetrics]);

  // Combined filtering
  const filteredEvents = useMemo(() => {
    return brokerEvents.filter(item => {
      const matchesSearch = !searchQuery ||
        item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.event_type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [brokerEvents, searchQuery, categoryFilter, statusFilter]);

  const toggleRow = (eventId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedRows(newExpanded);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setIsRefreshing(false);
    toast.success('Events refreshed');
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((currentTime - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; border: string; label: string; dotColor: string }> = {
      success: { color: 'text-green', bg: 'bg-green/10', border: 'border-green/30', label: 'Success', dotColor: 'bg-green' },
      failed: { color: 'text-red', bg: 'bg-red/10', border: 'border-red/30', label: 'Failed', dotColor: 'bg-red' },
      pending: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Pending', dotColor: 'bg-orange-500' },
      duplicate: { color: 'text-grey-500', bg: 'bg-grey-500/10', border: 'border-grey-500/30', label: 'Duplicate', dotColor: 'bg-grey-500' },
    };
    return configs[status] || configs.pending;
  };

  const getCategoryConfig = (category: string) => {
    const configs: Record<string, { icon: any; color: string; label: string }> = {
      consumer: { icon: Users, color: 'text-blue-500', label: 'Consumer' },
      producer: { icon: Send, color: 'text-green', label: 'Producer' },
      'dead-letter': { icon: Trash2, color: 'text-red', label: 'Dead Letter' },
      message: { icon: MessageSquare, color: 'text-cyan-600', label: 'Message' },
      error: { icon: AlertCircle, color: 'text-red', label: 'Error' },
    };
    return configs[category] || { icon: Activity, color: 'text-grey-500', label: category };
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background-tertiary">
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-grey-400 flex flex-col flex-shrink-0 transition-all duration-300",
        isSidebarCollapsed ? "w-14" : "w-64"
      )}>
        {/* Header */}
        <div className={cn("flex-shrink-0 border-b border-grey-400", isSidebarCollapsed ? "p-2" : "p-4")}>
          <div className={cn("flex items-center gap-2", !isSidebarCollapsed && "mb-3")}>
            <MessageSquare className="h-5 w-5 text-cyan-600 flex-shrink-0" />
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-grey text-sm truncate">{broker.name}</h2>
                <p className="text-xs text-grey-600 truncate">{broker.brokerTag || broker.tag}</p>
              </div>
            )}
          </div>

          {/* Search */}
          {!isSidebarCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          )}
        </div>

          {/* Navigation - independently scrollable */}
          <div className="flex-1 overflow-y-auto p-2 min-h-0">
            {/* Overview Link */}
            <div className="mb-4">
              <button
                onClick={() => setViewMode('overview')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  viewMode === 'overview'
                    ? 'bg-cyan-600/10 text-cyan-600'
                    : 'text-grey hover:bg-background-secondary',
                  isSidebarCollapsed && 'justify-center px-2'
                )}
                title={isSidebarCollapsed ? 'Overview' : undefined}
              >
                <LayoutDashboard className={cn(
                  'h-4 w-4 flex-shrink-0',
                  viewMode === 'overview' ? 'text-cyan-600' : 'text-grey-600'
                )} />
                {!isSidebarCollapsed && <span className="flex-1 text-left font-medium">Overview</span>}
              </button>
            </div>

            {/* Category Filters */}
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-between px-2 py-2">
                <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
                  Category
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-grey-600 hover:text-cyan-600 transition-colors"
                  title="Refresh events"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                </button>
              </div>
            )}

            <div className="space-y-0.5">
              {([
                { value: 'all', label: 'All Events', icon: <LayoutGrid className="h-4 w-4" />, count: metrics.total },
                { value: 'consumer', label: 'Consumers', icon: <Users className="h-4 w-4" />, count: metrics.consumers },
                { value: 'producer', label: 'Producers', icon: <Send className="h-4 w-4" />, count: metrics.producers },
                { value: 'dead-letter', label: 'Dead Letters', icon: <Trash2 className="h-4 w-4" />, count: metrics.deadLetter },
                { value: 'error', label: 'Errors', icon: <AlertCircle className="h-4 w-4" />, count: metrics.errors },
              ] as const).map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => {
                    setCategoryFilter(filter.value);
                    setViewMode('events');
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    viewMode === 'events' && categoryFilter === filter.value
                      ? 'bg-cyan-600/10 text-cyan-600'
                      : 'text-grey hover:bg-background-secondary',
                    isSidebarCollapsed && 'justify-center px-2'
                  )}
                  title={isSidebarCollapsed ? filter.label : undefined}
                >
                  <span className={cn(
                    'flex-shrink-0',
                    viewMode === 'events' && categoryFilter === filter.value ? 'text-cyan-600' : 'text-grey-600'
                  )}>
                    {filter.icon}
                  </span>
                  {!isSidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{filter.label}</span>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        viewMode === 'events' && categoryFilter === filter.value
                          ? 'bg-cyan-600/20 text-cyan-600'
                          : 'bg-background-secondary text-grey-600'
                      )}>
                        {filter.count}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Status Filters */}
            {!isSidebarCollapsed && (
              <div className="mt-4 px-2">
                <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-2">
                  Status
                </div>
                <div className="space-y-0.5">
                  {([
                    { value: 'success', label: 'Success', count: metrics.success, color: 'bg-green' },
                    { value: 'failed', label: 'Failed', count: metrics.failed, color: 'bg-red' },
                    { value: 'pending', label: 'Pending', count: metrics.pending, color: 'bg-orange-500' },
                    { value: 'duplicate', label: 'Duplicate', count: metrics.duplicate, color: 'bg-grey-500' },
                  ] as const).map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => {
                        setStatusFilter(filter.value === statusFilter ? 'all' : filter.value);
                        setViewMode('events');
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                        statusFilter === filter.value
                          ? 'bg-cyan-600/10 text-cyan-600'
                          : 'text-grey hover:bg-background-secondary'
                      )}
                    >
                      <div className={cn('w-2 h-2 rounded-full', filter.color)} />
                      <span className="flex-1 text-left">{filter.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-background-secondary text-grey-600">
                        {filter.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Collapse Toggle Button */}
          <div className="flex-shrink-0 p-2 border-t border-grey-400">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm text-grey-600 hover:bg-background-secondary hover:text-cyan-600 transition-colors"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-white">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-600/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">{broker.name} - Events</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{broker.brokerTag || broker.tag}</code>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-600/10 text-cyan-600">
                      {filteredEvents.length} events
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
                  className="border-grey-400 text-grey-600 hover:text-grey hover:bg-grey-100"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'overview' ? (
            /* Overview Content */
            <div className="flex-1 overflow-auto p-6">
              {/* 7-Day Activity Stats - Session Dashboard Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Messages Published (7 days) */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                      <Send className="h-5 w-5 text-green" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingUp className="h-3 w-3" />
                      14.2%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.published.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Published (7 days)</div>
                </div>

                {/* Messages Consumed */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingUp className="h-3 w-3" />
                      11.8%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.consumed.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Consumed (7 days)</div>
                </div>

                {/* Failed Messages */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-red">
                      <TrendingDown className="h-3 w-3" />
                      -8.5%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-red mb-1">{metrics.weeklyStats.failed.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Failed (7 days)</div>
                </div>

                {/* Dead Lettered */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-red">
                      <TrendingUp className="h-3 w-3" />
                      2.3%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-orange-500 mb-1">{metrics.weeklyStats.deadLettered.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Dead Lettered</div>
                </div>

                {/* Throughput */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-600/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingUp className="h-3 w-3" />
                      6.7%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.throughput.toLocaleString()}/s</div>
                  <div className="text-xs text-grey-600 font-medium">Avg Throughput</div>
                </div>

                {/* Avg Latency */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingDown className="h-3 w-3" />
                      -12.1%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.avgLatency}ms</div>
                  <div className="text-xs text-grey-600 font-medium">Avg Latency</div>
                </div>
              </div>

              {/* Activity Timeline - Session Dashboard Style */}
              <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm mb-6">
                <h2 className="text-lg font-semibold text-grey mb-4">Activity Timeline (7 Days)</h2>
                <div className="space-y-3">
                  {metrics.weeklyStats.dailyTrend.map((day) => {
                    const maxActivity = Math.max(...metrics.weeklyStats.dailyTrend.map(d => d.published + d.consumed));
                    const percentage = maxActivity > 0 ? ((day.published + day.consumed) / maxActivity) * 100 : 0;

                    return (
                      <div key={day.day} className="flex items-center gap-3">
                        <div className="w-12 text-xs font-medium text-grey-600">{day.day}</div>
                        <div className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                          <div className="absolute inset-0 flex items-center px-3">
                            <span className="text-xs font-semibold text-white">
                              {day.published.toLocaleString()} pub, {day.consumed.toLocaleString()} cons
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Session Metrics Dashboard */}
              <div className="grid grid-cols-6 gap-4 mb-6">
                {/* Total Events */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Total Events</span>
                    <Activity className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-grey">{metrics.total}</p>
                  <div className="mt-2 h-8">
                    <Sparkline data={metrics.sparklineData} color="#0891B2" />
                  </div>
                </div>

                {/* Success Rate */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Success Rate</span>
                    <TrendingUp className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className={cn(
                    'text-2xl font-bold',
                    metrics.successRate >= 90 ? 'text-green' :
                    metrics.successRate >= 70 ? 'text-yellow' :
                    'text-red'
                  )}>
                    {metrics.successRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-grey-500 mt-2">{metrics.success} succeeded</p>
                </div>

                {/* Successful */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Successful</span>
                    <CheckCircle2 className="h-4 w-4 text-green" />
                  </div>
                  <p className="text-2xl font-bold text-green">{metrics.success}</p>
                  <p className="text-xs text-grey-500 mt-2">processed</p>
                </div>

                {/* Failed */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Failed</span>
                    <AlertCircle className="h-4 w-4 text-red" />
                  </div>
                  <p className="text-2xl font-bold text-red">{metrics.failed}</p>
                  <div className="mt-2 h-8">
                    <Sparkline data={metrics.errorSparkline} color="#DC3444" />
                  </div>
                </div>

                {/* Idempotent */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Idempotent</span>
                    <Shield className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-500">{metrics.idempotent}</p>
                  <p className="text-xs text-grey-500 mt-2">safe to retry</p>
                </div>

                {/* Dead Letters */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Dead Letters</span>
                    <Trash2 className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold text-orange-500">{metrics.deadLetter}</p>
                  <p className="text-xs text-grey-500 mt-2">need attention</p>
                </div>
              </div>

              {/* Breakdown Charts */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* By Category */}
                <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                  <h3 className="text-sm font-semibold text-grey mb-4">Events by Category</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Consumer', count: metrics.consumers, color: 'bg-blue-500' },
                      { label: 'Producer', count: metrics.producers, color: 'bg-green' },
                      { label: 'Message', count: metrics.messages, color: 'bg-cyan-600' },
                      { label: 'Dead Letter', count: metrics.deadLetter, color: 'bg-orange-500' },
                      { label: 'Error', count: metrics.errors, color: 'bg-red' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded-full', item.color)} />
                          <span className="text-sm text-grey">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-grey">{item.count} events</span>
                          <div className="w-24 h-2 bg-grey-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', item.color)}
                              style={{ width: `${metrics.total > 0 ? (item.count / metrics.total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Status */}
                <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                  <h3 className="text-sm font-semibold text-grey mb-4">Events by Status</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Success', count: metrics.success, color: 'bg-green' },
                      { label: 'Failed', count: metrics.failed, color: 'bg-red' },
                      { label: 'Pending', count: metrics.pending, color: 'bg-orange-500' },
                      { label: 'Duplicate', count: metrics.duplicate, color: 'bg-grey-500' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded-full', item.color)} />
                          <span className="text-sm text-grey">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-grey">{item.count} events</span>
                          <div className="w-24 h-2 bg-grey-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', item.color)}
                              style={{ width: `${metrics.total > 0 ? (item.count / metrics.total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Events */}
              <div className="bg-white rounded-lg border border-border shadow-sm">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-grey">Recent Events</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCategoryFilter('all');
                      setViewMode('events');
                    }}
                    className="text-cyan-600 hover:text-cyan-700 text-xs"
                  >
                    View All Events
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {brokerEvents.slice(0, 5).map((event) => {
                    const statusConfig = getStatusConfig(event.status);
                    const categoryConfig = getCategoryConfig(event.category);
                    return (
                      <div
                        key={event.id}
                        className="px-5 py-3 flex items-center justify-between hover:bg-background-secondary transition-colors cursor-pointer"
                        onClick={() => {
                          setViewMode('events');
                          toggleRow(event.id);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn('w-2 h-2 rounded-full', statusConfig.dotColor)} />
                          <div>
                            <p className="text-sm font-medium text-grey">{event.event_type}</p>
                            <p className="text-xs text-grey-500">{event.topic}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={cn('text-xs', categoryConfig.color)}>{categoryConfig.label}</span>
                          <span className="text-xs text-grey-500">{getTimeAgo(event.timestamp)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Events List View */
            <>
              {/* Toolbar */}
              <div className="flex-shrink-0 px-6 py-3 bg-white border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-grey-600">
                      Showing <span className="font-medium text-grey">{filteredEvents.length}</span> events
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-background-secondary rounded-lg p-1 border border-border">
                      <button
                        onClick={() => setListViewMode('list')}
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          listViewMode === 'list' ? 'bg-white text-grey shadow-sm' : 'text-grey-600 hover:text-grey'
                        )}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setListViewMode('grid')}
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          listViewMode === 'grid' ? 'bg-white text-grey shadow-sm' : 'text-grey-600 hover:text-grey'
                        )}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto p-4">
                <div className="bg-white rounded-lg border border-border h-full overflow-auto">
                  {/* Table header */}
                  <div className="sticky top-0 z-10 bg-background-secondary border-b border-border">
                    <div className="grid grid-cols-[1fr,140px,140px,100px,100px,40px] gap-4 px-6 py-3 text-xs font-medium text-grey-600 uppercase tracking-wider">
                      <div>Event</div>
                      <div>Category</div>
                      <div>Topic</div>
                      <div>Status</div>
                      <div>Time</div>
                      <div></div>
                    </div>
                  </div>

                  {/* Table body */}
                  <div className="divide-y divide-border">
                    {filteredEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-12 h-12 rounded-lg bg-border flex items-center justify-center mb-4">
                          <Search className="h-6 w-6 text-grey-500" />
                        </div>
                        <p className="text-grey font-medium">No events found</p>
                        <p className="text-grey-500 text-sm mt-1">Try adjusting your filters</p>
                      </div>
                    ) : (
                      filteredEvents.map((event) => {
                        const isExpanded = expandedRows.has(event.id);
                        const statusConfig = getStatusConfig(event.status);
                        const categoryConfig = getCategoryConfig(event.category);
                        const CategoryIcon = categoryConfig.icon;

                        return (
                          <div key={event.id}>
                            <div
                              className={cn(
                                'grid grid-cols-[1fr,140px,140px,100px,100px,40px] gap-4 px-6 py-4 items-center cursor-pointer transition-colors',
                                'hover:bg-background-secondary',
                                isExpanded && 'bg-background-secondary'
                              )}
                              onClick={() => toggleRow(event.id)}
                            >
                              {/* Event */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig.dotColor)} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-medium text-grey">{event.event_type}</span>
                                    {event.idempotent && (
                                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-500">
                                        <Shield className="h-3 w-3" />
                                        <span>idempotent</span>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs text-grey-500 truncate">{event.message}</p>
                                </div>
                              </div>

                              {/* Category */}
                              <div>
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-grey-100 text-grey-600">
                                  <CategoryIcon className={cn('h-3 w-3', categoryConfig.color)} />
                                  <span>{categoryConfig.label}</span>
                                </div>
                              </div>

                              {/* Topic */}
                              <div className="text-sm text-grey-600">
                                {event.topic}
                              </div>

                              {/* Status */}
                              <div>
                                <div className={cn(
                                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                                  statusConfig.bg,
                                  statusConfig.border,
                                  'border'
                                )}>
                                  <span className={statusConfig.color}>{statusConfig.label}</span>
                                </div>
                              </div>

                              {/* Time */}
                              <div className="text-sm text-grey-600">
                                {getTimeAgo(event.timestamp)}
                              </div>

                              {/* Arrow */}
                              <div className="flex justify-end">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-grey-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-grey-400" />
                                )}
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="px-6 py-4 bg-background-secondary border-t border-border">
                                <div className="space-y-4">
                                  {/* Event Details */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Code2 className="h-4 w-4 text-grey-600" />
                                      <span className="text-xs font-semibold text-grey uppercase tracking-wide">Event Details</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                          <span className="text-grey-600">Event ID:</span>
                                          <span className="ml-2 font-mono text-grey">{event.id}</span>
                                        </div>
                                        <div>
                                          <span className="text-grey-600">Timestamp:</span>
                                          <span className="ml-2 text-grey">{event.timestamp.toLocaleString()}</span>
                                        </div>
                                        {event.idempotent && (
                                          <div className="col-span-2">
                                            <span className="text-grey-600">Idempotency:</span>
                                            <span className="ml-2 text-blue-600 font-medium">Guaranteed - operation is safe to retry</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Metadata Grid */}
                                  {(event.metadata?.consumer_id || event.metadata?.producer_id || event.metadata?.message_id || event.metadata?.idempotency_key || event.metadata?.retry_count !== undefined) && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      {event.metadata?.message_id && (
                                        <div className="bg-white rounded-lg p-3 border border-grey-300">
                                          <div className="text-xs font-semibold mb-1 text-grey-600">Message ID</div>
                                          <span className="text-xs font-mono text-grey">{event.metadata.message_id}</span>
                                        </div>
                                      )}
                                      {event.metadata?.consumer_id && (
                                        <div className="bg-white rounded-lg p-3 border border-grey-300">
                                          <div className="text-xs font-semibold mb-1 text-grey-600">Consumer ID</div>
                                          <span className="text-xs font-mono text-grey">{event.metadata.consumer_id}</span>
                                        </div>
                                      )}
                                      {event.metadata?.producer_id && (
                                        <div className="bg-white rounded-lg p-3 border border-grey-300">
                                          <div className="text-xs font-semibold mb-1 text-grey-600">Producer ID</div>
                                          <span className="text-xs font-mono text-grey">{event.metadata.producer_id}</span>
                                        </div>
                                      )}
                                      {event.metadata?.idempotency_key && (
                                        <div className="bg-white rounded-lg p-3 border border-grey-300">
                                          <div className="text-xs font-semibold mb-1 text-grey-600">Idempotency Key</div>
                                          <span className="text-xs font-mono text-grey">{event.metadata.idempotency_key}</span>
                                        </div>
                                      )}
                                      {event.metadata?.retry_count !== undefined && (
                                        <div className="bg-white rounded-lg p-3 border border-grey-300">
                                          <div className="text-xs font-semibold mb-1 text-grey-600">Retry Count</div>
                                          <span className="text-xs text-grey">{event.metadata.retry_count}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Error Message */}
                                  {event.metadata?.error_message && (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <AlertCircle className="h-4 w-4 text-red" />
                                          <span className="text-xs font-semibold text-grey uppercase tracking-wide">Error Details</span>
                                        </div>
                                        {event.category === 'dead-letter' && (
                                          <Button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toast.success(`Reprocessing message ${event.metadata?.message_id}`);
                                            }}
                                            size="sm"
                                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
                                          >
                                            <Activity className="h-3.5 w-3.5" />
                                            Reprocess DLQ
                                          </Button>
                                        )}
                                      </div>
                                      <div className="bg-red/5 rounded-lg p-3 border border-red/20">
                                        <span className="text-xs text-red">{event.metadata.error_message}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Request Data */}
                                  {event.request_data && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Send className="h-4 w-4 text-grey-600" />
                                        <span className="text-xs font-semibold text-grey uppercase tracking-wide">Request Data</span>
                                      </div>
                                      <div className="bg-white rounded-lg p-3 border border-grey-300">
                                        <pre className="text-xs font-mono text-grey overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                                          {JSON.stringify(event.request_data, null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                  )}

                                  {/* Response Data */}
                                  {event.response_data && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="h-4 w-4 text-grey-600" />
                                        <span className="text-xs font-semibold text-grey uppercase tracking-wide">Response Data</span>
                                      </div>
                                      <div className="bg-white rounded-lg p-3 border border-grey-300">
                                        <pre className="text-xs font-mono text-grey overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                                          {JSON.stringify(event.response_data, null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
    </div>
  );
}
