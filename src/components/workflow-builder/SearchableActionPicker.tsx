/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { filterActionsBySearch } from '@/utils/actionVariables';

interface SearchableActionPickerProps {
  actions: any[];
  label?: string;
  placeholder?: string;
  onSelect: (action: any) => void;
  selectedTag?: string;
  className?: string;
}

export function SearchableActionPicker({
  actions,
  label = 'Select Action',
  placeholder = 'Search actions...',
  onSelect,
  selectedTag,
  className,
}: SearchableActionPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(
    () => filterActionsBySearch(actions, searchTerm),
    [actions, searchTerm],
  );

  if (!actions.length) {
    return (
      <p className="text-sm text-grey-600">No actions available for this app.</p>
    );
  }

  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2 border rounded-lg bg-white">
        <div className="p-2 border-b">
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-grey-600">No actions match your search.</p>
          ) : (
            filtered.map((action) => (
              <button
                key={action._id || action.tag}
                type="button"
                className={`w-full text-left p-3 hover:bg-grey-100 border-b last:border-b-0 transition-colors ${
                  selectedTag === action.tag ? 'bg-primary/5' : ''
                }`}
                onClick={() => onSelect(action)}
              >
                <div className="font-medium text-sm">{action.name}</div>
                {action.tag ? (
                  <div className="text-xs text-grey-600 font-mono">{action.tag}</div>
                ) : null}
                {action.method ? (
                  <div className="text-[10px] text-grey-500 uppercase">{action.method}</div>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
