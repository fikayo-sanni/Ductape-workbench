import { useWorkbenchStore } from '@/stores/workbench-store';
import { Tab, TabType } from '@/types/tab';
import {
  FormStructure,
  FormInspectionResult,
  FillFormOptions,
  FillFormResult,
  TabInfo,
  TabCapabilities,
  AutomationContext,
  FormStateQuery,
  FormStateInfo,
  TabStateQuery,
  TabStateInfo,
  QueryResult,
  DecisionHelper,
} from '@/types/automation';

/**
 * Core Automation Service
 * Provides unified interface for AI agent to interact with workbench
 */
export class AutomationService {
  private store = useWorkbenchStore.getState();

  /**
   * Get information about all open tabs
   */
  getTabs(): TabInfo[] {
    const { tabs, activeTabId } = this.store;
    return tabs.map((tab) => ({
      id: tab.id,
      type: tab.type,
      title: tab.title,
      itemId: tab.itemId,
      data: tab.data,
      isActive: tab.id === activeTabId,
      isDirty: tab.isDirty || false,
      canAutomate: this.canTabBeAutomated(tab.type),
    }));
  }

  /**
   * Get information about the currently active tab
   */
  getActiveTab(): TabInfo | null {
    const { tabs, activeTabId } = this.store;
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return null;

    return {
      id: activeTab.id,
      type: activeTab.type,
      title: activeTab.title,
      itemId: activeTab.itemId,
      data: activeTab.data,
      isActive: true,
      isDirty: activeTab.isDirty || false,
      canAutomate: this.canTabBeAutomated(activeTab.type),
    };
  }

  /**
   * Open a new tab
   */
  openTab(tabType: TabType, options?: { itemId?: string; title?: string; data?: any }): TabInfo {
    const tab: Tab = {
      id: `${tabType}-${Date.now()}`,
      type: tabType,
      title: options?.title || this.getDefaultTabTitle(tabType),
      itemId: options?.itemId,
      data: options?.data,
    };

    this.store.openTab(tab);

    return {
      id: tab.id,
      type: tab.type,
      title: tab.title,
      itemId: tab.itemId,
      data: tab.data,
      isActive: true,
      isDirty: false,
      canAutomate: this.canTabBeAutomated(tabType),
    };
  }

  /**
   * Close a tab
   */
  closeTab(tabId: string): boolean {
    try {
      this.store.closeTab(tabId);
      return true;
    } catch (error) {
      console.error('Error closing tab:', error);
      return false;
    }
  }

  /**
   * Switch to a different tab
   */
  switchTab(tabId: string): boolean {
    try {
      this.store.setActiveTab(tabId);
      return true;
    } catch (error) {
      console.error('Error switching tab:', error);
      return false;
    }
  }

  /**
   * Update tab data
   */
  updateTab(tabId: string, updates: Partial<Tab>): boolean {
    try {
      this.store.updateTab(tabId, updates);
      return true;
    } catch (error) {
      console.error('Error updating tab:', error);
      return false;
    }
  }

  /**
   * Inspect form structure in a tab
   * This scans the DOM/React tree to identify form fields
   */
  async inspectForm(tabId: string, formId?: string): Promise<FormInspectionResult | null> {
    const tab = this.store.tabs.find((t) => t.id === tabId);
    if (!tab) {
      throw new Error(`Tab ${tabId} not found`);
    }

    try {
      const structure = await this.extractFormStructure(tabId, formId);
      if (!structure) return null;

      return {
        structure,
        metadata: {
          tabId,
          tabType: tab.type,
          lastUpdated: new Date(),
        },
      };
    } catch (error) {
      console.error('Error inspecting form:', error);
      throw error;
    }
  }

