import { create } from 'zustand';

/**
 * A request, made from outside a product tab, for that tab to open on one of its sections, such as the dashboard asking a product
 * to show one of its deployments. Kept in memory only: it is read once by the product tab and then cleared, so a reload does not
 * pull the tab back to the section.
 */
export interface IProductFocus {
  category: 'deployments';
  deploymentId?: string;
  /** Changes on every request, so asking for the same deployment twice still moves the tab. */
  nonce: number;
}

interface ProductFocusState {
  /** By product id, the same id the product tab is opened with. */
  requests: Record<string, IProductFocus>;
  request: (productId: string, focus: Omit<IProductFocus, 'nonce'>) => void;
  clear: (productId: string, nonce: number) => void;
}

export const useProductFocusStore = create<ProductFocusState>((set) => ({
  requests: {},
  request: (productId, focus) =>
    set((state) => ({ requests: { ...state.requests, [productId]: { ...focus, nonce: Date.now() } } })),
  clear: (productId, nonce) =>
    set((state) => {
      if (state.requests[productId]?.nonce !== nonce) return state;
      const { [productId]: _done, ...rest } = state.requests;
      return { requests: rest };
    }),
}));
