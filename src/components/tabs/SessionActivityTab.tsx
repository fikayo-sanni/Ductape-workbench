import { useState } from 'react';
import { Activity, Users, Clock, Calendar, ChevronLeft, ChevronRight, BarChart3, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import SessionDashboard from './SessionDashboard';
import { format } from 'date-fns';

interface SessionActivityTabProps {
  session: any;
  sessionTag: string;
  productTag: string;
  productName?: string;
}

// Dummy data for session users
const DUMMY_USERS = [
  {
    ductape_user_id: 'usr_1a2b3c4d5e',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'sarah.johnson@enterprise.com',
    env: 'production',
    first_seen: '2024-01-10T08:30:00Z',
    last_seen: '2024-01-23T14:45:00Z',
    createdAt: '2024-01-10T08:30:00Z',
    updatedAt: '2024-01-23T14:45:00Z',
    session_count: 47,
    session_data: {
      userId: '191010192-19198829819',
      details: {
        username: 'sarah.johnson',
        email: 'sarah.johnson@enterprise.com',
        role: 'admin'
      },
      preferences: {
        theme: 'dark',
        notifications: true
      }
    }
  },
  {
    ductape_user_id: 'usr_2b3c4d5e6f',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'john.doe@company.com',
    env: 'production',
    first_seen: '2024-01-12T10:15:00Z',
    last_seen: '2024-01-23T16:20:00Z',
    createdAt: '2024-01-12T10:15:00Z',
    updatedAt: '2024-01-23T16:20:00Z',
    session_count: 32,
    session_data: {
      userId: '291929-38291919',
      details: {
        username: 'john.doe',
        email: 'john.doe@company.com',
        role: 'user'
      },
      metadata: {
        lastLogin: '2024-01-23T16:20:00Z',
        ipAddress: '192.168.1.100'
      }
    }
  },
  {
    ductape_user_id: 'usr_3c4d5e6f7g',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'jane.smith@startup.io',
    env: 'staging',
    first_seen: '2024-01-15T09:00:00Z',
    last_seen: '2024-01-22T11:30:00Z',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-22T11:30:00Z',
    session_count: 18,
  },
  {
    ductape_user_id: 'usr_4d5e6f7g8h',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'admin@platform.com',
    env: 'production',
    first_seen: '2024-01-08T07:00:00Z',
    last_seen: '2024-01-23T18:00:00Z',
    createdAt: '2024-01-08T07:00:00Z',
    updatedAt: '2024-01-23T18:00:00Z',
    session_count: 89,
  },
  {
    ductape_user_id: 'usr_5e6f7g8h9i',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'test.user@demo.com',
    env: 'development',
    first_seen: '2024-01-20T12:00:00Z',
    last_seen: '2024-01-20T15:30:00Z',
    createdAt: '2024-01-20T12:00:00Z',
    updatedAt: '2024-01-20T15:30:00Z',
    session_count: 3,
  },
  {
    ductape_user_id: 'usr_6f7g8h9i0j',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'michael.chen@techcorp.io',
    env: 'production',
    first_seen: '2024-01-11T09:45:00Z',
    last_seen: '2024-01-23T13:20:00Z',
    createdAt: '2024-01-11T09:45:00Z',
    updatedAt: '2024-01-23T13:20:00Z',
    session_count: 41,
  },
  {
    ductape_user_id: 'usr_7g8h9i0j1k',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'emily.rodriguez@agency.co',
    env: 'production',
    first_seen: '2024-01-13T11:00:00Z',
    last_seen: '2024-01-23T10:15:00Z',
    createdAt: '2024-01-13T11:00:00Z',
    updatedAt: '2024-01-23T10:15:00Z',
    session_count: 28,
  },
  {
    ductape_user_id: 'usr_8h9i0j1k2l',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'david.kim@saas-company.com',
    env: 'staging',
    first_seen: '2024-01-16T14:30:00Z',
    last_seen: '2024-01-22T16:45:00Z',
    createdAt: '2024-01-16T14:30:00Z',
    updatedAt: '2024-01-22T16:45:00Z',
    session_count: 12,
  },
  {
    ductape_user_id: 'usr_9i0j1k2l3m',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'lisa.anderson@consulting.biz',
    env: 'production',
    first_seen: '2024-01-09T08:00:00Z',
    last_seen: '2024-01-23T17:30:00Z',
    createdAt: '2024-01-09T08:00:00Z',
    updatedAt: '2024-01-23T17:30:00Z',
    session_count: 56,
  },
  {
    ductape_user_id: 'usr_0j1k2l3m4n',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'robert.martinez@finance.org',
    env: 'production',
    first_seen: '2024-01-14T10:20:00Z',
    last_seen: '2024-01-23T12:40:00Z',
    createdAt: '2024-01-14T10:20:00Z',
    updatedAt: '2024-01-23T12:40:00Z',
    session_count: 23,
  },
  {
    ductape_user_id: 'usr_1k2l3m4n5o',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'maria.garcia@ecommerce.shop',
    env: 'staging',
    first_seen: '2024-01-17T13:15:00Z',
    last_seen: '2024-01-21T09:25:00Z',
    createdAt: '2024-01-17T13:15:00Z',
    updatedAt: '2024-01-21T09:25:00Z',
    session_count: 9,
  },
  {
    ductape_user_id: 'usr_2l3m4n5o6p',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'james.wilson@media.net',
    env: 'production',
    first_seen: '2024-01-11T07:30:00Z',
    last_seen: '2024-01-23T15:50:00Z',
    createdAt: '2024-01-11T07:30:00Z',
    updatedAt: '2024-01-23T15:50:00Z',
    session_count: 38,
  },
  {
    ductape_user_id: 'usr_3m4n5o6p7q',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'jennifer.lee@healthcare.med',
    env: 'development',
    first_seen: '2024-01-19T11:45:00Z',
    last_seen: '2024-01-22T14:20:00Z',
    createdAt: '2024-01-19T11:45:00Z',
    updatedAt: '2024-01-22T14:20:00Z',
    session_count: 7,
  },
  {
    ductape_user_id: 'usr_4n5o6p7q8r',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'william.brown@logistics.express',
    env: 'production',
    first_seen: '2024-01-10T09:10:00Z',
    last_seen: '2024-01-23T11:35:00Z',
    createdAt: '2024-01-10T09:10:00Z',
    updatedAt: '2024-01-23T11:35:00Z',
    session_count: 44,
  },
  {
    ductape_user_id: 'usr_5o6p7q8r9s',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'patricia.davis@education.edu',
    env: 'staging',
    first_seen: '2024-01-18T10:05:00Z',
    last_seen: '2024-01-22T13:50:00Z',
    createdAt: '2024-01-18T10:05:00Z',
    updatedAt: '2024-01-22T13:50:00Z',
    session_count: 11,
  },
  {
    ductape_user_id: 'usr_6p7q8r9s0t',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'charles.miller@realestate.properties',
    env: 'production',
    first_seen: '2024-01-12T08:25:00Z',
    last_seen: '2024-01-23T16:05:00Z',
    createdAt: '2024-01-12T08:25:00Z',
    updatedAt: '2024-01-23T16:05:00Z',
    session_count: 35,
  },
  {
    ductape_user_id: 'usr_7q8r9s0t1u',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'susan.moore@travel.tours',
    env: 'production',
    first_seen: '2024-01-13T12:40:00Z',
    last_seen: '2024-01-23T09:15:00Z',
    createdAt: '2024-01-13T12:40:00Z',
    updatedAt: '2024-01-23T09:15:00Z',
    session_count: 26,
  },
  {
    ductape_user_id: 'usr_8r9s0t1u2v',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'joseph.taylor@automotive.cars',
    env: 'development',
    first_seen: '2024-01-21T14:55:00Z',
    last_seen: '2024-01-22T10:30:00Z',
    createdAt: '2024-01-21T14:55:00Z',
    updatedAt: '2024-01-22T10:30:00Z',
    session_count: 4,
  },
  {
    ductape_user_id: 'usr_9s0t1u2v3w',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'karen.jackson@retail.store',
    env: 'production',
    first_seen: '2024-01-09T11:20:00Z',
    last_seen: '2024-01-23T14:25:00Z',
    createdAt: '2024-01-09T11:20:00Z',
    updatedAt: '2024-01-23T14:25:00Z',
    session_count: 52,
  },
  {
    ductape_user_id: 'usr_0t1u2v3w4x',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'daniel.white@insurance.policy',
    env: 'staging',
    first_seen: '2024-01-16T09:35:00Z',
    last_seen: '2024-01-21T15:10:00Z',
    createdAt: '2024-01-16T09:35:00Z',
    updatedAt: '2024-01-21T15:10:00Z',
    session_count: 14,
  },
  {
    ductape_user_id: 'usr_1u2v3w4x5y',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'nancy.harris@marketing.digital',
    env: 'production',
    first_seen: '2024-01-11T10:50:00Z',
    last_seen: '2024-01-23T13:45:00Z',
    createdAt: '2024-01-11T10:50:00Z',
    updatedAt: '2024-01-23T13:45:00Z',
    session_count: 39,
  },
  {
    ductape_user_id: 'usr_2v3w4x5y6z',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'thomas.clark@manufacturing.factory',
    env: 'production',
    first_seen: '2024-01-14T07:15:00Z',
    last_seen: '2024-01-23T12:00:00Z',
    createdAt: '2024-01-14T07:15:00Z',
    updatedAt: '2024-01-23T12:00:00Z',
    session_count: 31,
  },
  {
    ductape_user_id: 'usr_3w4x5y6z7a',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'betty.lewis@hospitality.hotel',
    env: 'development',
    first_seen: '2024-01-20T13:25:00Z',
    last_seen: '2024-01-22T11:40:00Z',
    createdAt: '2024-01-20T13:25:00Z',
    updatedAt: '2024-01-22T11:40:00Z',
    session_count: 6,
  },
  {
    ductape_user_id: 'usr_4x5y6z7a8b',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'christopher.walker@gaming.play',
    env: 'production',
    first_seen: '2024-01-10T12:05:00Z',
    last_seen: '2024-01-23T15:20:00Z',
    createdAt: '2024-01-10T12:05:00Z',
    updatedAt: '2024-01-23T15:20:00Z',
    session_count: 48,
  },
  {
    ductape_user_id: 'usr_5y6z7a8b9c',
    product_tag: 'my-product',
    session_tag: 'user-session',
    identifier: 'sandra.hall@publishing.books',
    env: 'staging',
    first_seen: '2024-01-17T08:50:00Z',
    last_seen: '2024-01-22T12:15:00Z',
    createdAt: '2024-01-17T08:50:00Z',
    updatedAt: '2024-01-22T12:15:00Z',
    session_count: 10,
  },
];

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
        // Recursively flatten nested objects
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        // Add the value directly
        flattened[newKey] = obj[key];
      }
    }
  }

  return flattened;
};

