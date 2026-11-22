import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkAuth } from '@/hooks/useWork';
import { searchWorkItems, workErrorMessage } from '@/services/workServices';
import { pollInterval } from '@/utils/workStream';
import { PriorityChip, StatusChip } from './WorkChips';

/** Search is separate from the board: old, cancelled and epic work must be discoverable too. */
export default function WorkItemSearch({ product, live, onOpen, children }: { product?: string; live: boolean; onOpen: (ref: string) => void; children: ReactNode }) {
  const auth = useWorkAuth();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const term = input.trim();
  useEffect(() => {
    const timer = setTimeout(() => setQuery(term), 250);
    return () => clearTimeout(timer);
  }, [term]);
  const results = useQuery({
    queryKey: ['work', 'search', auth?.workspaceId, product, query, offset],
    queryFn: () => searchWorkItems(auth!, product!, query, offset),
    enabled: Boolean(auth && product && query),
    refetchInterval: pollInterval(live),
  });
  useEffect(() => {
    if (results.data && offset > 0 && offset >= results.data.total) {
      setOffset(Math.max(0, Math.floor((results.data.total - 1) / 50) * 50));
    }
  }, [results.data, offset]);
  const clear = () => { setInput(''); setQuery(''); setOffset(0); };
  const loading = term !== query || results.isLoading;
  const items = results.data?.items ?? [];
  const total = results.data?.total ?? 0;
  return (
    <div className="space-y-3">
      <div className="relative max-w-xl">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-600" />
        <Input type="search" aria-label="Search work items" placeholder="Search titles, descriptions, or W-123" maxLength={200} value={input} disabled={!product} className="bg-white pl-9 pr-10" onChange={(event) => { setInput(event.target.value); setOffset(0); }} onKeyDown={(event) => { if (event.key === 'Escape') clear(); }} />
        {input ? <button type="button" aria-label="Clear work item search" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-grey-600 hover:bg-grey-100"><X className="h-4 w-4" /></button> : null}
      </div>
      {!term ? children : (
        <section aria-label="Work item search results" className="overflow-hidden rounded-xl border border-grey-400 bg-white">
          <header className="border-b border-grey-400 px-4 py-3 text-sm text-grey-600" role="status" aria-live="polite">
            {loading ? 'Searching work items…' : results.error ? 'Search could not be completed' : `${total} matching work ${total === 1 ? 'item' : 'items'} in this product`}
          </header>
          {loading ? <p className="p-4 text-sm text-grey-600">Looking through the product’s work history…</p> : results.error ? (
            <div className="flex items-center justify-between gap-3 p-4 text-sm text-grey-600"><span>{workErrorMessage(results.error)}</span><Button size="sm" variant="outline" onClick={() => void results.refetch()}>Try again</Button></div>
          ) : !items.length ? (
            <div className="p-6 text-sm text-grey-600"><p>No work items match “{query}”. Try another title, description, or task reference.</p><button type="button" className="mt-2 text-primary hover:underline" onClick={clear}>Clear search</button></div>
          ) : (
            <>
              <ul className="divide-y divide-grey-400">
                {items.map((item) => <li key={item.id}><button type="button" className="block w-full px-4 py-3 text-left transition-colors hover:bg-grey-100" onClick={() => onOpen(item.ref)}>
                  <div className="mb-1 flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-grey-600">{item.ref}</span><StatusChip status={item.status} /><PriorityChip priority={item.priority} />{item.kind === 'epic' ? <span className="text-xs text-grey-600">Epic</span> : null}</div>
                  <p className="text-sm font-medium text-grey">{item.title}</p>
                  {item.body ? <p className="mt-1 line-clamp-2 text-xs text-grey-600">{item.body}</p> : null}
                </button></li>)}
              </ul>
              {total > 50 ? <footer className="flex items-center justify-between gap-2 border-t border-grey-400 px-4 py-3 text-xs text-grey-600"><span>{offset + 1}–{Math.min(offset + items.length, total)} of {total}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={offset === 0 || results.isFetching} onClick={() => setOffset((value) => Math.max(0, value - 50))}>Previous</Button><Button size="sm" variant="outline" disabled={offset + items.length >= total || results.isFetching} onClick={() => setOffset((value) => value + 50)}>Next</Button></div></footer> : null}
            </>
          )}
        </section>
      )}
    </div>
  );
}
