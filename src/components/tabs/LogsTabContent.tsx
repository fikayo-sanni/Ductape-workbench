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
import logsServices from '@/services/logsServices';
import { useAuth } from '@/store/useAuth';
import { Input } from '../ui/input';
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
import { Badge } from '../ui/badge';
import CopyableTag from '../CopyableTag';
import appServicesReal from '@/services/appServicesReal';
import productServicesReal from '@/services/productServicesReal';

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
  { id: 'broker', name: 'Message Broker' },
  { id: 'job', name: 'Job' },
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

export default function LogsTabContent() {
  const { user, currentWorkspaceId } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    component: 'all',
    app: 'all',
    product: 'all',
    status: 'all',
  });

  const debouncedSearch = useDebouncedValue(searchTerm, 500);

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
    queryKey: ['workspace-logs', currentWorkspaceId, filters, debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      logsServices.fetchLogs(
        {
          user_id: user?._id ?? '',
          public_key: user?.public_key ?? '',
          workspace_id: currentWorkspaceId ?? '',
        },
        {
          component: filters.component === 'all' ? undefined : filters.component,
          app_id: filters.app === 'all' ? undefined : filters.app,
          product_id: filters.product === 'all' ? undefined : filters.product,
          status: filters.status === 'all' ? undefined : filters.status,
          process_id: debouncedSearch || undefined,
          page: pageParam,
          limit: 20,
        }
      ),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.logs.metadata;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!currentWorkspaceId,
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
    return data?.pages.flatMap((page) => page.data.logs.data) ?? [];
  }, [data]);

  const clearFilters = () => {
    setFilters({
      component: 'all',
      app: 'all',
      product: 'all',
      status: 'all',
    });
    setSearchTerm('');
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="h-full overflow-auto bg-grey-100">
      <div className="bg-white px-6 py-4 border-b border-grey-400">
        <h1 className="text-grey text-xl font-bold">Workspace Logs</h1>
      </div>

      {logsStatus === 'pending' ? (
        <div className="flex items-center justify-center pt-20">
          <Loader className="animate-spin" />
        </div>
      ) : (
        <div className="px-6 mt-6">
          <div className="flex flex-col gap-4">
            {/* Search and Filters */}
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="w-full">
                <Input
                  type="text"
                  placeholder="Search by process ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                <Select
                  value={filters.component}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, component: value }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select component type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All components</SelectItem>
                    {componentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.product}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, product: value }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.app}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, app: value }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select app" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All apps</SelectItem>
                    {apps.map((app) => (
                      <SelectItem key={app._id} value={app._id}>
                        {app.app_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {responseStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(filters.component !== 'all' ||
                  filters.app !== 'all' ||
                  filters.product !== 'all' ||
                  filters.status !== 'all' ||
                  searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-grey-600 hover:text-grey flex items-center gap-2 px-3 py-2 rounded-md hover:bg-grey-100"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Active Filters Display */}
              {(filters.component !== 'all' ||
                filters.app !== 'all' ||
                filters.product !== 'all' ||
                filters.status !== 'all') && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-sm text-grey-600">Filtered by:</span>
                  {filters.component !== 'all' && (
                    <Badge variant="outline" className="text-grey">
                      Component:{' '}
                      {componentTypes.find((c) => c.id === filters.component)?.name}
                    </Badge>
                  )}
                  {filters.product !== 'all' && (
                    <Badge variant="outline" className="text-grey">
                      Product:{' '}
                      {products.find((p) => p._id === filters.product)?.name}
                    </Badge>
                  )}
                  {filters.app !== 'all' && (
                    <Badge variant="outline" className="text-grey">
                      App: {apps.find((a) => a._id === filters.app)?.app_name}
                    </Badge>
                  )}
                  {filters.status !== 'all' && (
                    <Badge variant="outline" className="text-grey">
                      Status: {capitalizeFirst(filters.status)}
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

            {data?.pages[0].data.logs.data.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10">
                <p className="text-grey text-sm font-semibold mt-4">No logs found</p>
                {(filters.component !== 'all' ||
                  filters.app !== 'all' ||
                  filters.product !== 'all' ||
                  filters.status !== 'all' ||
                  searchTerm) && (
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
