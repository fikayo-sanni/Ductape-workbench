import { create } from "zustand";
import { User } from "@/types/auth";
import { useWorkbenchStore } from "@/stores/workbench-store";
import { queryClient } from "@/lib/queryClient";

interface AuthState {
  user: User | null;
  currentWorkspaceId: string | null;
  setUser: (user: User | null) => void;
  setCurrentWorkspaceId: (workspaceId: string | null) => void;
  logout: () => void;
}

const savedUser: string | null = localStorage.getItem("user");
const user: User | null = savedUser ? JSON.parse(savedUser) : null;
const savedWorkspaceId: string | null = localStorage.getItem("currentWorkspaceId");

/**
 * Tabs (persisted in localStorage via the workbench store) and cached React
 * Query data are keyed by nothing account-specific, so they survive a login
 * as a different user unless explicitly wiped here — at logout, and whenever
 * setUser sees the signed-in user's id change.
 */
function clearStaleSessionState() {
  useWorkbenchStore.getState().clearAllTabs();
  queryClient.clear();
}

export const useAuth = create<AuthState>((set, get) => ({
  user,
  currentWorkspaceId: savedWorkspaceId,
  setUser: (nextUser: User | null) => {
    const previousUserId = get().user?._id;
    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
    } else {
      localStorage.removeItem("user");
    }
    if (nextUser && previousUserId && previousUserId !== nextUser._id) {
      clearStaleSessionState();
    }
    set({ user: nextUser });
  },
  setCurrentWorkspaceId: (workspaceId: string | null) => {
    if (workspaceId === null) {
      localStorage.removeItem("currentWorkspaceId");
      set({ currentWorkspaceId: null });
    } else {
      localStorage.setItem("currentWorkspaceId", workspaceId);
      set({ currentWorkspaceId: workspaceId });
    }
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentWorkspaceId");
    clearStaleSessionState();
    set({ user: null, currentWorkspaceId: null });
  },
}));
