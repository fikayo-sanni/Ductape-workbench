import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MappingSource } from './types';
import {
  MAPPING_LITERAL_ID,
  buildMappingValueOptions,
  resolveMappingSelectValue,
} from './mappingOptions';

interface MappingValueSelectProps {
  value: string;
  sources: MappingSource[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MappingValueSelect({
  value,
  sources,
  onChange,
  placeholder = 'Select source field…',
  className,
  disabled,
}: MappingValueSelectProps) {
  const options = useMemo(() => buildMappingValueOptions(sources), [sources]);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof options>();
    options.forEach((opt) => {
      if (!map.has(opt.group)) map.set(opt.group, []);
      map.get(opt.group)!.push(opt);
    });
    return map;
  }, [options]);

  const selectValue = resolveMappingSelectValue(value, options);
  const isLiteral = selectValue === MAPPING_LITERAL_ID;
  const [literalDraft, setLiteralDraft] = useState(value);

  useEffect(() => {
    setLiteralDraft(value);
  }, [value]);

  const handleSelect = (id: string) => {
    if (id === MAPPING_LITERAL_ID) {
      onChange(literalDraft || value || '');
      return;
    }
    const opt = options.find((o) => o.id === id);
    if (opt) onChange(opt.value);
  };

  if (options.length === 0) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="$Input{field}"
        className={`h-8 text-sm font-mono ${className || ''}`}
        disabled={disabled}
      />
    );
  }

  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      <Select value={selectValue || undefined} onValueChange={handleSelect} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {Array.from(grouped.entries()).map(([group, items]) => (
            <SelectGroup key={group}>
              <SelectLabel className="text-[10px] uppercase tracking-wide text-grey-500">
                {group}
              </SelectLabel>
              {items.map((opt) => (
                <SelectItem key={opt.id} value={opt.id} className="text-xs font-mono">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
          <SelectGroup>
            <SelectLabel className="text-[10px] uppercase tracking-wide text-grey-500">
              Other
            </SelectLabel>
            <SelectItem value={MAPPING_LITERAL_ID} className="text-xs">
              Custom literal…
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      {isLiteral ? (
        <Input
          value={literalDraft}
          onChange={(e) => {
            setLiteralDraft(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Literal or expression"
          className="h-8 text-sm font-mono"
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}
