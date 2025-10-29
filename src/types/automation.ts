import { TabType } from './tab';

/**
 * Form field types that can be found in forms
 */
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'file'
  | 'password'
  | 'email'
  | 'url';

/**
 * Form field constraint information
 */
export interface FormFieldConstraint {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  allowedValues?: string[]; // For select/radio fields
  dependsOn?: string[]; // Fields this field depends on
}

/**
 * Structure of a form field
 */
export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  value?: any;
  placeholder?: string;
  description?: string;
  constraints: FormFieldConstraint;
  validation?: {
    isValid: boolean;
    errorMessage?: string;
  };
}

/**
 * Complete form structure
 */
export interface FormStructure {
  formId: string;
  formName: string;
  fields: FormField[];
  sections?: Array<{
    id: string;
    title: string;
    fields: string[]; // Field IDs in this section
  }>;
  submitButton?: {
    id: string;
    label: string;
  };
}

/**
 * Result of form inspection
 */
export interface FormInspectionResult {
  structure: FormStructure;
  metadata: {
    tabId: string;
    tabType: TabType;
    lastUpdated: Date;
  };
}

/**
 * Options for filling a form
 */
export interface FillFormOptions {
  validateBeforeSubmit?: boolean;
  waitForValidation?: boolean;
  submitAfterFill?: boolean;
  skipFields?: string[]; // Fields to skip
  customValues?: Record<string, any>; // Override values
}

/**
 * Result of form fill operation
 */
export interface FillFormResult {
  success: boolean;
  filledFields: string[];
  skippedFields: string[];
  errors: Array<{
    fieldId: string;
    error: string;
  }>;
  submitted?: boolean;
}

/**
 * Tab action types
 */
export type TabAction =
  | { type: 'open'; tabType: TabType; itemId?: string; data?: any }
  | { type: 'close'; tabId: string }
  | { type: 'switch'; tabId: string }
  | { type: 'update'; tabId: string; updates: Partial<any> };

/**
 * Tab information
 */
export interface TabInfo {
  id: string;
  type: TabType;
  title: string;
  itemId?: string;
  data?: any;
  isActive: boolean;
  isDirty: boolean;
  canAutomate: boolean; // Whether this tab supports automation
}

/**
 * Automation capabilities for a tab
 */
export interface TabCapabilities {
  canInspectForms: boolean;
  canFillForms: boolean;
  canTriggerActions: boolean;
  availableActions?: string[]; // List of action names available
  formIds?: string[]; // List of form IDs in this tab
}

/**
 * Automation context - current state of automation
 */
export interface AutomationContext {
  activeTab?: TabInfo;
  allTabs: TabInfo[];
  availableForms: FormStructure[];
  capabilities: Record<string, TabCapabilities>;
}

/**
 * Form state query types
 */
export type FormStateQuery =
  | 'get-filled-fields'
  | 'get-empty-fields'
  | 'get-required-empty-fields'
  | 'get-validation-errors'
  | 'get-field-options'
  | 'is-form-valid'
  | 'is-form-submittable'
  | 'get-field-dependencies';

/**
 * Form state information
 */
export interface FormStateInfo {
  formId: string;
  filledFields: string[];
  emptyFields: string[];
  requiredEmptyFields: string[];
  validationErrors: Array<{
    fieldId: string;
    error: string;
  }>;
  isValid: boolean;
  isSubmittable: boolean;
  fieldsWithOptions: Record<string, string[]>; // Field ID -> available options
  fieldDependencies: Record<string, string[]>; // Field ID -> fields it depends on
}

/**
 * Tab state query types
 */
export type TabStateQuery =
  | 'get-data'
  | 'get-loaded-state'
  | 'get-available-actions'
  | 'get-child-resources'
  | 'get-errors'
  | 'is-dirty'
  | 'can-save';

/**
 * Tab state information
 */
export interface TabStateInfo {
  tabId: string;
  tabType: TabType;
  data: any;
  isLoaded: boolean;
  isLoading: boolean;
  availableActions: string[];
  childResources?: Array<{
    type: string;
    id: string;
    name: string;
    count?: number;
  }>;
  errors: Array<{
    message: string;
    source?: string;
  }>;
  isDirty: boolean;
  canSave: boolean;
}

/**
 * Query result for agent decision-making
 */
export interface QueryResult {
  success: boolean;
  queryType: FormStateQuery | TabStateQuery;
  data: FormStateInfo | TabStateInfo | any;
  metadata?: {
    timestamp: Date;
    query: string; // Natural language query
    reasoning?: string; // Why this query was executed
  };
}

/**
 * Decision helper - provides suggestions based on current state
 */
export interface DecisionHelper {
  suggestedNextActions: Array<{
    action: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  missingInformation: string[];
  blockers: Array<{
    issue: string;
    fieldId?: string;
    suggestion: string;
  }>;
  warnings: Array<{
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
}
