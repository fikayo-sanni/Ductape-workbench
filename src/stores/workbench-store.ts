import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Workspace,
  Project,
  EndpointRequest,
  EndpointResponse,
} from '@/types';
import { Tab } from '@/types/tab';

interface WorkbenchState {
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
  activeTab: 'params' | 'headers' | 'body' | 'auth';
  responseTab: 'response' | 'headers' | 'code';
  activeView: 'products' | 'apps' | 'environments' | 'dashboard';
  activeIconSidebar: 'products' | 'apps' | 'environments' | 'dashboard' | 'logs' | 'tokens' | 'teams' | null;

  // Logs Filter State
  logsFilters: {
    component: string;
    app: string;
    product: string;
    status: string;
    searchTerm: string;
    startDate: string;
    endDate: string;
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
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  openLogsTab: () => void;
  openDashboardTab: () => void;
  openTokensTab: () => void;
  openTeamsTab: () => void;

  // Actions - UI
  toggleSidebar: () => void;
  setRequestTab: (tab: 'params' | 'headers' | 'body' | 'auth') => void;
  setResponseTab: (tab: 'response' | 'headers' | 'code') => void;
  setActiveView: (view: WorkbenchState['activeView']) => void;
  setActiveIconSidebar: (icon: WorkbenchState['activeIconSidebar']) => void;

  // Actions - Logs
  setLogsFilters: (filters: Partial<WorkbenchState['logsFilters']>) => void;
}

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set) => ({
  // Initial State
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
  activeTab: 'params',
  responseTab: 'response',
  activeView: 'products',
  activeIconSidebar: null,
  logsFilters: {
    component: 'all',
    app: 'all',
    product: 'all',
    status: 'all',
    searchTerm: '',
    startDate: '',
    endDate: '',
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
      // Check if tab already exists (by itemId and type, or just by id if new tab)
      const existingTab = state.tabs.find(
        (t) => t.itemId === tab.itemId && t.type === tab.type && tab.itemId
      );

      if (existingTab) {
        // Tab already exists, just switch to it
        return { activeTabId: existingTab.id };
      }

      // Create new tab
      return {
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      };
    }),

  closeTab: (tabId) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== tabId);
      let newActiveTabId = state.activeTabId;

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

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateTab: (tabId, updates) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t)),
    })),

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
        title: 'API Tokens',
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

  // UI Actions
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setRequestTab: (tab) => set({ activeTab: tab }),
  setResponseTab: (tab) => set({ responseTab: tab }),
  setActiveView: (view) => set({ activeView: view }),
  setActiveIconSidebar: (icon) => set({ activeIconSidebar: icon }),

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
        currentWorkspaceId: state.currentWorkspaceId,
        currentProjectId: state.currentProjectId,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
