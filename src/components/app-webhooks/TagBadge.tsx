import { cn } from '@/lib/utils';
import { badgeVariants } from '@/components/ui/badge';

export function TagBadge({ tag, className }: { tag: string; className?: string }) {
  return (
    <span
      className={cn(
        badgeVariants({ variant: 'outline' }),
        'inline-flex max-w-full truncate font-mono font-normal text-[10px] leading-tight text-grey-600 bg-grey-50 border-grey-200 px-1.5 py-0 h-auto rounded-md',
        className
      )}
    >
      {tag}
    </span>
  );
}
