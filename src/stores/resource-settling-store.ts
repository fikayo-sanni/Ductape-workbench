import { create } from "zustand";

/**
 * Tracks resources that just finished a create/update call but may not be safely
 * connectable yet — separate from the backend's own `provisionStatus` field.
 *
 * `provisionStatus` only covers genuine async cloud provisioning (a fresh Atlas
 * cluster/Aura instance being created). It does NOT cover the import path, where
 * an existing cloud resource is linked and the create/update call returns success
 * immediately — but the connection-URL secret write and its propagation can still
 * lag behind that response by a few seconds. A user who clicks "connect" in that
 * window hits a live but confusing error ("has no connection URL... may still be
 * provisioning") even though nothing is actually stuck provisioning.
 *
 * This store closes that specific gap: mark a resource as settling right when its
 * create/update mutation succeeds, independent of what the response says about
 * provisioning, and treat it the same as "provisioning" in the UI for a short,
 * fixed window.
 */

const DEFAULT_SETTLE_MS = 8000;

interface ResourceSettlingState {
  settling: Record<string, number>;
  markSettling: (resourceType: string, tag: string, durationMs?: number) => void;
  isSettling: (resourceType: string, tag: string) => boolean;
}

function keyFor(resourceType: string, tag: string): string {
  return `${resourceType}:${tag}`;
}

export const useResourceSettlingStore = create<ResourceSettlingState>((set, get) => ({
  settling: {},
  markSettling: (resourceType, tag, durationMs = DEFAULT_SETTLE_MS) => {
    const key = keyFor(resourceType, tag);
    const expiresAt = Date.now() + durationMs;
    set((state) => ({ settling: { ...state.settling, [key]: expiresAt } }));
    setTimeout(() => {
      set((state) => {
        if (state.settling[key] !== expiresAt) return state;
        const next = { ...state.settling };
        delete next[key];
        return { settling: next };
      });
    }, durationMs);
  },
  isSettling: (resourceType, tag) => {
    const expiresAt = get().settling[keyFor(resourceType, tag)];
    return expiresAt !== undefined && expiresAt > Date.now();
  },
}));
