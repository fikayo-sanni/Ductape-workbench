import { Loader2, Heart, ChevronUpIcon, ChevronDownIcon } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Code, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IHealthCheck } from '@/types/healthcheck';
import { formatAgo, getEnvStatusForSlug, parseLatency } from './utils';
import { useMemo } from 'react';

const columnHelper = createColumnHelper<IHealthCheck>();

interface HealthcheckExplorerListViewProps {
  data: IHealthCheck[];
  selectedEnv: string;
  isRefreshing: boolean;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick: (h: IHealthCheck) => void;
  onView: (h: IHealthCheck) => void;
  onCode: (h: IHealthCheck) => void;
  onDelete: (h: IHealthCheck) => void;
}

export function HealthcheckExplorerListView({
  data,
  selectedEnv,
  isRefreshing,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onView,
  onCode,
  onDelete,
}: HealthcheckExplorerListViewProps) {
  const columns = useMemo(
    () =>
      [
        columnHelper.display({
          id: 'name',
          header: 'Healthcheck',
          cell: ({ row }) => {
            const envStatus = getEnvStatusForSlug(row.original, selectedEnv);
            const healthy = envStatus?.status === 'healthy';
            return (
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    healthy ? 'bg-green/10' : 'bg-red/10'
                  )}
                >
                  <Heart className={cn('h-4 w-4', healthy ? 'text-green' : 'text-red')} />
                </div>
                <div>
                  <span className="text-sm font-medium text-grey">{row.original.name}</span>
                  <p className="text-xs text-grey-500 font-mono">{row.original.tag}</p>
                </div>
              </div>
            );
          },
        }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const healthy = getEnvStatusForSlug(row.original, selectedEnv)?.status === 'healthy';
          return healthy ? (
            <Badge className="bg-green/10 text-green border-green/20 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Healthy
            </Badge>
          ) : (
            <Badge className="bg-red/10 text-red border-red/20 text-xs">
              <XCircle className="h-3 w-3 mr-1" />
              Unhealthy
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: 'latency',
        header: 'Latency',
        cell: ({ row }) => {
          const envStatus = getEnvStatusForSlug(row.original, selectedEnv);
          const lat = parseLatency(envStatus?.lastLatency || '0ms');
          return (
            <div>
              <span
                className={cn(
                  'text-sm font-medium',
                  lat < 100 ? 'text-green' : lat < 500 ? 'text-orange-500' : 'text-red'
                )}
              >
                {envStatus?.lastLatency || '—'}
              </span>
              <p className="text-xs text-grey-500">avg {envStatus?.averageLatency || '—'}</p>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'interval',
        header: 'Interval',
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {row.original.checkIntervals}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: 'lastChecked',
        header: 'Checked',
        cell: ({ row }) => (
          <span className="text-sm text-grey-600">
            {formatAgo(getEnvStatusForSlug(row.original, selectedEnv)?.lastChecked)}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(row.original); }}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCode(row.original); }}>
                <Code className="h-4 w-4 mr-2" />
                Code
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red" onClick={(e) => { e.stopPropagation(); onDelete(row.original); }}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
      ] as ColumnDef<IHealthCheck>[],
    [selectedEnv, onView, onCode, onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination: { pageIndex: currentPage - 1, pageSize } },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const next = updater({ pageIndex: currentPage - 1, pageSize });
        onPageChange(next.pageIndex + 1);
        onPageSizeChange(next.pageSize);
      }
    },
  });

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-xl border border-grey-300 bg-white min-h-[200px]">
          {isRefreshing ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-rose-600 mb-2" />
              <p className="text-sm text-grey-500">Loading…</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Heart className="h-10 w-10 text-grey-300 mb-2" />
              <p className="text-sm text-grey-600">No healthchecks match filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="bg-grey-50">
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className="text-xs uppercase text-grey-600">
                        {header.isPlaceholder ? null : (
                          <div
                            className={header.column.getCanSort() ? 'cursor-pointer flex items-center' : ''}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: <ChevronUpIcon className="ml-1 h-3 w-3" />, desc: <ChevronDownIcon className="ml-1 h-3 w-3" /> }[
                              header.column.getIsSorted() as string
                            ] ?? null}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-grey-50"
                    onClick={() => onRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      {data.length > 0 && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-grey-300 bg-white flex items-center justify-between text-sm text-grey-600">
          <span>
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, data.length)} of {data.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
              Prev
            </Button>
            <span className="text-xs">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
