import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown, ChevronRight, XCircle, CheckCircle, AlertTriangle, Loader2, Copy, Check, Terminal, Database,
  HardDrive, MessageSquare, Zap, Box, Boxes, Share2, Timer, UserCheck, Megaphone, Headphones, Bell, Code,
  Webhook, Mail, Smartphone, MessageCircle, Link2, Lock, GitBranch, Layers, Activity,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ILog } from '@/types/logs';
import { cn } from '@/lib/utils';

/**
 * The workspace log table: rows, mobile cards and header. The Logs page and the product Observability
 * views both render through this file so they always look the same.
 */

// Component types mapped to LogEventTypes enum from backend (feature_step displayed as "Step")
export const componentTypes = [
  { id: 'actions', name: 'API', icon: Box },
  { id: 'database_actions', name: 'Database Actions', icon: Database },
  { id: 'database', name: 'Database', icon: Database },
  { id: 'graph', name: 'Graph', icon: Share2 },
  { id: 'vector', name: 'Vector', icon: Boxes },
  { id: 'storage', name: 'Storage', icon: HardDrive },
  { id: 'cache', name: 'Cache', icon: Zap },
  { id: 'message_broker', name: 'Message Broker', icon: MessageSquare },
  { id: 'producer', name: 'Producer', icon: Megaphone },
  { id: 'consumer', name: 'Consumer', icon: Headphones },
  { id: 'jobs', name: 'Jobs', icon: Terminal },
  { id: 'session', name: 'Session', icon: UserCheck },
  { id: 'feature', name: 'Feature', icon: GitBranch },
  { id: 'feature_step', name: 'Step', icon: Layers },
  { id: 'secret', name: 'Secret', icon: Lock },
  { id: 'tokens', name: 'Tokens', icon: Lock },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'push', name: 'Push', icon: Smartphone },
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'sms', name: 'SMS', icon: MessageCircle },
  { id: 'callbacks', name: 'Callbacks', icon: Link2 },
  { id: 'functions', name: 'Functions', icon: Code },
  { id: 'webhook', name: 'Webhook', icon: Webhook },
  { id: 'frontend', name: 'Frontend', icon: Activity },
];

export const normalizeLogType = (type: string) => {
  const normalized = (type || '').toLowerCase().trim();
  return normalized === 'action' ? 'actions' : normalized;
};

export const getLogTypeLabel = (type: string): string => {
  const id = normalizeLogType(type);
  const entry = componentTypes.find((c) => c.id === id);
  return entry?.name ?? (type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : '');
};

export type ProcessLog = ILog['logs']['data'][number];

/** Loads the payload of one log on demand, for lists whose endpoint leaves `data` out of each row. */
export type FetchLogPayload = (log: ProcessLog) => Promise<unknown>;

// Helper to safely parse and format log data
export const formatLogData = (data: any): string => {
  if (data === undefined || data === null) {
    return 'No data available';
  }
  try {
    if (typeof data === 'string') {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    }
    return JSON.stringify(data, null, 2);
  } catch {
    return typeof data === 'string' ? data : 'Invalid data format';
  }
};

// Helper to format latency in a human-readable way
export const formatLatency = (latencyMs: number | undefined): string | null => {
  if (latencyMs === undefined || latencyMs === null) return null;
  if (latencyMs < 1) return '<1ms';
  if (latencyMs < 1000) return `${Math.round(latencyMs)}ms`;
  if (latencyMs < 60000) return `${(latencyMs / 1000).toFixed(2)}s`;
  const minutes = Math.floor(latencyMs / 60000);
  const seconds = ((latencyMs % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
};

// Get latency color based on value
export const getLatencyColor = (latencyMs: number | undefined): string => {
  if (latencyMs === undefined || latencyMs === null) return 'text-grey-500';
  if (latencyMs < 200) return 'text-green'; // Fast
  if (latencyMs < 1000) return 'text-yellow-600'; // Moderate
  if (latencyMs < 3000) return 'text-orange-500'; // Slow
  return 'text-red'; // Very slow
};

// Get status config
export const getStatusConfig = (log: ProcessLog) => {
  if (log.successful_execution || log.status === 'success') {
    return {
      icon: CheckCircle,
      color: 'text-green',
      bg: 'bg-green/10',
      label: 'Success',
    };
  }
  if (log.status === 'fail') {
    return {
      icon: XCircle,
      color: 'text-red',
      bg: 'bg-red/10',
      label: 'Failed',
    };
  }
  return {
    icon: AlertTriangle,
    color: 'text-yellow',
    bg: 'bg-yellow/10',
    label: 'Processing',
  };
};

// Get component icon (normalizes type; feature_step -> Layers, feature -> GitBranch, secret/tokens -> Lock)
export const getComponentIcon = (type: string) => {
  const id = normalizeLogType(type);
  const component = componentTypes.find(c => c.id === id);
  if (component?.icon) return component.icon;
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    feature: GitBranch,
    feature_step: Layers,
    secret: Lock,
    tokens: Lock,
  };
  return iconMap[id] || Activity;
};

// Get environment badge style
export const getEnvStyle = (env: string) => {
  switch (env?.toLowerCase()) {
    case 'prd':
    case 'production':
      return 'bg-green/10 text-green';
    case 'stg':
    case 'staging':
      return 'bg-yellow/10 text-yellow';
    case 'dev':
    case 'development':
      return 'bg-blue-500/10 text-blue-500';
    default:
      return 'bg-grey-400/20 text-grey-600';
  }
};

// Copy button component
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-grey-400/30 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-grey-600" />
      )}
    </button>
  );
}

