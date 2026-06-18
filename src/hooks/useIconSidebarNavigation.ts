import {
  Cloud,
  Grid3x3,
  Handshake,
  LayoutDashboard,
  Lock,
  MessageCircle,
  Package,
  Receipt,
  Settings2,
  SquareTerminal,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useWorkbenchStore } from '@/stores/workbench-store';

export type SidebarView =
  | 'cloud'
  | 'products'
  | 'apps'
  | 'environments'
  | 'dashboard'
  | 'marketplace'
  | 'partnership'
  | 'pricing';

export type IconSidebarNavId =
  | SidebarView
  | 'logs'
  | 'tokens'
  | 'teams'
  | 'chatbot';

export type IconSidebarNavItem = {
  id: IconSidebarNavId;
  icon: LucideIcon;
  label: string;
  section: 'primary' | 'secondary';
};

export const ICON_SIDEBAR_NAV_ITEMS: IconSidebarNavItem[] = [
  { id: 'cloud', icon: Cloud, label: 'Cloud', section: 'primary' },
  { id: 'products', icon: Package, label: 'Products', section: 'primary' },
  { id: 'apps', icon: Grid3x3, label: 'Apps', section: 'primary' },
  { id: 'environments', icon: Settings2, label: 'Environments', section: 'primary' },
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'primary' },
  { id: 'marketplace', icon: Store, label: 'Marketplace', section: 'primary' },
  { id: 'partnership', icon: Handshake, label: 'Partnerships', section: 'primary' },
  { id: 'logs', icon: SquareTerminal, label: 'Logs', section: 'secondary' },
  { id: 'tokens', icon: Lock, label: 'Tokens', section: 'secondary' },
  { id: 'teams', icon: Users, label: 'Team Members', section: 'secondary' },
  { id: 'pricing', icon: Receipt, label: 'Pricing & Billing', section: 'secondary' },
  { id: 'chatbot', icon: MessageCircle, label: 'AI Assistant', section: 'secondary' },
];


export function useIconSidebarNavigation(onViewChange: (view: SidebarView) => void) {
  const {
    openLogsTab,
    openDashboardTab,
    openTokensTab,
    openTeamsTab,
    openMarketplaceTab,
    openPricingTab,
    setBillingView,
    toggleChatbotSidebar,
    sidebarCollapsed,
    toggleSidebar,
    activeIconSidebar,
    chatbotSidebarOpen,
    setActiveIconSidebar,
  } = useWorkbenchStore();

  const navigate = (id: IconSidebarNavId) => {
    setActiveIconSidebar(id === 'chatbot' ? 'chatbot' : id);

    if (id === 'dashboard') {
      openDashboardTab();
      if (!sidebarCollapsed) toggleSidebar();
      return;
    }

    if (id === 'marketplace') {
      openMarketplaceTab();
      if (!sidebarCollapsed) toggleSidebar();
      return;
    }

    if (id === 'logs') {
      openLogsTab();
      if (!sidebarCollapsed) toggleSidebar();
      return;
    }

    if (id === 'tokens') {
      openTokensTab();
      if (!sidebarCollapsed) toggleSidebar();
      return;
    }

    if (id === 'teams') {
      openTeamsTab();
      if (!sidebarCollapsed) toggleSidebar();
      return;
    }

    if (id === 'pricing') {
      if (sidebarCollapsed) toggleSidebar();
      setBillingView('expenses');
      openPricingTab();
      onViewChange('pricing');
      return;
    }

    if (id === 'chatbot') {
      toggleChatbotSidebar();
      if (!sidebarCollapsed) toggleSidebar();
      return;
    }

    if (sidebarCollapsed) toggleSidebar();
    onViewChange(id);
  };

  const isActive = (id: IconSidebarNavId) => {
    if (id === 'chatbot') return chatbotSidebarOpen;
    return activeIconSidebar === id;
  };

  return {
    items: ICON_SIDEBAR_NAV_ITEMS,
    navigate,
    isActive,
    activeIconSidebar,
    chatbotSidebarOpen,
  };
}
