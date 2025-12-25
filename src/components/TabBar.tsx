import { useState } from 'react';
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
  KeyRound,
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
    feature: Zap,
    cache: Layers,
    'cache-values': Layers,
    healthcheck: Heart,
    'healthcheck-explorer': Heart,
    database: Database,
    graph: GitBranch,
    vector: Boxes,
    workflow: Workflow,
    'workflow-run': Workflow,
    agent: Bot,
    'agent-run': Bot,
    'message-broker': MessageSquare,
    'message-broker-events': MessageSquare,
    notification: Bell,
    'notification-explorer': Bell,
    'new-notification': Bell,
    notifier: Bell,
    message: Mail,
    'new-message': Mail,
    'new-topic': Mail,
    fallback: Shield,
    'fallback-explorer': Shield,
    'new-fallback': Shield,
    quota: BarChart3,
    'quota-explorer': BarChart3,
    'new-quota': BarChart3,
    job: ListTree,
    'jobs-explorer': ListTree,
    'new-healthcheck': Heart,
    logs: FileText,
    dashboard: LayoutDashboard,
    tokens: KeyRound,
    teams: Users,
    marketplace: Store,
    webhook: MessageSquare,
    auth: KeyRound,
    pricing: Receipt,
    partnership: Handshake,
    brief: Briefcase,
    settings: Settings,
  };
  return icons[type] || FileText;
};

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, setActiveView, reorderTabs } = useWorkbenchStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="h-9 md:h-10 bg-white border-b border-grey-400 flex items-center overflow-x-auto shadow-sm tab-bar-scroll">
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
