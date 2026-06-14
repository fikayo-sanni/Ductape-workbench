import {
  Heart,
  LayoutDashboard,
  Activity,
  List,
  PanelLeft,
  PanelLeftClose,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { IHealthCheck } from '@/types/healthcheck';
import { HealthcheckViewMode, StatusFilter } from './utils';

const VIEW_ITEMS: { id: HealthcheckViewMode; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'status', label: 'Live', icon: Activity },
  { id: 'list', label: 'All', icon: List },
];

interface HealthcheckExplorerSidebarProps {
  productName: string;
  productTag: string;
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  viewMode: HealthcheckViewMode;
  onViewModeChange: (mode: HealthcheckViewMode) => void;
  totalCount: number;
  healthyCount: number;
  unhealthyCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (f: StatusFilter) => void;
  selectedEnv: string;
  onEnvChange: (env: string) => void;
  productEnvs: Array<{ slug: string; name?: string }>;
  envMetrics: Record<string, { healthy: number; unhealthy: number }>;
  filteredHealthchecks: IHealthCheck[];
  selectedTag: string | null;
  onSelectHealthcheck: (h: IHealthCheck) => void;
  onCreate?: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  getIsHealthy: (h: IHealthCheck) => boolean;
}

export function HealthcheckExplorerSidebar({
  productName,
  productTag,
  isSidebarCollapsed,
  onToggleCollapse,
  viewMode,
  onViewModeChange,
  totalCount,
  healthyCount,
  unhealthyCount,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedEnv,
  onEnvChange,
  productEnvs,
  envMetrics,
  filteredHealthchecks,
  selectedTag,
  onSelectHealthcheck,
  onCreate,
  isRefreshing,
  onRefresh,
  hasActiveFilters,
  onClearFilters,
  getIsHealthy,
}: HealthcheckExplorerSidebarProps) {
  const showList = viewMode === 'list' || viewMode === 'status';

  return (
    <aside
      className={cn(
        'bg-white border-r border-grey-400 flex flex-col flex-shrink-0 min-h-0 overflow-hidden transition-[width] duration-200',
        isSidebarCollapsed ? 'w-[52px]' : 'w-[280px]'
      )}
    >
      <div className={cn('flex-shrink-0 border-b border-grey-400', isSidebarCollapsed ? 'p-2' : 'p-4')}>
        <div className={cn('flex items-center', isSidebarCollapsed ? 'justify-center' : 'gap-3')}>
          <div
            className={cn(
              'rounded-xl bg-gradient-to-br from-rose-500/15 to-red/5 border border-rose-500/25 flex items-center justify-center flex-shrink-0',
              isSidebarCollapsed ? 'w-9 h-9' : 'w-11 h-11'
            )}
          >
            <Heart className={cn('text-rose-600', isSidebarCollapsed ? 'h-4 w-4' : 'h-5 w-5')} />
          </div>
          {!isSidebarCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-grey text-sm truncate">{productName}</h2>
                <code className="text-[11px] text-grey-500 font-mono truncate block">{productTag}</code>
              </div>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 text-grey-500 hover:bg-grey-100 rounded-md"
                title="Collapse"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {!isSidebarCollapsed && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-grey-500">{totalCount} checks</span>
            <span className="text-green font-medium">{healthyCount} ok</span>
            {unhealthyCount > 0 && (
              <span className="text-red font-medium">{unhealthyCount} failing</span>
            )}
          </div>
        )}
      </div>

      <div className={cn('flex-shrink-0', isSidebarCollapsed ? 'p-1.5' : 'px-3 pt-3')}>
        {isSidebarCollapsed ? (
          <div className="flex flex-col items-center gap-1">
            {VIEW_ITEMS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onToggleCollapse();
                  onViewModeChange(id);
                }}
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center',
                  viewMode === id ? 'bg-rose-500/15 text-rose-700' : 'text-grey-600 hover:bg-grey-100'
                )}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex p-1 rounded-lg bg-grey-100 border border-grey-200 gap-0.5">
            {VIEW_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onViewModeChange(id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-xs font-medium',
                  viewMode === id ? 'bg-white shadow-sm border border-grey-200 text-grey' : 'text-grey-600'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isSidebarCollapsed && (
        <div className="flex-shrink-0 px-3 py-2 space-y-2 border-b border-grey-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-grey-500 uppercase tracking-wide">Environment</span>
            <button type="button" onClick={onRefresh} disabled={isRefreshing} className="text-grey-500 hover:text-rose-600">
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            </button>
          </div>
          <Select value={selectedEnv} onValueChange={onEnvChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {productEnvs.map((env) => {
                const m = envMetrics[env.slug] || { healthy: 0, unhealthy: 0 };
                return (
                  <SelectItem key={env.slug} value={env.slug}>
                    <span className="flex items-center gap-2">
                      {env.name || env.slug}
                      <span className={cn('w-1.5 h-1.5 rounded-full', m.unhealthy > 0 ? 'bg-red' : 'bg-green')} />
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            {(['all', 'healthy', 'unhealthy'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onStatusFilterChange(f)}
                className={cn(
                  'flex-1 py-1 rounded text-[10px] font-medium capitalize',
                  statusFilter === f
                    ? f === 'healthy'
                      ? 'bg-green/15 text-green'
                      : f === 'unhealthy'
                        ? 'bg-red/15 text-red'
                        : 'bg-rose-500/15 text-rose-700'
                    : 'text-grey-500 hover:bg-grey-100'
                )}
              >
                {f}
              </button>
            ))}
          </div>
          {hasActiveFilters && (
            <button type="button" onClick={onClearFilters} className="text-[10px] text-grey-500 hover:text-grey w-full text-left">
              Clear filters
            </button>
          )}
        </div>
      )}

      {showList && !isSidebarCollapsed && (
        <div className="flex-1 flex flex-col min-h-0 border-t border-grey-200">
          <div className="px-3 pt-2 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grey-500" />
              <Input
                placeholder="Filter…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 min-h-0">
            {filteredHealthchecks.length === 0 ? (
              <p className="text-xs text-grey-500 text-center py-6">No matches</p>
            ) : (
              filteredHealthchecks.map((h) => {
                const healthy = getIsHealthy(h);
                const selected = selectedTag === h.tag;
                return (
                  <button
                    key={h.tag}
                    type="button"
                    onClick={() => onSelectHealthcheck(h)}
                    className={cn(
                      'w-full text-left rounded-lg px-2.5 py-2 border transition-all',
                      selected ? 'bg-rose-500/10 border-rose-500/40' : 'border-transparent hover:bg-grey-50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Heart className={cn('h-3.5 w-3.5', healthy ? 'text-green' : 'text-red')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-grey truncate">{h.name}</p>
                        <p className="text-[10px] font-mono text-grey-500 truncate">{h.tag}</p>
                      </div>
                      {selected && <ChevronRight className="h-3.5 w-3.5 text-rose-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {!showList && <div className="flex-1 min-h-0" />}

      <div className={cn('flex-shrink-0 border-t border-grey-400', isSidebarCollapsed ? 'p-2' : 'p-3')}>
        {isSidebarCollapsed ? (
          <button type="button" onClick={onToggleCollapse} className="w-full flex justify-center p-2">
            <PanelLeft className="h-4 w-4 text-grey-600" />
          </button>
        ) : onCreate ? (
          <Button type="button" className="w-full bg-rose-600 hover:bg-rose-700 text-white h-9" onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New healthcheck
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
