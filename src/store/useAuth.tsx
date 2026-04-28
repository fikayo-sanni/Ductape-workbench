import { create } from "zustand";
import { User } from "@/types/auth";

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

export const useAuth = create<AuthState>((set) => ({
  user,
  currentWorkspaceId: savedWorkspaceId,
  setUser: (user: User | null) => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
    set({ user });
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
    set({ user: null, currentWorkspaceId: null });
  },
}));
