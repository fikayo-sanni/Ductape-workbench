/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback } from 'react';
import { saveTabState, getTabState } from '@/lib/tab-state-manager';
import { useWorkbenchStore } from '@/stores/workbench-store';

/**
 * Custom hook for managing tab state persistence
 *
 * @param tabId - The unique ID of the tab
 * @param type - The type of tab (app, product, request-builder, etc.)
 * @param title - The title of the tab
 * @param data - The main data for the tab
 * @param formState - Optional form state to persist
 * @param itemId - Optional item ID (appId, productId, etc.)
 */
export function useTabState<TData = any, TFormState = any>(
  tabId: string,
  type: string,
  title: string,
  data: TData,
  formState?: TFormState,
  itemId?: string
) {
  const activeTabId = useWorkbenchStore(state => state.activeTabId);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollPositionRef = useRef<number>(0);

  /**
   * Save current state to localStorage
   */
  const saveState = useCallback(() => {
    saveTabState(
      tabId,
      type,
      title,
      data,
      formState,
      itemId,
      scrollPositionRef.current
    );
  }, [tabId, type, title, data, formState, itemId]);

  /**
   * Debounced save function
   */
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveState();
    }, 1000); // Save after 1 second of inactivity
  }, [saveState]);

  /**
   * Load saved state from localStorage
   */
  const loadSavedState = useCallback(() => {
    return getTabState(tabId);
  }, [tabId]);

  /**
   * Track scroll position
   */
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    scrollPositionRef.current = target.scrollTop;
    debouncedSave();
  }, [debouncedSave]);

  // Save state whenever data or formState changes
  useEffect(() => {
    debouncedSave();
  }, [data, formState, debouncedSave]);

  // Save state when tab becomes inactive
  useEffect(() => {
    if (activeTabId !== tabId) {
      // Tab is no longer active, save immediately
      saveState();
    }
  }, [activeTabId, tabId, saveState]);

  // Save state before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveState();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Final save on unmount
      saveState();
    };
  }, [saveState]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    /**
     * Load saved state for this tab
     */
    loadSavedState,

    /**
     * Manually save state (useful for form submissions)
     */
    saveState,

    /**
     * Attach to scrollable container to track scroll position
     */
    handleScroll,
  };
}
