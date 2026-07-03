/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { MappingSource } from './types';
import { extractActionVariables } from '@/utils/actionVariables';
import { MappingValueSelect } from './MappingValueSelect';
import {
  MAPPING_CUSTOM_TARGET_ID,
  type AssetFieldOption,
  toMapKey,
} from './mappingOptions';

interface StepInputMapperProps {
  title?: string;
  /** Explicit target fields (e.g. output schema). Falls back to action variables. */
  targetFields?: Array<{ key: string; category?: string; type?: string; required?: boolean; label?: string }>;
  variables?: Array<{ key: string; category?: string; type?: string; required?: boolean }>;
  action?: any;
  mappings: Record<string, any>;
  onChange: (mappings: Record<string, any>) => void;
  sources?: MappingSource[];
  showCategoryPrefix?: boolean;
  parentHint?: string;
}

function buildAssetFields(
  action: any | undefined,
  variables?: StepInputMapperProps['variables'],
  targetFields?: StepInputMapperProps['targetFields'],
  showCategoryPrefix = true,
): AssetFieldOption[] {
  const raw =
    targetFields?.length
      ? targetFields
      : variables?.length
        ? variables
        : action
          ? extractActionVariables(action).map((v) => ({
              key: v.key || v.name || '',
              category: v.category,
              type: v.type,
              required: v.required,
            }))
          : [];

  return raw
    .filter((f) => f.key)
    .map((f) => ({
      key: f.key,
      mapKey: toMapKey(f, showCategoryPrefix),
      category: f.category,
      type: f.type,
      required: f.required,
    }));
}

export function StepInputMapper({
  title = 'Input mapping',
  targetFields,
  variables,
  action,
  mappings,
  onChange,
  sources = [],
  showCategoryPrefix = true,
  parentHint,
}: StepInputMapperProps) {
  const fields = useMemo(
    () => buildAssetFields(action, variables, targetFields, showCategoryPrefix),
    [action, variables, targetFields, showCategoryPrefix],
  );

  const [customTargetSelect, setCustomTargetSelect] = useState('');
  const [customTargetManual, setCustomTargetManual] = useState('');
  const [customValueKey, setCustomValueKey] = useState('');

  const mappedKeys = useMemo(() => new Set(Object.keys(mappings)), [mappings]);

  const unmappedAssetFields = useMemo(
    () => fields.filter((f) => !mappedKeys.has(f.mapKey) && !mappedKeys.has(f.key)),
    [fields, mappedKeys],
  );

  const setFieldValue = (key: string, value: string) => {
    onChange({ ...mappings, [key]: value });
  };

  const removeField = (key: string) => {
    const next = { ...mappings };
    delete next[key];
    onChange(next);
  };

  const addCustomMapping = () => {
    let targetKey = '';
    if (customTargetSelect === MAPPING_CUSTOM_TARGET_ID) {
      targetKey = customTargetManual.trim();
    } else if (customTargetSelect) {
      const field = fields.find((f) => f.mapKey === customTargetSelect || f.key === customTargetSelect);
      targetKey = field?.mapKey || customTargetSelect;
    }
    if (!targetKey || !customValueKey.trim()) return;
    onChange({ ...mappings, [targetKey]: customValueKey.trim() });
    setCustomTargetSelect('');
    setCustomTargetManual('');
    setCustomValueKey('');
  };

  const customMappingKeys = Object.entries(mappings).filter(([key]) =>
    !fields.some((f) => f.mapKey === key || f.key === key),
  );

  const targetGroups = useMemo(() => {
    const schema: AssetFieldOption[] = [];
    const custom: AssetFieldOption[] = [];
    fields.forEach((f) => {
      if (mappedKeys.has(f.mapKey) || mappedKeys.has(f.key)) custom.push(f);
      else schema.push(f);
    });
    return { schema, custom };
  }, [fields, mappedKeys]);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">{title}</Label>
      <p className="text-xs text-grey-600">
        {parentHint || (
          <>
            Map asset parameters from feature input, parent step output, or a literal.
          </>
        )}
      </p>

      {fields.length > 0 ? (
        <div className="space-y-2">
          {fields.map((field) => {
            const currentValue = String(mappings[field.mapKey] ?? mappings[field.key] ?? '');
            return (
              <div key={field.mapKey} className="p-3 bg-grey-50 rounded-lg border border-grey-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <code className="text-sm font-mono text-primary">{field.mapKey}</code>
                    {field.type ? (
                      <span className="ml-2 text-[10px] text-grey-500">{field.type}</span>
                    ) : null}
                  </div>
                  {field.required ? (
                    <span className="text-[10px] text-red-600 uppercase">required</span>
                  ) : null}
                </div>
                <MappingValueSelect
                  value={currentValue}
                  sources={sources}
                  onChange={(val) => setFieldValue(field.mapKey, val)}
                  placeholder="Select input source…"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-grey-600">
          No asset input fields detected. Add mappings below.
        </p>
      )}

      {customMappingKeys.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-xs text-grey-600">Additional mappings</Label>
          {customMappingKeys.map(([key, value]) => (
            <div key={key} className="p-3 bg-grey-50 rounded-lg border border-grey-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-primary">{key}</code>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeField(key)}>
                  <Trash2 className="h-3 w-3 text-red" />
                </Button>
              </div>
              <MappingValueSelect
                value={String(value)}
                sources={sources}
                onChange={(val) => setFieldValue(key, val)}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-3">
        <Label className="text-xs font-semibold">Add mapping</Label>
        <div className="space-y-2">
          <div>
            <Label className="text-[10px] text-grey-600 mb-1 block">Asset input (target)</Label>
            <Select value={customTargetSelect || undefined} onValueChange={setCustomTargetSelect}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select asset field…" />
              </SelectTrigger>
              <SelectContent>
                {targetGroups.schema.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase">Asset inputs</SelectLabel>
                    {targetGroups.schema.map((f) => (
                      <SelectItem key={f.mapKey} value={f.mapKey} className="text-xs font-mono">
                        {f.mapKey}
                        {f.type ? ` · ${f.type}` : ''}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
                {targetGroups.custom.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase">Already mapped</SelectLabel>
                    {targetGroups.custom.map((f) => (
                      <SelectItem key={`mapped-${f.mapKey}`} value={f.mapKey} className="text-xs font-mono">
                        {f.mapKey} (edit above)
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase">Other</SelectLabel>
                  <SelectItem value={MAPPING_CUSTOM_TARGET_ID} className="text-xs">
                    Custom field name…
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {customTargetSelect === MAPPING_CUSTOM_TARGET_ID ? (
              <Input
                className="h-8 text-sm font-mono mt-1.5"
                placeholder="e.g. body.userId"
                value={customTargetManual}
                onChange={(e) => setCustomTargetManual(e.target.value)}
              />
            ) : null}
          </div>

          <div>
            <Label className="text-[10px] text-grey-600 mb-1 block">Source (feature input or parent output)</Label>
            <MappingValueSelect
              value={customValueKey}
              sources={sources}
              onChange={setCustomValueKey}
              placeholder="Select source field…"
            />
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addCustomMapping}
          disabled={
            !customValueKey.trim() ||
            (!customTargetSelect ||
              (customTargetSelect === MAPPING_CUSTOM_TARGET_ID && !customTargetManual.trim()))
          }
          className="w-full"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add mapping
        </Button>
      </div>
    </div>
  );
}
