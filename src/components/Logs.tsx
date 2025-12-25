import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@wojtekmaj/react-hooks';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  LinkIcon,
  Loader,
} from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import logsServicesReal from '@/services/logsServicesReal';
import { useAuth } from '@/store/useAuth';
import { Input } from './ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ILog } from '@/types/logs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from './ui/badge';
import CopyableTag from './CopyableTag';
import appServicesReal from '@/services/appServicesReal';
import productServicesReal from '@/services/productServicesReal';
import { useWorkbenchStore } from '@/stores/workbench-store';

const responseStatuses = [
  { id: 'fail', name: 'Fail' },
  { id: 'processing', name: 'Processing' },
  { id: 'success', name: 'Success' },
];

const componentTypes = [
  { id: 'app', name: 'App' },
  { id: 'product', name: 'Product' },
  { id: 'database', name: 'Database' },
  { id: 'storage', name: 'Storage' },
  { id: 'cache', name: 'Cache' },
  { id: 'broker', name: 'Messaging' },
  { id: 'job', name: 'Job' },
];

const timeRangeOptions = [
  { id: 'custom', name: 'Custom range', minutes: 0 },
  { id: '30s', name: 'Last 30 seconds', minutes: 0.5 },
  { id: '1m', name: 'Last 1 minute', minutes: 1 },
  { id: '5m', name: 'Last 5 minutes', minutes: 5 },
  { id: '15m', name: 'Last 15 minutes', minutes: 15 },
  { id: '30m', name: 'Last 30 minutes', minutes: 30 },
  { id: '1h', name: 'Last 1 hour', minutes: 60 },
  { id: '5h', name: 'Last 5 hours', minutes: 300 },
  { id: '24h', name: 'Last 24 hours', minutes: 1440 },
  { id: '1w', name: 'Last 1 week', minutes: 10080 },
  { id: '1mo', name: 'Last 1 month', minutes: 43200 },
  { id: '3mo', name: 'Last 3 months', minutes: 129600 },
  { id: '6mo', name: 'Last 6 months', minutes: 259200 },
  { id: '1y', name: 'Last 1 year', minutes: 525600 },
];

type ProcessLog = ILog['logs']['data'][number];

const columnHelper = createColumnHelper<ProcessLog>();

