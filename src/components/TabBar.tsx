import { useState } from 'react';
import { tabsToClose, unsavedCount, type CloseScope } from '@/utils/tabClosing';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Tab, TabType } from '@/types/tab';
import { cn } from '@/lib/utils';
import { KanbanSquare,
  X,
  FileText,
  Grid3x3,
  Package,
  HardDrive,
  Users,
  Database,
  MessageSquare,
  Bell,
  Shield,
  BarChart3,
  Heart,
  LayoutDashboard,
  KeyRound,
  Lock,
  Store,
  Mail,
  Layers,
  Receipt,
  Workflow,
  Bot,
  Activity,
  GitBranch,
  Settings,
  Briefcase,
  User,
  Handshake,
  Boxes,
  Cloud,
  CalendarClock,
  ChevronDown,
} from 'lucide-react';

const getTabIcon = (type: Tab['type']) => {
  const icons: Partial<Record<TabType, typeof FileText>> = {
    request: FileText,
    app: Grid3x3,
    product: Package,
    storage: HardDrive,
    session: KeyRound,
    'session-activity': KeyRound,
    'session-dashboard': KeyRound,
    'session-user': User,
    cache: Layers,
    'cache-values': Layers,
    healthcheck: Heart,
    database: Database,
    graph: GitBranch,
    vector: Boxes,
    feature: Workflow,
    'feature-run': Workflow,
    'resilience-invocation': Activity,
    agent: Bot,
    'agent-run': Bot,
    'message-broker': MessageSquare,
    'message-broker-events': MessageSquare,
    notification: Bell,
    'notification-explorer': Bell,
    'new-notification': Bell,
    'notification-template': FileText,
    notifier: Bell,
    message: Mail,
    'new-message': Mail,
    'new-topic': Mail,
    fallback: Shield,
    'new-fallback': Shield,
    quota: BarChart3,
    'new-quota': BarChart3,
    job: CalendarClock,
    'job-run': CalendarClock,
    'job-explorer': CalendarClock,
    'new-healthcheck': Heart,
    logs: FileText,
    work: KanbanSquare,
    dashboard: LayoutDashboard,
    tokens: Lock,
    teams: Users,
    marketplace: Store,
    webhook: MessageSquare,
    auth: KeyRound,
    pricing: Receipt,
    partnership: Handshake,
    brief: Briefcase,
    settings: Settings,
    cloud: Cloud,
  };
  return icons[type] || FileText;
};

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, closeTabs, setActiveView, setActiveIconSidebar, reorderTabs } =
    useWorkbenchStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab.id);

    // Switch view based on tab type
    if (tab.type === 'product') {
      setActiveView('products');
    } else if (tab.type === 'app' || tab.type === 'request') {
      setActiveView('apps');
    } else if (tab.type === 'cloud') {
      setActiveView('cloud');
      setActiveIconSidebar('cloud');
    }
    // Dashboard, logs, tokens, teams tabs don't need view switching
    // as they handle their own display
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      reorderTabs(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  /** Closes the tabs a menu command covers, asking first when that would discard unsaved changes. */
  const closeScope = (scope: CloseScope) => {
    const ids = tabsToClose(tabs, activeTabId, scope);
    if (ids.length === 0) return;
    const unsaved = unsavedCount(tabs, ids);
    if (unsaved > 0 && !window.confirm(`${unsaved} of these tabs ${unsaved === 1 ? 'has' : 'have'} unsaved changes. Close anyway?`)) {
      return;
    }
    closeTabs(ids);
  };

  if (tabs.length === 0) {
    return null;
  }

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId);

  return (
    <div data-testid="tab-bar" className="h-9 md:h-10 bg-white border-b border-grey-400 flex items-stretch shadow-sm">
      <div className="flex-1 min-w-0 flex items-center overflow-x-auto tab-bar-scroll">
      {tabs.map((tab, index) => {
        const Icon = getTabIcon(tab.type);
        const isActive = activeTabId === tab.id;
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;

        return (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'h-full flex items-center gap-1.5 md:gap-2 px-2 md:px-4 border-r border-grey-400 cursor-pointer group relative flex-shrink-0',
              isActive
                ? 'bg-grey-100 border-b-2 border-b-primary shadow-sm'
                : 'bg-white hover:bg-grey-100 hover:shadow-sm',
              isDragging && 'opacity-50',
              isDragOver && 'border-l-2 border-l-primary'
            )}
            onClick={() => handleTabClick(tab)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className={cn(
                'p-0.5 rounded hover:bg-grey-200 transition-opacity flex-shrink-0',
                // Always there for the open tab and on touch screens; other tabs show it on hover.
                isActive ? 'opacity-100' : 'md:opacity-0 md:group-hover:opacity-100'
              )}
              title="Close tab"
              aria-label={`Close ${tab.title}`}
            >
              <X className="h-3 w-3 text-grey-600" />
            </button>
            <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', isActive ? 'text-primary' : 'text-grey-600')} />
            <span
              className={cn(
                'text-xs md:text-sm font-medium max-w-[80px] md:max-w-[150px] truncate',
                isActive ? 'text-grey' : 'text-grey-600'
              )}
            >
              {tab.title}
            </span>
            {tab.isDirty && (
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary flex-shrink-0" title="Unsaved changes" />
            )}
          </div>
        );
      })}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="h-full px-2 md:px-3 border-l border-grey-400 flex items-center justify-center flex-shrink-0 text-grey-600 hover:bg-grey-100 hover:text-grey transition-colors"
            title="Tab actions"
            aria-label="Tab actions"
            data-testid="tab-menu"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[190px]">
          <DropdownMenuItem disabled={activeIndex < 0} onSelect={() => closeScope('active')}>
            Close tab
          </DropdownMenuItem>
          <DropdownMenuItem disabled={tabs.length < 2 || activeIndex < 0} onSelect={() => closeScope('others')}>
            Close other tabs
          </DropdownMenuItem>
          <DropdownMenuItem disabled={activeIndex < 0 || activeIndex === tabs.length - 1} onSelect={() => closeScope('right')}>
            Close tabs to the right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => closeScope('all')} data-testid="close-all-tabs">
            Close all tabs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
