import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CloudConnectionTagBadge({
  tag,
  className,
}: {
  tag: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(tag);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy connection tag"
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-md font-mono text-sm text-grey transition-colors hover:text-primary',
        className,
      )}
    >
      <span className="truncate">{tag}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </button>
  );
}

export function cloudTabTitle(connection: { tag?: string; display_name?: string }): string {
  if (connection.tag) return connection.tag;
  return connection.display_name || 'Cloud connection';
}
