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

function WorkbenchShell() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    activeView,
    setActiveView,
    chatbotSidebarOpen,
    toggleChatbotSidebar,
  } = useWorkbenchStore();

  return (
    <>
      <div data-testid="workbench-shell" className="flex flex-col h-screen bg-grey-100 overflow-hidden">
        <WorkbenchHeader />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="hidden md:block" data-intro="sidebar">
            <IconSidebar activeView={activeView} onViewChange={setActiveView} />
          </div>

          {activeView !== 'dashboard' && (
            <div
              className={`${
                sidebarCollapsed ? 'w-0' : 'w-full md:w-[280px]'
              } transition-all duration-300 ease-in-out border-r border-grey-400 bg-white flex-shrink-0 overflow-hidden shadow-sm
              ${!sidebarCollapsed ? 'fixed md:relative inset-0 md:inset-auto z-50 md:z-0' : ''}`}
            >
              <div className="md:hidden p-4 border-b border-grey-400 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-grey">Menu</h3>
                  <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'cloud', label: 'Cloud' },
                    { id: 'products', label: 'Products' },
                    { id: 'apps', label: 'Apps' },
                    { id: 'environments', label: 'Envs' },
                    { id: 'pricing', label: 'pricing' },
                    { id: 'partnership', label: 'Partners' },
                    { id: 'dashboard', label: 'Dashboard' },
                  ].map((view) => (
                    <button
                      key={view.id}
                      onClick={() => {
                        setActiveView(view.id as any);
                        if (view.id === 'dashboard') toggleSidebar();
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                        activeView === view.id
                          ? 'bg-primary text-white'
                          : 'bg-grey-100 text-grey-600 hover:bg-grey-200',
                      )}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeView === 'cloud' && <CloudSidebar />}
              {activeView === 'products' && <ProductsSidebar />}
              {activeView === 'apps' && <AppsSidebar />}
              {activeView === 'environments' && <EnvironmentsSidebar />}
              {activeView === 'pricing' && <PricingSidebar />}
              {activeView === 'partnership' && <PartnershipsSidebar />}
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
