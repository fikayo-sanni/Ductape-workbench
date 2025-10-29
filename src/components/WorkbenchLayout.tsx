import { useEffect, useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useAuth } from '@/store/useAuth';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
// import { useIntro } from '@/hooks/useIntro.js'; // Disabled to avoid conflicts with OnboardingModal
import { useFetchWorkspaces } from '@/hooks/useWorkspaceQueries';
import IconSidebar from './IconSidebar';
import WorkbenchHeader from './WorkbenchHeader';
import ProductsSidebar from './ProductsSidebar';
import AppsSidebar from './AppsSidebar';
import EnvironmentsSidebar from './EnvironmentsSidebar';
import Dashboard from './Dashboard';
import TabBar from './TabBar';
import TabContent from './TabContent';
import LoginModal from './LoginModal';
import OnboardingModal from './OnboardingModal';
import ChatbotSidebar from './ChatbotSidebar';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

function WorkbenchContent() {
  const { user, currentWorkspaceId } = useAuth();
  const { isOnboarding, completeOnboarding, skipOnboarding, startOnboarding } = useOnboarding();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasTriggeredOnboarding, setHasTriggeredOnboarding] = useState(false);
  const {
    sidebarCollapsed,
    toggleSidebar,
    activeView,
    setActiveView,
    chatbotSidebarOpen,
    toggleChatbotSidebar,
  } = useWorkbenchStore();

  // Fetch workspaces to check if user has any
  const { data: workspacesData } = useFetchWorkspaces({
    user_id: user?._id ?? '',
    public_key: user?.public_key ?? '',
  });

  // Note: Using OnboardingModal instead of intro.js to avoid conflicts

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      setShowLoginModal(true);
    }
  }, [user]);

  // Trigger onboarding when user logs in but has no workspace
  useEffect(() => {
    const hasNoWorkspace = !currentWorkspaceId || (workspacesData?.data?.length === 0);

    if (user && hasNoWorkspace && !hasTriggeredOnboarding && !showLoginModal) {

        // Small delay to ensure DOM is ready
        setTimeout(() => {
          startOnboarding();
          setHasTriggeredOnboarding(true);
        }, 1000);
    }
  }, [user, currentWorkspaceId, workspacesData, hasTriggeredOnboarding, showLoginModal, startOnboarding]);


  return (
    <>
      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onSuccess={() => setShowLoginModal(false)}
          onClose={() => setShowLoginModal(false)} // TEMPORARY: Remove this later
        />
      )}

      {/* Main Content - Blurred when not authenticated */}
      <div className={`flex flex-col h-screen bg-grey-100 overflow-hidden ${showLoginModal ? 'blur-sm pointer-events-none' : ''}`}>
        {/* Header - Full width at top */}
        <WorkbenchHeader />

        {/* Content Area - Icon Sidebar + Main Sidebar + Panels */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Icon Sidebar - Far left - Hidden on mobile */}
          <div className="hidden md:block" data-intro="sidebar">
            <IconSidebar activeView={activeView} onViewChange={setActiveView} />
          </div>

          {/* Main Sidebar - Hidden when dashboard is active */}
          {activeView !== 'dashboard' && (
            <div
              className={`${
                sidebarCollapsed ? 'w-0' : 'w-full md:w-80'
              } transition-all duration-300 ease-in-out border-r border-grey-400 bg-white flex-shrink-0 overflow-hidden shadow-sm
              ${!sidebarCollapsed ? 'fixed md:relative inset-0 md:inset-auto z-30 md:z-0' : ''}`}
            >
              {/* Mobile Header - Show view selector on mobile */}
              <div className="md:hidden p-4 border-b border-grey-400 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-grey">Menu</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="h-8 w-8"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
                {/* Mobile view selector */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'products', label: 'Products' },
                    { id: 'apps', label: 'Apps' },
                    { id: 'environments', label: 'Envs' },
                    { id: 'dashboard', label: 'Dashboard' },
                  ].map((view) => (
                    <button
                      key={view.id}
                      onClick={() => {
                        setActiveView(view.id as any);
                        if (view.id === 'dashboard') {
                          toggleSidebar(); // Close sidebar when switching to dashboard
                        }
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                        activeView === view.id
                          ? 'bg-primary text-white'
                          : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                      )}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeView === 'products' && <ProductsSidebar />}
              {activeView === 'apps' && <AppsSidebar />}
              {activeView === 'environments' && <EnvironmentsSidebar />}
            </div>
          )}

          {/* Backdrop for mobile sidebar */}
          {!sidebarCollapsed && activeView !== 'dashboard' && (
            <div
              className="fixed inset-0 bg-black/50 z-20 md:hidden"
              onClick={toggleSidebar}
            />
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-grey-100 overflow-hidden">
            {/* Sidebar Toggle Bar or Dashboard Back Button */}
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
                <span className="text-sm font-medium text-grey-600">
                  Back to Workbench
                </span>
              </div>
            ) : (
              <div className="h-10 border-b border-grey-400 bg-white flex items-center px-4 gap-2 flex-shrink-0 shadow-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-7 w-7 md:h-7 md:w-7"
                >
                  {sidebarCollapsed ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
                <span className="text-sm font-medium text-grey-600 hidden sm:inline">
                  Workbench
                </span>
              </div>
            )}

            {/* Tab Bar - Hidden when dashboard is active */}
            {activeView !== 'dashboard' && <div data-intro="tabs" className="flex-shrink-0"><TabBar /></div>}

            {/* Content - Show Dashboard or Tab Content */}
            <div data-intro="content" className="flex-1 min-h-0 max-h-[calc(100vh-8rem)] overflow-y-auto">
              {activeView === 'dashboard' ? (
                <Dashboard />
              ) : (
                <TabContent />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Modal */}
      <OnboardingModal
        open={isOnboarding}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />

      {/* Chatbot Sidebar */}
      <ChatbotSidebar
        isOpen={chatbotSidebarOpen}
        onClose={toggleChatbotSidebar}
      />
    </>
  );
}

export default function WorkbenchLayout() {
  return (
    <OnboardingProvider>
      <WorkbenchContent />
    </OnboardingProvider>
  );
}
