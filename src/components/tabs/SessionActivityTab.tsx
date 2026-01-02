import { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  ChevronRight,
  BarChart3,
  Search,
  RefreshCw,
  LayoutGrid,
  Globe,
  Key,
  UserCheck,
  UserX,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import SessionDashboard from './SessionDashboard';
import { useWorkbenchStore } from '@/stores/workbench-store';

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
    status: 'active',
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
    status: 'active',
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
    status: 'inactive',
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
    status: 'active',
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
    status: 'expired',
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
    status: 'active',
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
    status: 'active',
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
    status: 'inactive',
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
    status: 'active',
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
    status: 'active',
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
    status: 'expired',
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
    status: 'active',
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
    status: 'inactive',
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
    status: 'active',
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
    status: 'inactive',
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
    status: 'active',
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
    status: 'active',
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
    status: 'expired',
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
    status: 'active',
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
    status: 'inactive',
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
    status: 'active',
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
    status: 'active',
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
    status: 'expired',
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
    status: 'active',
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
    status: 'inactive',
  },
];

type UserStatus = 'active' | 'inactive' | 'expired' | 'all';

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

// Format helpers
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

export default function SessionActivityTab({
  session,
  sessionTag,
  productTag,
  productName,
}: SessionActivityTabProps) {
  const { openTab } = useWorkbenchStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<UserStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'overview' | 'users'>('overview');
  const [listViewMode, setListViewMode] = useState<'list' | 'grid'>('list');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const envSlug = session?.env?.slug || session?.env || 'production';

  const filteredUsers = useMemo(() => {
    return DUMMY_USERS.filter((user) => {
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesSearch = searchQuery === '' ||
        user.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.ductape_user_id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const users = DUMMY_USERS;
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const inactive = users.filter(u => u.status === 'inactive').length;
    const expired = users.filter(u => u.status === 'expired').length;

    // Users by environment
    const production = users.filter(u => u.env === 'production').length;
    const staging = users.filter(u => u.env === 'staging').length;
    const development = users.filter(u => u.env === 'development').length;

    return { total, active, inactive, expired, production, staging, development };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleOpenUser = (user: typeof DUMMY_USERS[0]) => {
    openTab({
      id: `session-user-${user.ductape_user_id}`,
      type: 'session-user',
      title: user.identifier,
      itemId: user.ductape_user_id,
      data: {
        user,
        sessionTag,
        productTag,
        productName,
        sessionName: session?.name || 'User Sessions'
      },
    });
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: any; color: string; bg: string; border: string; label: string; dotColor: string }> = {
      active: { icon: UserCheck, color: 'text-green', bg: 'bg-green/10', border: 'border-green/30', label: 'Active', dotColor: 'bg-green' },
      inactive: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Inactive', dotColor: 'bg-orange-500' },
      expired: { icon: UserX, color: 'text-red', bg: 'bg-red/10', border: 'border-red/30', label: 'Expired', dotColor: 'bg-red' },
    };
    return configs[status] || configs.inactive;
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
            <Key className="h-5 w-5 text-blue-600 flex-shrink-0" />
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-grey text-sm truncate">{session?.name || 'User Sessions'}</h2>
                <p className="text-xs text-grey-600 truncate">{envSlug}</p>
              </div>
            )}
          </div>

          {/* Search */}
          {!isSidebarCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                type="text"
                placeholder="Search users..."
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
                    ? 'bg-blue-500/10 text-blue-600'
                    : 'text-grey hover:bg-background-secondary',
                  isSidebarCollapsed && 'justify-center px-2'
                )}
                title={isSidebarCollapsed ? 'Overview' : undefined}
              >
                <LayoutDashboard className={cn(
                  'h-4 w-4 flex-shrink-0',
                  viewMode === 'overview' ? 'text-blue-600' : 'text-grey-600'
                )} />
                {!isSidebarCollapsed && <span className="flex-1 text-left font-medium">Overview</span>}
              </button>
            </div>

            {/* Status Filters */}
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-between px-2 py-2">
                <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
                  Status
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-grey-600 hover:text-blue-600 transition-colors"
                  title="Refresh users"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                </button>
              </div>
            )}

            <div className="space-y-0.5">
              {([
                { value: 'all', label: 'All Users', icon: <LayoutGrid className="h-4 w-4" />, count: DUMMY_USERS.length },
                { value: 'active', label: 'Active', icon: <UserCheck className="h-4 w-4" />, count: metrics.active },
                { value: 'inactive', label: 'Inactive', icon: <Clock className="h-4 w-4" />, count: metrics.inactive },
                { value: 'expired', label: 'Expired', icon: <UserX className="h-4 w-4" />, count: metrics.expired },
              ] as const).map((status) => (
                <button
                  key={status.value}
                  onClick={() => {
                    setStatusFilter(status.value);
                    setViewMode('users');
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    viewMode === 'users' && statusFilter === status.value
                      ? 'bg-blue-500/10 text-blue-600'
                      : 'text-grey hover:bg-background-secondary',
                    isSidebarCollapsed && 'justify-center px-2'
                  )}
                  title={isSidebarCollapsed ? status.label : undefined}
                >
                  <span className={cn(
                    'flex-shrink-0',
                    viewMode === 'users' && statusFilter === status.value ? 'text-blue-600' : 'text-grey-600'
                  )}>
                    {status.icon}
                  </span>
                  {!isSidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{status.label}</span>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        viewMode === 'users' && statusFilter === status.value
                          ? 'bg-blue-500/20 text-blue-600'
                          : 'bg-background-secondary text-grey-600'
                      )}>
                        {status.count}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Environment Filter */}
            {!isSidebarCollapsed && (
              <div className="mt-4 px-2">
                <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-2">
                  Environment
                </div>
                <div className="space-y-0.5">
                  {[
                    { value: 'production', label: 'Production', count: metrics.production },
                    { value: 'staging', label: 'Staging', count: metrics.staging },
                    { value: 'development', label: 'Development', count: metrics.development },
                  ].map(option => (
                    <div
                      key={option.value}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-grey"
                    >
                      <Globe className="h-4 w-4 text-grey-600" />
                      <span className="flex-1 text-left">{option.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-background-secondary text-grey-600">
                        {option.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Collapse Toggle Button */}
          <div className="flex-shrink-0 p-2 border-t border-grey-400">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm text-grey-600 hover:bg-background-secondary hover:text-blue-600 transition-colors"
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
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Key className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">{session?.name || 'User Sessions'}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{sessionTag}</code>
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

        {viewMode === 'overview' ? (
            /* Overview Content - Use SessionDashboard */
            <SessionDashboard
              session={session}
              sessionTag={sessionTag}
              productTag={productTag}
              productName={productName}
            />
          ) : (
            /* Users List View */
            <>
              {/* Toolbar */}
              <div className="flex-shrink-0 px-6 py-3 bg-white border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-grey-600">
                      Showing <span className="font-medium text-grey">{filteredUsers.length}</span> users
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
                    <div className="grid grid-cols-[1fr,120px,140px,140px,100px,100px,40px] gap-4 px-6 py-3 text-xs font-medium text-grey-600 uppercase tracking-wider">
                      <div>User</div>
                      <div>Status</div>
                      <div>Environment</div>
                      <div>Last Seen</div>
                      <div>Sessions</div>
                      <div>First Seen</div>
                      <div></div>
                    </div>
                  </div>

                  {/* Table body */}
                  <div className="divide-y divide-border">
                    {filteredUsers.map((user) => {
                      const statusConfig = getStatusConfig(user.status || 'inactive');
                      const StatusIcon = statusConfig.icon;

                      return (
                        <div
                          key={user.ductape_user_id}
                          className={cn(
                            'grid grid-cols-[1fr,120px,140px,140px,100px,100px,40px] gap-4 px-6 py-4 items-center cursor-pointer transition-colors',
                            'hover:bg-background-secondary',
                            user.status === 'active' && 'bg-green/5',
                            user.status === 'expired' && 'bg-red/5',
                          )}
                          onClick={() => handleOpenUser(user)}
                        >
                          {/* User info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig.dotColor)} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-grey truncate">{user.identifier}</span>
                              </div>
                              <p className="text-xs text-grey-500 truncate max-w-[300px] font-mono">{user.ductape_user_id}</p>
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
                              <StatusIcon className={cn('h-3 w-3', statusConfig.color)} />
                              <span className={statusConfig.color}>{statusConfig.label}</span>
                            </div>
                          </div>

                          {/* Environment */}
                          <div>
                            <span className={cn(
                              'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                              getEnvBadgeColor(user.env)
                            )}>
                              {user.env}
                            </span>
                          </div>

                          {/* Last Seen */}
                          <div className="text-sm text-grey-600">
                            {formatTime(user.last_seen)}
                          </div>

                          {/* Sessions */}
                          <div className="text-sm font-medium text-grey">
                            {user.session_count}
                          </div>

                          {/* First Seen */}
                          <div className="text-sm text-grey-600">
                            {formatTime(user.first_seen, false)}
                          </div>

                          {/* Arrow */}
                          <div className="flex justify-end">
                            <ChevronRight className="h-4 w-4 text-grey-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredUsers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-lg bg-border flex items-center justify-center mb-4">
                        <Search className="h-6 w-6 text-grey-500" />
                      </div>
                      <p className="text-grey font-medium">No users found</p>
                      <p className="text-grey-500 text-sm mt-1">Try adjusting your filters</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
    </div>
  );
}
