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
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import SessionDashboard from './SessionDashboard';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useAuth } from '@/store/useAuth';
import sessionUsersService from '@/services/sessionUsersService';

interface SessionActivityTabProps {
  session: any;
  sessionTag: string;
  productTag: string;
  productName?: string;
}


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
const formatTime = (dateInput: string | Date, relative = true) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
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
  const { user, currentWorkspaceId } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<UserStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'overview' | 'users'>('overview');
  const [listViewMode, setListViewMode] = useState<'list' | 'grid'>('list');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const envSlug = session?.env?.slug || session?.env || 'production';

  // Fetch session users
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['session-users', productTag, sessionTag, envSlug],
    queryFn: () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key) {
        throw new Error('Missing auth parameters');
      }
      return sessionUsersService.fetchSessionUsers(
        currentWorkspaceId,
        user._id,
        user.public_key,
        {
          product_tag: productTag,
          session_tag: sessionTag,
          env: envSlug,
          page: 1,
          limit: 100,
        }
      );
    },
    enabled: !!productTag && !!sessionTag && !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  // Fetch session dashboard metrics
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['session-dashboard', productTag, sessionTag, envSlug],
    queryFn: () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key) {
        throw new Error('Missing auth parameters');
      }
      return sessionUsersService.fetchSessionDashboard(
        currentWorkspaceId,
        user._id,
        user.public_key,
        {
          product_tag: productTag,
          session_tag: sessionTag,
          env: envSlug,
        }
      );
    },
    enabled: !!productTag && !!sessionTag && !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  // Filter and search users locally
  const filteredUsers = useMemo(() => {
    if (!usersData?.users) return [];

    let users = usersData.users;

    // Calculate user status based on last_seen
    const now = new Date();
    const activeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    const inactiveThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    users = users.map(user => {
      const lastSeen = new Date(user.last_seen);
      let status: 'active' | 'inactive' | 'expired' = 'expired';

      if (lastSeen > activeThreshold) {
        status = 'active';
      } else if (lastSeen > inactiveThreshold) {
        status = 'inactive';
      }

      return { ...user, status, session_count: user.total_sessions || 0 };
    });

    // Filter by status
    if (statusFilter !== 'all') {
      users = users.filter(user => user.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      users = users.filter(user =>
        user.identifier.toLowerCase().includes(query) ||
        user.ductape_user_id.toLowerCase().includes(query)
      );
    }

    return users;
  }, [usersData?.users, statusFilter, searchQuery]);

  // Calculate metrics from dashboard data
  const metrics = useMemo(() => {
    if (!dashboardData) {
      return {
        total: filteredUsers.length,
        active: filteredUsers.filter(u => u.status === 'active').length,
        inactive: filteredUsers.filter(u => u.status === 'inactive').length,
        expired: filteredUsers.filter(u => u.status === 'expired').length,
        production: filteredUsers.filter(u => u.env === 'production').length,
        staging: filteredUsers.filter(u => u.env === 'staging').length,
        development: filteredUsers.filter(u => u.env === 'development').length,
      };
    }

    return {
      total: dashboardData.totalUsers || 0,
      active: dashboardData.activeUsers || 0,
      inactive: dashboardData.inactiveUsers || 0,
      expired: dashboardData.expiredUsers || 0,
      production: filteredUsers.filter(u => u.env === 'production').length,
      staging: filteredUsers.filter(u => u.env === 'staging').length,
      development: filteredUsers.filter(u => u.env === 'development').length,
    };
  }, [dashboardData, filteredUsers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchUsers(), refetchDashboard()]);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenUser = (user: any) => {
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
                { value: 'all', label: 'All Users', icon: <LayoutGrid className="h-4 w-4" />, count: metrics.total },
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