import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ConditionEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

const CONDITION_EXAMPLES = [
  '$Step{validate}{valid} == true',
  '$Input{type} == \'premium\'',
  '$Step{check}{count} >= 1',
];

export function ConditionEditor({
  value,
  onChange,
  label = 'Condition expression',
  placeholder = '$Step{tag}{field} == true',
}: ConditionEditorProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono text-sm"
      />
      <p className="text-[11px] text-grey-600">
        Supports <code>==</code>, <code>!=</code>, <code>&gt;</code>, <code>&lt;</code>,{' '}
        <code>&gt;=</code>, <code>&lt;=</code>, <code>&amp;&amp;</code>, <code>||</code>
      </p>
      <div className="flex flex-wrap gap-1">
        {CONDITION_EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="text-[10px] px-2 py-0.5 rounded bg-grey-100 hover:bg-grey-200 font-mono text-grey-700"
            onClick={() => onChange(ex)}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
