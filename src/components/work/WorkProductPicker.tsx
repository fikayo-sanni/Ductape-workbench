import { useState } from 'react';
import { Package } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { IWorkProduct } from '@/utils/workBoard';

function ProductLogo({ product, compact = false }: { product?: IWorkProduct; compact?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const logo = product?.logo;
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center overflow-hidden border border-grey-300 bg-grey-100 text-xs font-semibold text-primary ${compact ? 'h-7 w-7 rounded-md' : 'h-9 w-9 rounded-lg'}`}>
      {logo && failedUrl !== logo
        ? <img src={logo} alt="" className="h-full w-full object-contain p-0.5" onError={() => setFailedUrl(logo)} />
        : product ? product.name.slice(0, 2).toUpperCase() : <Package className="h-3.5 w-3.5" />}
    </span>
  );
}

export default function WorkProductPicker({ products, value, onValueChange }: {
  products: IWorkProduct[];
  value?: string;
  onValueChange: (tag: string) => void;
}) {
  const current = products.find(product => product.tag === value);
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label="Work product" className="h-10 w-[min(18rem,calc(100vw-3rem))] gap-3 rounded-lg bg-white px-3 shadow-none transition-colors hover:border-primary/40">
        <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <ProductLogo product={current} compact />
          <span className="min-w-0 flex-1 truncate text-sm font-medium"><SelectValue placeholder="Choose product">{current?.name}</SelectValue></span>
        </span>
      </SelectTrigger>
      <SelectContent align="end" sideOffset={6} className="w-[min(20rem,calc(100vw-2rem))] max-h-[min(24rem,var(--radix-select-content-available-height))] rounded-xl border-grey-400 bg-white p-1 shadow-lg dark:bg-white">
        <SelectGroup>
          <SelectLabel className="px-3 pb-2 pt-2 text-[10px] font-medium uppercase tracking-wider text-grey/50">Switch product</SelectLabel>
          {products.map(product => (
            <SelectItem key={product.tag} value={product.tag} textValue={product.name} className="rounded-lg py-2.5 pl-3 pr-8 focus:bg-primary/5 data-[state=checked]:bg-primary/5 [&>span:first-child]:text-primary [&>span:last-child]:w-full">
              <span className="flex min-w-0 items-center gap-3">
                <ProductLogo product={product} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-grey">{product.name}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-grey/50">{product.tag}</span></span>
                {typeof product.open_items === 'number' && <span className="shrink-0 rounded-md bg-grey-100 px-1.5 py-0.5 text-[10px] tabular-nums text-grey/60">{product.open_items} open</span>}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
