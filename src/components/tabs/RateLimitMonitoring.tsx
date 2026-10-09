import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { fetchLogs } from '@/services/logsServices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RateLimitMonitoring({ product }: { product: any }) {
  const { user, currentWorkspaceId } = useAuth();
  const [env, setEnv] = useState('all');
  const [tag, setTag] = useState('');
  const [outcome, setOutcome] = useState('all');
  const [page, setPage] = useState(1);
  const [start, setStart] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const query = useQuery({
    queryKey: ['rate-limit-decisions', currentWorkspaceId, product?.tag, env, tag, outcome, start, end, page],
    enabled: Boolean(currentWorkspaceId && user?._id && user?.public_key && product?.tag),
    queryFn: () => fetchLogs({ workspace_id: currentWorkspaceId!, user_id: user!._id, public_key: user!.public_key }, {
      product_tag: product.tag, type: 'rate_limit', env: env === 'all' ? undefined : env,
      action: outcome === 'all' ? undefined : outcome,
      parent_tag: tag.trim() || undefined, start_date: start, end_date: end, page, limit: 50,
    }),
  });
  const rows = query.data?.data?.logs?.data ?? [];
  const meta = query.data?.data?.logs?.metadata;
  return <div className="p-4 sm:p-6 space-y-4 min-w-0">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Rate Limits</h2>
      <Button variant="ghost" size="icon" title="Refresh decisions" aria-label="Refresh decisions" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className="h-4 w-4" /></Button>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <Input className="w-56" aria-label="Policy tag" placeholder="Policy tag" value={tag} onChange={e => { setTag(e.target.value); setPage(1); }} />
      <Select value={env} onValueChange={v => { setEnv(v); setPage(1); }}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>
        <SelectItem value="all">All environments</SelectItem>
        {(product?.envs ?? []).map((e: any) => <SelectItem key={e.slug} value={e.slug}>{e.name ?? e.slug}</SelectItem>)}
      </SelectContent></Select>
      <Select value={outcome} onValueChange={v => { setOutcome(v); setPage(1); }}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>
        {['all','allowed','rejected','bypassed','unavailable','drift'].map(value => <SelectItem key={value} value={value}>{value === 'all' ? 'All decisions' : value}</SelectItem>)}
      </SelectContent></Select>
      <Input className="w-40" type="date" aria-label="Start date" value={start} onChange={e => { setStart(e.target.value); setPage(1); }} />
      <Input className="w-40" type="date" aria-label="End date" value={end} onChange={e => { setEnd(e.target.value); setPage(1); }} />
    </div>
    <div className="text-sm text-muted-foreground"><LoadingValue loading={query.isLoading}>{meta?.total ?? 0}</LoadingValue> recorded decisions</div>
    {query.isError ? <div role="alert">Unable to load rate-limit decisions. <Button variant="ghost" onClick={() => void query.refetch()}>Retry</Button></div> :
      <div className="overflow-x-auto"><table className="w-full text-sm text-left">
        <thead className="text-muted-foreground border-b border-border"><tr>{['Time', 'Policy', 'Environment', 'Decision', 'Remaining / limit', 'Latency'].map(h => <th key={h} className="p-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rows.map(row => {
          let details: any = row.data;
          try { if (typeof details === 'string') details = JSON.parse(details); } catch { details = {}; }
          return <tr key={row._id} className="border-b border-border hover:bg-muted/40">
            <td className="p-3 whitespace-nowrap">{new Date(row.timestamp).toLocaleString()}</td>
            <td className="p-3 break-all">{row.parent_tag}</td><td className="p-3">{row.env}</td>
            <td className="p-3">{details?.outcome ?? row.status}</td>
            <td className="p-3">{details?.remaining ?? '-'} / {details?.limit ?? '-'}</td>
            <td className="p-3">{row.latency ?? details?.latency ?? '-'} ms</td>
          </tr>;
        })}</tbody>
      </table>{!rows.length && <div className="py-12 text-center text-muted-foreground">{query.isLoading ? 'Loading decisions...' : 'No recorded decisions in this period.'}</div>}</div>}
    <div className="flex items-center justify-end gap-3"><span className="text-sm">Page {page} of {Math.max(1, meta?.totalPages ?? 1)}</span>
      <Button variant="ghost" size="icon" title="Previous page" aria-label="Previous page" disabled={page === 1 || query.isFetching} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" title="Next page" aria-label="Next page" disabled={page >= (meta?.totalPages ?? 1) || query.isFetching} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
    </div>
  </div>;
}
import { LoadingValue } from '@/components/ui/loading-value';