  /**
   * Fill a form with provided values
   */
  async fillForm(
    tabId: string,
    formId: string,
    values: Record<string, any>,
    options?: FillFormOptions
  ): Promise<FillFormResult> {
    const result: FillFormResult = {
      success: false,
      filledFields: [],
      skippedFields: [],
      errors: [],
    };

    try {
      // First, inspect the form to get its structure
      const inspection = await this.inspectForm(tabId, formId);
      if (!inspection) {
        result.errors.push({
          fieldId: 'form',
          error: 'Form not found or cannot be inspected',
        });
        return result;
      }

      const { structure } = inspection;
      const skipFields = options?.skipFields || [];
      const customValues = options?.customValues || {};

      // Fill each field
      for (const field of structure.fields) {
        if (skipFields.includes(field.id)) {
          result.skippedFields.push(field.id);
          continue;
        }

        // Use custom value if provided, otherwise use the value from values
        const valueToSet = customValues[field.id] ?? values[field.id];

        if (valueToSet !== undefined) {
          try {
            await this.setFormFieldValue(tabId, formId, field.id, valueToSet);
            result.filledFields.push(field.id);

            // Wait for validation if requested
            if (options?.waitForValidation) {
              await this.waitForValidation(tabId, formId, field.id);
            }
          } catch (error: any) {
            result.errors.push({
              fieldId: field.id,
              error: error.message || 'Failed to set field value',
            });
          }
        }
      }

      // Validate if requested
      if (options?.validateBeforeSubmit) {
        const validationErrors = await this.validateForm(tabId, formId);
        result.errors.push(...validationErrors);
      }

      // Submit if requested and no errors
      if (options?.submitAfterFill && result.errors.length === 0) {
        result.submitted = await this.submitForm(tabId, formId);
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error: any) {
      result.errors.push({
        fieldId: 'form',
        error: error.message || 'Unknown error filling form',
      });
      return result;
    }
  }

  /**
   * Get capabilities of a specific tab
   */
  getTabCapabilities(tabId: string): TabCapabilities {
    const tab = this.store.tabs.find((t) => t.id === tabId);
    if (!tab) {
      return {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      };
    }

    // Define capabilities based on tab type
    const capabilities: Record<TabType, TabCapabilities> = {
      product: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        availableActions: ['createApp', 'createEnvironment', 'addComponent'],
        formIds: ['product-form', 'environment-form', 'app-form'],
      },
      app: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        availableActions: ['createAction', 'updateConfig'],
        formIds: ['app-form', 'action-form'],
      },
      request: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        availableActions: ['sendRequest', 'saveRequest'],
        formIds: ['request-form'],
      },
      feature: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        availableActions: ['addComponent', 'configureMapping'],
        formIds: ['feature-form', 'component-form'],
      },
      notification: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        availableActions: ['configureChannel'],
        formIds: ['notification-form'],
      },
      notifier: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        availableActions: ['configureNotifier'],
        formIds: ['notifier-form'],
      },
      // Default capabilities for other tab types
      storage: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      session: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      'session-activity': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      cache: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      healthcheck: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      database: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      graph: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      vector: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      'message-broker': {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      message: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      'new-message': {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      'new-topic': {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      fallback: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      quota: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      job: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      webhook: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      'webhook-explorer': {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      auth: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      logs: {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      dashboard: {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      tokens: {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      teams: {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      marketplace: {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      partnership: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      brief: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      cloud: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        availableActions: ['createCloudConnection'],
        formIds: ['cloud-connection-form'],
      },
      settings: {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      'session-dashboard': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      'cache-values': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      'message-broker-events': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      pricing: {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      'session-user': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      'healthcheck-explorer': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      workflow: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        availableActions: ['runWorkflow', 'configureWorkflow'],
        formIds: ['workflow-form'],
      },
      'workflow-run': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      agent: {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        availableActions: ['runAgent', 'configureAgent'],
        formIds: ['agent-form'],
      },
      'agent-run': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      'notification-explorer': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      'new-notification': {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        formIds: ['new-notification-form'],
      },
      'notification-template': {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: false,
      },
      'fallback-explorer': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      'new-fallback': {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        formIds: ['new-fallback-form'],
      },
      'quota-explorer': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      'new-quota': {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        formIds: ['new-quota-form'],
      },
      'job-explorer': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      'job-run': {
        canInspectForms: false,
        canFillForms: false,
        canTriggerActions: false,
      },
      'new-healthcheck': {
        canInspectForms: true,
        canFillForms: true,
        canTriggerActions: true,
        formIds: ['new-healthcheck-form'],
      },
    };

    return capabilities[tab.type] || {
      canInspectForms: false,
      canFillForms: false,
      canTriggerActions: false,
    };
  }

  /**
   * Query form state - allows agent to ask questions about form status
   */
  async queryFormState(
    tabId: string,
    formId: string,
    query: FormStateQuery | string,
    naturalLanguageQuery?: string
  ): Promise<QueryResult> {
    try {
      // First inspect the form to get current structure
      const inspection = await this.inspectForm(tabId, formId);
      if (!inspection) {
        return {
          success: false,
          queryType: query as FormStateQuery,
          data: null,
          metadata: {
            timestamp: new Date(),
            query: naturalLanguageQuery || query,
            reasoning: 'Form could not be inspected',
          },
        };
      }

      // Get current form state
      const formState = await this.getFormState(tabId, formId, inspection.structure);

      // Answer the specific query
      let queryResult: any = null;

      switch (query) {
        case 'get-filled-fields':
          queryResult = { filledFields: formState.filledFields };
          break;
        case 'get-empty-fields':
          queryResult = { emptyFields: formState.emptyFields };
          break;
        case 'get-required-empty-fields':
          queryResult = { requiredEmptyFields: formState.requiredEmptyFields };
          break;
        case 'get-validation-errors':
          queryResult = { validationErrors: formState.validationErrors };
          break;
        case 'get-field-options':
          queryResult = { fieldOptions: formState.fieldsWithOptions };
          break;
        case 'is-form-valid':
          queryResult = { isValid: formState.isValid };
          break;
        case 'is-form-submittable':
          queryResult = { isSubmittable: formState.isSubmittable };
          break;
        case 'get-field-dependencies':
          queryResult = { dependencies: formState.fieldDependencies };
          break;
        default:
          // Return full form state for complex queries
          queryResult = formState;
      }

      return {
        success: true,
        queryType: query as FormStateQuery,
        data: queryResult,
        metadata: {
          timestamp: new Date(),
          query: naturalLanguageQuery || query,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        queryType: query as FormStateQuery,
        data: null,
        metadata: {
          timestamp: new Date(),
          query: naturalLanguageQuery || query,
          reasoning: error.message,
        },
      };
    }
  }

  /**
   * Query tab state - allows agent to ask questions about tab status
   */
  async queryTabState(
    tabId: string,
    query: TabStateQuery | string,
    naturalLanguageQuery?: string
  ): Promise<QueryResult> {
    try {
      const tab = this.store.tabs.find((t) => t.id === tabId);
      if (!tab) {
        return {
          success: false,
          queryType: query as TabStateQuery,
          data: null,
          metadata: {
            timestamp: new Date(),
            query: naturalLanguageQuery || query,
            reasoning: 'Tab not found',
          },
        };
      }

      // Get current tab state
      const tabState = await this.getTabState(tabId, tab);

      // Answer the specific query
      let queryResult: any = null;

      switch (query) {
        case 'get-data':
          queryResult = { data: tabState.data };
          break;
        case 'get-loaded-state':
          queryResult = {
            isLoaded: tabState.isLoaded,
            isLoading: tabState.isLoading,
          };
          break;
        case 'get-available-actions':
          queryResult = { availableActions: tabState.availableActions };
          break;
        case 'get-child-resources':
          queryResult = { childResources: tabState.childResources };
          break;
        case 'get-errors':
          queryResult = { errors: tabState.errors };
          break;
        case 'is-dirty':
          queryResult = { isDirty: tabState.isDirty };
          break;
        case 'can-save':
          queryResult = { canSave: tabState.canSave };
          break;
        default:
          // Return full tab state for complex queries
          queryResult = tabState;
      }

      return {
        success: true,
        queryType: query as TabStateQuery,
        data: queryResult,
        metadata: {
          timestamp: new Date(),
          query: naturalLanguageQuery || query,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        queryType: query as TabStateQuery,
        data: null,
        metadata: {
          timestamp: new Date(),
          query: naturalLanguageQuery || query,
          reasoning: error.message,
        },
      };
    }
  }

  /**
   * Get decision helper - provides AI agent with suggestions on what to do next
   */
  async getDecisionHelper(tabId: string, formId?: string): Promise<DecisionHelper> {
    const helper: DecisionHelper = {
      suggestedNextActions: [],
      missingInformation: [],
      blockers: [],
      warnings: [],
    };

    try {
      // If form ID provided, analyze form state
      if (formId) {
        const formState = await this.queryFormState(tabId, formId, 'get-required-empty-fields');
        const formData = formState.data as { requiredEmptyFields: string[] };

        if (formData?.requiredEmptyFields?.length > 0) {
          helper.missingInformation.push(
            `Required fields: ${formData.requiredEmptyFields.join(', ')}`
          );
          helper.suggestedNextActions.push({
            action: 'fill-required-fields',
            reason: `Fill ${formData.requiredEmptyFields.length} required field(s)`,
            priority: 'high',
          });
        }

        // Check validation errors
        const validationQuery = await this.queryFormState(tabId, formId, 'get-validation-errors');
        const validationData = validationQuery.data as { validationErrors: Array<{ fieldId: string; error: string }> };

        if (validationData?.validationErrors?.length > 0) {
          validationData.validationErrors.forEach((error) => {
            helper.blockers.push({
              issue: error.error,
              fieldId: error.fieldId,
              suggestion: `Fix validation error in field: ${error.fieldId}`,
            });
          });
        }

        // Check if form is submittable
        const submittableQuery = await this.queryFormState(tabId, formId, 'is-form-submittable');
        const submittableData = submittableQuery.data as { isSubmittable: boolean };

        if (submittableData?.isSubmittable) {
          helper.suggestedNextActions.push({
            action: 'submit-form',
            reason: 'Form is complete and ready to submit',
            priority: 'medium',
          });
        }
      }

      // Analyze tab state
      const tabState = await this.queryTabState(tabId, 'get-available-actions');
      const tabData = tabState.data as { availableActions: string[] };

      if (tabData?.availableActions?.length > 0) {
        tabData.availableActions.forEach((action) => {
          helper.suggestedNextActions.push({
            action: `execute-${action}`,
            reason: `Action "${action}" is available in this tab`,
            priority: 'low',
          });
        });
      }

      // Check for errors in tab
      const errorsQuery = await this.queryTabState(tabId, 'get-errors');
      const errorsData = errorsQuery.data as { errors: Array<{ message: string }> };

      if (errorsData?.errors?.length > 0) {
        errorsData.errors.forEach((error) => {
          helper.warnings.push({
            message: error.message,
            severity: 'error',
          });
        });
      }

      return helper;
    } catch (error: any) {
      helper.warnings.push({
        message: `Error analyzing state: ${error.message}`,
        severity: 'error',
      });
      return helper;
    }
  }

  /**
   * Get current automation context
   */
  getContext(): AutomationContext {
    const tabs = this.getTabs();
    const activeTab = this.getActiveTab();
    const availableForms: FormStructure[] = [];

    // Collect all forms from tabs that support form inspection
    tabs.forEach((tab) => {
      if (tab.canAutomate) {
        const capabilities = this.getTabCapabilities(tab.id);
        if (capabilities.formIds) {
          // Would need to actually inspect forms here
          // For now, we'll leave this as a placeholder
        }
      }
    });

    const capabilities: Record<string, TabCapabilities> = {};
    tabs.forEach((tab) => {
      capabilities[tab.id] = this.getTabCapabilities(tab.id);
    });

    return {
      activeTab: activeTab || undefined,
      allTabs: tabs,
      availableForms,
      capabilities,
    };
  }

  // Private helper methods

  private canTabBeAutomated(tabType: TabType): boolean {
    const nonAutomatedTabs: TabType[] = ['logs', 'dashboard', 'tokens', 'teams', 'marketplace', 'settings'];
    return !nonAutomatedTabs.includes(tabType);
  }

  private getDefaultTabTitle(tabType: TabType): string {
    const titles: Record<TabType, string> = {
      product: 'Product',
      app: 'App',
      request: 'Request',
      feature: 'Feature',
      storage: 'Storage',
      session: 'Session',
      'session-activity': 'Session Activity',
      cache: 'Cache',
      healthcheck: 'Health Check',
      database: 'Database',
      graph: 'Graph',
      vector: 'Vector',
      'message-broker': 'Messaging',
      notification: 'Notification',
      notifier: 'Notification',
      message: 'Message',
      'new-message': 'New Message',
      'new-topic': 'New Topic',
      fallback: 'Fallback',
      quota: 'Quota',
      job: 'Job',
      webhook: 'Webhook',
      'webhook-explorer': 'Webhook Explorer',
      auth: 'Auth',
      logs: 'Logs',
      dashboard: 'Dashboard',
      tokens: 'Tokens',
      teams: 'Teams',
      marketplace: 'Marketplace',
      partnership: 'Partnership',
      brief: 'Brief',
      cloud: 'Cloud',
      settings: 'Settings',
      'session-dashboard': 'Session Dashboard',
      'cache-values': 'Cache Values',
      'message-broker-events': 'Messaging Events',
      pricing: 'Pricing',
      'session-user': 'Session User',
      'healthcheck-explorer': 'Health Check Explorer',
      workflow: 'Workflow',
      'workflow-run': 'Workflow Run',
      agent: 'Agent',
      'agent-run': 'Agent Run',
      'notification-explorer': 'Notification Explorer',
      'new-notification': 'New Notification',
      'notification-template': 'Notification Template',
      'fallback-explorer': 'Fallback Explorer',
      'new-fallback': 'New Fallback',
      'quota-explorer': 'Quota Explorer',
      'new-quota': 'New Quota',
      'job-explorer': 'Job Explorer',
      'job-run': 'Job run',
      'new-healthcheck': 'New Health Check',
    };
    return titles[tabType] || tabType;
  }

  /**
   * Extract form structure from DOM/React tree
   * This is a placeholder that should be implemented with actual DOM inspection
   */
  private async extractFormStructure(
    _tabId: string,
    _formId?: string
  ): Promise<FormStructure | null> {
    // TODO: Implement actual form extraction
    // This would need to:
    // 1. Find the form element in the DOM
    // 2. Scan for input fields, selects, textareas, etc.
    // 3. Extract field metadata (labels, types, constraints, etc.)
    // 4. Return structured form information

    // Placeholder implementation
    return null;
  }

  /**
   * Set a form field value
   * This should interact with React state or DOM elements
   */
  private async setFormFieldValue(
    _tabId: string,
    _formId: string,
    _fieldId: string,
    _value: any
  ): Promise<void> {
    // TODO: Implement actual field value setting
    // This could:
    // 1. Dispatch React events
    // 2. Update React state via refs
    // 3. Use DOM manipulation as fallback
  }

  /**
   * Wait for field validation to complete
   */
  private async waitForValidation(
    _tabId: string,
    _formId: string,
    _fieldId: string
  ): Promise<void> {
    // TODO: Implement validation wait logic
    // Wait for React validation to run and complete
  }

  /**
   * Validate entire form
   */
  private async validateForm(
    _tabId: string,
    _formId: string
  ): Promise<Array<{ fieldId: string; error: string }>> {
    // TODO: Implement form validation
    // Return array of validation errors
    return [];
  }

  /**
   * Submit a form
   */
  private async submitForm(_tabId: string, _formId: string): Promise<boolean> {
    // TODO: Implement form submission
    // Trigger form submit button click or handle submit event
    return false;
  }

  /**
   * Get current form state
   */
  private async getFormState(
    _tabId: string,
    formId: string,
    structure: FormStructure
  ): Promise<FormStateInfo> {
    // TODO: Implement actual form state extraction
    // This should:
    // 1. Read current values from form fields
    // 2. Check validation status
    // 3. Determine which fields are filled/empty
    // 4. Check field dependencies
    // 5. Get available options for select fields

    // Placeholder implementation
    const formState: FormStateInfo = {
      formId,
      filledFields: [],
      emptyFields: structure.fields.map((f) => f.id),
      requiredEmptyFields: structure.fields
        .filter((f) => f.constraints.required && !f.value)
        .map((f) => f.id),
      validationErrors: [],
      isValid: true,
      isSubmittable: false,
      fieldsWithOptions: {},
      fieldDependencies: {},
    };

    // Extract field options and dependencies from structure
    structure.fields.forEach((field) => {
      if (field.constraints.allowedValues) {
        formState.fieldsWithOptions[field.id] = field.constraints.allowedValues;
      }
      if (field.constraints.dependsOn) {
        formState.fieldDependencies[field.id] = field.constraints.dependsOn;
      }
    });

    return formState;
  }

  /**
   * Get current tab state
   */
  private async getTabState(tabId: string, tab: Tab): Promise<TabStateInfo> {
    // TODO: Implement actual tab state extraction
    // This should:
    // 1. Check if tab data is loaded
    // 2. Get available actions based on tab type
    // 3. Extract child resources (e.g., apps in product, actions in app)
    // 4. Check for errors
    // 5. Determine if tab is dirty and can be saved

    const capabilities = this.getTabCapabilities(tabId);

    const tabState: TabStateInfo = {
      tabId,
      tabType: tab.type,
      data: tab.data || null,
      isLoaded: !!tab.data,
      isLoading: false,
      availableActions: capabilities.availableActions || [],
      childResources: [],
      errors: [],
      isDirty: tab.isDirty || false,
      canSave: tab.isDirty || false,
    };

    // Extract child resources based on tab type
    if (tab.data) {
      switch (tab.type) {
        case 'product':
          if (tab.data.apps) {
            tabState.childResources = tab.data.apps.map((app: any) => ({
              type: 'app',
              id: app._id,
              name: app.name || app.tag,
            }));
          }
          break;
        case 'app':
          if (tab.data.actions) {
            tabState.childResources = tab.data.actions.map((action: any) => ({
              type: 'action',
              id: action._id,
              name: action.name || action.tag,
            }));
          }
          break;
      }
    }

    return tabState;
  }
}

// Export singleton instance
export const automationService = new AutomationService();