function TableComponent({ processes }: { processes: ProcessLog[] }) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const columns = useMemo<ColumnDef<ProcessLog, any>[]>(
    () => [
      columnHelper.accessor('_id', {
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center">
            {row.original.successful_execution ? (
              <div className="-ml-1 h-6 w-[4px] bg-blue-500" />
            ) : row.original.status === 'fail' ? (
              <div className="-ml-1 h-6 w-[4px] bg-red" />
            ) : row.original.status === 'success' ? (
              <div className="-ml-1 h-6 w-[4px] bg-green" />
            ) : (
              <div className="-ml-1 h-6 w-[4px] bg-transparent" />
            )}
            <LinkIcon className="mx-2 size-3 text-primary" />
            <button onClick={() => toggleRow(row.original._id)} className="mr-2">
              {expandedRows[row.original._id] ? (
                <ChevronDownIcon className="size-4" />
              ) : (
                <ChevronRightIcon className="size-4" />
              )}
            </button>
          </div>
        ),
      }),
      columnHelper.accessor('timestamp', {
        header: 'Timestamp',
        cell: ({ row }) => (
          <div className="flex items-center text-grey font-semibold">
            {format(new Date(row.original.timestamp), 'yyyy-MM-dd HH:mm:ss')}
          </div>
        ),
      }),
      columnHelper.accessor('process_id', {
        header: 'Process ID',
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-[#444444] font-semibold px-4 h-6 bg-[#F3F7FD] w-fit rounded-full">
            {row.original.process_id}
          </div>
        ),
      }),
      columnHelper.accessor('app_env', {
        header: 'Environment',
        cell: ({ row }) => (
          <Badge
            variant={row.original.app_env === 'prd' ? 'default' : 'secondary'}
            className="rounded-full"
          >
            {row.original.app_env || row.original.env}
          </Badge>
        ),
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-[#444444] font-semibold px-4 h-6 bg-[#F3F7FD] w-fit rounded-full">
            {row.original.name}
          </div>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-[#444444] font-semibold px-4 h-6 bg-[#F3F7FD] w-fit rounded-full">
            {row.original.type}
          </div>
        ),
      }),
      columnHelper.accessor('message', {
        header: 'Message',
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-[#444444] font-semibold px-4 h-6 bg-[#F3F7FD] w-fit rounded-full">
            {row.original.message}
          </div>
        ),
      }),
      columnHelper.accessor('child_tag', {
        header: 'Operation',
        cell: ({ row }) => (
          <div>
            <CopyableTag
              tag={String(
                row.original.child_tag
                  ? `${row.original.parent_tag ? `${row.original.parent_tag}:` : ''}${row.original.child_tag}`
                  : row.original.feature_tag || row.original.parent_tag
              )}
              className="text-primary bg-primary/15 border-primary border-[0.5px] bg-opacity-[15%] text-xs font-medium px-2 py-1 rounded-sm w-fit h-5 flex items-center justify-center"
            />
          </div>
        ),
      }),
    ],
    [expandedRows]
  );

  const table = useReactTable({
    data: processes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full">
      <div className="rounded-md border border-grey-400">
        {/* Desktop View */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="bg-[#F2F6FF]">
                      {header.isPlaceholder ? null : (
                        <div
                          {...{
                            className: header.column.getCanSort()
                              ? 'cursor-pointer select-none flex items-center'
                              : '',
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {
                            {
                              asc: <ChevronUpIcon className="ml-2 h-4 w-4" />,
                              desc: <ChevronDownIcon className="ml-2 h-4 w-4" />,
                            }[header.column.getIsSorted() as string] ?? null
                          }
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow key={row.id} className="h-11">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedRows[row.original._id] && (
                    <TableRow>
                      <TableCell colSpan={columns.length}>
                        <pre className="bg-gray-100 p-4 rounded-md contain-inline-size overflow-x-auto">
                          <code className="text-grey text-sm font-medium">
                            {JSON.stringify(JSON.parse(row.original.data), null, 2)}
                          </code>
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden">
          {processes?.length ? (
            <div className="divide-y divide-grey-400">
              {processes.map((log) => (
                <LogCard key={log._id} log={log} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center my-10">
              <p className="text-sm text-grey font-semibold">No logs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LogCard({ log }: { log: ProcessLog }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-4 border-b border-grey-400 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {log.successful_execution ? (
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          ) : log.status === 'fail' ? (
            <div className="h-2 w-2 rounded-full bg-red" />
          ) : log.status === 'success' ? (
            <div className="h-2 w-2 rounded-full bg-green" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-transparent" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-grey font-semibold">
              {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
            </span>
            <button onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-grey" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-grey" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="text-sm text-[#444444] font-semibold px-3 py-1 bg-[#F3F7FD] rounded-full">
              {log.process_id}
            </div>
            <Badge
              variant={log.app_env === 'prd' ? 'default' : 'secondary'}
              className="rounded-full"
            >
              {log.app_env || log.env}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="text-sm text-[#444444] font-semibold px-3 py-1 bg-[#F3F7FD] rounded-full">
              {log.name}
            </div>
            <div className="text-sm text-[#444444] font-semibold px-3 py-1 bg-[#F3F7FD] rounded-full">
              {log.type}
            </div>
          </div>

          <div className="text-sm text-[#444444] font-semibold px-3 py-1 bg-[#F3F7FD] rounded-full">
            {log.message}
          </div>

          <div>
            <CopyableTag
              tag={String(
                log.child_tag
                  ? `${log.parent_tag ? `${log.parent_tag}:` : ''}${log.child_tag}`
                  : log.feature_tag || log.parent_tag
              )}
              className="text-primary bg-primary/15 border-primary border-[0.5px] bg-opacity-[15%] text-xs font-medium px-2 py-1 rounded-sm w-fit h-5 flex items-center justify-center"
            />
          </div>

          {isExpanded && (
            <div className="mt-4">
              <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                <code className="text-grey text-sm font-medium">
                  {JSON.stringify(JSON.parse(log.data), null, 2)}
                </code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Logs() {
  const { user, currentWorkspaceId } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { logsFilters, setLogsFilters } = useWorkbenchStore();

  const debouncedSearch = useDebouncedValue(logsFilters.searchTerm, 500);

  // Calculate date range based on selected time range
  const getDateRange = (timeRange: string) => {
    const option = timeRangeOptions.find(opt => opt.id === timeRange);
    if (!option) return { start_date: undefined, end_date: undefined };
    
    const now = new Date();
    const startDate = new Date(now.getTime() - (option.minutes * 60 * 1000));
    
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    };
  };

  // Fetch products for filtering
  const { data: productsData } = useQuery({
    queryKey: ['products', currentWorkspaceId],
    queryFn: () =>
      productServicesReal.fetchProducts({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    enabled: !!currentWorkspaceId,
  });

  // Fetch apps for filtering
  const { data: appsData } = useQuery({
    queryKey: ['apps', currentWorkspaceId],
    queryFn: () =>
      appServicesReal.fetchApps({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    enabled: !!currentWorkspaceId,
  });

  const products = productsData?.data || [];
  const apps = appsData?.data || [];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status: logsStatus,
  } = useInfiniteQuery({
    queryKey: ['workspace-logs', currentWorkspaceId, logsFilters.component, logsFilters.app, logsFilters.product, logsFilters.status, logsFilters.startDate, logsFilters.endDate, logsFilters.timeRange, debouncedSearch],
    queryFn: ({ pageParam = 1 }) => {
      const dateRange = getDateRange(logsFilters.timeRange);
      return logsServicesReal.fetchLogs(
        {
          user_id: user?._id ?? '',
          public_key: user?.public_key ?? '',
          workspace_id: currentWorkspaceId ?? '',
        },
        {
          component: logsFilters.component === 'all' ? undefined : logsFilters.component,
          app_id: logsFilters.app === 'all' ? undefined : logsFilters.app,
          product_id: logsFilters.product === 'all' ? undefined : logsFilters.product,
          status: logsFilters.status === 'all' ? undefined : logsFilters.status,
          process_id: debouncedSearch || undefined,
          start_date: logsFilters.startDate || dateRange.start_date,
          end_date: logsFilters.endDate || dateRange.end_date,
          page: pageParam,
          limit: 20,
        }
      );
    },
    getNextPageParam: (lastPage) => {
      // Check if metadata exists at root level or in data.logs
      const metadata = lastPage.metadata || lastPage.data?.logs?.metadata;
      if (!metadata) return undefined;

      const { page, totalPages } = metadata;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: true,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allLogs = useMemo(() => {
    return data?.pages.flatMap((page) => {
      // Handle different possible response structures
      return page?.data?.logs?.data ?? [];
    }) ?? [];
  }, [data]);

  const clearFilters = () => {
    setLogsFilters({
      component: 'all',
      app: 'all',
      product: 'all',
      status: 'all',
      searchTerm: '',
      startDate: '',
      endDate: '',
      timeRange: '24h',
    });
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm ml-6 me-6">
        <h1 className="text-grey text-xl font-bold">Workspace Logs</h1>
        <p className="text-sm text-grey-600 mt-1">
          View and filter logs across all products and apps in your workspace
        </p>
      </div>

      {logsStatus === 'pending' ? (
        <div className="flex items-center justify-center pt-20">
          <Loader className="animate-spin" />
        </div>
      ) : (
        <div className="p-6">
          <div className="flex flex-col gap-4">
              {/* Search and Filters */}
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-grey-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <Input
                    type="text"
                    placeholder="Search logs by process ID, message, or tag..."
                    value={logsFilters.searchTerm}
                    onChange={(e) => setLogsFilters({ searchTerm: e.target.value })}
                    className="pl-10 h-9 border-grey-300 focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-grey-600 hover:text-grey border border-grey-300 rounded-md hover:bg-grey-50 transition-colors"
                >
                  Clear filters
                </button>
              </div>

              {/* Filter Bar */}
              <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {/* Component Filter */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm text-grey-600 font-medium">Component:</span>
                    <Select
                      value={logsFilters.component}
                      onValueChange={(value) => setLogsFilters({ component: value })}
                    >
                      <SelectTrigger className="h-9 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {componentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Product Filter - Only show if component is selected */}
                  {logsFilters.component !== 'all' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-grey-600 font-medium">Product:</span>
                      <Select
                        value={logsFilters.product}
                        onValueChange={(value) => setLogsFilters({ product: value })}
                      >
                        <SelectTrigger className="h-9 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product._id} value={product._id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* App Filter - Only show if product is selected */}
                  {logsFilters.product !== 'all' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-grey-600 font-medium">App:</span>
                      <Select
                        value={logsFilters.app}
                        onValueChange={(value) => setLogsFilters({ app: value })}
                      >
                        <SelectTrigger className="h-9 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {apps.map((app) => (
                            <SelectItem key={app._id} value={app._id}>
                              {app.app_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Status Filter - Always visible */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm text-grey-600 font-medium">Status:</span>
                    <Select
                      value={logsFilters.status}
                      onValueChange={(value) => setLogsFilters({ status: value })}
                    >
                      <SelectTrigger className="h-9 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {responseStatuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                status.id === 'success' ? 'bg-green-500' :
                                status.id === 'fail' ? 'bg-red-500' :
                                'bg-yellow-500'
                              }`}></div>
                              {status.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time Range Filter - Always visible */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm text-grey-600 font-medium">Time:</span>
                    <Select
                      value={logsFilters.timeRange}
                      onValueChange={(value) => setLogsFilters({ timeRange: value })}
                    >
                      <SelectTrigger className="h-9 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeRangeOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range Filters - Only show if custom time range is selected */}
                  {logsFilters.timeRange === 'custom' && (
                    <>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm text-grey-600 font-medium">From:</span>
                        <Input
                          type="datetime-local"
                          value={logsFilters.startDate ? new Date(logsFilters.startDate + 'T00:00').toISOString().slice(0, 16) : ''}
                          onChange={(e) => setLogsFilters({ startDate: e.target.value ? new Date(e.target.value).toISOString().split('T')[0] : '' })}
                          className="h-9 w-48"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm text-grey-600 font-medium">To:</span>
                        <Input
                          type="datetime-local"
                          value={logsFilters.endDate ? new Date(logsFilters.endDate + 'T23:59').toISOString().slice(0, 16) : ''}
                          onChange={(e) => setLogsFilters({ endDate: e.target.value ? new Date(e.target.value).toISOString().split('T')[0] : '' })}
                          className="h-9 w-48"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Active Filter Chips */}
              {(logsFilters.component !== 'all' ||
                logsFilters.app !== 'all' ||
                logsFilters.product !== 'all' ||
                logsFilters.status !== 'all' ||
                logsFilters.timeRange !== '24h' ||
                logsFilters.startDate ||
                logsFilters.endDate) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-grey-600 font-medium">Active filters:</span>
                  {logsFilters.component !== 'all' && (
                    <Badge variant="outline" className="text-grey bg-white border-grey-400 hover:bg-grey-50">
                      Component: {componentTypes.find((c) => c.id === logsFilters.component)?.name}
                      <button
                        onClick={() => setLogsFilters({ component: 'all' })}
                        className="ml-1 hover:bg-grey-200 rounded-full p-0.5"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  )}
                  {logsFilters.product !== 'all' && (
                    <Badge variant="outline" className="text-grey bg-white border-grey-400 hover:bg-grey-50">
                      Product: {products.find((p) => p._id === logsFilters.product)?.name}
                      <button
                        onClick={() => setLogsFilters({ product: 'all' })}
                        className="ml-1 hover:bg-grey-200 rounded-full p-0.5"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  )}
                  {logsFilters.app !== 'all' && (
                    <Badge variant="outline" className="text-grey bg-white border-grey-400 hover:bg-grey-50">
                      App: {apps.find((a) => a._id === logsFilters.app)?.app_name}
                      <button
                        onClick={() => setLogsFilters({ app: 'all' })}
                        className="ml-1 hover:bg-grey-200 rounded-full p-0.5"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  )}
                  {logsFilters.status !== 'all' && (
                    <Badge variant="outline" className="text-grey bg-white border-grey-400 hover:bg-grey-50">
                      Status: {capitalizeFirst(logsFilters.status)}
                      <button
                        onClick={() => setLogsFilters({ status: 'all' })}
                        className="ml-1 hover:bg-grey-200 rounded-full p-0.5"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  )}
                  {logsFilters.timeRange !== '24h' && (
                    <Badge variant="outline" className="text-grey bg-white border-grey-400 hover:bg-grey-50">
                      Time: {timeRangeOptions.find((t) => t.id === logsFilters.timeRange)?.name}
                      <button
                        onClick={() => setLogsFilters({ timeRange: '24h' })}
                        className="ml-1 hover:bg-grey-200 rounded-full p-0.5"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  )}
                  {logsFilters.startDate && (
                    <Badge variant="outline" className="text-grey bg-white border-grey-400 hover:bg-grey-50">
                      From: {logsFilters.startDate}
                      <button
                        onClick={() => setLogsFilters({ startDate: '' })}
                        className="ml-1 hover:bg-grey-200 rounded-full p-0.5"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  )}
                  {logsFilters.endDate && (
                    <Badge variant="outline" className="text-grey bg-white border-grey-400 hover:bg-grey-50">
                      To: {logsFilters.endDate}
                      <button
                        onClick={() => setLogsFilters({ endDate: '' })}
                        className="ml-1 hover:bg-grey-200 rounded-full p-0.5"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Table/Cards Component */}
            {allLogs.length > 0 ? <TableComponent processes={allLogs} /> : null}

            {/* Load More */}
            <div ref={loadMoreRef}>
              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4">
                  <Loader className="animate-spin" />
                </div>
              )}
            </div>

            {/* Empty States */}
            {!hasNextPage && Number(data?.pages[0]?.data?.logs?.data?.length) > 0 && (
              <div className="flex items-center justify-center py-4">
                <p className="text-grey text-sm font-semibold">No more logs</p>
              </div>
            )}

            {data?.pages[0]?.data?.logs?.data?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10">
                <p className="text-grey text-sm font-semibold mt-4">No logs found</p>
                {(logsFilters.component !== 'all' ||
                  logsFilters.app !== 'all' ||
                  logsFilters.product !== 'all' ||
                  logsFilters.status !== 'all' ||
                  logsFilters.timeRange !== '24h' ||
                  logsFilters.startDate ||
                  logsFilters.endDate ||
                  logsFilters.searchTerm) && (
                  <p className="text-grey-600 text-sm mt-2">
                    Try adjusting your filters or search terms
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
