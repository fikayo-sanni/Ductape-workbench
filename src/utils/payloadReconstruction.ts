/**
 * Utility functions for reconstructing JSON payloads from IParsedSample data
 * and user-provided inputs
 */

export interface IParsedSample {
  key?: string;
  parent_key?: string;
  level?: number;
  index?: number;
  parent_index?: number;
  type: string;
  sampleValue?: string | number | object | boolean;
  value?: any; // Alternative field name that might be used
  sample?: any; // Another alternative field name
  description?: string;
  required: boolean;
  unique?: boolean;
  maxLength: number;
  minLength: number;
  decorator?: string;
  decoratorPosition?: string;
  defaultValue?: string | number | boolean;
  default?: any; // Alternative field name
  defaultType?: string;
}

/**
 * Reconstructs a nested JSON structure from IParsedSample data
 *
 * @param parsedSamples - Array of IParsedSample items describing the structure
 * @param userInputs - User-provided values for simple (non-array/object) fields
 * @returns Reconstructed JSON object/array with user inputs merged in
 */
export function reconstructPayloadFromSample(
  parsedSamples: IParsedSample[] | undefined,
  userInputs: Record<string, any> = {}
): any {
  if (!parsedSamples || parsedSamples.length === 0) {
    return userInputs;
  }

  // Build a map of items by their index for quick lookup
  const itemsByIndex = new Map<number, IParsedSample>();
  parsedSamples.forEach((item, idx) => {
    const itemIndex = item.index !== undefined ? item.index : idx;
    itemsByIndex.set(itemIndex, item);
  });

  // Find root-level items (level 0 and no parent_key or empty parent_key)
  const rootItems = parsedSamples.filter(item =>
    (item.level === undefined || item.level === 0) &&
    (!item.parent_key || item.parent_key === '')
  );

  // If there's only one root item and it's an object, start with that
  const firstRootType = rootItems[0]?.type?.toLowerCase() || '';
  if (rootItems.length === 1 && (firstRootType === 'object' || firstRootType === 'json')) {
    const reconstructed = reconstructValue(rootItems[0], itemsByIndex, userInputs);

    // Merge user inputs at the root level
    if (typeof reconstructed === 'object' && !Array.isArray(reconstructed)) {
      return { ...reconstructed, ...userInputs };
    }
    return reconstructed;
  }

  // Multiple root items or different structure - build an object
  const result: any = { ...userInputs };

  rootItems.forEach(item => {
    if (item.key) {
      const value = reconstructValue(item, itemsByIndex, userInputs);

      // Only add if user didn't already provide a value, or if it's complex
      if (!(item.key in userInputs) || isComplexType(item.type)) {
        result[item.key] = value;
      }
    }
  });

  return result;
}

/**
 * Reconstructs a single value (which may be complex like array/object)
 */
function reconstructValue(
  item: IParsedSample,
  itemsByIndex: Map<number, IParsedSample>,
  userInputs: Record<string, any>
): any {
  const itemType = item.type?.toLowerCase() || 'string';

  // If user provided a value for this key and it's not a complex type, use it
  if (item.key && item.key in userInputs && !isComplexType(itemType)) {
    return userInputs[item.key];
  }

  // Handle array types
  if (itemType === 'array' || itemType.startsWith('array-')) {
    return reconstructArray(item, itemsByIndex, userInputs);
  }

  // Handle object types
  if (itemType === 'object' || itemType === 'json') {
    return reconstructObject(item, itemsByIndex, userInputs);
  }

  // Handle simple types - prioritize user input, then sample value, then default value
  if (item.key && item.key in userInputs) {
    const userValue = userInputs[item.key];
    // Only use user input if it's not an empty string (unless it's intentionally empty)
    if (userValue !== undefined && userValue !== null && userValue !== '') {
      return userValue;
    }
  }

  // Prefer sampleValue (contains example data) over defaultValue
  // Check multiple possible field names for sample values
  const sampleVal = item.sampleValue ?? (item as any).value ?? (item as any).sample;
  if (sampleVal !== undefined && sampleVal !== null) {
    // Convert sampleValue to the correct type
    return convertToType(sampleVal, itemType);
  }

  // Check multiple possible field names for default values
  const defaultVal = item.defaultValue ?? (item as any).default;
  if (defaultVal !== undefined && defaultVal !== null) {
    // Convert defaultValue to the correct type
    return convertToType(defaultVal, itemType);
  }

  // Return type-appropriate defaults
  return getDefaultForType(itemType);
}

/**
 * Reconstructs an array from parsed sample data
 */
