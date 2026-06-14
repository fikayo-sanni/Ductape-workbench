import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Workspace,
  Project,
  EndpointRequest,
  EndpointResponse,
} from '@/types';
import { Tab } from '@/types/tab';
import { deleteTabState, cleanupOldTabStates } from '@/lib/tab-state-manager';

type BillingView =
  | "expenses"
  | "revenue"
  | "bundles";


interface WorkbenchState {
  billingView: BillingView;
  setBillingView: (view: BillingView) => void;
  // Hydration state
  _hasHydrated: boolean;

  // Workspaces
  workspaces: Workspace[];
  currentWorkspaceId: string | null;

  // Projects
  projects: Project[];
  currentProjectId: string | null;

  // Requests
  requests: EndpointRequest[];
  currentRequestId: string | null;

  // Responses
  responses: Record<string, EndpointResponse>;

  // Tabs
  tabs: Tab[];
  activeTabId: string | null;

  // UI State
  sidebarCollapsed: boolean;
  chatbotSidebarOpen: boolean;
  activeTab: 'params' | 'headers' | 'body' | 'auth';
  responseTab: 'response' | 'headers' | 'code';
  activeView: 'cloud' | 'products' | 'apps' | 'environments' | 'dashboard' | 'marketplace' | 'partnership' | 'pricing';
  activeIconSidebar: 'cloud' | 'products' | 'apps' | 'environments' | 'dashboard' | 'logs' | 'tokens' | 'teams' | 'partnership' | 'marketplace' | 'chatbot' | 'pricing' | null;

  cloudAddConnectionModalOpen: boolean;

  // Logs Filter State
  logsFilters: {
    component: string;
    app: string;
    product: string;
    status: string;
    searchTerm: string;
    startDate: string;
    endDate: string;
    timeRange: string;
  };

  // Actions - Workspaces
  setCurrentWorkspace: (id: string | null) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;