// Simplified User Logs Component
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
        <div key={log._id} className="bg-white rounded-lg border border-grey-400 overflow-hidden hover:border-primary/50 transition-colors">
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
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
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

export default function SessionActivityTab({
  sessionTag,
  productName,
}: SessionActivityTabProps) {
  const [showDashboard, setShowDashboard] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedEnv, setSelectedEnv] = useState<string>('all');
  const itemsPerPage = 10;

  // Get unique environments from users
  const environments = ['all', ...Array.from(new Set(DUMMY_USERS.map(user => user.env)))];

  // Filter users based on search and environment
  const filteredUsers = DUMMY_USERS.filter(user => {
    const matchesSearch = user.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.ductape_user_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnv = selectedEnv === 'all' || user.env === selectedEnv;
    return matchesSearch && matchesEnv;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

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

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-grey-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-grey-400 flex flex-col flex-shrink-0">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 dark:text-grey" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-grey text-sm truncate">Session Activity</h2>
              <p className="text-xs text-grey-600 truncate">{sessionTag}</p>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex gap-1 mb-3 bg-grey-100 p-1 rounded">
            <button
              onClick={() => {
                setShowDashboard(true);
                setSelectedUser(null);
              }}
              className={cn(
                'flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors',
                showDashboard
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-grey-600 hover:text-grey'
              )}
            >
              <BarChart3 className="h-3 w-3 inline mr-1" />
              Dashboard
            </button>
            <button
              onClick={() => {
                setShowDashboard(false);
                setSelectedUser(null);
              }}
              className={cn(
                'flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors',
                !showDashboard
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-grey-600 hover:text-grey'
              )}
            >
              <Users className="h-3 w-3 inline mr-1" />
              Users
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Environment Filter */}
          <div>
            <Label className="text-xs font-medium text-grey-600 mb-1.5 block">
              Environment
            </Label>
            <Select
              value={selectedEnv}
              onValueChange={(value) => {
                setSelectedEnv(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {environments.map((env) => (
                  <SelectItem key={env} value={env}>
                    {env === 'all' ? 'All Environments' : env.charAt(0).toUpperCase() + env.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
              Users ({filteredUsers.length})
            </div>
          </div>

          {/* User List */}
          <div className="space-y-1">
            {currentUsers.length > 0 ? (
              <>
                {currentUsers.map((user) => (
                  <button
                    key={user.ductape_user_id}
                    onClick={() => {
                      setSelectedUser(user);
                      setShowDashboard(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-2 py-2 rounded text-sm transition-colors',
                      selectedUser?.ductape_user_id === user.ductape_user_id && !showDashboard
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-grey hover:bg-grey-100'
                    )}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-sm text-grey truncate leading-tight">{user.identifier}</div>
                        <div>
                          <span className={cn(
                            'inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase',
                            getEnvBadgeColor(user.env)
                          )}>
                            {user.env}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-grey-600 flex-shrink-0 ml-2">
                      {user.session_count}
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <div className="flex items-center justify-center h-32 px-3">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-grey-400" />
                  <p className="text-sm text-grey-600">No users found</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex-shrink-0 p-4 border-t border-grey-400">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-grey-600 font-medium">
                Page {currentPage} of {totalPages}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex-1 h-8 disabled:opacity-50"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex-1 h-8 disabled:opacity-50"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - User Activity or Dashboard */}
      <div className="flex-1 overflow-y-auto">
        {showDashboard ? (
          <SessionDashboard
            session={null}
            sessionTag={sessionTag}
            productTag=""
            productName={productName}
          />
        ) : selectedUser ? (
          <div className="p-6 space-y-6">
            {/* User Details Header */}
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-grey mb-2">{selectedUser.identifier}</h1>
                  <div className="flex flex-wrap gap-3">
                    <span className="text-sm text-grey-600">
                      <strong>User ID:</strong> <span className="font-mono text-xs">{selectedUser.ductape_user_id}</span>
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getEnvBadgeColor(selectedUser.env)}`}>
                      {selectedUser.env}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-600">
                      {selectedUser.session_count} Sessions
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-green" />
                  <h3 className="text-sm font-semibold text-grey">First Seen</h3>
                </div>
                <p className="text-sm text-grey-600">{formatDate(selectedUser.first_seen)}</p>
              </div>

              <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <h3 className="text-sm font-semibold text-grey">Last Seen</h3>
                </div>
                <p className="text-sm text-grey-600">{formatDate(selectedUser.last_seen)}</p>
              </div>

              <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <h3 className="text-sm font-semibold text-grey">Total Sessions</h3>
                </div>
                <p className="text-2xl font-bold text-grey">{selectedUser.session_count}</p>
              </div>
            </div>

            {/* User Info */}
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-grey mb-4">User Information</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-grey-600 font-medium mb-1">Product Tag</p>
                    <p className="text-sm text-grey font-mono">{selectedUser.product_tag}</p>
                  </div>
                  <div>
                    <p className="text-xs text-grey-600 font-medium mb-1">Session Tag</p>
                    <p className="text-sm text-grey font-mono">{selectedUser.session_tag}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-grey-600 font-medium mb-1">Created At</p>
                    <p className="text-sm text-grey">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-grey-600 font-medium mb-1">Updated At</p>
                    <p className="text-sm text-grey">{formatDate(selectedUser.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Data */}
            {selectedUser.session_data && (
              <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-grey mb-4">Session Data</h2>
                <p className="text-xs text-grey-600 mb-4">
                  The following data is encrypted to generate the session token
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {Object.entries(flattenObject(selectedUser.session_data)).map(([key, value]) => (
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
              <h3 className="text-sm font-semibold text-grey mb-2">About Session Activity</h3>
              <p className="text-xs text-grey-600">
                This shows detailed information for the selected user including their session count and activity history.
                The session count represents the total number of session records for this user.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-grey-600 max-w-md">
              <Users className="h-12 w-12 mx-auto mb-4 text-grey-400" />
              <p className="text-lg font-medium mb-2">No User Selected</p>
              <p className="text-sm">
                Select a user from the sidebar to view their session activity and details
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
