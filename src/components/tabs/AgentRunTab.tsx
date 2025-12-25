import { useState } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Bot,
  Timer,
  Pause,
  RotateCcw,
  Copy,
  Download,
  MoreVertical,
  Loader2,
  AlertCircle,
  MessageSquare,
  Wrench,
  User,
  Brain,
  Zap,
  DollarSign,
  ExternalLink,
  Webhook,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

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

interface AgentRunTabProps {
  run: AgentRun;
  agentName?: string;
  agentTag?: string;
}

// Format helpers
const formatDuration = (ms: number | null) => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatCost = (cost: number) => `$${cost.toFixed(4)}`;

export default function AgentRunTab({ run, agentName, agentTag }: AgentRunTabProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(new Set());

  const toggleMessageExpanded = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      next.has(messageId) ? next.delete(messageId) : next.add(messageId);
      return next;
    });
  };

  const toggleToolCallExpanded = (toolCallId: string) => {
    setExpandedToolCalls(prev => {
      const next = new Set(prev);
      next.has(toolCallId) ? next.delete(toolCallId) : next.add(toolCallId);
      return next;
    });
  };

  const getStatusConfig = (status: RunStatus): { icon: typeof CheckCircle; color: string; bg: string; border: string; label: string; animate?: boolean; dotColor: string } => {
    const configs = {
      completed: { icon: CheckCircle, color: 'text-green', bg: 'bg-green/10', border: 'border-green/30', label: 'Completed', dotColor: 'bg-green' },
      failed: { icon: XCircle, color: 'text-red', bg: 'bg-red/10', border: 'border-red/30', label: 'Failed', dotColor: 'bg-red' },
      running: { icon: Loader2, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'Running', animate: true, dotColor: 'bg-purple-500' },
      pending: { icon: Clock, color: 'text-grey-200', bg: 'bg-grey-400/10', border: 'border-grey-400/30', label: 'Pending', dotColor: 'bg-grey-400' },
      cancelled: { icon: Pause, color: 'text-orange', bg: 'bg-orange/10', border: 'border-orange/30', label: 'Cancelled', dotColor: 'bg-orange' },
      timeout: { icon: AlertCircle, color: 'text-yellow', bg: 'bg-yellow/10', border: 'border-yellow/30', label: 'Timeout', dotColor: 'bg-yellow' },
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const statusConfig = getStatusConfig(run.status);
  const StatusIcon = statusConfig.icon;
  const triggerConfig = getTriggerConfig(run.triggeredBy);

  return (
    <div className="h-full flex flex-col bg-background-tertiary">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-border">
        <div className="px-6 py-5">
          {/* Top row: Icon, title, status, actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Agent Icon */}
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Bot className="h-6 w-6 text-purple-500" />
              </div>

              {/* Title & Meta */}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-grey">Run #{run.runNumber}</h1>
                  <div className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
                    statusConfig.bg,
                    statusConfig.border
                  )}>
                    <StatusIcon className={cn('h-3.5 w-3.5', statusConfig.color, statusConfig.animate && 'animate-spin')} />
                    <span className={cn('text-xs font-semibold', statusConfig.color)}>{statusConfig.label}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(run.id, 'Run ID')}
                    className="text-grey-400 hover:text-grey-600 transition-colors"
                    title="Copy Run ID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  {agentName && (
                    <div className="flex items-center gap-1.5 text-sm text-grey-600">
                      <span className="font-medium text-grey">{agentName}</span>
                      {agentTag && <code className="text-xs text-grey-400 font-mono">{agentTag}</code>}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-grey-600">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatTime(run.startedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Timer className="h-3.5 w-3.5 text-grey-600" />
                    {run.duration ? (
                      <span className="text-grey-600">{formatDuration(run.duration)}</span>
                    ) : (
                      <span className="text-purple-500 font-medium">{formatDuration(Date.now() - new Date(run.startedAt).getTime())}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {run.status === 'running' && (
                <Button size="sm" variant="outline" className="border-red/30 text-red hover:bg-red/10">
                  <Pause className="h-4 w-4 mr-1.5" />
                  Stop
                </Button>
              )}
              {(run.status === 'failed' || run.status === 'timeout') && (
                <Button size="sm" variant="outline" className="border-border text-grey-600 hover:text-grey hover:bg-grey-100">
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Retry
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-grey-400 hover:text-grey">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-border">
                  <DropdownMenuItem className="text-grey focus:text-grey focus:bg-grey-100">
                    <Download className="h-4 w-4 mr-2" />
                    Export Conversation
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-grey focus:text-grey focus:bg-grey-100">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Run ID
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-3 mt-5">
            {/* Trigger */}
            <div className="bg-background-tertiary rounded-lg px-4 py-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <triggerConfig.icon className={cn('h-4 w-4', triggerConfig.color)} />
                <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Trigger</span>
              </div>
              <p className={cn('text-sm font-semibold', triggerConfig.color)}>{triggerConfig.label}</p>
              {run.triggeredByUser && run.triggeredByUser !== 'system' && (
                <p className="text-xs text-grey-400 mt-0.5">{run.triggeredByUser}</p>
              )}
            </div>

            {/* Messages */}
            <div className="bg-background-tertiary rounded-lg px-4 py-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Messages</span>
              </div>
              <p className="text-sm font-semibold text-grey">{run.messages.length}</p>
            </div>

            {/* Tool Calls */}
            <div className="bg-background-tertiary rounded-lg px-4 py-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="h-4 w-4 text-yellow" />
                <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Tool Calls</span>
              </div>
              <p className="text-sm font-semibold text-grey">{run.toolCalls}</p>
            </div>

            {/* Tokens */}
            <div className="bg-background-tertiary rounded-lg px-4 py-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Tokens</span>
              </div>
              <p className="text-sm font-semibold text-grey">{run.tokens.total.toLocaleString()}</p>
              <p className="text-xs text-grey-400 mt-0.5">{run.tokens.input.toLocaleString()}↓ {run.tokens.output.toLocaleString()}↑</p>
            </div>

            {/* Cost */}
            <div className="bg-background-tertiary rounded-lg px-4 py-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-green" />
                <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Cost</span>
              </div>
              <p className="text-sm font-semibold text-grey">{formatCost(run.cost)}</p>
              <p className="text-xs text-grey-400 mt-0.5">{run.model.split('-').slice(0, 3).join('-')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          {/* Error Alert */}
          {run.error && (
            <div className="bg-red/10 border border-red/20 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red/20 flex items-center justify-center flex-shrink-0">
                <XCircle className="h-4 w-4 text-red" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-red">Conversation Failed</p>
                <p className="text-sm text-red/80 mt-1">{run.error}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-red hover:text-red hover:bg-red/10">
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Retry
              </Button>
            </div>
          )}

          {/* Conversation */}
          <div className="space-y-4">
            {run.messages.map((message) => {
              const isExpanded = expandedMessages.has(message.id);
              const isUser = message.role === 'user';
              const isAssistant = message.role === 'assistant';

              return (
                <div
                  key={message.id}
                  className={cn(
                    'rounded-xl border overflow-hidden',
                    isUser ? 'bg-white border-border' : 'bg-purple-500/5 border-purple-500/20'
                  )}
                >
                  {/* Message header */}
                  <div className={cn(
                    'px-4 py-3 flex items-center justify-between',
                    isUser ? 'bg-grey-100 border-b border-border' : 'bg-purple-500/10 border-b border-purple-500/20'
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        isUser ? 'bg-primary/10' : 'bg-purple-500/20'
                      )}>
                        {isUser ? (
                          <User className="h-4 w-4 text-primary" />
                        ) : (
                          <Bot className="h-4 w-4 text-purple-500" />
                        )}
                      </div>
                      <div>
                        <p className={cn('font-medium', isUser ? 'text-grey' : 'text-purple-600')}>
                          {isUser ? 'User' : 'Agent'}
                        </p>
                        <p className="text-xs text-grey-700">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {isAssistant && message.metadata && (
                      <div className="flex items-center gap-3 text-xs text-grey-200">
                        <span className="font-mono">{message.metadata.tokens?.input}→{message.metadata.tokens?.output} tokens</span>
                      </div>
                    )}
                  </div>

                  {/* Reasoning (if available) */}
                  {isAssistant && message.reasoning && (
                    <div className="px-4 py-3 bg-yellow/5 border-b border-yellow/20">
                      <div className="flex items-start gap-2">
                        <Brain className="h-4 w-4 text-yellow mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-yellow uppercase tracking-wide mb-1">Reasoning</p>
                          <p className="text-sm text-grey-700">{message.reasoning}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message content */}
                  <div className="px-4 py-4">
                    <p className="text-grey whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Tool calls */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="px-4 pb-4 space-y-2">
                      <p className="text-xs font-medium text-grey-200 uppercase tracking-wide flex items-center gap-2">
                        <Wrench className="h-3.5 w-3.5" />
                        Tool Calls ({message.toolCalls.length})
                      </p>
                      {message.toolCalls.map((toolCall) => {
                        const isToolExpanded = expandedToolCalls.has(toolCall.id);
                        const isToolSuccess = toolCall.status === 'completed';

                        return (
                          <div
                            key={toolCall.id}
                            className="bg-grey-100 rounded-lg border border-border overflow-hidden"
                          >
                            <button
                              onClick={() => toggleToolCallExpanded(toolCall.id)}
                              className="w-full px-3 py-2 flex items-center justify-between hover:bg-grey-400/20 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  'w-5 h-5 rounded flex items-center justify-center',
                                  isToolSuccess ? 'bg-green/10' : 'bg-red/10'
                                )}>
                                  {toolCall.status === 'running' ? (
                                    <Loader2 className="h-3 w-3 text-primary animate-spin" />
                                  ) : isToolSuccess ? (
                                    <CheckCircle className="h-3 w-3 text-green" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red" />
                                  )}
                                </div>
                                <code className="text-sm font-mono text-grey">{toolCall.name}</code>
                                {toolCall.duration && (
                                  <span className="text-xs text-grey-700">{formatDuration(toolCall.duration)}</span>
                                )}
                              </div>
                              {isToolExpanded ? (
                                <ChevronDown className="h-4 w-4 text-grey-700" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-grey-700" />
                              )}
                            </button>

                            {isToolExpanded && (
                              <div className="px-3 pb-3 space-y-3">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-grey-200 uppercase tracking-wide">Input</span>
                                    <button
                                      onClick={() => copyToClipboard(JSON.stringify(toolCall.input, null, 2), 'Input')}
                                      className="text-grey-700 hover:text-grey-200"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <pre className="bg-white text-grey rounded p-2 text-xs font-mono overflow-auto max-h-24 border border-border">
                                    {JSON.stringify(toolCall.input, null, 2)}
                                  </pre>
                                </div>
                                {toolCall.output && (
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-grey-200 uppercase tracking-wide">Output</span>
                                      <button
                                        onClick={() => copyToClipboard(JSON.stringify(toolCall.output, null, 2), 'Output')}
                                        className="text-grey-700 hover:text-grey-200"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </div>
                                    <pre className="bg-white text-grey rounded p-2 text-xs font-mono overflow-auto max-h-24 border border-border">
                                      {JSON.stringify(toolCall.output, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Running indicator */}
            {run.status === 'running' && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 px-4 py-2 bg-purple-500/10 rounded-full">
                  <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
                  <span className="text-sm font-medium text-purple-500">Agent is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
