import { cn } from '@/lib/utils';
import { useIconSidebarNavigation } from '@/hooks/useIconSidebarNavigation';
import type { SidebarView } from '@/hooks/useIconSidebarNavigation';

interface IconSidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

export default function IconSidebar({ onViewChange }: IconSidebarProps) {
  const { items, navigate, isActive } = useIconSidebarNavigation(onViewChange);

  const primaryItems = items.filter((item) => item.section === 'primary');
  const secondaryItems = items.filter((item) => item.section === 'secondary');

  const renderButton = (item: (typeof items)[number]) => {
    const Icon = item.icon;
    const active = isActive(item.id);

    return (
      <button
        key={item.id}
        data-testid={`icon-sidebar-${item.id}`}
        onClick={() => navigate(item.id)}
        className={cn(
          'w-12 h-12 rounded-md flex items-center justify-center transition-all group relative',
          active
            ? 'bg-primary text-white'
            : 'text-grey-600 hover:bg-grey-100 hover:text-grey dark:hover:bg-grey-400/30',
        )}
        aria-label={item.label}
      >
        <Icon className="h-5 w-5" />
        <div className="absolute left-full ml-2 px-3 py-1.5 bg-grey text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50 shadow-lg">
          {item.label}
        </div>
      </button>
    );
  };

  return (
    <div
      data-testid="icon-sidebar"
      className="w-16 h-screen bg-white-700 border-r border-grey-400 flex flex-col items-center py-4 gap-2"
    >
      {primaryItems.map((item) => renderButton(item))}
      <div className="w-8 h-px bg-grey-400 my-2" />
      {secondaryItems.map((item) => renderButton(item))}
    </div>
  );
}

export type { SidebarView };
