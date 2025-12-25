import { useState } from 'react';
import {
  Users,
  Clock,
  Calendar,
  Activity,
  ChevronDown,
  ChevronUp,
  Key,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface SessionUserTabProps {
  user: any;
  sessionTag: string;
  productTag: string;
  productName?: string;
  sessionName?: string;
}

// Dummy logs data
const DUMMY_LOGS = [
  {
    _id: 'log_1',
    timestamp: '2024-01-20T14:30:15Z',
    process_id: 'proc_abc123',
    app_env: 'production',
    env: 'production',
    name: 'session-validate',
    type: 'session',
    message: 'Session validated successfully',
    parent_tag: 'user-session',
    child_tag: 'validate',
    status: 'success',
    successful_execution: true,
    data: JSON.stringify({ user_id: 'usr_1a2b3c4d5e', session_token: 'tok_***', validated: true }),
  },
  {
    _id: 'log_2',
    timestamp: '2024-01-20T14:15:42Z',
    process_id: 'proc_def456',
    app_env: 'production',
    env: 'production',
    name: 'session-create',
    type: 'session',
    message: 'New session created',
    parent_tag: 'user-session',
    child_tag: 'create',
    status: 'success',
    successful_execution: true,
    data: JSON.stringify({ user_id: 'usr_1a2b3c4d5e', session_id: 'sess_789', created_at: '2024-01-20T14:15:42Z' }),
  },
  {
    _id: 'log_3',
    timestamp: '2024-01-20T13:45:20Z',
    process_id: 'proc_ghi789',
    app_env: 'production',
    env: 'production',
    name: 'session-refresh',
    type: 'session',
    message: 'Session refreshed',
    parent_tag: 'user-session',
    child_tag: 'refresh',
    status: 'success',
    successful_execution: true,
    data: JSON.stringify({ user_id: 'usr_1a2b3c4d5e', new_token: 'tok_***', expires_at: '2024-01-21T13:45:20Z' }),
  },
  {
    _id: 'log_4',
    timestamp: '2024-01-20T12:30:10Z',
    process_id: 'proc_jkl012',
    app_env: 'production',
    env: 'production',
    name: 'session-validate',
    type: 'session',
    message: 'Session validation failed',
    parent_tag: 'user-session',
    child_tag: 'validate',
    status: 'fail',
    successful_execution: false,
    data: JSON.stringify({ user_id: 'usr_1a2b3c4d5e', error: 'Token expired', timestamp: '2024-01-20T12:30:10Z' }),
  },
  {
    _id: 'log_5',
    timestamp: '2024-01-20T11:20:33Z',
    process_id: 'proc_mno345',
    app_env: 'production',
    env: 'production',
    name: 'session-create',
    type: 'session',
    message: 'Session created',
    parent_tag: 'user-session',
    child_tag: 'create',
    status: 'success',
    successful_execution: true,
    data: JSON.stringify({ user_id: 'usr_1a2b3c4d5e', session_id: 'sess_456', ip_address: '192.168.1.100' }),
  },
];

// Helper function for environment badge colors
const getEnvBadgeColor = (env: string) => {
  switch (env) {
    case 'production':
      return 'bg-green/10 text-green border-green/20';
    case 'staging':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'development':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    default:
      return 'bg-grey-100 text-grey-600 border-grey-300';
  }
};

// Helper function to flatten nested objects into dot notation
const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
  const flattened: Record<string, any> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }

  return flattened;
};