  // Actions - Projects
  setCurrentProject: (id: string | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Actions - Requests
  setCurrentRequest: (id: string | null) => void;
  addRequest: (request: EndpointRequest) => void;
  updateRequest: (id: string, updates: Partial<EndpointRequest>) => void;
  deleteRequest: (id: string) => void;

  // Actions - Responses
  setResponse: (requestId: string, response: EndpointResponse) => void;

  // Actions - Tabs
  openTab: (tab: Tab) => void;
  closeTab: (tabId: string) => void;
  clearAllTabs: () => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  openLogsTab: () => void;
  openDashboardTab: () => void;
  openTokensTab: () => void;
  openTeamsTab: () => void;
  openPartnershipTab: () => void;
  openMarketplaceTab: () => void;
  openPricingTab: () => void;

  // Actions - UI
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleChatbotSidebar: () => void;
  setRequestTab: (tab: 'params' | 'headers' | 'body' | 'auth') => void;
  setResponseTab: (tab: 'response' | 'headers' | 'code') => void;
  setActiveView: (view: WorkbenchState['activeView']) => void;
  setActiveIconSidebar: (icon: WorkbenchState['activeIconSidebar']) => void;
  setCloudAddConnectionModalOpen: (open: boolean) => void;

  // Actions - Logs
  setLogsFilters: (filters: Partial<WorkbenchState['logsFilters']>) => void;

}

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set) => ({
  // Initial State
  _hasHydrated: false,
  workspaces: [],
  currentWorkspaceId: null,
  projects: [],
  currentProjectId: null,
  requests: [],
  currentRequestId: null,
  responses: {},
  tabs: [],
  activeTabId: null,
  sidebarCollapsed: false,
  chatbotSidebarOpen: false,
  activeTab: 'params',
  responseTab: 'response',
  activeView: 'products',
  activeIconSidebar: null,
  cloudAddConnectionModalOpen: false,
  billingView: "expenses",
  logsFilters: {
    component: 'all',
    app: 'all',
    product: 'all',
    status: 'all',
    searchTerm: '',
    startDate: '',
    endDate: '',
    timeRange: '24h',
  },

  // Workspace Actions
  setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),

  addWorkspace: (workspace) =>
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
    })),

  updateWorkspace: (id, updates) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, ...updates, updatedAt: new Date() } : w
      ),
    })),

  deleteWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      currentWorkspaceId: state.currentWorkspaceId === id ? null : state.currentWorkspaceId,
    })),

  // Project Actions
  setCurrentProject: (id) => set({ currentProjectId: id }),

  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project],
    })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
    })),

  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
    })),

  // Request Actions
  setCurrentRequest: (id) => set({ currentRequestId: id }),

  addRequest: (request) =>
    set((state) => ({
      requests: [...state.requests, request],
    })),

  updateRequest: (id, updates) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date() } : r
      ),
    })),

  deleteRequest: (id) =>
    set((state) => ({
      requests: state.requests.filter((r) => r.id !== id),
      currentRequestId: state.currentRequestId === id ? null : state.currentRequestId,
    })),

  // Response Actions
  setResponse: (requestId, response) =>
    set((state) => ({
      responses: {
        ...state.responses,
        [requestId]: response,
      },
    })),

  // Tab Actions
  openTab: (tab) =>
    set((state) => {
      // Check if tab already exists by:
      // 1. Static ID (for singleton tabs like 'partnership-search')
      // 2. itemId and type (for content tabs with data)
      const existingTab = state.tabs.find(
        (t) => (tab.id && t.id === tab.id) || (t.itemId === tab.itemId && t.type === tab.type && tab.itemId)
      );

      if (existingTab) {
        // Tab already exists — switch to it and refresh tab data (e.g. cloud connection status)
        const updatedTabs =
          tab.data !== undefined
            ? state.tabs.map((t) =>
                t.id === existingTab.id
                  ? {
                      ...t,
                      title: tab.title ?? t.title,
                      itemId: tab.itemId ?? t.itemId,
                      data: { ...(t.data as object), ...(tab.data as object) },
                    }
                  : t,
              )
            : state.tabs;

        if (existingTab.type === 'partnership' && existingTab.itemId) {
          return {
            tabs: updatedTabs,
            activeTabId: existingTab.id,
            activeView: 'partnership',
            activeIconSidebar: 'partnership',
          };
        }
        if (existingTab.type === 'cloud') {
          return {
            tabs: updatedTabs,
            activeTabId: existingTab.id,
            activeView: 'cloud',
            activeIconSidebar: 'cloud',
          };
        }
        return { tabs: updatedTabs, activeTabId: existingTab.id };
      }

      // Find the index of the currently active tab
      const activeTabIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);

      // Insert new tab after the current tab (or at the end if no active tab)
      const newTabs = [...state.tabs];
      if (activeTabIndex >= 0) {
        newTabs.splice(activeTabIndex + 1, 0, tab);
      } else {
        newTabs.push(tab);
      }

      // If opening a partnership detail tab, also switch sidebar to partnership view
      if (tab.type === 'partnership' && tab.itemId) {
        return {
          tabs: newTabs,
          activeTabId: tab.id,
          activeView: 'partnership',
          activeIconSidebar: 'partnership',
        };
      }

      if (tab.type === 'cloud') {
        return {
          tabs: newTabs,
          activeTabId: tab.id,
          activeView: 'cloud',
          activeIconSidebar: 'cloud',
        };
      }

      return {
        tabs: newTabs,
        activeTabId: tab.id,
      };
    }),

  closeTab: (tabId) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== tabId);
      let newActiveTabId = state.activeTabId;

      // Delete tab state from localStorage
      deleteTabState(tabId);

      // If closing the active tab, switch to another tab
      if (state.activeTabId === tabId) {
        if (newTabs.length > 0) {
          // Switch to the tab to the left, or the first tab if we closed the first one
          const closedTabIndex = state.tabs.findIndex((t) => t.id === tabId);
          const newIndex = closedTabIndex > 0 ? closedTabIndex - 1 : 0;
          newActiveTabId = newTabs[newIndex]?.id || null;
        } else {
          newActiveTabId = null;
        }
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveTabId,
      };
    }),

  clearAllTabs: () =>
    set((state) => {
      state.tabs.forEach((tab) => deleteTabState(tab.id));
      return { tabs: [], activeTabId: null };
    }),

  setActiveTab: (tabId) =>
    set((state) => {
      // Find the tab being activated
      const tab = state.tabs.find((t) => t.id === tabId);

      // If it's a partnership detail tab, also switch sidebar to partnership view
      if (tab && tab.type === 'partnership' && tab.itemId) {
        return {
          activeTabId: tabId,
          activeView: 'partnership',
          activeIconSidebar: 'partnership',
        };
      }

      if (tab?.type === 'cloud') {
        return {
          activeTabId: tabId,
          activeView: 'cloud',
          activeIconSidebar: 'cloud',
        };
      }

      return { activeTabId: tabId };
    }),

  updateTab: (tabId, updates) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t)),
    })),

  reorderTabs: (fromIndex, toIndex) =>
    set((state) => {
      const newTabs = [...state.tabs];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);
      return { tabs: newTabs };
    }),

  openLogsTab: () =>
    set((state) => {
      // Check if logs tab already exists
      const existingLogsTab = state.tabs.find((t) => t.type === 'logs');

      if (existingLogsTab) {
        // Tab already exists, just switch to it
        return { activeTabId: existingLogsTab.id };
      }

      // Create new logs tab
      const newLogsTab: Tab = {
        id: `logs-${Date.now()}`,
        type: 'logs',
        title: 'Workspace Logs',
      };

      return {
        tabs: [...state.tabs, newLogsTab],
        activeTabId: newLogsTab.id,
      };
    }),

  openDashboardTab: () =>
    set((state) => {
      // Check if dashboard tab already exists
      const existingDashboardTab = state.tabs.find((t) => t.type === 'dashboard');

      if (existingDashboardTab) {
        // Tab already exists, just switch to it
        return { activeTabId: existingDashboardTab.id };
      }

      // Create new dashboard tab
      const newDashboardTab: Tab = {
        id: `dashboard-${Date.now()}`,
        type: 'dashboard',
        title: 'Dashboard',
      };

      return {
        tabs: [...state.tabs, newDashboardTab],
        activeTabId: newDashboardTab.id,
      };
    }),

  openTokensTab: () =>
    set((state) => {
      // Check if tokens tab already exists
      const existingTokensTab = state.tabs.find((t) => t.type === 'tokens');

      if (existingTokensTab) {
        // Tab already exists, just switch to it
        return { activeTabId: existingTokensTab.id };
      }

      // Create new tokens tab
      const newTokensTab: Tab = {
        id: `tokens-${Date.now()}`,
        type: 'tokens',
        title: 'Secrets',
      };

      return {
        tabs: [...state.tabs, newTokensTab],
        activeTabId: newTokensTab.id,
      };
    }),

  openTeamsTab: () =>
    set((state) => {
      // Check if teams tab already exists
      const existingTeamsTab = state.tabs.find((t) => t.type === 'teams');

      if (existingTeamsTab) {
        // Tab already exists, just switch to it
        return { activeTabId: existingTeamsTab.id };
      }

      // Create new teams tab
      const newTeamsTab: Tab = {
        id: `teams-${Date.now()}`,
        type: 'teams',
        title: 'Team Members',
      };

      return {
        tabs: [...state.tabs, newTeamsTab],
        activeTabId: newTeamsTab.id,
      };
    }),

  openPartnershipTab: () =>
    set((state) => {
      // Check if partnership tab already exists
      const existingPartnershipTab = state.tabs.find((t) => t.type === 'partnership');

      if (existingPartnershipTab) {
        // Tab already exists, just switch to it
        return { activeTabId: existingPartnershipTab.id };
      }

      // Create new partnership tab
      const newPartnershipTab: Tab = {
        id: `partnership-${Date.now()}`,
        type: 'partnership',
        title: 'Partnership',
      };

      return {
        tabs: [...state.tabs, newPartnershipTab],
        activeTabId: newPartnershipTab.id,
      };
    }),

  openMarketplaceTab: () =>
    set((state) => {
      // Check if marketplace tab already exists
      const existingMarketplaceTab = state.tabs.find((t) => t.type === 'marketplace');

      if (existingMarketplaceTab) {
        // Tab already exists, just switch to it
        return { activeTabId: existingMarketplaceTab.id };
      }

      // Create new marketplace tab
      const newMarketplaceTab: Tab = {
        id: `marketplace-${Date.now()}`,
        type: 'marketplace',
        title: 'Marketplace',
      };

      return {
        tabs: [...state.tabs, newMarketplaceTab],
        activeTabId: newMarketplaceTab.id,
      };
    }),

  openPricingTab: () =>
    set((state) => {
      // Check if pricing tab already exists
      const existingPricingTab = state.tabs.find((t) => t.type === 'pricing');

      if (existingPricingTab) {
        // Tab already exists, just switch to it
        return { activeTabId: existingPricingTab.id };
      }

      // Create new pricing tab
      const newPricingTab: Tab = {
        id: `pricing-${Date.now()}`,
        type: 'pricing',
        title: 'Pricing',
      };

      return {
        tabs: [...state.tabs, newPricingTab],
        activeTabId: newPricingTab.id,
      };
    }),


  // UI Actions
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleChatbotSidebar: () => set((state) => ({ chatbotSidebarOpen: !state.chatbotSidebarOpen })),
  setRequestTab: (tab) => set({ activeTab: tab }),
  setResponseTab: (tab) => set({ responseTab: tab }),
  setActiveView: (view) => set({ activeView: view }),
  setActiveIconSidebar: (icon) => set({ activeIconSidebar: icon }),
  setCloudAddConnectionModalOpen: (open) => set({ cloudAddConnectionModalOpen: open }),
  setBillingView: (view) => set({ billingView: view }),

  // Logs Actions
  setLogsFilters: (filters) =>
    set((state) => ({
      logsFilters: { ...state.logsFilters, ...filters },
    })),
    }),
    {
      name: 'workbench-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        logsFilters: state.logsFilters,
        activeView: state.activeView,
        billingView: state.billingView,
        currentWorkspaceId: state.currentWorkspaceId,
        currentProjectId: state.currentProjectId,
        // Only persist tab metadata, not the full data to avoid quota issues
        tabs: state.tabs.map(tab => ({
          id: tab.id,
          type: tab.type,
          title: tab.title,
          itemId: tab.itemId,
          isDirty: tab.isDirty,
          // Include small initialization data (appId, productId, activeSection, etc.) but exclude large objects
          data: tab.data ? {
            appId: (tab.data as any).appId,
            productId: (tab.data as any).productId,
            integrationId: (tab.data as any).integrationId,
            activeSection: (tab.data as any).activeSection,
            isNew: (tab.data as any).isNew,
            componentType: (tab.data as any).componentType,
            productName: (tab.data as any).productName,
            productTag: (tab.data as any).productTag,
            productLogo: (tab.data as any).productLogo,
            // Database/resource explorer restoration data
            isExplorer: (tab.data as any).isExplorer,
            // For database tabs, persist enough to refetch on restore
            database: (tab.data as any).database ? {
              name: (tab.data as any).database.name,
              tag: (tab.data as any).database.tag,
              type: (tab.data as any).database.type,
              productTag: (tab.data as any).database.productTag,
              productName: (tab.data as any).database.productName,
              // Only persist env slug - connection_url will be refetched
              env: (tab.data as any).database.env ? {
                slug: (tab.data as any).database.env.slug,
              } : undefined,
            } : undefined,
            // For graph tabs, persist enough to refetch on restore
            graph: (tab.data as any).graph ? {
              name: (tab.data as any).graph.name,
              tag: (tab.data as any).graph.tag,
              type: (tab.data as any).graph.type,
              productTag: (tab.data as any).graph.productTag,
              productName: (tab.data as any).graph.productName,
              // Only persist env slug - connection_url will be refetched
              env: (tab.data as any).graph.env ? {
                slug: (tab.data as any).graph.env.slug,
              } : undefined,
            } : undefined,
            // For vector tabs, persist enough to refetch on restore
            vector: (tab.data as any).vector ? {
              name: (tab.data as any).vector.name,
              // Persist vector tag - check both 'vector' and 'tag' properties
              vector: (tab.data as any).vector.vector || (tab.data as any).vector.tag,
              tag: (tab.data as any).vector.tag || (tab.data as any).vector.vector,
              type: (tab.data as any).vector.type,
              productTag: (tab.data as any).vector.productTag,
              productName: (tab.data as any).vector.productName,
              // Only persist env slug - endpoint will be refetched
              env: (tab.data as any).vector.env ? {
                slug: (tab.data as any).vector.env.slug,
              } : undefined,
              // Also persist envs array slugs for fallback
              envs: (tab.data as any).vector.envs?.map((e: any) => ({ slug: e.slug })),
            } : undefined,
            // For storage tabs, persist enough to refetch on restore
            storage: (tab.data as any).storage ? {
              name: (tab.data as any).storage.name,
              tag: (tab.data as any).storage.tag,
              type: (tab.data as any).storage.type,
              provider: (tab.data as any).storage.provider,
              productTag: (tab.data as any).storage.productTag,
              productName: (tab.data as any).storage.productName,
              productId: (tab.data as any).storage.productId,
              // Only persist env slug - config will be refetched
              env: (tab.data as any).storage.env ? {
                slug: (tab.data as any).storage.env.slug,
              } : undefined,
            } : undefined,
            // For component tabs (cache, broker, session, etc.), persist root-level fields
            // These are needed for components that have their data at the root of tab.data
            // Only include if not already present in nested objects
            ...(!(tab.data as any).storage && !(tab.data as any).vector ? {
              name: (tab.data as any).name,
              tag: (tab.data as any).tag,
              cacheTag: (tab.data as any).cacheTag,
              brokerTag: (tab.data as any).brokerTag,
              sessionTag: (tab.data as any).sessionTag,
              productTag: (tab.data as any).productTag,
              productName: (tab.data as any).productName,
              sessionName: (tab.data as any).sessionName,
              type: (tab.data as any).type,
              provider: (tab.data as any).provider,
            } : {}),
            // Also preserve nested component objects if they exist
            cache: (tab.data as any).cache,
            broker: (tab.data as any).broker,
            session: (tab.data as any).session,
            // For session-user tabs, persist user essential fields
            user: (tab.data as any).user ? {
              identifier: (tab.data as any).user.identifier,
              ductape_user_id: (tab.data as any).user.ductape_user_id,
              env: (tab.data as any).user.env,
              session_count: (tab.data as any).user.session_count,
              status: (tab.data as any).user.status,
              first_seen: (tab.data as any).user.first_seen,
              last_seen: (tab.data as any).user.last_seen,
            } : undefined,
            // Environment info if present at root level
            env: (tab.data as any).env,
            envs: (tab.data as any).envs,
            // Webhook explorer - preserve app context
            appTag: (tab.data as any).appTag,
            appName: (tab.data as any).appName,
            appLogo: (tab.data as any).appLogo,
            // Webhook events (needed for display)
            events: (tab.data as any).events,
            description: (tab.data as any).description,
            active: (tab.data as any).active,
            // Cloud connection tabs — preserve setup state across refresh
            isSetup: (tab.data as any).isSetup,
            status: (tab.data as any).status,
            id: (tab.data as any).id,
            tag: (tab.data as any).tag,
            provider: (tab.data as any).provider,
            display_name: (tab.data as any).display_name,
            scopes: (tab.data as any).scopes,
            account_identifier: (tab.data as any).account_identifier,
            setupPayload: (tab.data as any).setupPayload,
            // Notification explorer - product + notification + env for restore after refresh
            product: (tab.data as any).product ? {
              tag: (tab.data as any).product.tag,
              name: (tab.data as any).product.name,
              logo: (tab.data as any).product.logo,
              envs: (tab.data as any).product.envs?.map((e: any) => ({ slug: e.slug, name: e.name })),
            } : undefined,
            notification: (tab.data as any).notification ? {
              tag: (tab.data as any).notification.tag,
              name: (tab.data as any).notification.name,
              envs: (tab.data as any).notification.envs?.map((e: any) => ({ slug: e.slug, name: e.name })),
            } : undefined,
            // Job explorer - job + env so tab restores after refresh
            job: (tab.data as any).job ? {
              tag: (tab.data as any).job.tag,
              name: (tab.data as any).job.name,
              productTag: (tab.data as any).job.productTag,
              productName: (tab.data as any).job.productName,
              type: (tab.data as any).job.type,
              event: (tab.data as any).job.event,
              schedule: (tab.data as any).job.schedule,
            } : undefined,
            // Workflow explorer - workflow + product so tab restores after refresh
            workflow: (tab.data as any).workflow ? {
              name: (tab.data as any).workflow.name,
              tag: (tab.data as any).workflow.tag,
              productTag: (tab.data as any).workflow.productTag,
              env: (tab.data as any).workflow.env ? { slug: (tab.data as any).workflow.env.slug } : undefined,
            } : undefined,
            // Workflow run tab - minimal run + workflow context for restore (include completed_steps/step_outputs for step fallback)
            run: (tab.data as any).run ? {
              id: (tab.data as any).run.id,
              runNumber: (tab.data as any).run.runNumber,
              status: (tab.data as any).run.status,
              startedAt: (tab.data as any).run.startedAt,
              completedAt: (tab.data as any).run.completedAt,
              duration: (tab.data as any).run.duration,
              triggeredBy: (tab.data as any).run.triggeredBy,
              steps: (tab.data as any).run.steps,
              input: (tab.data as any).run.input,
              output: (tab.data as any).run.output,
              error: (tab.data as any).run.error,
              version: (tab.data as any).run.version,
              completed_steps: (tab.data as any).run.completed_steps,
              step_outputs: (tab.data as any).run.step_outputs,
              failed_step: (tab.data as any).run.failed_step,
            } : undefined,
            workflowName: (tab.data as any).workflowName,
            workflowTag: (tab.data as any).workflowTag,
            // Exclude large fields like full app object, versions, actions, webhooks, etc.
          } : undefined,
        })),
        activeTabId: state.activeTabId,
        chatbotSidebarOpen: state.chatbotSidebarOpen,
      }),
      onRehydrateStorage: () => () => {
        useWorkbenchStore.setState({ _hasHydrated: true });
      },
    }
  )
);

// Clean up old tab states on app initialization
cleanupOldTabStates();
