import { useWorkbenchStore } from '@/stores/workbench-store';
import { Tab, TabType } from '@/types/tab';
import { cn } from '@/lib/utils';
import {
  X,
  FileText,
  Grid3x3,
  Package,
  HardDrive,
  Users,
  Zap,
  Database,
  MessageSquare,
  Bell,
  Shield,
  BarChart3,
  Heart,
  ListTree,
  LayoutDashboard,
  Key,
  Store,
  Mail,
  Layers,
} from 'lucide-react';

const getTabIcon = (type: Tab['type']) => {
  const icons: Partial<Record<TabType, typeof FileText>> = {
    request: FileText,
    app: Grid3x3,
    product: Package,
    storage: HardDrive,
    session: Users,
    feature: Zap,
    cache: Layers,
    healthcheck: Heart,
    database: Database,
    'message-broker': MessageSquare,
    notification: Bell,
    notifier: Bell,
    message: Mail,
    'new-message': Mail,
    fallback: Shield,
    quota: BarChart3,
    job: ListTree,
    logs: FileText,
    dashboard: LayoutDashboard,
    tokens: Key,
    teams: Users,
    marketplace: Store,
    webhook: MessageSquare,
    auth: Key,
  };
  return icons[type] || FileText;
};

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, setActiveView } = useWorkbenchStore();

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab.id);

    // Switch view based on tab type
    if (tab.type === 'product') {
      setActiveView('products');
    } else if (tab.type === 'app' || tab.type === 'request') {
      setActiveView('apps');
    }
    // Dashboard, logs, tokens, teams tabs don't need view switching
    // as they handle their own display
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="h-9 md:h-10 bg-white border-b border-grey-400 flex items-center overflow-x-auto shadow-sm scrollbar-thin scrollbar-thumb-grey-400 scrollbar-track-transparent">
      {tabs.map((tab) => {
        const Icon = getTabIcon(tab.type);
        const isActive = activeTabId === tab.id;

        return (
          <div
            key={tab.id}
            className={cn(
              'h-full flex items-center gap-1.5 md:gap-2 px-2 md:px-4 border-r border-grey-400 cursor-pointer group relative flex-shrink-0',
              isActive
                ? 'bg-grey-100 border-b-2 border-b-primary shadow-sm'
                : 'bg-white hover:bg-grey-100 hover:shadow-sm'
            )}
            onClick={() => handleTabClick(tab)}
          >
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className={cn(
                'ml-1 p-0.5 rounded hover:bg-grey-200 transition-opacity flex-shrink-0',
                'opacity-0 group-hover:opacity-100 md:opacity-0'
              )}
              title="Close tab"
            >
              <X className="h-3 w-3 text-grey-600" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
