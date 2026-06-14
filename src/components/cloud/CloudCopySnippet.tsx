import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CloudCopySnippet({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={label ? `Copy ${label}` : 'Copy'}
      className={cn(
        'group inline-flex items-center gap-2 max-w-full rounded-md border border-grey-300 bg-grey-100/60 px-2.5 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5',
        className,
      )}
    >
      <code className="text-xs font-mono text-grey truncate flex-1">{value}</code>
      <span className="shrink-0 text-grey-600 group-hover:text-primary">
        {copied ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
            <Check className="h-3 w-3" />
            Copied
          </span>
        ) : (
          <Copy className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
        )}
      </span>
    </button>
  );
}
