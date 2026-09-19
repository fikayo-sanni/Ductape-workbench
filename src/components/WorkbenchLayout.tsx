import { useWorkbenchStore } from '@/stores/workbench-store';
import IconSidebar from './IconSidebar';
import WorkbenchHeader from './WorkbenchHeader';
import CloudSidebar from './CloudSidebar';
import ProductsSidebar from './ProductsSidebar';
import AppsSidebar from './AppsSidebar';
import EnvironmentsSidebar from './EnvironmentsSidebar';
import PartnershipsSidebar from './PartnershipsSidebar';
import Dashboard from './Dashboard';
import TabBar from './TabBar';
import TabContent from './TabContent';
import ChatbotSidebar from './ChatbotSidebar';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import PricingSidebar from './tabs/PricingSidebar';
import RequireAuth from '@/components/auth/RequireAuth';
import RequireOnboarded from '@/components/auth/RequireOnboarded';
import { useIconSidebarNavigation } from '@/hooks/useIconSidebarNavigation';

function WorkbenchShell() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    activeView,
    setActiveView,
    chatbotSidebarOpen,
    toggleChatbotSidebar,
  } = useWorkbenchStore();

  const { items: navItems, navigate, isActive } = useIconSidebarNavigation(setActiveView);
  const primaryNavItems = navItems.filter((item) => item.section === 'primary');
  const secondaryNavItems = navItems.filter((item) => item.section === 'secondary');

  return (
    <>
      <div data-testid="workbench-shell" className="flex flex-col h-screen h-dvh bg-grey-100 overflow-hidden">
        <WorkbenchHeader />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="hidden md:block" data-intro="sidebar">
            <IconSidebar activeView={activeView} onViewChange={setActiveView} />
          </div>

          {activeView !== 'dashboard' && (
            <div
              className={cn(
                'transition-all duration-300 ease-in-out border-r border-grey-400 bg-white flex-shrink-0 shadow-sm',
                'flex flex-col min-h-0 overflow-hidden',
                sidebarCollapsed ? 'w-0' : 'w-full md:w-[280px]',
                !sidebarCollapsed && 'fixed inset-0 md:relative md:inset-auto z-50 md:z-0',
              )}
            >
              <div className="md:hidden flex-shrink-0 px-4 py-3 border-b border-grey-400 bg-white shadow-sm flex items-center justify-between">
                <h3 className="text-lg font-semibold text-grey">Menu</h3>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain md:overflow-hidden">
                <div className="md:hidden p-4 border-b border-grey-400 bg-white space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {primaryNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigate(item.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                            isActive(item.id)
                              ? 'bg-primary text-white'
                              : 'bg-grey-100 text-grey-600 hover:bg-grey-200',
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="h-px bg-grey-300" />
                  <div className="flex gap-2 flex-wrap">
                    {secondaryNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigate(item.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                            isActive(item.id)
                              ? 'bg-primary text-white'
                              : 'bg-grey-100 text-grey-600 hover:bg-grey-200',
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="min-h-0 md:h-full">
                  {activeView === 'cloud' && <CloudSidebar />}
                  {activeView === 'products' && <ProductsSidebar />}
                  {activeView === 'apps' && <AppsSidebar />}
                  {activeView === 'environments' && <EnvironmentsSidebar />}
                  {activeView === 'pricing' && <PricingSidebar />}
                  {activeView === 'partnership' && <PartnershipsSidebar />}
                </div>
              </div>
            </div>
          )}

          {!sidebarCollapsed && activeView !== 'dashboard' && (
            <div
              className="fixed inset-0 bg-black/50 z-20 md:hidden"
              onClick={toggleSidebar}
            />
          )}

          <div className="flex-1 flex flex-col min-w-0 bg-grey-100 overflow-hidden">
            {activeView === 'dashboard' ? (
              <div className="h-10 md:hidden border-b border-grey-400 bg-white flex items-center px-4 gap-2 flex-shrink-0 shadow-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveView('products')}
                  className="h-7 w-7"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-grey-600">Back to Workbench</span>
              </div>
            ) : (
              <div className="h-10 border-b border-grey-400 bg-white flex items-center px-4 gap-2 flex-shrink-0 shadow-sm">
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7">
                  {sidebarCollapsed ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
                <span className="text-sm font-medium text-grey-600 hidden sm:inline">Workbench</span>
              </div>
            )}

            {activeView !== 'dashboard' && (
              <div data-intro="tabs" className="flex-shrink-0">
                <TabBar />
              </div>
            )}

            <div
              data-intro="content"
              className="flex-1 min-h-0 flex flex-col overflow-hidden"
            >
              {activeView === 'dashboard' ? (
                <div className="flex-1 min-h-0 h-full overflow-y-auto overflow-x-hidden overscroll-y-contain">
                  <Dashboard />
                </div>
              ) : (
                <TabContent />
              )}
            </div>
          </div>
        </div>
      </div>

      <ChatbotSidebar isOpen={chatbotSidebarOpen} onClose={toggleChatbotSidebar} />
    </>
  );
}

export default function WorkbenchLayout() {
  return (
    <RequireAuth>
      <RequireOnboarded>
        <WorkbenchShell />
      </RequireOnboarded>
    </RequireAuth>
  );
}
