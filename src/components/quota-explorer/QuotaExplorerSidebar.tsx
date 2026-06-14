import {
  Timer,
  LayoutDashboard,
  List,
  PanelLeft,
  PanelLeftClose,
  Search,
  Plus,
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
import { ResilienceViewMode } from '@/components/resilience-explorer/utils';
import { ProductQuota } from './types';

const VIEW_ITEMS: { id: ResilienceViewMode; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'list', label: 'All', icon: List },
];

interface QuotaExplorerSidebarProps {
  productName: string;
  productTag: string;
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  viewMode: ResilienceViewMode;
  onViewModeChange: (mode: ResilienceViewMode) => void;
  totalCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedEnv: string;
  onEnvChange: (env: string) => void;
  productEnvs: Array<{ slug: string; name?: string }>;
  filteredQuotas: ProductQuota[];
  selectedTag: string | null;
  onSelectQuota: (q: ProductQuota) => void;
  onCreate: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function QuotaExplorerSidebar(props: QuotaExplorerSidebarProps) {
  const {
    productName,
    productTag,
    isSidebarCollapsed,
    onToggleCollapse,
    viewMode,
    onViewModeChange,
    totalCount,
    searchQuery,
    onSearchChange,
    selectedEnv,
    onEnvChange,
    productEnvs,
    filteredQuotas,
    selectedTag,
    onSelectQuota,
    onCreate,
    isRefreshing,
    onRefresh,
  } = props;

  const showList = viewMode === 'list';

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
              'rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-500/5 border border-orange-500/25 flex items-center justify-center flex-shrink-0',
              isSidebarCollapsed ? 'w-9 h-9' : 'w-11 h-11'
            )}
          >
            <Timer className={cn('text-orange-600', isSidebarCollapsed ? 'h-4 w-4' : 'h-5 w-5')} />
          </div>
          {!isSidebarCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-grey text-sm truncate">{productName}</h2>
                <code className="text-[11px] text-grey-500 font-mono truncate block">{productTag}</code>
              </div>
              <button type="button" onClick={onToggleCollapse} className="p-1.5 text-grey-500 hover:bg-grey-100 rounded-md">
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {!isSidebarCollapsed && (
          <p className="mt-3 text-xs text-grey-500">{totalCount} quota{totalCount !== 1 ? 's' : ''}</p>
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
                  viewMode === id ? 'bg-orange-500/15 text-orange-700' : 'text-grey-600 hover:bg-grey-100'
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
            <button type="button" onClick={onRefresh} disabled={isRefreshing} className="text-grey-500 hover:text-orange-600">
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            </button>
          </div>
          <Select value={selectedEnv} onValueChange={onEnvChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {productEnvs.map((env) => (
                <SelectItem key={env.slug} value={env.slug}>
                  {env.name || env.slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            {filteredQuotas.length === 0 ? (
              <p className="text-xs text-grey-500 text-center py-6">No quotas</p>
            ) : (
              filteredQuotas.map((q) => {
                const selected = selectedTag === q.tag;
                return (
                  <button
                    key={q.tag}
                    type="button"
                    onClick={() => onSelectQuota(q)}
                    className={cn(
                      'w-full text-left rounded-lg px-2.5 py-2 border transition-all',
                      selected ? 'bg-orange-500/10 border-orange-500/40' : 'border-transparent hover:bg-grey-50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Timer className="h-3.5 w-3.5 text-orange-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-grey truncate">{q.name}</p>
                        <p className="text-[10px] font-mono text-grey-500 truncate">{q.tag}</p>
                      </div>
                      {selected && <ChevronRight className="h-3.5 w-3.5 text-orange-600" />}
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
        ) : (
          <Button type="button" className="w-full bg-orange-600 hover:bg-orange-700 text-white h-9" onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New quota
          </Button>
        )}
      </div>
    </aside>
  );
}
