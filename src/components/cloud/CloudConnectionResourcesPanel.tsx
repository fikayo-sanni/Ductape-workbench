import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes,
  Check,
  Copy,
  Database,
  HardDrive,
  Inbox,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Server,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SDKProxyService } from '@/services/sdkProxy';
import { cn } from '@/lib/utils';
import {
  SERVICES_BY_PROVIDER,
  type CloudProvider,
  cloudConnectionRef,
  isCloudConnectionActive,
} from './cloudConnection.constants';

interface CloudResource {
  id: string;
  name?: string;
  region?: string;
}

interface CloudConnectionResourcesPanelProps {
  sdkProxy: SDKProxyService;
  connection: {
    id?: string;
    tag?: string;
    provider?: CloudProvider;
    status?: string;
    scopes?: string[];
  };
  variant?: 'card' | 'panel';
}

const SERVICE_ICONS: Record<string, typeof HardDrive> = {
  s3: HardDrive,
  gcs: HardDrive,
  blob: HardDrive,
  sqs: MessageSquare,
  rds: Database,
  neptune: Share2,
  opensearch: Boxes,
};

function ResourceIcon({ service }: { service: string }) {
  const Icon = SERVICE_ICONS[service] || Server;
  return (
    <div className="w-8 h-8 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4 text-primary" />
    </div>
  );
}

function CopyIdButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Copy resource ID"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-grey-600" />
      )}
    </Button>
  );
}

