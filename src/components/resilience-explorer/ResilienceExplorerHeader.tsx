import { type LucideIcon, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResilienceExplorerHeaderProps {
  icon: LucideIcon;
  title: string;
  productTag: string;
  environment: string;
  accentClassName: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onCreate?: () => void;
  createLabel: string;
}

export function ResilienceExplorerHeader({
  icon: Icon,
  title,
  productTag,
  environment,
  accentClassName,
  isRefreshing,
  onRefresh,
  onCreate,
  createLabel,
}: ResilienceExplorerHeaderProps) {
  return (
    <header className="flex-shrink-0 border-b border-grey-300 bg-white px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg', accentClassName)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-grey">{title}</h1>
            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-grey-500">
              <code className="truncate font-mono">{productTag}</code>
              <span aria-hidden="true">/</span>
              <span className="truncate">{environment}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {onCreate ? (
            <Button type="button" size="sm" className="h-8 gap-1.5" onClick={onCreate}>
              <Plus className="h-3.5 w-3.5" />
              <span>{createLabel}</span>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
