import type { MappingSource } from './types';

export interface AssetFieldOption {
  key: string;
  mapKey: string;
  category?: string;
  type?: string;
  required?: boolean;
}

export interface MappingValueOption {
  id: string;
  group: string;
  label: string;
  value: string;
}

export const MAPPING_LITERAL_ID = '__literal__';
export const MAPPING_CUSTOM_TARGET_ID = '__custom_target__';

export function toMapKey(
  field: { key: string; category?: string },
  showCategoryPrefix: boolean,
): string {
  return showCategoryPrefix && field.category ? `${field.category}.${field.key}` : field.key;
}

export function buildMappingValueOptions(sources: MappingSource[]): MappingValueOption[] {
  const options: MappingValueOption[] = [];

  for (const source of sources) {
    for (const field of source.fields) {
      options.push({
        id: `${source.id}::${field.key}`,
        group: source.label,
        label: field.key + (field.type ? ` (${field.type})` : ''),
        value: `${source.prefix}{${field.key}}`,
      });
    }
  }

  return options;
}

export function resolveMappingSelectValue(
  currentValue: string,
  options: MappingValueOption[],
): string {
  if (!currentValue) return '';
  const match = options.find((o) => o.value === currentValue);
  return match?.id ?? MAPPING_LITERAL_ID;
}
