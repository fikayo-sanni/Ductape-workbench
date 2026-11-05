import { useState } from 'react';
import { ArrowUpRight, Check, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MarketplaceCardProps {
  name: string;
  description?: string;
  logo?: string;
  publisher?: string | null;
  categories?: string[];
  version?: string | null;
  imported?: boolean;
  updateAvailable?: boolean;
  viewMode?: 'grid' | 'list';
  onInspect: () => void;
  onAction?: () => void;
  actionLabel?: string;
  externalHref?: string;
}

const tones = [
  'bg-primary/5 text-primary',
  'bg-teal-600/5 text-teal-600',
  'bg-purple-600/5 text-purple-600',
  'bg-primary/5 text-primary',
];

/** Shared visual tiles; each action remains a separate keyboard-accessible control. */
export default function MarketplaceCard({
  name, description, logo, publisher, categories = [], version, imported,
  updateAvailable, viewMode = 'grid', onInspect, onAction,
  actionLabel = 'View details', externalHref,
}: MarketplaceCardProps) {
  const [failedLogo, setFailedLogo] = useState<string | undefined>();
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  const labels = [...new Set(categories.filter(Boolean))];
  const tone = tones[Array.from(name).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % tones.length];
  const isGrid = viewMode === 'grid';

  return (
    <article className={cn(
      'group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-grey-400 bg-white transition-colors hover:border-primary/40',
      !isGrid && 'sm:flex-row',
    )}>
      <button type="button" onClick={onInspect} aria-label={`View ${name} details`}
        className={cn('min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary', !isGrid && 'flex items-center gap-4 p-4')}>
        <div className={cn('relative flex items-center justify-center', tone, isGrid ? 'm-2 mb-0 h-36 rounded-xl sm:h-40' : 'h-20 w-20 shrink-0 rounded-xl')}>
          {logo && failedLogo !== logo
            ? <img src={logo} alt="" loading="lazy" onError={() => setFailedLogo(logo)} className={cn('object-contain transition-transform duration-200 group-hover:scale-105', isGrid ? 'h-16 w-16' : 'h-11 w-11')} />
            : <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl font-semibold shadow-sm">{initials}</span>}
          {imported && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-grey-300 bg-white px-2 py-1 text-[10px] font-medium text-grey"><Check className="h-3 w-3" />{updateAvailable ? 'Update available' : 'Imported'}</span>}
          {isGrid && <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-grey/30 transition-colors group-hover:text-primary" />}
        </div>
        <div className={cn('min-w-0', isGrid ? 'px-5 pb-4 pt-4' : 'flex-1')}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-grey">{name || 'Unnamed integration'}</h3>
            {labels[0] && <span className="max-w-[45%] truncate text-[10px] capitalize text-grey/50" title={labels.join(', ')}>{labels[0]}</span>}
          </div>
          <p className="mt-1.5 truncate text-xs text-grey/60" title={description || undefined}>{description || (publisher ? `By ${publisher}` : 'Explore available actions')}</p>
        </div>
      </button>
      <div className={cn('mt-auto flex items-center justify-between gap-3 border-t border-grey-300 px-5 py-3', !isGrid && 'sm:my-4 sm:w-44 sm:shrink-0 sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-t-0')}>
        <span className="min-w-0 truncate text-[11px] text-grey/50" title={publisher || version || undefined}>{publisher || version || 'Integration'}</span>
        <div className="flex shrink-0 items-center gap-1">
          {externalHref && <a href={externalHref} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name} public page`} className="rounded-md p-1.5 text-grey/40 hover:bg-grey-100 hover:text-grey"><ExternalLink className="h-3.5 w-3.5" /></a>}
          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary" onClick={onAction ?? onInspect}>{actionLabel}<ChevronRight className="h-3 w-3" /></Button>
        </div>
      </div>
    </article>
  );
}
