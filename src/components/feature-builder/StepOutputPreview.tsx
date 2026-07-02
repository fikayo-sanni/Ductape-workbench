import { Label } from '@/components/ui/label';
import { COMPONENT_IO_REGISTRY } from './componentIoRegistry';
import type { ResilienceComponentCategory } from './types';

interface StepOutputPreviewProps {
  category?: ResilienceComponentCategory | string;
  outputHints?: string[];
  mappings?: Record<string, unknown>;
}

export function StepOutputPreview({
  category,
  outputHints,
  mappings,
}: StepOutputPreviewProps) {
  const hints =
    outputHints ||
    (category && category in COMPONENT_IO_REGISTRY
      ? COMPONENT_IO_REGISTRY[category as ResilienceComponentCategory].outputHints
      : ['Response fields from the step']);

  const mappedKeys = mappings ? Object.keys(mappings) : [];

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Expected output</Label>
      <ul className="text-xs text-grey-600 list-disc list-inside space-y-0.5">
        {hints.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      {mappedKeys.length > 0 ? (
        <div className="mt-2 p-2 bg-grey-50 rounded border text-xs">
          <p className="font-medium text-grey mb-1">Mapped fields</p>
          {mappedKeys.map((k) => (
            <p key={k} className="font-mono text-primary">
              {k} → {String(mappings?.[k])}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
