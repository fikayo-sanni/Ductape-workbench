import { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Search,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Bot,
  Timer,
  Pause,
  Calendar,
  LayoutGrid,
  BarChart3,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Wrench,
  Zap,
  DollarSign,
  User,
  Webhook,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ActivityTimelinePanel } from '@/components/activity/ActivityTimelinePanel';
import toast from 'react-hot-toast';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface AgentExplorerTabProps {
  agent?: {
    name?: string;
    tag?: string;
    productTag?: string;
    env?: {
      slug?: string;
    };
  };
}

type RunStatus = 'completed' | 'failed' | 'running' | 'pending' | 'cancelled' | 'timeout';

interface ToolCall {
  id: string;
  name: string;
  input: any;
  output?: any;
  status: 'completed' | 'failed' | 'running';
  duration: number | null;
  timestamp: string;
}

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  reasoning?: string;
  metadata?: {
    model?: string;
    tokens?: { input: number; output: number };
  };
}

interface AgentRun {
  id: string;
  runNumber: number;
  status: RunStatus;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  input: string;
  output: string | null;
  error?: string;
  messages: AgentMessage[];
  toolCalls: number;
  tokens: { input: number; output: number; total: number };
  cost: number;
  triggeredBy: 'manual' | 'schedule' | 'webhook' | 'event' | 'api';
  triggeredByUser?: string;
  version: string;
  model: string;
  tags?: string[];
}