function ResourceTableSkeleton() {
  return (
    <TableBody>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <TableRow key={i} className="border-grey-300">
          <TableCell className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-grey-200 animate-pulse" />
              <div className="h-4 w-32 rounded bg-grey-200 animate-pulse" />
            </div>
          </TableCell>
          <TableCell className="px-4 py-3">
            <div className="h-4 w-48 rounded bg-grey-200 animate-pulse ml-auto max-w-full" />
          </TableCell>
          <TableCell className="px-4 py-3 w-24">
            <div className="h-4 w-16 rounded bg-grey-200 animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function CloudConnectionResourcesPanel({
  sdkProxy,
  connection,
  variant = 'card',
}: CloudConnectionResourcesPanelProps) {
  const provider = (connection.provider || 'aws') as CloudProvider;
  const cloudRef = cloudConnectionRef(connection);
  const isActive = isCloudConnectionActive(connection.status);
  const scopes = connection.scopes || [];

  const availableServices = SERVICES_BY_PROVIDER[provider].filter((s) =>
    scopes.includes(s.scope),
  );

  const [activeService, setActiveService] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!availableServices.length) {
      setActiveService('');
      return;
    }
    if (!availableServices.some((s) => s.service === activeService)) {
      setActiveService(availableServices[0].service);
    }
  }, [availableServices, activeService]);

  useEffect(() => {
    setSearch('');
  }, [activeService, region]);

  const needsRegion = ['s3', 'sqs', 'rds', 'neptune', 'opensearch'].includes(activeService);
  const activeServiceLabel =
    availableServices.find((s) => s.service === activeService)?.label || activeService;

  const { data, isFetching, refetch, isError, error, isSuccess } = useQuery({
    queryKey: ['cloud-connection-resources', cloudRef, activeService, region],
    queryFn: async () => {
      const res = await sdkProxy.cloud.resources.list({
        cloud: cloudRef,
        service: activeService,
        region: needsRegion ? region : undefined,
      });
      return (res as { resources?: CloudResource[] })?.resources || [];
    },
    enabled: Boolean(sdkProxy && cloudRef && activeService && isActive && scopes.length > 0),
  });

  const filtered = useMemo(() => {
    if (!data?.length) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) => {
      const name = (r.name || '').toLowerCase();
      const id = r.id.toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [data, search]);

  const shellClass =
    variant === 'panel'
      ? 'bg-white rounded-lg border border-grey-400 shadow-sm overflow-hidden flex flex-col min-h-[400px]'
      : 'bg-white rounded-lg border border-grey-400 shadow-sm overflow-hidden';

  if (!isActive) {
    return (
      <div className={cn(shellClass, variant !== 'panel' && 'p-6')}>
        <p className="text-sm text-grey-600">
          Complete and validate this connection to browse cloud resources here.
        </p>
      </div>
    );
  }

  if (!scopes.length || !availableServices.length) {
    return null;
  }

  const showRegionColumn =
    needsRegion || Boolean(data?.some((r) => r.region));
  const count = data?.length ?? 0;

  return (
    <div className={shellClass}>
      <div className="px-5 py-4 border-b border-grey-400 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-grey">Cloud resources</h3>
            <p className="text-xs text-grey-600 mt-0.5">
              {activeServiceLabel}
              {needsRegion ? ` · ${region}` : ''}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 shrink-0"
          >
            {isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-grey-100 w-fit max-w-full">
            {availableServices.map((s) => (
              <button
                key={s.service}
                type="button"
                onClick={() => setActiveService(s.service)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  activeService === s.service
                    ? 'bg-white text-primary shadow-sm ring-1 ring-grey-300'
                    : 'text-grey-600 hover:text-grey',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {needsRegion && (
              <Input
                id="resource-region"
                className="h-8 w-36 font-mono text-xs"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="us-east-1"
                aria-label="AWS region"
              />
            )}
            {isSuccess && count > 0 && (
              <div className="relative w-full sm:w-52">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grey-600" />
                <Input
                  className="h-8 pl-8 text-xs"
                  placeholder="Filter resources…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {isFetching && !data?.length ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-grey-100/80 hover:bg-grey-100/80 border-grey-300">
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-grey-600">
                  Name
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-grey-600 text-right">
                  Resource ID
                </TableHead>
                {showRegionColumn && (
                  <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-grey-600 w-28">
                    Region
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <ResourceTableSkeleton />
          </Table>
        ) : isError ? (
          <div className="py-14 px-6 text-center">
            <p className="text-sm text-red-600">
              {(error as Error)?.message || 'Failed to load resources'}
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-grey-100 flex items-center justify-center mb-3">
              <Inbox className="h-6 w-6 text-grey-500" />
            </div>
            <p className="text-sm font-medium text-grey">No resources found</p>
            <p className="text-xs text-grey-600 mt-1 max-w-sm">
              {needsRegion
                ? `No ${activeServiceLabel.toLowerCase()} in ${region}. Try another region.`
                : `Your account has no ${activeServiceLabel.toLowerCase()} to list.`}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 px-6 text-center text-sm text-grey-600">
            No resources match &quot;{search}&quot;
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-grey-100/95 backdrop-blur-sm">
              <TableRow className="border-grey-300 hover:bg-grey-100/95">
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-grey-600">
                  Name
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-grey-600 text-right w-[min(280px,45%)]">
                  Resource ID
                </TableHead>
                {showRegionColumn && (
                  <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-grey-600 w-28">
                    Region
                  </TableHead>
                )}
                <TableHead className="w-10 px-2" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const displayName = r.name || r.id;
                const idIsName = !r.name || r.name === r.id;
                return (
                  <TableRow key={r.id} className="group border-grey-300">
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <ResourceIcon service={activeService} />
                        <span className="text-sm font-medium text-grey truncate" title={displayName}>
                          {displayName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      {idIsName ? (
                        <span className="text-xs text-grey-500">—</span>
                      ) : (
                        <code
                          className="text-xs font-mono text-grey-600 bg-grey-100/80 px-2 py-1 rounded inline-block max-w-full truncate align-middle"
                          title={r.id}
                        >
                          {r.id}
                        </code>
                      )}
                    </TableCell>
                    {showRegionColumn && (
                      <TableCell className="px-4 py-3 text-xs font-mono text-grey-600">
                        {r.region || (needsRegion ? region : '—')}
                      </TableCell>
                    )}
                    <TableCell className="px-2 py-3">
                      <CopyIdButton value={r.id} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {isSuccess && count > 0 && (
        <div className="px-4 py-2.5 border-t border-grey-300 bg-grey-100/50 text-xs text-grey-600 flex justify-between gap-2">
          <span>
            {search && filtered.length !== count
              ? `${filtered.length} of ${count} resources`
              : `${count} ${count === 1 ? 'resource' : 'resources'}`}
          </span>
          <span className="font-mono text-grey-500">{activeService}</span>
        </div>
      )}
    </div>
  );
}
