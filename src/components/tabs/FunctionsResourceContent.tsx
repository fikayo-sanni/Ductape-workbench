import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JsonViewer } from '@/components/JsonViewer';
import ProductObservabilityContent from './ProductObservabilityContent';

export default function FunctionsResourceContent({product,onRefresh}:{product:any;onRefresh:()=>void}) {
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState<string|null>(null);
  const [view,setView]=useState<'definitions'|'activity'>('definitions');
  const functions=(product?.functions??[]).filter((fn:any)=>fn.deleted!==true);
  const selectedFunction=functions.find((fn:any)=>fn.tag===selected);
  return <div className="p-4 sm:p-6 space-y-4 min-w-0">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Functions</h2>
      <Button variant="ghost" size="icon" title="Refresh functions" aria-label="Refresh functions" onClick={onRefresh}><RefreshCw className="h-4 w-4"/></Button>
    </div>
    <div className="flex gap-4 border-b border-border" role="tablist" aria-label="Function views">
      {(['definitions','activity'] as const).map(tab=><button key={tab} role="tab" aria-selected={view===tab} onClick={()=>setView(tab)} className={`py-2 text-sm border-b-2 ${view===tab?'border-primary text-primary':'border-transparent text-muted-foreground'}`}>{tab==='definitions'?'Definitions':'Activity'}</button>)}
    </div>
    {view==='activity'?<ProductObservabilityContent product={product} initialView="functions"/>:<>
      <Input aria-label="Search functions" placeholder="Search functions" value={search} onChange={e=>setSearch(e.target.value)}/>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="border-b border-border text-muted-foreground"><tr><th className="p-3">Function</th><th className="p-3">Version</th><th className="p-3">Operations</th></tr></thead>
        <tbody>{functions.filter((fn:any)=>`${fn.name} ${fn.tag}`.toLowerCase().includes(search.toLowerCase())).map((fn:any)=><tr key={fn.tag} className="border-b border-border hover:bg-muted/40">
          <td className="p-3"><button className="text-primary text-left break-all" onClick={()=>setSelected(fn.tag)}>{fn.name||fn.tag}</button></td>
          <td className="p-3">{fn.portable_contract?.version??'-'}</td><td className="p-3 break-words">{Object.keys(fn.portable_contract?.operations??{}).join(', ')||fn.method||'-'}</td>
        </tr>)}</tbody></table></div>
      {!functions.length&&<div className="text-center py-10 text-muted-foreground">No persisted functions.</div>}
      {selectedFunction&&<section className="min-w-0"><h3 className="font-medium mb-3 break-all">{selectedFunction.tag}</h3><JsonViewer data={selectedFunction.portable_contract??{sample:selectedFunction.sample,response:selectedFunction.response}} defaultExpanded/></section>}
    </>}
  </div>;
}
