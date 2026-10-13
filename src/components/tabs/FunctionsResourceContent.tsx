import { useMemo, useState } from 'react';
import { ArrowLeft, Box, Clock3, RefreshCw, Repeat2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { schemaToRows, valueToRows, type FieldRow, type ValueRow } from '@/utils/schemaRows';
import ProductObservabilityContent from './ProductObservabilityContent';
import { DataTable, Panel, Pill, SectionEmpty, SectionPage, SegmentedTabs, TEAL } from './ProductSection';

type View = 'definitions' | 'activity';

interface OperationView {
  name: string;
  description?: string;
  input: FieldRow[];
  output: FieldRow[];
  timeoutMs?: number;
  idempotent?: boolean;
  transports: string[];
}

interface FunctionView {
  tag: string;
  name: string;
  description?: string;
  version?: string;
  operations: OperationView[];
  /** Older single-endpoint functions have no operations; show their request and response instead. */
  method?: string;
  envs: string[];
  requestSample: ValueRow[];
  responseSample: ValueRow[];
}

const TRANSPORT_LABELS: Record<string, string> = {
  http: 'HTTP',
  grpc: 'gRPC',
  local: 'In-app',
  events: 'Events',
};

function formatDuration(ms: number): string {
  if (ms >= 60_000) return `${Math.round(ms / 60_000)} min`;
  if (ms >= 1000) return `${Number((ms / 1000).toFixed(1))} s`;
  return `${ms} ms`;
}

function toFunctionView(fn: any): FunctionView {
  const contract = fn.portable_contract;
  const operations: OperationView[] = Object.entries(contract?.operations ?? {}).map(([name, op]: [string, any]) => ({
    name,
    description: op?.description,
    input: schemaToRows(op?.input),
    output: schemaToRows(op?.output),
    timeoutMs: typeof op?.timeout_ms === 'number' ? op.timeout_ms : undefined,
    idempotent: typeof op?.idempotent === 'boolean' ? op.idempotent : undefined,
    transports: Array.isArray(op?.transport_types) ? op.transport_types : [],
  }));
  return {
    tag: fn.tag,
    name: fn.name || fn.tag,
    description: fn.description || undefined,
    version: contract?.version,
    operations,
    method: fn.method,
    envs: (fn.envs ?? []).map((env: any) => env?.slug).filter(Boolean),
    requestSample: valueToRows(fn.sample),
    responseSample: valueToRows(fn.response),
  };
}

function transportsOf(view: FunctionView): string[] {
  return [...new Set(view.operations.flatMap(op => op.transports))];
}

export default function FunctionsResourceContent({ product, onRefresh }: { product: any; onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [view, setView] = useState<View>('definitions');

  const functions = useMemo(
    () => (product?.functions ?? []).filter((fn: any) => fn.deleted !== true).map(toFunctionView),
    [product?.functions],
  );
  const selected = functions.find((fn: FunctionView) => fn.tag === selectedTag) ?? null;
  const filtered = functions.filter((fn: FunctionView) =>
    `${fn.name} ${fn.tag} ${fn.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const refresh = (
    <Button variant="outline" size="sm" className="gap-2" onClick={onRefresh}>
      <RefreshCw className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Refresh</span>
    </Button>
  );

  if (selected) {
    return (
      <SectionPage
        icon={Box}
        tint={TEAL}
        title={selected.name}
        subtitle={selected.tag}
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedTag(null)}>
            <ArrowLeft className="h-3.5 w-3.5" />
            All functions
          </Button>
        }
      >
        <FunctionDetail fn={selected} />
      </SectionPage>
    );
  }

  const count = functions.length;
  return (
    <SectionPage
      icon={Box}
      tint={TEAL}
      title="Functions"
      subtitle={`${count} ${count === 1 ? 'function' : 'functions'} published from your code`}
      actions={
        <>
          {count > 0 && view === 'definitions' ? (
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-grey-500 sm:left-3 sm:h-4 sm:w-4" />
              <Input
                aria-label="Search functions"
                placeholder="Search..."
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="h-8 w-full bg-white pl-8 text-xs sm:h-9 sm:w-48 sm:pl-10 sm:text-sm md:h-10 md:w-64"
              />
            </div>
          ) : null}
          {refresh}
        </>
      }
      toolbar={
        <SegmentedTabs
          label="Function views"
          value={view}
          onChange={setView}
          options={[
            { id: 'definitions', label: 'Definitions' },
            { id: 'activity', label: 'Activity' },
          ]}
        />
      }
    >
      {view === 'activity' ? (
        <ProductObservabilityContent product={product} initialView="functions" embedded />
      ) : count === 0 ? (
        <SectionEmpty
          icon={Box}
          tint={TEAL}
          title="No functions yet"
          description="Functions are defined in your application code and published here with ductape.functions.sync(). Once synced, each function shows up with its operations, inputs and outputs."
        />
      ) : filtered.length === 0 ? (
        <SectionEmpty
          icon={Search}
          tint={TEAL}
          title="No results found"
          description={`Nothing matches "${search}".`}
          action={
            <Button variant="outline" size="sm" onClick={() => setSearch('')}>
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-5 lg:grid-cols-3">
          {filtered.map((fn: FunctionView) => (
            <FunctionCard key={fn.tag} fn={fn} onOpen={() => setSelectedTag(fn.tag)} />
          ))}
        </div>
      )}
    </SectionPage>
  );
}

function FunctionCard({ fn, onOpen }: { fn: FunctionView; onOpen: () => void }) {
  const names = fn.operations.map(op => op.name);
  const shown = names.slice(0, 3);
  const transports = transportsOf(fn);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-lg border border-grey-400 bg-white p-3 text-left transition-all hover:border-primary hover:shadow-md sm:p-4"
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-600/10 sm:h-10 sm:w-10">
          <Box className="h-4 w-4 text-teal-600 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-xs font-medium text-grey sm:text-sm">{fn.name}</h3>
            {fn.version ? <Pill tone="info">v{fn.version}</Pill> : null}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-grey-500 sm:text-xs">{fn.tag}</p>
        </div>
      </div>
      {fn.description ? <p className="mt-3 line-clamp-2 text-xs text-grey-600 sm:text-sm">{fn.description}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {shown.map(name => (
          <span key={name} className="rounded bg-grey-100 px-1.5 py-0.5 font-mono text-[11px] text-grey-600">
            {name}
          </span>
        ))}
        {names.length > shown.length ? <span className="text-[11px] text-grey-500">+{names.length - shown.length} more</span> : null}
        {names.length === 0 && fn.method ? <Pill>{fn.method}</Pill> : null}
      </div>
      {transports.length || fn.operations.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-grey-300 pt-3 text-[11px] text-grey-500">
          <span>
            {fn.operations.length} {fn.operations.length === 1 ? 'operation' : 'operations'}
          </span>
          {transports.map(type => (
            <Pill key={type}>{TRANSPORT_LABELS[type] ?? type}</Pill>
          ))}
        </div>
      ) : null}
    </button>
  );
}

function FieldTable({ rows, emptyLabel }: { rows: FieldRow[]; emptyLabel: string }) {
  if (!rows.length) return <p className="px-4 py-6 text-center text-xs text-grey-500 sm:text-sm">{emptyLabel}</p>;
  return (
    <DataTable head={['Field', 'Type', 'Notes']}>
      {rows.map((row, index) => (
        <tr key={`${row.name}-${index}`}>
          <td className="px-4 py-2.5 align-top" style={{ paddingLeft: `${1 + row.depth * 1.25}rem` }}>
            <span className="font-mono text-xs text-grey sm:text-sm">{row.name}</span>
            {row.required ? <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-red">required</span> : null}
          </td>
          <td className="whitespace-nowrap px-4 py-2.5 align-top text-xs text-grey-600 sm:text-sm">{row.type}</td>
          <td className="px-4 py-2.5 align-top text-xs text-grey-500 sm:text-sm">{row.note || '-'}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function SampleTable({ rows }: { rows: ValueRow[] }) {
  return (
    <DataTable head={['Field', 'Type', 'Example']}>
      {rows.map((row, index) => (
        <tr key={`${row.name}-${index}`}>
          <td className="px-4 py-2.5 align-top" style={{ paddingLeft: `${1 + row.depth * 1.25}rem` }}>
            <span className="font-mono text-xs text-grey sm:text-sm">{row.name}</span>
          </td>
          <td className="whitespace-nowrap px-4 py-2.5 align-top text-xs text-grey-600 sm:text-sm">{row.type}</td>
          <td className="break-all px-4 py-2.5 align-top font-mono text-xs text-grey-500">{row.example}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function FunctionDetail({ fn }: { fn: FunctionView }) {
  const transports = transportsOf(fn);
  return (
    <>
      <Panel title="About">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="text-xs text-grey-500">Description</dt>
            <dd className="mt-1 text-grey">{fn.description || 'No description provided.'}</dd>
          </div>
          {fn.version ? (
            <div>
              <dt className="text-xs text-grey-500">Version</dt>
              <dd className="mt-1 text-grey">v{fn.version}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-grey-500">Operations</dt>
            <dd className="mt-1 text-grey">{fn.operations.length || (fn.method ? 1 : 0)}</dd>
          </div>
          {transports.length ? (
            <div>
              <dt className="text-xs text-grey-500">Reached over</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {transports.map(type => (
                  <Pill key={type}>{TRANSPORT_LABELS[type] ?? type}</Pill>
                ))}
              </dd>
            </div>
          ) : null}
          {fn.envs.length ? (
            <div>
              <dt className="text-xs text-grey-500">Environments</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {fn.envs.map(slug => (
                  <Pill key={slug}>{slug}</Pill>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      </Panel>

      {fn.operations.map(op => (
        <Panel
          key={op.name}
          title={op.name}
          description={op.description}
          action={
            <div className="flex flex-wrap justify-end gap-1.5">
              {op.timeoutMs !== undefined ? (
                <Pill>
                  <Clock3 className="h-3 w-3" />
                  Times out after {formatDuration(op.timeoutMs)}
                </Pill>
              ) : null}
              {op.idempotent ? (
                <Pill tone="good">
                  <Repeat2 className="h-3 w-3" />
                  Safe to retry
                </Pill>
              ) : null}
              {op.transports.map(type => (
                <Pill key={type}>{TRANSPORT_LABELS[type] ?? type}</Pill>
              ))}
            </div>
          }
          flush
        >
          <div className="grid divide-y divide-grey-300 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div className="min-w-0">
              <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-grey-500">Takes</p>
              <FieldTable rows={op.input} emptyLabel="No input." />
            </div>
            <div className="min-w-0">
              <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-grey-500">Returns</p>
              <FieldTable rows={op.output} emptyLabel="No output." />
            </div>
          </div>
        </Panel>
      ))}

      {fn.operations.length === 0 ? (
        <Panel title={fn.method ? `${fn.method} request` : 'Request'} flush>
          <div className={cn('grid', fn.responseSample.length && 'lg:grid-cols-2 lg:divide-x lg:divide-grey-300')}>
            <div className="min-w-0">
              <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-grey-500">Takes</p>
              {fn.requestSample.length ? <SampleTable rows={fn.requestSample} /> : <p className="px-4 py-6 text-center text-xs text-grey-500 sm:text-sm">No request sample recorded.</p>}
            </div>
            {fn.responseSample.length ? (
              <div className="min-w-0">
                <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-grey-500">Returns</p>
                <SampleTable rows={fn.responseSample} />
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}
    </>
  );
}