function reconstructArray(
  parentItem: IParsedSample,
  itemsByIndex: Map<number, IParsedSample>,
  userInputs: Record<string, any>
): any[] {
  const parentKey = parentItem.key;
  const parentLevel = parentItem.level !== undefined ? parentItem.level : 0;

  // Find children of this array (match by parent_key, not parent_index)
  const children = Array.from(itemsByIndex.values()).filter(
    item =>
      item.parent_key === parentKey &&
      (item.level === parentLevel + 1)
  );

  // Sort children by index to maintain order
  children.sort((a, b) => (a.index || 0) - (b.index || 0));

  if (children.length === 0) {
    // Empty array or use sample value if available
    const sampleVal = parentItem.sampleValue ?? (parentItem as any).value ?? (parentItem as any).sample;
    if (Array.isArray(sampleVal)) {
      return sampleVal;
    }
    return [];
  }

  // Reconstruct each child
  return children.map(child => reconstructValue(child, itemsByIndex, userInputs));
}

/**
 * Reconstructs an object from parsed sample data
 */
function reconstructObject(
  parentItem: IParsedSample,
  itemsByIndex: Map<number, IParsedSample>,
  userInputs: Record<string, any>
): Record<string, any> {
  const parentKey = parentItem.key;
  const parentLevel = parentItem.level !== undefined ? parentItem.level : 0;

  // Find children of this object (match by parent_key, not parent_index)
  const children = Array.from(itemsByIndex.values()).filter(
    item =>
      item.parent_key === parentKey &&
      (item.level === parentLevel + 1)
  );

  if (children.length === 0) {
    // Empty object or use sample value if available
    const sampleVal = parentItem.sampleValue ?? (parentItem as any).value ?? (parentItem as any).sample;

    // If sampleValue is a JSON string, parse it
    if (typeof sampleVal === 'string') {
      try {
        const parsed = JSON.parse(sampleVal);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        // If parsing fails, return empty object
      }
    }

    if (typeof sampleVal === 'object' && !Array.isArray(sampleVal)) {
      return sampleVal as Record<string, any>;
    }
    return {};
  }

  const result: Record<string, any> = {};

  children.forEach(child => {
    if (child.key) {
      result[child.key] = reconstructValue(child, itemsByIndex, userInputs);
    }
  });

  return result;
}

/**
 * Checks if a type is complex (array or object)
 */
function isComplexType(type: string): boolean {
  const lowerType = type?.toLowerCase() || '';
  return (
    lowerType === 'array' ||
    lowerType.startsWith('array-') ||
    lowerType === 'object' ||
    lowerType === 'json'
  );
}

/**
 * Converts a value to the specified type
 */
function convertToType(value: any, type: string): any {
  const lowerType = type?.toLowerCase() || 'string';

  // If value is already the correct type, return it
  if (lowerType === 'number' || lowerType === 'integer' || lowerType === 'float' || lowerType === 'double') {
    if (typeof value === 'number') return value;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  if (lowerType === 'boolean' || lowerType === 'bool') {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
  }

  // For string types, just return the value as-is
  return value;
}

/**
 * Returns a default value for a given type
 */
function getDefaultForType(type: string): any {
  const lowerType = type?.toLowerCase() || 'string';

  if (lowerType === 'number' || lowerType === 'integer' || lowerType === 'float' || lowerType === 'double') {
    return 0;
  }

  if (lowerType === 'boolean' || lowerType === 'bool') {
    return false;
  }

  if (lowerType === 'array' || lowerType.startsWith('array-')) {
    return [];
  }

  if (lowerType === 'object' || lowerType === 'json') {
    return {};
  }

  return '';
}

/**
 * Reconstructs payloads for each category (body, params, query, headers)
 * Used specifically for action inputs where each category may have its own sample data
 *
 * @param actionData - Action data containing params, body, query, headers with sample data
 * @param userInputsByCategory - User inputs organized by category (e.g., { body: {...}, params: {...} })
 * @returns Reconstructed payload with all categories merged
 */
export function reconstructActionPayload(
  actionData: {
    params?: { data?: IParsedSample[]; sample?: any };
    body?: { data?: IParsedSample[]; sample?: any };
    query?: { data?: IParsedSample[]; sample?: any };
    headers?: { data?: IParsedSample[]; sample?: any };
  },
  userInputsByCategory: {
    params?: Record<string, any>;
    body?: Record<string, any>;
    query?: Record<string, any>;
    headers?: Record<string, any>;
  }
): {
  params?: any;
  body?: any;
  query?: any;
  headers?: any;
} {
  const result: any = {};

  // Process each category
  (['params', 'body', 'query', 'headers'] as const).forEach(category => {
    const categoryData = actionData[category];
    const userInputs = userInputsByCategory[category] || {};

    if (!categoryData) {
      // No sample data, just use user inputs if any
      if (Object.keys(userInputs).length > 0) {
        result[category] = userInputs;
      }
      return;
    }

    // Reconstruct using sample data
    const parsedSamples = Array.isArray(categoryData.data)
      ? categoryData.data
      : categoryData.data
        ? [categoryData.data]
        : undefined;

    if (parsedSamples && parsedSamples.length > 0) {
      result[category] = reconstructPayloadFromSample(parsedSamples, userInputs);
    } else if (Object.keys(userInputs).length > 0) {
      // No parsed samples, just use user inputs
      result[category] = userInputs;
    }
  });

  return result;
}