// User Logs Component
function UserLogsTable({ logs }: { logs: typeof DUMMY_LOGS }) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-grey-400">
        <Activity className="h-12 w-12 mx-auto mb-3 text-grey-400" />
        <p className="text-sm text-grey-600">No logs found for this user</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log._id} className="bg-white rounded-lg border border-grey-400 overflow-hidden hover:border-blue-500/50 transition-colors">
          {/* Log Header */}
          <div
            className="p-3 cursor-pointer"
            onClick={() => toggleRow(log._id)}
          >
            <div className="flex items-start gap-3">
              {/* Status Indicator */}
              <div className="flex-shrink-0 mt-1">
                {log.successful_execution || log.status === 'success' ? (
                  <div className="w-2 h-2 rounded-full bg-green" />
                ) : log.status === 'fail' ? (
                  <div className="w-2 h-2 rounded-full bg-red" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                {/* Top Row: Timestamp & Expand */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-grey">
                    {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                  <button className="flex-shrink-0 text-grey-600 hover:text-grey">
                    {expandedRows[log._id] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Details Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Process ID */}
                  <span className="text-xs font-mono text-grey-600 bg-grey-100 px-2 py-0.5 rounded">
                    {log.process_id}
                  </span>

                  {/* Environment */}
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium border',
                    getEnvBadgeColor(log.app_env || log.env)
                  )}>
                    {log.app_env || log.env}
                  </span>

                  {/* Operation */}
                  <span className="text-xs font-mono text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">
                    {log.child_tag ? `${log.parent_tag}:${log.child_tag}` : log.parent_tag}
                  </span>

                  {/* Name */}
                  <span className="text-xs text-grey-600">
                    {log.name}
                  </span>
                </div>

                {/* Message */}
                <p className="text-sm text-grey-600">{log.message}</p>
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {expandedRows[log._id] && (
            <div className="border-t border-grey-400 bg-grey-50 p-4">
              <p className="text-xs text-grey-600 mb-2 font-medium">Request Data</p>
              <pre className="bg-white border border-grey-400 rounded-md p-3 overflow-x-auto">
                <code className="text-xs font-mono text-grey">
                  {JSON.stringify(JSON.parse(log.data), null, 2)}
                </code>
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SessionUserTab({
  user,
  sessionTag,
  sessionName,
}: SessionUserTabProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const envSlug = user?.env || 'production';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-background-tertiary">
        <div className="text-center text-grey-600 max-w-md">
          <Users className="h-12 w-12 mx-auto mb-4 text-grey-400" />
          <p className="text-lg font-medium mb-2">User data not available</p>
          <p className="text-sm">The user data has expired. Please open the user again from the session activity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-tertiary">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-white">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-grey">{user.identifier}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm text-grey-600 font-mono">{user.ductape_user_id}</code>
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-semibold rounded-full',
                    envSlug === 'production' ? 'bg-red/10 text-red' :
                    envSlug === 'staging' ? 'bg-yellow/10 text-yellow' :
                    'bg-blue-500/10 text-blue-500'
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
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* User Details Header */}
          <div className="bg-white rounded-lg border border-border p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Key className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-grey mb-2">Session: {sessionName || sessionTag}</h2>
                <div className="flex flex-wrap gap-3">
                  <span className="text-sm text-grey-600">
                    <strong>Session Tag:</strong> <span className="font-mono text-xs">{sessionTag}</span>
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getEnvBadgeColor(user.env)}`}>
                    {user.env}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-600">
                    {user.session_count} Sessions
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-green" />
                <h3 className="text-sm font-semibold text-grey">First Seen</h3>
              </div>
              <p className="text-sm text-grey-600">{formatDate(user.first_seen)}</p>
            </div>

            <div className="bg-white rounded-lg border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <h3 className="text-sm font-semibold text-grey">Last Seen</h3>
              </div>
              <p className="text-sm text-grey-600">{formatDate(user.last_seen)}</p>
            </div>

            <div className="bg-white rounded-lg border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <h3 className="text-sm font-semibold text-grey">Total Sessions</h3>
              </div>
              <p className="text-2xl font-bold text-grey">{user.session_count}</p>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-white rounded-lg border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">User Information</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-grey-600 font-medium mb-1">Product Tag</p>
                  <p className="text-sm text-grey font-mono">{user.product_tag}</p>
                </div>
                <div>
                  <p className="text-xs text-grey-600 font-medium mb-1">Session Tag</p>
                  <p className="text-sm text-grey font-mono">{user.session_tag}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-grey-600 font-medium mb-1">Created At</p>
                  <p className="text-sm text-grey">{formatDate(user.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-grey-600 font-medium mb-1">Updated At</p>
                  <p className="text-sm text-grey">{formatDate(user.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Session Data */}
          {user.session_data && (
            <div className="bg-white rounded-lg border border-border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-grey mb-4">Session Data</h2>
              <p className="text-xs text-grey-600 mb-4">
                The following data is encrypted to generate the session token
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {Object.entries(flattenObject(user.session_data)).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-4 py-2 border-b border-grey-300">
                    <span className="text-sm font-mono text-grey-600 break-all">{key}:</span>
                    <span className="text-sm text-grey font-medium text-right break-all">
                      {typeof value === 'boolean' ? value.toString() : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Logs */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-grey">Session Logs</h2>
            <div className="max-h-[600px] overflow-y-auto">
              <UserLogsTable logs={DUMMY_LOGS} />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-grey mb-2">About Session Users</h3>
            <p className="text-xs text-grey-600">
              This shows detailed information for the selected user including their session count and activity history.
              The session count represents the total number of session records for this user.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
