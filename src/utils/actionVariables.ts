/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ActionVariable {
  key?: string;
  name?: string;
  type?: string;
  category: string;
  source: string;
  required?: boolean;
  default?: unknown;
  [key: string]: unknown;
}

export interface ExplorerActionParameter {
  name: string;
  path: string;
  defaultValue: unknown;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
}

/** Extract mappable input fields from an action or database action definition. */
export function extractActionVariables(action: any): ActionVariable[] {
  if (!action) return [];

  const variables: ActionVariable[] = [];

  if (Array.isArray(action.parameters)) {
    action.parameters.forEach((parameter: any) => {
      variables.push({
        ...parameter,
        key: parameter.name ?? parameter.key,
        name: parameter.name ?? parameter.key,
        category: 'parameters',
        source: 'parameters',
      });
    });
  }

  const pushFromArray = (items: any[], category: string) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      variables.push({ ...item, category, source: category });
    });
  };

  if (action.params?.data && Array.isArray(action.params.data)) {
    pushFromArray(action.params.data, 'params');
  } else if (Array.isArray(action.params)) {
    pushFromArray(action.params, 'params');
  }

  if (action.query?.data && Array.isArray(action.query.data)) {
    pushFromArray(action.query.data, 'query');
  } else if (Array.isArray(action.query)) {
    pushFromArray(action.query, 'query');
  }

  if (action.headers?.data && Array.isArray(action.headers.data)) {
    pushFromArray(action.headers.data, 'headers');
  } else if (Array.isArray(action.headers)) {
    pushFromArray(action.headers, 'headers');
  }

  if (action.body?.data && Array.isArray(action.body.data)) {
    pushFromArray(action.body.data, 'body');
  } else if (Array.isArray(action.body)) {
    pushFromArray(action.body, 'body');
  }

  if (action.data && Array.isArray(action.data)) {
    action.data.forEach((dataItem: any) => {
      variables.push({
        ...dataItem,
        key: dataItem.key,
        name: dataItem.key,
        category: 'data',
        source: 'data',
      });
    });
  }

  if (action.filterData && Array.isArray(action.filterData)) {
    action.filterData.forEach((filterItem: any) => {
      variables.push({
        ...filterItem,
        key: filterItem.key,
        name: filterItem.key,
        category: 'filterData',
        source: 'filterData',
      });
    });
  }

  return variables;
}

const normalizeParameterType = (
  declaredType: unknown,
  value: unknown,
): ExplorerActionParameter['type'] => {
  const type = String(declaredType ?? '').toLowerCase();
  if (type.includes('bool')) return 'boolean';
  if (/number|integer|int|float|double|decimal/.test(type)) return 'number';
  if (type.includes('array') || Array.isArray(value)) return 'array';
  if (type.includes('object') || (value !== null && typeof value === 'object')) return 'object';
  return 'string';
};

/** Normalize canonical action parameters and recover placeholders for older actions. */
export function getExplorerActionParameters(action: any, template?: any): ExplorerActionParameter[] {
  const parameters = new Map<string, ExplorerActionParameter>();

  extractActionVariables(action)
    .filter((variable) => variable.source === 'parameters')
    .forEach((variable) => {
      const name = String(variable.name ?? variable.key ?? '').trim();
      if (!name || parameters.has(name)) return;
      const defaultValue = variable.defaultValue
        ?? variable.default
        ?? variable.sampleValue
        ?? variable.value
        ?? variable.sample
        ?? '';
      parameters.set(name, {
        name,
        path: String(variable.path ?? name),
        defaultValue,
        type: normalizeParameterType(variable.type, defaultValue),
        description: typeof variable.description === 'string' ? variable.description : undefined,
        required: typeof variable.required === 'boolean' ? variable.required : undefined,
      });
    });

  const visit = (value: any, path = '') => {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/{{\s*([^{}]+?)\s*}}/g)) {
        const name = match[1].trim();
        if (!name || parameters.has(name)) continue;
        parameters.set(name, {
          name,
          path: path || name,
          defaultValue: '',
          type: 'string',
        });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => visit(item, path ? `${path}.${key}` : key));
    }
  };

  visit(template);
  return Array.from(parameters.values());
}

export function filterActionsBySearch(actions: any[], searchTerm: string): any[] {
  if (!searchTerm.trim()) return actions;
  const q = searchTerm.toLowerCase();
  return actions.filter(
    (action) =>
      action.name?.toLowerCase().includes(q) ||
      action.tag?.toLowerCase().includes(q) ||
      action.method?.toLowerCase().includes(q),
  );
}
