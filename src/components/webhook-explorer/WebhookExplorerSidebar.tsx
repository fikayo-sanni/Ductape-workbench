import {
  Webhook,
  Zap,
  Globe,
  LayoutDashboard,
  Package,
  ExternalLink,
  PanelLeft,
  PanelLeftClose,
  Search,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IWebhookEvent } from '@/types/webhook';
import { formatSelector, parseEventSelectors, WebhookExplorerViewMode } from './utils';

const VIEW_ITEMS: { id: WebhookExplorerViewMode; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'events', label: 'Events', icon: Zap },
  { id: 'environments', label: 'Environments', icon: Globe },
];

interface WebhookExplorerSidebarProps {
  webhookName: string;
  webhookTag: string;
  webhookActive: boolean;
  appName?: string;
  appLogo?: string;
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenApp?: () => void;
  viewMode: WebhookExplorerViewMode;
  onViewModeChange: (mode: WebhookExplorerViewMode) => void;
  eventsCount: number;
  envsCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filteredEvents: IWebhookEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  onAddEvent: () => void;
  fullWebhookTag: string;
  modeBadge?: { label: string; className: string };
  canAddEvent?: boolean;
}

export function WebhookExplorerSidebar({
  webhookName,
  webhookTag,
  webhookActive,
  appName,
  appLogo,
  isSidebarCollapsed,
  onToggleCollapse,
  onOpenApp,
  viewMode,
  onViewModeChange,
  eventsCount,
  envsCount,
  searchQuery,
  onSearchChange,
  filteredEvents,
  selectedEventId,
  onSelectEvent,
  onAddEvent,
  fullWebhookTag,
  modeBadge,
  canAddEvent = true,
}: WebhookExplorerSidebarProps) {
  return (
    <aside
      className={cn(
        'bg-white border-r border-grey-400 flex flex-col flex-shrink-0 min-h-0 overflow-hidden transition-[width] duration-200',
        isSidebarCollapsed ? 'w-[52px]' : 'w-[280px]'
      )}
    >
      {/* Brand header */}
      <div className={cn('flex-shrink-0 border-b border-grey-400', isSidebarCollapsed ? 'p-2' : 'p-4')}>
        <div className={cn('flex items-center', isSidebarCollapsed ? 'justify-center' : 'gap-3')}>
          <div
            className={cn(
              'rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20 flex items-center justify-center flex-shrink-0',
              isSidebarCollapsed ? 'w-9 h-9' : 'w-11 h-11'
            )}
          >
            <Webhook className={cn('text-amber-600', isSidebarCollapsed ? 'h-4 w-4' : 'h-5 w-5')} />
          </div>
          {!isSidebarCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-grey text-sm truncate leading-tight">{webhookName}</h2>
                <code className="text-[11px] text-grey-500 font-mono truncate block">{webhookTag}</code>
              </div>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 text-grey-500 hover:text-grey hover:bg-grey-100 rounded-md transition-colors"
                title="Collapse"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {!isSidebarCollapsed && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                webhookActive ? 'bg-green/10 text-green' : 'bg-grey-100 text-grey-600'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', webhookActive ? 'bg-green' : 'bg-grey-400')} />
              {webhookActive ? 'Active' : 'Inactive'}
            </span>
            {modeBadge && (
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', modeBadge.className)}>
                {modeBadge.label}
              </span>
            )}
            <span className="text-xs text-grey-500">
              {eventsCount} events · {envsCount} envs
            </span>
          </div>
        )}
      </div>

      {/* App link */}
      {appName && !isSidebarCollapsed && (
        <div className="flex-shrink-0 px-3 pt-3">
          <button
            type="button"
            onClick={onOpenApp}
            className="w-full flex items-center gap-2 rounded-lg border border-grey-300 bg-grey-50/80 hover:bg-grey-100 px-2.5 py-2 transition-colors group text-left"
          >
            <div className="w-7 h-7 rounded-md bg-white border border-grey-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {appLogo ? (
                <img src={appLogo} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package className="h-3.5 w-3.5 text-grey-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-grey-500">App</p>
              <p className="text-xs font-medium text-grey truncate">{appName}</p>
            </div>
            <ExternalLink className="h-3 w-3 text-grey-400 group-hover:text-primary flex-shrink-0" />
          </button>
        </div>
      )}

      {/* View switcher */}
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
                  'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                  viewMode === id ? 'bg-amber-500/15 text-amber-700' : 'text-grey-600 hover:bg-grey-100'
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
                  'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all',
                  viewMode === id
                    ? 'bg-white text-grey shadow-sm border border-grey-200'
                    : 'text-grey-600 hover:text-grey'
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Events list (when Events tab active) */}
      {viewMode === 'events' && !isSidebarCollapsed && (
        <div className="flex-1 flex flex-col min-h-0 border-t border-grey-300 mt-3">
          <div className="flex-shrink-0 px-3 pt-3 pb-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-grey-600 uppercase tracking-wide">Events</span>
              {canAddEvent && (
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={onAddEvent}>
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grey-500" />
              <Input
                type="text"
                placeholder="Filter events…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0 space-y-1">
            {filteredEvents.length === 0 ? (
              <p className="text-xs text-grey-500 text-center py-6 px-2">
                {searchQuery ? 'No matches' : 'No events yet'}
              </p>
            ) : (
              filteredEvents.map((event) => {
                const selectors = parseEventSelectors((event as { selector?: string }).selector || '');
                const isSelected = selectedEventId === event._id;
                return (
                  <button
                    key={event._id}
                    type="button"
                    onClick={() => onSelectEvent(event._id)}
                    className={cn(
                      'w-full text-left rounded-lg px-2.5 py-2 border transition-all',
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                        : 'border-transparent hover:bg-grey-50 hover:border-grey-200'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Zap
                        className={cn(
                          'h-3.5 w-3.5 mt-0.5 flex-shrink-0',
                          isSelected ? 'text-amber-600' : 'text-grey-500'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-grey truncate">{event.name}</p>
                        <p className="text-[10px] text-grey-500 font-mono truncate">
                          {fullWebhookTag}:{event.tag}
                        </p>
                        {selectors.length > 0 && (
                          <p className="text-[10px] text-grey-400 font-mono mt-0.5 truncate">
                            {formatSelector(selectors[0])}
                            {selectors.length > 1 ? ` +${selectors.length - 1}` : ''}
                          </p>
                        )}
                      </div>
                      {isSelected && <ChevronRight className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Spacer when not on events */}
      {viewMode !== 'events' && <div className="flex-1 min-h-0" />}

      {/* Collapse (collapsed state) */}
      {isSidebarCollapsed && (
        <div className="flex-shrink-0 p-2 border-t border-grey-400">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-2 rounded-md text-grey-600 hover:bg-grey-100"
            title="Expand sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