// Generate realistic dummy data
const generateDummyRuns = (): AgentRun[] => {
  const triggers: AgentRun['triggeredBy'][] = ['manual', 'api', 'webhook', 'event', 'schedule'];
  const users = ['john.doe@company.com', 'jane.smith@company.com', 'system', 'api-service'];
  const models = ['claude-3-5-sonnet', 'claude-3-opus', 'gpt-4-turbo', 'gpt-4o'];
  const sampleInputs = [
    'Analyze the customer feedback data and provide insights on common pain points',
    'Generate a summary report for Q4 sales performance',
    'Help me debug this API integration issue with the payment gateway',
    'Create a marketing email draft for our new product launch',
    'Review the code changes in PR #234 and suggest improvements',
    'Research competitors in the fintech space and compile a report',
    'Draft a response to the customer complaint about delayed shipping',
    'Summarize the key points from today\'s team meeting notes',
  ];
  const sampleOutputs = [
    'Based on my analysis of 1,247 customer feedback entries, I\'ve identified 5 key pain points...',
    'Q4 Sales Summary: Total revenue increased by 23% compared to Q3, with the highest growth in...',
    'I\'ve identified the issue - the webhook signature validation is failing due to...',
    'Here\'s a draft email that highlights the key features while maintaining our brand voice...',
    'I\'ve reviewed the changes and found 3 areas that could be improved for better performance...',
    'I\'ve compiled research on 8 key competitors. Here are the main findings...',
    'I\'ve drafted a response that acknowledges the issue and offers a concrete resolution...',
    'Meeting Summary: 4 action items were discussed, with deadlines set for...',
  ];

  const runs: AgentRun[] = [];
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const startTime = new Date(now.getTime() - i * 1000 * 60 * 45 - Math.random() * 1000 * 60 * 20);
    const baseDuration = Math.floor(Math.random() * 90000) + 8000;
    const statuses: RunStatus[] = ['completed', 'completed', 'completed', 'completed', 'completed', 'failed', 'running', 'cancelled'];
    const status = i === 0 ? 'running' : statuses[Math.floor(Math.random() * statuses.length)];
    const duration = status === 'running' ? null : baseDuration;
    const endTime = status === 'running' ? null : new Date(startTime.getTime() + baseDuration);

    const inputIdx = Math.floor(Math.random() * sampleInputs.length);
    const toolCallCount = Math.floor(Math.random() * 6) + 1;
    const inputTokens = Math.floor(Math.random() * 2500) + 800;
    const outputTokens = Math.floor(Math.random() * 1500) + 300;
    const totalTokens = inputTokens + outputTokens;
    const cost = (inputTokens * 0.003 + outputTokens * 0.015) / 1000;

    const messageCount = Math.floor(Math.random() * 4) + 2;
    const messages: AgentMessage[] = [];

    messages.push({
      id: `msg_${i}_0`,
      role: 'user',
      content: sampleInputs[inputIdx],
      timestamp: startTime.toISOString(),
    });

    for (let j = 1; j < messageCount; j++) {
      const hasToolCalls = j % 2 === 1 && Math.random() > 0.4;
      const toolCalls: ToolCall[] = hasToolCalls ? Array.from({ length: Math.floor(Math.random() * 2) + 1 }, (_, k) => ({
        id: `tool_${i}_${j}_${k}`,
        name: ['search_database', 'call_api', 'read_file', 'execute_query', 'analyze_data'][Math.floor(Math.random() * 5)],
        input: { query: 'sample query', limit: 10 },
        output: { results: [], count: Math.floor(Math.random() * 100) },
        status: 'completed' as const,
        duration: Math.floor(Math.random() * 1500) + 200,
        timestamp: new Date(startTime.getTime() + j * (baseDuration / messageCount)).toISOString(),
      })) : [];

      messages.push({
        id: `msg_${i}_${j}`,
        role: j % 2 === 1 ? 'assistant' : 'user',
        content: j % 2 === 1 ? sampleOutputs[inputIdx] : 'Can you elaborate on that point?',
        timestamp: new Date(startTime.getTime() + j * (baseDuration / messageCount)).toISOString(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        reasoning: j % 2 === 1 && Math.random() > 0.5 ? 'Analyzing the request to determine the best approach...' : undefined,
        metadata: j % 2 === 1 ? {
          model: models[Math.floor(Math.random() * models.length)],
          tokens: { input: Math.floor(inputTokens / messageCount), output: Math.floor(outputTokens / messageCount) },
        } : undefined,
      });
    }

    runs.push({
      id: `agent_${(10000 - i).toString(36)}${Math.random().toString(36).substr(2, 4)}`,
      runNumber: 10000 - i,
      status,
      startedAt: startTime.toISOString(),
      completedAt: endTime?.toISOString() || null,
      duration,
      input: sampleInputs[inputIdx],
      output: status === 'completed' ? sampleOutputs[inputIdx] : null,
      error: status === 'failed' ? 'Rate limit exceeded. Please try again later.' : undefined,
      messages,
      toolCalls: toolCallCount,
      tokens: { input: inputTokens, output: outputTokens, total: totalTokens },
      cost,
      triggeredBy: triggers[Math.floor(Math.random() * triggers.length)],
      triggeredByUser: users[Math.floor(Math.random() * users.length)],
      version: `v${Math.floor(Math.random() * 2) + 1}.${Math.floor(Math.random() * 5)}`,
      model: models[Math.floor(Math.random() * models.length)],
      tags: Math.random() > 0.8 ? ['priority'] : undefined,
    });
  }

  return runs;
};

