import { Package, Grid3x3, Settings2, LayoutDashboard, SquareTerminal, Lock, Users, Store, MessageCircle, Handshake, Receipt, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkbenchStore } from '@/stores/workbench-store';

type SidebarView = 'cloud' | 'products' | 'apps' | 'environments' | 'dashboard' | 'marketplace' | 'partnership' | 'pricing';

interface IconSidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

export default function IconSidebar({ onViewChange }: IconSidebarProps) {
  const { openLogsTab, openDashboardTab, openTokensTab, openTeamsTab, openPricingTab, setBillingView, openMarketplaceTab, toggleChatbotSidebar, chatbotSidebarOpen, sidebarCollapsed, toggleSidebar, activeIconSidebar, setActiveIconSidebar } = useWorkbenchStore();

  const menuItems: Array<{
    id: SidebarView;
    icon: typeof Package;
    label: string;
    disabled?: boolean;
  }> = [
    {
      id: 'cloud',
      icon: Cloud,
      label: 'Cloud',
    },
    {
      id: 'products',
      icon: Package,
      label: 'Products',
    },
    {
      id: 'apps',
      icon: Grid3x3,
      label: 'Apps',
    },
    {
      id: 'environments',
      icon: Settings2,
      label: 'Environments',
    },
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
    },
    {
      id: 'marketplace',
      icon: Store,
      label: 'Marketplace',
    },
    {
      id: 'partnership',
      icon: Handshake,
      label: 'Partnerships',
    },
  ];

  return (
    <div
      data-testid="icon-sidebar"
      className="w-16 h-screen bg-white-700 border-r border-grey-400 flex flex-col items-center py-4 gap-2"
    >
      {menuItems.map((item) => {
        const Icon = item.icon;
        // Check if this icon is the active sidebar icon
        const isActive = activeIconSidebar === item.id;
        const isDisabled = item.disabled;

        return (
          <button
            key={item.id}
            data-testid={`icon-sidebar-${item.id}`}
            disabled={isDisabled}
            onClick={() => {
              if (isDisabled) return;

              // Set this as the active icon
              setActiveIconSidebar(item.id);

              // Dashboard and marketplace open as tabs, others change view
              if (item.id === 'dashboard') {
                openDashboardTab();
                // Close sidebar on mobile when opening dashboard
                if (!sidebarCollapsed) {
                  toggleSidebar();
                }
              } else if (item.id === 'marketplace') {
                openMarketplaceTab();
                // Close sidebar on mobile when opening marketplace
                if (!sidebarCollapsed) {
                  toggleSidebar();
                }
              } else {
                // Cloud, Products, Apps, Environments, Partnership - open sidebar if collapsed
                if (sidebarCollapsed) {
                  toggleSidebar();
                }
                onViewChange(item.id);
              }
            }}
            className={cn(
              'w-12 h-12 rounded-md flex items-center justify-center transition-all group relative',
              isDisabled
                ? 'text-grey-400 cursor-not-allowed opacity-50'
                : isActive
                  ? 'bg-primary text-white'
                  : 'text-grey-600 hover:bg-grey-100 hover:text-grey dark:hover:bg-grey-400/30'
            )}
            aria-label={item.label}
          >
            <Icon className="h-5 w-5" />

            {/* Tooltip on hover */}
            <div className="absolute left-full ml-2 px-3 py-1.5 bg-grey text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50 shadow-lg">
              {item.label}{isDisabled ? ' (Coming Soon)' : ''}
            </div>
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-8 h-px bg-grey-400 my-2" />

      {/* Logs Button - Opens as tab */}
      <button
        onClick={() => {
          setActiveIconSidebar('logs');
          openLogsTab();
          // Close sidebar on mobile when opening logs
          if (!sidebarCollapsed) {
            toggleSidebar();
          }
        }}
        className={cn(
          'w-12 h-12 rounded-md flex items-center justify-center transition-all group relative',
          activeIconSidebar === 'logs'
            ? 'bg-primary text-white'
            : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
        )}
        aria-label="Logs"
      >
        <SquareTerminal className="h-5 w-5" />

        {/* Tooltip on hover */}
        <div className="absolute left-full ml-2 px-3 py-1.5 bg-grey text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50 shadow-lg">
          Logs
        </div>
      </button>

      {/* Tokens Button - Opens as tab */}
      <button
        onClick={() => {
          setActiveIconSidebar('tokens');
          openTokensTab();
          // Close sidebar on mobile when opening tokens
          if (!sidebarCollapsed) {
            toggleSidebar();
          }
        }}
        className={cn(
          'w-12 h-12 rounded-md flex items-center justify-center transition-all group relative',
          activeIconSidebar === 'tokens'
            ? 'bg-primary text-white'
            : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
        )}
        aria-label="Tokens"
      >
        <Lock className="h-5 w-5" />

        {/* Tooltip on hover */}
        <div className="absolute left-full ml-2 px-3 py-1.5 bg-grey text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50 shadow-lg">
          Tokens
        </div>
      </button>

      {/* Teams Button - Opens as tab */}
      <button
        onClick={() => {
          setActiveIconSidebar('teams');
          openTeamsTab();
          // Close sidebar on mobile when opening teams
          if (!sidebarCollapsed) {
            toggleSidebar();
          }
        }}
        className={cn(
          'w-12 h-12 rounded-md flex items-center justify-center transition-all group relative',
          activeIconSidebar === 'teams'
            ? 'bg-primary text-white'
            : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
        )}
        aria-label="Teams"
      >
        <Users className="h-5 w-5" />

        {/* Tooltip on hover */}
        <div className="absolute left-full ml-2 px-3 py-1.5 bg-grey text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50 shadow-lg">
          Team Members
        </div>
      </button>

      {/* Pricing Button - Opens as tab */}
      <button
        onClick={() => {
    setActiveIconSidebar('pricing');

    if (sidebarCollapsed) {
      toggleSidebar();
    }

    setBillingView('expenses');
    openPricingTab();

    onViewChange('pricing');
  }}

        className={cn(
          'w-12 h-12 rounded-md flex items-center justify-center transition-all group relative',
          activeIconSidebar === 'pricing'
            ? 'bg-primary text-white'
            : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
        )}
        aria-label="Pricing"
      >
        <Receipt className="h-5 w-5" />

        {/* Tooltip on hover */}
        <div className="absolute left-full ml-2 px-3 py-1.5 bg-grey text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50 shadow-lg">
          Pricing & Billing
        </div>
      </button>

      {/* Chatbot Button - Opens sidebar */}
      <button
        onClick={() => {
          setActiveIconSidebar('chatbot');
          toggleChatbotSidebar();
          // Close sidebar on mobile when opening chatbot
          if (!sidebarCollapsed) {
            toggleSidebar();
          }
        }}
        className={cn(
          'w-12 h-12 rounded-md flex items-center justify-center transition-all group relative',
          chatbotSidebarOpen
            ? 'bg-primary text-white'
            : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
        )}
        aria-label="AI Assistant"
      >
        <MessageCircle className="h-5 w-5" />

        {/* Tooltip on hover */}
        <div className="absolute left-full ml-2 px-3 py-1.5 bg-grey text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50 shadow-lg">
          AI Assistant
        </div>
      </button>
    </div>
  );
}

export type { SidebarView };
