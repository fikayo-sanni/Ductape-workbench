import { useState, type ReactNode } from 'react';
import { X, Globe, ChevronRight, LayoutGrid, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Domain } from '@/services/marketplaceServices';
export type MarketplaceViewMode = 'browse' | 'submissions';
interface MarketplaceSidebarProps {
  domains: Domain[]; selectedDomain: string | null; onDomainSelect: (id: string | null) => void;
  viewMode?: MarketplaceViewMode; onViewModeChange?: (mode: MarketplaceViewMode) => void;
  isMobileOpen: boolean; onMobileToggle: () => void;
}
const nameOf = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
export default function MarketplaceSidebar({ domains, selectedDomain, onDomainSelect, viewMode = 'browse', onViewModeChange, isMobileOpen, onMobileToggle }: MarketplaceSidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const select = (id: string | null) => { onDomainSelect(id); if (isMobileOpen) onMobileToggle(); };
  const row = (active: boolean) => cn('flex w-full min-w-0 items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium transition-colors', active ? 'bg-primary/10 text-primary' : 'text-grey/70 hover:bg-grey-100 hover:text-grey');
  const roots = domains.filter(domain => !domain.parent_domain_id || !domains.some(parent => parent._id === domain.parent_domain_id));
  function category(domain: Domain, depth = 0, ancestors = new Set<string>()): ReactNode {
    if (ancestors.has(domain._id)) return null;
    const children = domains.filter(child => child.parent_domain_id === domain._id);
    const active = selectedDomain === domain._id;
    return <div key={domain._id}>
      <div className="flex items-center gap-0.5" style={{ paddingLeft: depth * 12 }}>
        <button type="button" aria-pressed={active} onClick={() => select(domain._id)} className={row(active)}><Globe className="h-3.5 w-3.5 shrink-0 opacity-70" /><span className="truncate" title={nameOf(domain.domain_name)}>{nameOf(domain.domain_name)}</span></button>
        {children.length > 0 && <button type="button" aria-label={`Expand ${nameOf(domain.domain_name)}`} aria-expanded={expanded.has(domain._id)} onClick={() => setExpanded(current => { const next = new Set(current); next.has(domain._id) ? next.delete(domain._id) : next.add(domain._id); return next; })} className="shrink-0 rounded p-1.5 text-grey/60 hover:bg-grey-100"><ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expanded.has(domain._id) && 'rotate-90')} /></button>}
      </div>
      {expanded.has(domain._id) && children.map(child => category(child, depth + 1, new Set([...ancestors, domain._id])))}
    </div>;
  }
  return <>
    {isMobileOpen && <button type="button" aria-label="Close category navigation" className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onMobileToggle} />}
    <aside aria-label="Marketplace navigation" className={cn('fixed inset-y-0 left-0 z-50 flex w-56 shrink-0 flex-col border-r border-grey-400 bg-white transition-transform md:static md:z-auto md:translate-x-0', isMobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full')}>
      <div className="flex items-center justify-between border-b border-grey-300 px-4 py-4"><p className="text-sm font-semibold text-grey">Marketplace</p><Button variant="ghost" size="icon" aria-label="Close categories" className="h-7 w-7 md:hidden" onClick={onMobileToggle}><X className="h-4 w-4" /></Button></div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
        {onViewModeChange && <nav aria-label="Marketplace sections" className="space-y-1"><button type="button" aria-pressed={viewMode === 'browse'} onClick={() => { onViewModeChange('browse'); if (isMobileOpen) onMobileToggle(); }} className={row(viewMode === 'browse')}><LayoutGrid className="h-4 w-4" />Browse integrations</button><button type="button" aria-pressed={viewMode === 'submissions'} onClick={() => { onViewModeChange('submissions'); if (isMobileOpen) onMobileToggle(); }} className={row(viewMode === 'submissions')}><ClipboardList className="h-4 w-4" />My submissions</button></nav>}
        {viewMode === 'browse' && <nav aria-label="Integration categories"><p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-wider text-grey/50">Categories</p><div className="space-y-0.5"><button type="button" aria-pressed={!selectedDomain || selectedDomain === 'all'} className={row(!selectedDomain || selectedDomain === 'all')} onClick={() => select(null)}><LayoutGrid className="h-3.5 w-3.5 opacity-70" />All integrations</button>{roots.map(domain => category(domain))}</div></nav>}
      </div>
    </aside>
  </>;
}