const DUMMY_RUNS = generateDummyRuns();

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
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} 100,${height}`}
        fill={`url(#gradient-${color})`}
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

// Format helpers
const formatDuration = (ms: number | null) => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

const formatTime = (dateStr: string, relative = true) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (relative) {
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 172800000) return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
const formatTokens = (tokens: number) => tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens.toString();

export default function AgentExplorerTab({ agent = {} }: AgentExplorerTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();

  const agentName = agent.name || 'Customer Support Agent';
  const agentTag = agent.tag || 'support-agent';
  const envSlug = agent.env?.slug || 'production';

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [executeInput, setExecuteInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d' | 'all'>('24h');
  const [listViewMode, setListViewMode] = useState<'list' | 'timeline'>('list');
  const [viewMode, setViewMode] = useState<'overview' | 'runs'>('overview');

  const handleOpenRun = (run: AgentRun) => {
    openTab({
      id: `agent-run-${run.id}`,
      type: 'agent-run',
      title: `Run #${run.runNumber}`,
      itemId: run.id,
      data: { run, agentName, agentTag },
    });
  };

  const filteredRuns = useMemo(() => {
    return DUMMY_RUNS.filter((run) => {
      const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
      const matchesSearch = searchQuery === '' ||
        run.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.runNumber.toString().includes(searchQuery) ||
        run.input.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const runs = DUMMY_RUNS;
    const total = runs.length;
    const completed = runs.filter(r => r.status === 'completed').length;
    const failed = runs.filter(r => r.status === 'failed').length;
    const running = runs.filter(r => r.status === 'running').length;

    const completedRuns = runs.filter(r => r.duration !== null);
    const durations = completedRuns.map(r => r.duration!).sort((a, b) => a - b);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const successRate = total > 0 ? (completed / (total - running)) * 100 : 0;
    const totalCost = runs.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = runs.reduce((sum, r) => sum + r.tokens.total, 0);
    const totalToolCalls = runs.reduce((sum, r) => sum + r.toolCalls, 0);

    // Generate sparkline data (last 24 data points)
    const sparklineData = Array.from({ length: 24 }, (_, i) => {
      const hourRuns = runs.filter(r => {
        const runTime = new Date(r.startedAt).getTime();
        const hourStart = Date.now() - (24 - i) * 3600000;
        const hourEnd = hourStart + 3600000;
        return runTime >= hourStart && runTime < hourEnd;
      });
      return hourRuns.length;
    });

    const errorSparkline = Array.from({ length: 24 }, (_, i) => {
      const hourRuns = runs.filter(r => {
        const runTime = new Date(r.startedAt).getTime();
        const hourStart = Date.now() - (24 - i) * 3600000;
        const hourEnd = hourStart + 3600000;
        return runTime >= hourStart && runTime < hourEnd && r.status === 'failed';
      });
      return hourRuns.length;
    });

    // Generate 7-day activity stats
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;

    // Use seeded random based on agent tag for consistent display
    const seed = (agentTag || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const seededRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const weeklyStats = {
      conversations: Math.floor(seededRandom(1) * 500) + 100 + total,
      successful: Math.floor(seededRandom(2) * 450) + 90 + completed,
      failed: Math.floor(seededRandom(3) * 30) + 5 + failed,
      totalTokens7d: Math.floor(seededRandom(4) * 500000) + 100000 + totalTokens,
      totalCost7d: totalCost + (seededRandom(5) * 50),
      toolCalls7d: Math.floor(seededRandom(6) * 2000) + 500 + totalToolCalls,
      avgResponseTime: Math.floor(seededRandom(7) * 15000) + 5000,
      dailyTrend: days.map((day, idx) => ({
        day,
        conversations: idx <= dayOfWeek ? Math.floor(seededRandom(8 + idx) * 80) + 15 : 0,
        tokens: idx <= dayOfWeek ? Math.floor(seededRandom(15 + idx) * 80000) + 15000 : 0,
      })),
    };

    return { total, completed, failed, running, avgDuration, successRate, totalCost, totalTokens, totalToolCalls, sparklineData, errorSparkline, weeklyStats };
  }, [agentTag]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleExecuteAgent = async () => {
    if (!executeInput.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setIsExecuting(true);
    await new Promise(r => setTimeout(r, 1200));
    toast.success('Agent conversation started');
    setShowExecuteModal(false);
    setExecuteInput('');
    setIsExecuting(false);
  };

  const getStatusConfig = (status: RunStatus) => {
    const configs = {
      completed: { icon: CheckCircle, color: 'text-green', bg: 'bg-green/10', border: 'border-green/30', label: 'Completed', animate: false, dotColor: 'bg-green' },
      failed: { icon: XCircle, color: 'text-red', bg: 'bg-red/10', border: 'border-red/30', label: 'Failed', animate: false, dotColor: 'bg-red' },
      running: { icon: Loader2, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'Running', animate: true, dotColor: 'bg-purple-500' },
      pending: { icon: Clock, color: 'text-grey-200', bg: 'bg-grey-400/10', border: 'border-grey-400/30', label: 'Pending', animate: false, dotColor: 'bg-grey-400' },
      cancelled: { icon: Pause, color: 'text-orange', bg: 'bg-orange/10', border: 'border-orange/30', label: 'Cancelled', animate: false, dotColor: 'bg-orange' },
      timeout: { icon: AlertCircle, color: 'text-yellow', bg: 'bg-yellow/10', border: 'border-yellow/30', label: 'Timeout', animate: false, dotColor: 'bg-yellow' },
    };
    return configs[status] || configs.pending;
  };

  const getTriggerConfig = (trigger: AgentRun['triggeredBy']) => {
    const configs = {
      manual: { icon: User, label: 'Manual', color: 'text-purple-500', bg: 'bg-purple-500/10' },
      schedule: { icon: Clock, label: 'Schedule', color: 'text-purple-500', bg: 'bg-purple-500/10' },
      webhook: { icon: Webhook, label: 'Webhook', color: 'text-green', bg: 'bg-green/10' },
      event: { icon: Zap, label: 'Event', color: 'text-yellow', bg: 'bg-yellow/10' },
      api: { icon: Play, label: 'API', color: 'text-grey-600', bg: 'bg-grey-100' },
    };
    return configs[trigger] || configs.manual;
  };

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden bg-background-tertiary">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-grey-400 flex flex-col flex-shrink-0 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-5 w-5 text-purple-500" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-grey text-sm truncate">{agentName}</h2>
              <p className="text-xs text-grey-600 truncate">{envSlug}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
            <Input
              type="text"
              placeholder="Search runs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
            {/* Overview Link */}
            <div className="mb-4">
              <button
                onClick={() => setViewMode('overview')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  viewMode === 'overview'
                    ? 'bg-purple-500/10 text-purple-500'
                    : 'text-grey hover:bg-background-secondary'
                )}
              >
                <LayoutDashboard className={cn(
                  'h-4 w-4',
                  viewMode === 'overview' ? 'text-purple-500' : 'text-grey-600'
                )} />
                <span className="flex-1 text-left font-medium">Overview</span>
              </button>
            </div>

            {/* Status Filters */}
            <div className="flex items-center justify-between px-2 py-2">
              <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
                Status
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-grey-600 hover:text-purple-500 transition-colors"
                title="Refresh runs"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
              </button>
            </div>

            <div className="space-y-0.5">
              {([
                { value: 'all', label: 'All Runs', icon: <LayoutGrid className="h-4 w-4" />, count: DUMMY_RUNS.length },
                { value: 'running', label: 'Running', icon: <Loader2 className="h-4 w-4" />, count: metrics.running },
                { value: 'completed', label: 'Completed', icon: <CheckCircle2 className="h-4 w-4" />, count: metrics.completed },
                { value: 'failed', label: 'Failed', icon: <AlertCircle className="h-4 w-4" />, count: metrics.failed },
              ] as const).map((status) => (
                <button
                  key={status.value}
                  onClick={() => {
                    setStatusFilter(status.value);
                    setViewMode('runs');
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    viewMode === 'runs' && statusFilter === status.value
                      ? 'bg-purple-500/10 text-purple-500'
                      : 'text-grey hover:bg-background-secondary'
                  )}
                >
                  <span className={cn(
                    viewMode === 'runs' && statusFilter === status.value ? 'text-purple-500' : 'text-grey-600'
                  )}>
                    {status.icon}
                  </span>
                  <span className="flex-1 text-left">{status.label}</span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    viewMode === 'runs' && statusFilter === status.value
                      ? 'bg-purple-500/20 text-purple-500'
                      : 'bg-background-secondary text-grey-600'
                  )}>
                    {status.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Time Range Filter */}
            <div className="mt-4 px-2">
              <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-2">
                Time Range
              </div>
              <div className="space-y-0.5">
                {[
                  { value: '1h', label: 'Last Hour' },
                  { value: '24h', label: 'Last 24 Hours' },
                  { value: '7d', label: 'Last 7 Days' },
                  { value: '30d', label: 'Last 30 Days' },
                  { value: 'all', label: 'All Time' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setTimeRange(option.value as any)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                      timeRange === option.value
                        ? 'bg-purple-500/10 text-purple-500'
                        : 'text-grey hover:bg-background-secondary'
                    )}
                  >
                    <Calendar className={cn(
                      'h-4 w-4',
                      timeRange === option.value ? 'text-purple-500' : 'text-grey-600'
                    )} />
                    <span className="flex-1 text-left">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        {/* New Conversation Button */}
        <div className="flex-shrink-0 p-4 border-t border-grey-400">
          <Button
            onClick={() => setShowExecuteModal(true)}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-white">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">{agentName}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{agentTag}</code>
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-semibold rounded-full',
                      envSlug === 'production' ? 'bg-red/10 text-red' :
                      envSlug === 'staging' ? 'bg-yellow/10 text-yellow' :
                      'bg-purple-500/10 text-purple-500'
                    )}>
                      {envSlug}
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
                <Button
                  size="sm"
                  onClick={() => setShowExecuteModal(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  New Conversation
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
                {/* Total Conversations (7 days) */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingUp className="h-3 w-3" />
                      15.3%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.conversations.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Conversations (7 days)</div>
                </div>

                {/* Successful */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingUp className="h-3 w-3" />
                      11.2%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green mb-1">{metrics.weeklyStats.successful.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Successful (7 days)</div>
                </div>

                {/* Failed */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-red">
                      <TrendingDown className="h-3 w-3" />
                      -6.8%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-red mb-1">{metrics.weeklyStats.failed.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Failed (7 days)</div>
                </div>

                {/* Total Tokens */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingUp className="h-3 w-3" />
                      22.1%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{formatTokens(metrics.weeklyStats.totalTokens7d)}</div>
                  <div className="text-xs text-grey-600 font-medium">Tokens (7 days)</div>
                </div>

                {/* Total Cost */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-red">
                      <TrendingUp className="h-3 w-3" />
                      18.5%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">${metrics.weeklyStats.totalCost7d.toFixed(2)}</div>
                  <div className="text-xs text-grey-600 font-medium">Cost (7 days)</div>
                </div>

                {/* Tool Calls */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingUp className="h-3 w-3" />
                      9.4%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.toolCalls7d.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Tool Calls (7 days)</div>
                </div>
              </div>

              <ActivityTimelinePanel
                title="Activity timeline"
                kind="agent"
                productTag={agent?.productTag}
                componentTag={agent?.tag}
                env={agent?.env?.slug}
                countLabel="conversations"
                enabled={!!agent?.tag}
                className="mb-6"
              />

              {/* Current Session Metrics Dashboard */}
              <div className="grid grid-cols-6 gap-4 mb-6">
                {/* Total Runs */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Total Runs</span>
                    <MessageSquare className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-grey">{metrics.total}</p>
                  <div className="mt-2 h-8">
                    <Sparkline data={metrics.sparklineData} color="#A855F7" />
                  </div>
                </div>

                {/* Success Rate */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Success Rate</span>
                    <CheckCircle className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className={cn(
                    'text-2xl font-bold',
                    metrics.successRate >= 95 ? 'text-green' :
                    metrics.successRate >= 80 ? 'text-yellow' :
                    'text-red'
                  )}>
                    {metrics.successRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-grey-500 mt-2">{metrics.completed} succeeded</p>
                </div>

                {/* Active */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Active</span>
                    <Loader2 className={cn('h-4 w-4', metrics.running > 0 ? 'text-purple-500 animate-spin' : 'text-grey-400')} />
                  </div>
                  <p className="text-2xl font-bold text-purple-500">{metrics.running}</p>
                  <p className="text-xs text-grey-500 mt-2">currently running</p>
                </div>

                {/* Errors */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Errors</span>
                    <AlertCircle className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-red">{metrics.failed}</p>
                  <div className="mt-2 h-8">
                    <Sparkline data={metrics.errorSparkline} color="#DC3444" />
                  </div>
                </div>

                {/* Tokens */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Total Tokens</span>
                    <Zap className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-grey">{formatTokens(metrics.totalTokens)}</p>
                  <p className="text-xs text-grey-500 mt-2">{metrics.totalToolCalls} tool calls</p>
                </div>

                {/* Cost */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Total Cost</span>
                    <DollarSign className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-grey">${metrics.totalCost.toFixed(2)}</p>
                  <p className="text-xs text-grey-500 mt-2">avg: {formatDuration(metrics.avgDuration)}</p>
                </div>
              </div>

              {/* Breakdown Charts */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* By Trigger */}
                <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                  <h3 className="text-sm font-semibold text-grey mb-4">Runs by Trigger</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Manual', count: DUMMY_RUNS.filter(r => r.triggeredBy === 'manual').length, color: 'bg-purple-500' },
                      { label: 'API', count: DUMMY_RUNS.filter(r => r.triggeredBy === 'api').length, color: 'bg-grey-500' },
                      { label: 'Webhook', count: DUMMY_RUNS.filter(r => r.triggeredBy === 'webhook').length, color: 'bg-green' },
                      { label: 'Schedule', count: DUMMY_RUNS.filter(r => r.triggeredBy === 'schedule').length, color: 'bg-blue' },
                      { label: 'Event', count: DUMMY_RUNS.filter(r => r.triggeredBy === 'event').length, color: 'bg-yellow' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded-full', item.color)} />
                          <span className="text-sm text-grey">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-grey">{item.count} runs</span>
                          <div className="w-24 h-2 bg-grey-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', item.color)}
                              style={{ width: `${(item.count / metrics.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Model */}
                <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                  <h3 className="text-sm font-semibold text-grey mb-4">Runs by Model</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Claude 3.5 Sonnet', count: DUMMY_RUNS.filter(r => r.model === 'claude-3-5-sonnet').length, color: 'bg-purple-500' },
                      { label: 'Claude 3 Opus', count: DUMMY_RUNS.filter(r => r.model === 'claude-3-opus').length, color: 'bg-purple-700' },
                      { label: 'GPT-4 Turbo', count: DUMMY_RUNS.filter(r => r.model === 'gpt-4-turbo').length, color: 'bg-green' },
                      { label: 'GPT-4o', count: DUMMY_RUNS.filter(r => r.model === 'gpt-4o').length, color: 'bg-green-700' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded-full', item.color)} />
                          <span className="text-sm text-grey">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-grey">{item.count} runs</span>
                          <div className="w-24 h-2 bg-grey-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', item.color)}
                              style={{ width: `${(item.count / metrics.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Runs */}
              <div className="bg-white rounded-lg border border-border shadow-sm">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-grey">Recent Conversations</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusFilter('all');
                      setViewMode('runs');
                    }}
                    className="text-purple-500 hover:text-purple-600 text-xs"
                  >
                    View All Runs
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {DUMMY_RUNS.slice(0, 5).map((run) => {
                    const statusConfig = getStatusConfig(run.status);
                    return (
                      <div
                        key={run.id}
                        className="px-5 py-3 flex items-center justify-between hover:bg-background-secondary transition-colors cursor-pointer"
                        onClick={() => handleOpenRun(run)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn('w-2 h-2 rounded-full', statusConfig.dotColor)} />
                          <div>
                            <p className="text-sm font-medium text-grey">#{run.runNumber}</p>
                            <p className="text-xs text-grey-500 truncate max-w-[300px]">{run.input}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-grey-500">{formatTokens(run.tokens.total)} tokens</span>
                          <span className="text-xs text-grey-500">{formatTime(run.startedAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Runs List View */
            <>
              {/* Toolbar */}
              <div className="flex-shrink-0 px-6 py-3 bg-white border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-grey-600">
                      Showing <span className="font-medium text-grey">{filteredRuns.length}</span> runs
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
                        onClick={() => setListViewMode('timeline')}
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          listViewMode === 'timeline' ? 'bg-white text-grey shadow-sm' : 'text-grey-600 hover:text-grey'
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
                <div className="grid grid-cols-[1fr,120px,140px,120px,100px,100px,80px,40px] gap-4 px-6 py-3 text-xs font-medium text-grey-600 uppercase tracking-wider">
                  <div>Run</div>
                  <div>Status</div>
                  <div>Trigger</div>
                  <div>Started</div>
                  <div>Duration</div>
                  <div>Tokens</div>
                  <div>Cost</div>
                  <div></div>
                </div>
              </div>

              {/* Table body */}
              <div className="divide-y divide-border">
                {filteredRuns.map((run) => {
                  const statusConfig = getStatusConfig(run.status);
                  const StatusIcon = statusConfig.icon;
                  const triggerConfig = getTriggerConfig(run.triggeredBy);

                  return (
                    <div
                      key={run.id}
                      className={cn(
                        'grid grid-cols-[1fr,120px,140px,120px,100px,100px,80px,40px] gap-4 px-6 py-4 items-center cursor-pointer transition-colors',
                        'hover:bg-background-secondary',
                        run.status === 'running' && 'bg-purple-500/5',
                        run.status === 'failed' && 'bg-red/5',
                      )}
                      onClick={() => handleOpenRun(run)}
                    >
                      {/* Run info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig.dotColor)} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-grey">#{run.runNumber}</span>
                            {run.tags && run.tags.includes('priority') && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-yellow/10 text-yellow rounded">
                                PRIORITY
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-grey-500 truncate max-w-[300px]">{run.input}</p>
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <div className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                          statusConfig.bg,
                          statusConfig.border,
                          'border'
                        )}>
                          <StatusIcon className={cn('h-3 w-3', statusConfig.color, statusConfig.animate && 'animate-spin')} />
                          <span className={statusConfig.color}>{statusConfig.label}</span>
                        </div>
                      </div>

                      {/* Trigger */}
                      <div className="flex items-center gap-2">
                        <triggerConfig.icon className={cn('h-4 w-4', triggerConfig.color)} />
                        <div className="min-w-0">
                          <p className="text-sm text-grey">{triggerConfig.label}</p>
                          {run.triggeredByUser && run.triggeredByUser !== 'system' && (
                            <p className="text-xs text-grey-500 truncate">{run.triggeredByUser}</p>
                          )}
                        </div>
                      </div>

                      {/* Started */}
                      <div className="text-sm text-grey-600">
                        {formatTime(run.startedAt)}
                      </div>

                      {/* Duration */}
                      <div className="text-sm font-mono text-grey-600">
                        {run.status === 'running' ? (
                          <span className="text-purple-500">{formatDuration(Date.now() - new Date(run.startedAt).getTime())}</span>
                        ) : (
                          formatDuration(run.duration)
                        )}
                      </div>

                      {/* Tokens */}
                      <div className="text-sm text-grey-600">
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {formatTokens(run.tokens.total)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-grey-500">
                          <Wrench className="h-3 w-3" />
                          {run.toolCalls} tools
                        </div>
                      </div>

                      {/* Cost */}
                      <div className="text-sm font-mono text-grey-600">
                        {formatCost(run.cost)}
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-end">
                        <ChevronRight className="h-4 w-4 text-grey-400" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredRuns.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-lg bg-border flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 text-grey-500" />
                  </div>
                  <p className="text-grey font-medium">No runs found</p>
                  <p className="text-grey-500 text-sm mt-1">Try adjusting your filters</p>
                </div>
              )}
                </div>
              </div>
            </>
          )}
        </div>

      {/* Execute Modal */}
      <Dialog open={showExecuteModal} onOpenChange={setShowExecuteModal}>
        <DialogContent className="max-w-lg bg-white border-grey-400">
          <DialogHeader>
            <DialogTitle className="text-grey flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              New Conversation
            </DialogTitle>
            <DialogDescription className="text-grey-600">
              Start a conversation with <span className="font-medium text-grey">{agentName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold text-grey">Your Message</Label>
              <Textarea
                value={executeInput}
                onChange={(e) => setExecuteInput(e.target.value)}
                placeholder="What would you like the agent to help you with?"
                className="h-32 mt-2 bg-grey-100 border-grey-400 text-grey placeholder:text-grey-400"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExecuteModal(false)}
              className="border-grey-400 text-grey-600 hover:text-grey hover:bg-grey-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteAgent}
              disabled={isExecuting}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Conversation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