// Single log entry component
export function LogEntry({ log, isExpanded, onToggle, fetchPayload }: {
  log: ProcessLog;
  isExpanded: boolean;
  onToggle: () => void;
  fetchPayload?: FetchLogPayload;
}) {
  const payloadText = usePayloadText(log, fetchPayload, isExpanded);
  const statusConfig = getStatusConfig(log);
  const StatusIcon = statusConfig.icon;
  const componentType = (log.component || log.type || '').trim();
  const ComponentIcon = getComponentIcon(componentType);
  const operationTag = log.child_tag
    ? `${log.parent_tag ? `${log.parent_tag}:` : ''}${log.child_tag}`
    : log.parent_tag || '-';

  return (
    <div className={cn(
      "border-b border-grey-400 last:border-0 transition-colors",
      isExpanded ? "bg-grey-100" : "hover:bg-grey-100/50"
    )}>
      {/* Main Row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        {/* Expand Icon */}
        <button className="flex-shrink-0 p-0.5 rounded hover:bg-grey-400/30 transition-colors">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-grey-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-grey-600" />
          )}
        </button>

        {/* Status Indicator */}
        <div className={cn("flex-shrink-0 p-1.5 rounded-lg", statusConfig.bg)}>
          <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
        </div>

        {/* Timestamp */}
        <div className="flex-shrink-0 w-[140px]">
          <p className="text-sm font-medium text-grey">
            {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
          </p>
          <p className="text-xs text-grey-600">
            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
          </p>
        </div>

        {/* Component Type (feature_step -> "Step", secret -> "Secret", etc.) */}
        <div className="flex-shrink-0 w-[100px]">
          <div className="flex items-center gap-1.5">
            <ComponentIcon className="h-4 w-4 text-grey-600" />
            <span className="text-sm text-grey">{getLogTypeLabel(componentType)}</span>
          </div>
        </div>

        {/* Environment */}
        <div className="flex-shrink-0 w-[80px]">
          <span className={cn(
            "inline-flex px-2 py-0.5 text-xs font-medium rounded",
            getEnvStyle(log.app_env || log.env)
          )}>
            {(log.app_env || log.env || 'N/A').toUpperCase()}
          </span>
        </div>

        {/* Operation Tag */}
        <div className="flex-shrink-0 w-[180px]">
          <div className="flex items-center gap-1">
            <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded truncate max-w-[150px]">
              {operationTag}
            </code>
            <CopyButton text={operationTag} />
          </div>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="text-sm text-grey truncate">{log.message || log.name}</p>
          {/* Latency Badge */}
          {log.latency !== undefined && log.latency !== null && (
            <span className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded",
              getLatencyColor(log.latency),
              "bg-grey-400/10"
            )}>
              <Timer className="h-3 w-3" />
              {formatLatency(log.latency)}
            </span>
          )}
        </div>

        {/* Process ID */}
        <div className="flex-shrink-0 hidden lg:flex items-center gap-1">
          <code className="text-xs font-mono text-grey-600 bg-grey-400/20 px-2 py-0.5 rounded">
            {log.process_id?.slice(0, 12)}...
          </code>
          <CopyButton text={log.process_id} />
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-14">
          <div className="bg-grey rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-grey border-b border-grey-600">
              <span className="text-xs font-medium text-white">Request Data</span>
              <CopyButton text={payloadText} />
            </div>
            {/* Code Block */}
            <pre className="p-4 overflow-x-auto text-xs bg-grey">
              <code className="font-mono text-green">
                {payloadText}
              </code>
            </pre>
          </div>

          {/* Additional Metadata */}
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-xs text-grey-600">
              <span className="font-medium">Process ID:</span>
              <code className="font-mono bg-grey-400/20 px-1.5 py-0.5 rounded">{log.process_id}</code>
            </div>
            {log.latency !== undefined && log.latency !== null && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-medium text-grey-600">Latency:</span>
                <code className={cn("font-mono px-1.5 py-0.5 rounded", getLatencyColor(log.latency), "bg-grey-400/10")}>
                  {formatLatency(log.latency)}
                </code>
              </div>
            )}
            {log.product_tag && (
              <div className="flex items-center gap-1.5 text-xs text-grey-600">
                <span className="font-medium">Product:</span>
                <code className="font-mono bg-grey-400/20 px-1.5 py-0.5 rounded">{log.product_tag}</code>
              </div>
            )}
            {log.ip_address && (
              <div className="flex items-center gap-1.5 text-xs text-grey-600">
                <span className="font-medium">IP Address:</span>
                <code className="font-mono bg-grey-400/20 px-1.5 py-0.5 rounded">{log.ip_address}</code>
              </div>
            )}
            {log.language && (
              <div className="flex items-center gap-1.5 text-xs text-grey-600">
                <span className="font-medium">Language:</span>
                <code className="font-mono bg-grey-400/20 px-1.5 py-0.5 rounded">{log.language}</code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile log card component
export function LogCard({ log, fetchPayload }: { log: ProcessLog; fetchPayload?: FetchLogPayload }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const payloadText = usePayloadText(log, fetchPayload, isExpanded);
  const statusConfig = getStatusConfig(log);
  const StatusIcon = statusConfig.icon;
  const componentType = (log.component || log.type || '').trim();
  const ComponentIcon = getComponentIcon(componentType);
  const operationTag = log.child_tag
    ? `${log.parent_tag ? `${log.parent_tag}:` : ''}${log.child_tag}`
    : log.parent_tag || '-';

  return (
    <div className={cn(
      "bg-white rounded-lg border shadow-sm overflow-hidden transition-all",
      isExpanded ? "border-primary shadow-md" : "border-grey-400"
    )}>
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", statusConfig.bg)}>
              <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
            </div>
            <div>
              <p className="text-sm font-medium text-grey">
                {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
              </p>
              <p className="text-xs text-grey-600">
                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
          <span className={cn(
            "px-2 py-0.5 text-xs font-medium rounded",
            getEnvStyle(log.app_env || log.env)
          )}>
            {(log.app_env || log.env || 'N/A').toUpperCase()}
          </span>
        </div>

        {/* Message */}
        <p className="text-sm text-grey mb-3">{log.message || log.name}</p>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-grey-600 bg-grey-400/20 px-2 py-0.5 rounded inline-flex items-center gap-1">
            <ComponentIcon className="h-3.5 w-3.5" />
            {getLogTypeLabel(componentType)}
          </span>
          <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
            {operationTag}
          </code>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-grey-400 bg-grey-100 p-4">
          <div className="bg-grey rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-grey-600">
              <span className="text-xs font-medium text-white">Data</span>
              <CopyButton text={payloadText} />
            </div>
            <pre className="p-3 overflow-x-auto text-xs">
              <code className="font-mono text-green">
                {payloadText}
              </code>
            </pre>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-grey-600">
            <div>
              <span className="font-medium">ID:</span>{' '}
              <code className="font-mono">{log.process_id}</code>
            </div>
            {log.ip_address && (
              <div>
                <span className="font-medium">IP Address:</span>{' '}
                <code className="font-mono">{log.ip_address}</code>
              </div>
            )}
            {log.language && (
              <div>
                <span className="font-medium">Language:</span>{' '}
                <code className="font-mono">{log.language}</code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** The payload text shown in an expanded row: the row's own data, or one fetched when it is opened. */
function usePayloadText(log: ProcessLog, fetchPayload: FetchLogPayload | undefined, expanded: boolean): string {
  const lazy = log.data === undefined && !!fetchPayload;
  const query = useQuery({
    queryKey: ['log-payload', log._id || log.process_id],
    queryFn: () => fetchPayload!(log),
    enabled: lazy && expanded,
    staleTime: Infinity,
  });
  if (!lazy) return formatLogData(log.data);
  if (query.isLoading) return 'Loading...';
  if (query.isError) return 'The payload could not be loaded.';
  return formatLogData(query.data);
}

/** Column titles for the desktop table; the widths match the columns in LogEntry. */
export function LogTableHeader() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-grey-100 border-b border-grey-400 text-xs font-medium text-grey-600 uppercase tracking-wider">
      <div className="w-7" /> {/* Expand icon space */}
      <div className="w-10" /> {/* Status icon space */}
      <div className="w-[140px]">Timestamp</div>
      <div className="w-[100px]">Type</div>
      <div className="w-[80px]">Env</div>
      <div className="w-[180px]">Operation</div>
      <div className="flex-1">Message</div>
      <div className="w-[140px]">Process ID</div>
    </div>
  );
}

/** The workspace log table: header and rows on desktop, cards on mobile. Rows must already be loaded. */
export function LogList({ logs, fetchPayload }: { logs: ProcessLog[]; fetchPayload?: FetchLogPayload }) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const toggleRow = (id: string) => setExpandedRows(current => ({ ...current, [id]: !current[id] }));
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <LogTableHeader />
        {logs.map(log => (
          <LogEntry
            key={log._id}
            log={log}
            isExpanded={Boolean(expandedRows[log._id])}
            onToggle={() => toggleRow(log._id)}
            fetchPayload={fetchPayload}
          />
        ))}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden p-4 space-y-3 bg-grey-100">
        {logs.map(log => (
          <LogCard key={log._id} log={log} fetchPayload={fetchPayload} />
        ))}
      </div>
    </>
  );
}
