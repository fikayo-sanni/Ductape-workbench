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

/** Extract mappable input fields from an action or database action definition. */
export function extractActionVariables(action: any): ActionVariable[] {
  if (!action) return [];

  const variables: ActionVariable[] = [];

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
