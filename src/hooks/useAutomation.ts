import { useCallback, useMemo } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { automationService } from '@/services/automationService';
import { TabType } from '@/types/tab';
import {
  FillFormOptions,
  FillFormResult,
  FormInspectionResult,
  FormStateQuery,
  TabStateQuery,
  QueryResult,
  DecisionHelper,
} from '@/types/automation';

/**
 * React hook for automation service
 * Provides easy access to automation capabilities
 */
export function useAutomation() {
  const { tabs, activeTabId } = useWorkbenchStore();

  /**
   * Get current automation context
   */
  const context = useMemo(() => automationService.getContext(), [tabs, activeTabId]);

  /**
   * Open a new tab
   */
  const openTab = useCallback(
    (
      tabType: TabType,
      options?: { itemId?: string; title?: string; data?: any }
    ) => {
      return automationService.openTab(tabType, options);
    },
    []
  );

  /**
   * Close a tab
   */
  const closeTab = useCallback((tabId: string) => {
    return automationService.closeTab(tabId);
  }, []);

  /**
   * Switch to a different tab
   */
  const switchTab = useCallback((tabId: string) => {
    return automationService.switchTab(tabId);
  }, []);

  /**
   * Inspect form structure
   */
  const inspectForm = useCallback(
    async (tabId: string, formId?: string): Promise<FormInspectionResult | null> => {
      return automationService.inspectForm(tabId, formId);
    },
    []
  );

  /**
   * Fill a form with values
   */
  const fillForm = useCallback(
    async (
      tabId: string,
      formId: string,
      values: Record<string, any>,
      options?: FillFormOptions
    ): Promise<FillFormResult> => {
      return automationService.fillForm(tabId, formId, values, options);
    },
    []
  );

  /**
   * Get tab capabilities
   */
  const getTabCapabilities = useCallback((tabId: string) => {
    return automationService.getTabCapabilities(tabId);
  }, []);

  /**
   * Get all tabs
   */
  const getTabs = useCallback(() => {
    return automationService.getTabs();
  }, [tabs]);

  /**
   * Get active tab
   */
  const getActiveTab = useCallback(() => {
    return automationService.getActiveTab();
  }, [activeTabId]);

  /**
   * Query form state
   */
  const queryFormState = useCallback(
    async (
      tabId: string,
      formId: string,
      query: FormStateQuery | string,
      naturalLanguageQuery?: string
    ): Promise<QueryResult> => {
      return automationService.queryFormState(tabId, formId, query, naturalLanguageQuery);
    },
    []
  );

  /**
   * Query tab state
   */
  const queryTabState = useCallback(
    async (
      tabId: string,
      query: TabStateQuery | string,
      naturalLanguageQuery?: string
    ): Promise<QueryResult> => {
      return automationService.queryTabState(tabId, query, naturalLanguageQuery);
    },
    []
  );

  /**
   * Get decision helper
   */
  const getDecisionHelper = useCallback(
    async (tabId: string, formId?: string): Promise<DecisionHelper> => {
      return automationService.getDecisionHelper(tabId, formId);
    },
    []
  );

  return {
    context,
    openTab,
    closeTab,
    switchTab,
    inspectForm,
    fillForm,
    getTabCapabilities,
    getTabs,
    getActiveTab,
    queryFormState,
    queryTabState,
    getDecisionHelper,
  };
}
