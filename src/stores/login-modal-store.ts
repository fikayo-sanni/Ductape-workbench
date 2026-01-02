import { create } from "zustand";

interface LoginModalState {
  isOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

export const useLoginModalStore = create<LoginModalState>((set) => ({
  isOpen: false,
  openLoginModal: () => set({ isOpen: true }),
  closeLoginModal: () => set({ isOpen: false }),
}));

// Export a function that can be called from outside React components (like axios interceptor)
export const showLoginModal = () => {
  useLoginModalStore.getState().openLoginModal();
};
