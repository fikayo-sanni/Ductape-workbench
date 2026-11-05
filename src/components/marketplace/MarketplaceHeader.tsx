import type { ReactNode } from 'react';
import { Grid3x3, List, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function MarketplaceLayoutControl({ value, onChange }: { value: 'grid' | 'list'; onChange: (value: 'grid' | 'list') => void }) {
  return <div role="group" aria-label="Catalogue layout" className="inline-flex shrink-0 rounded-lg border border-grey-400 bg-white p-0.5">{([{ id: 'grid', icon: Grid3x3 }, { id: 'list', icon: List }] as const).map(({ id, icon: Icon }) => <button key={id} type="button" aria-label={`${id === 'grid' ? 'Grid' : 'List'} view`} aria-pressed={value === id} onClick={() => onChange(id)} className={cn('rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', value === id ? 'bg-primary text-white' : 'text-grey/60 hover:bg-grey-100 hover:text-grey')}><Icon className="h-3.5 w-3.5" /></button>)}</div>;
}

export default function MarketplaceHeader({ title = 'Marketplace', description, search, onSearch, placeholder, disabled, actions, children }: {
  title?: string; description: string; search: string; onSearch: (value: string) => void; placeholder?: string;
  disabled?: boolean; actions?: ReactNode; children?: ReactNode;
}) {
  return <header className="py-2">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3"><div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight text-grey">{title}</h1><p className="mt-2 text-xs leading-relaxed text-grey/60 sm:text-sm">{description}</p></div></div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey/50" /><Input aria-label="Search integrations" placeholder={placeholder ?? 'Search integrations by name or category…'} value={search} onChange={event => onSearch(event.target.value)} disabled={disabled} className="h-10 bg-background-secondary pl-9 pr-9 text-sm" />{search && <button type="button" aria-label="Clear search" onClick={() => onSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-grey/60 hover:bg-grey-100"><X className="h-3.5 w-3.5" /></button>}</div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  </header>;
}
