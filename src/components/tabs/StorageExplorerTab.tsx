import { useMemo, useState } from 'react';
import {
  LinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader,
  RefreshCw,
  Search,
  Filter,
  X,
  FolderOpen,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  File,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  createColumnHelper,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Dummy data for testing
const DUMMY_FILES: IFileURLPayload[] = [
  {
    url: 'https://storage.example.com/bucket/image1.png',
    workspace_id: 'ws_123',
    product: 'my-product',
    provider: 'aws',
    process_id: 'proc_001',
    type: 'image/png',
    event: 'file-upload',
    env: 'dev',
    size: 1024567,
    created_at: '2024-02-15T10:30:00Z',
  },
  {
    url: 'https://storage.example.com/bucket/document.pdf',
    workspace_id: 'ws_123',
    product: 'my-product',
    provider: 'aws',
    process_id: 'proc_002',
    type: 'application/pdf',
    event: 'file-upload',
    env: 'dev',
    size: 2048900,
    created_at: '2024-02-15T11:15:00Z',
  },
  {
    url: 'https://storage.example.com/bucket/video.mp4',
    workspace_id: 'ws_123',
    product: 'my-product',
    provider: 'gcp',
    process_id: 'proc_003',
    type: 'video/mp4',
    event: 'file-upload',
    env: 'prd',
    size: 10485760,
    created_at: '2024-02-14T16:20:00Z',
  },
  {
    url: 'https://storage.example.com/bucket/data.csv',
    workspace_id: 'ws_123',
    product: 'my-product',
    provider: 'azure',
    process_id: 'proc_004',
    type: 'text/csv',
    event: 'file-upload',
    env: 'dev',
    size: 8192,
    created_at: '2024-02-13T09:45:00Z',
  },
  {
    url: 'https://storage.example.com/bucket/logo.svg',
    workspace_id: 'ws_123',
    product: 'my-product',
    provider: 'aws',
    process_id: 'proc_005',
    type: 'image/svg+xml',
    event: 'file-upload',
    env: 'prd',
    size: 45056,
    created_at: '2024-02-12T14:30:00Z',
  },
  {
    url: 'https://storage.example.com/bucket/report.xlsx',
    workspace_id: 'ws_123',
    product: 'my-product',
    provider: 'gcp',
    process_id: 'proc_006',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    event: 'file-upload',
    env: 'dev',
    size: 156890,
    created_at: '2024-02-11T15:20:00Z',
  },
  {
    url: 'https://storage.example.com/bucket/audio.mp3',
    workspace_id: 'ws_123',
    product: 'my-product',
    provider: 'aws',
    process_id: 'proc_007',
    type: 'audio/mpeg',
    event: 'file-upload',
    env: 'prd',
    size: 3567890,
    created_at: '2024-02-10T08:15:00Z',
  },
  {
    url: 'https://storage.example.com/bucket/backup.zip',
    workspace_id: 'ws_123',
    product: 'my-product',
    provider: 'azure',
    process_id: 'proc_008',
    type: 'application/zip',
    event: 'file-upload',
    env: 'prd',
    size: 25678901,
    created_at: '2024-02-09T14:30:00Z',
  },
];

interface IFileURLPayload {
  url: string;
  workspace_id: string;
  product: string;
  provider: string;
  process_id: string;
  type: string;
  event: string;
  env: string;
  size: number;
  created_at?: string | Date;
}

interface StorageExplorerTabProps {
  storage: {
    name: string;
    tag: string;
    type?: string;
    env: {
      slug: string;
      config: any;
    };
  };
}

export default function StorageExplorerTab({ storage }: StorageExplorerTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    fileType: 'all',
    provider: 'all',
    environment: 'all',
  });

  // Filter files based on search and filters
  const filteredFiles = useMemo(() => {
    let filtered = [...DUMMY_FILES];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((file) => {
        const filename = file.url.substring(file.url.lastIndexOf('/') + 1).toLowerCase();
        const processId = file.process_id.toLowerCase();
        return filename.includes(searchQuery.toLowerCase()) || processId.includes(searchQuery.toLowerCase());
      });
    }

    // Apply file type filter
    if (filters.fileType !== 'all') {
      filtered = filtered.filter((file) => {
        const type = file.type.toLowerCase();
        switch (filters.fileType) {
          case 'image':
            return type.includes('image');
          case 'video':
            return type.includes('video');
          case 'audio':
            return type.includes('audio');
          case 'document':
            return type.includes('pdf') || type.includes('doc') || type.includes('text') || type.includes('spreadsheet');
          case 'archive':
            return type.includes('zip') || type.includes('rar') || type.includes('tar');
          default:
            return true;
        }
      });
    }

    // Apply provider filter
    if (filters.provider !== 'all') {
      filtered = filtered.filter((file) => file.provider.toLowerCase() === filters.provider);
    }

    // Apply environment filter
    if (filters.environment !== 'all') {
      filtered = filtered.filter((file) => file.env === filters.environment);
    }

    return filtered;
  }, [searchQuery, filters]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsRefreshing(false);
    toast.success('Files refreshed');
  };

  const clearFilters = () => {
    setFilters({
      fileType: 'all',
      provider: 'all',
      environment: 'all',
    });
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filters.fileType !== 'all' ||
    filters.provider !== 'all' ||
    filters.environment !== 'all' ||
    searchQuery !== '';

  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);
    return `${size.toFixed(2)} ${sizes[i]}`;
  }

  function getFileNameFromURL(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1);
    } catch (e: any) {
      console.log(e);
      return '';
    }
  }

  function getFileTypeLabel(type: string): string {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('image')) return 'Image';
    if (lowerType.includes('video')) return 'Video';
    if (lowerType.includes('audio')) return 'Audio';
    if (lowerType.includes('pdf')) return 'PDF';
    if (lowerType.includes('spreadsheet') || lowerType.includes('excel')) return 'Spreadsheet';
    if (lowerType.includes('zip') || lowerType.includes('rar') || lowerType.includes('tar')) return 'Archive';
    if (lowerType.includes('text') || lowerType.includes('csv')) return 'Text';
    return 'File';
  }

  function getFileIcon(type: string) {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('image')) return <FileImage className="h-3.5 w-3.5 text-blue group-hover:text-blue-600 transition-colors" />;
    if (lowerType.includes('video')) return <FileVideo className="h-3.5 w-3.5 text-purple-500 group-hover:text-purple-600 transition-colors" />;
    if (lowerType.includes('audio')) return <FileAudio className="h-3.5 w-3.5 text-orange-500 group-hover:text-orange-600 transition-colors" />;
    if (lowerType.includes('pdf')) return <FileText className="h-3.5 w-3.5 text-red group-hover:text-red/80 transition-colors" />;
    if (lowerType.includes('spreadsheet') || lowerType.includes('excel')) return <FileSpreadsheet className="h-3.5 w-3.5 text-green group-hover:text-green/80 transition-colors" />;
    if (lowerType.includes('zip') || lowerType.includes('rar') || lowerType.includes('tar')) return <FileArchive className="h-3.5 w-3.5 text-yellow group-hover:text-yellow/80 transition-colors" />;
    if (lowerType.includes('text') || lowerType.includes('csv')) return <FileText className="h-3.5 w-3.5 text-grey-600 group-hover:text-grey transition-colors" />;
    return <File className="h-3.5 w-3.5 text-grey-500 group-hover:text-grey-600 transition-colors" />;
  }

  function getProviderColor(provider: string) {
    const lowerProvider = provider.toLowerCase();
    switch (lowerProvider) {
      case 'aws':
      case 's3':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'azure':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'gcp':
      case 'google':
        return 'bg-green-50 text-green-600 border-green-200';
      default:
        return 'bg-grey-100 text-grey-700 border-grey-300';
    }
  }

  const columnHelper = createColumnHelper<IFileURLPayload>();
  const columns = useMemo<ColumnDef<IFileURLPayload, any>[]>(
    () => [
      columnHelper.accessor('url', {
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center">
            <LinkIcon
              className="mx-2 size-3 text-primary cursor-pointer hover:text-primary/80 transition-colors"
              onClick={() => window.open(row.original.url, '_blank')}
            />
          </div>
        ),
        enableSorting: false,
      }),
      columnHelper.accessor('created_at', {
        header: 'Timestamp',
        cell: ({ row }) => (
          <div className="flex items-center text-grey font-semibold text-xs">
            {row.original.created_at
              ? format(new Date(String(row.original.created_at)), 'MMM dd, yyyy')
              : '-'}
            <div className="text-[10px] text-grey-600 ml-1">
              {row.original.created_at
                ? format(new Date(String(row.original.created_at)), 'HH:mm')
                : ''}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('url', {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => window.open(row.original.url, '_blank')}
          >
            {getFileIcon(row.original.type)}
            <span className="text-sm font-medium text-blue-800 dark:text-blue-500 hover:text-blue-600 transition-colors hover:underline">
              {getFileNameFromURL(row.original.url)}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: ({ row }) => (
          <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 bg-grey-100 text-grey-700 rounded-md border border-grey-300">
            {getFileTypeLabel(row.original.type)}
          </span>
        ),
      }),
      columnHelper.accessor('process_id', {
        header: 'Process ID',
        cell: ({ row }) => (
          <span className="inline-flex items-center text-xs font-mono font-medium px-2.5 py-1 bg-grey-100 text-grey-700 rounded-md border border-grey-300">
            {row.original.process_id || '-'}
          </span>
        ),
      }),
      columnHelper.accessor('env', {
        header: 'Environment',
        cell: ({ row }) => (
          <Badge
            variant={row.original.env === 'prd' ? 'default' : 'secondary'}
            className={cn(
              'text-xs font-semibold',
              row.original.env === 'prd'
                ? 'bg-green/10 text-green border-green/20'
                : row.original.env === 'dev'
                ? 'bg-blue/10 text-blue border-blue/20'
                : 'bg-yellow/10 text-yellow border-yellow/20'
            )}
          >
            {row.original.env.toUpperCase()}
          </Badge>
        ),
      }),
      columnHelper.accessor('provider', {
        header: 'Provider',
        cell: ({ row }) => (
          <span className={cn(
            'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md border',
            getProviderColor(row.original.provider)
          )}>
            {row.original.provider.toUpperCase()}
          </span>
        ),
      }),
      columnHelper.accessor('size', {
        header: 'Size',
        cell: ({ row }) => (
          <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 bg-grey-100 text-grey-700 rounded-md border border-grey-300">
            {formatSize(row.original.size)}
          </span>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredFiles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({ pageIndex: currentPage - 1, pageSize });
        setCurrentPage(newState.pageIndex + 1);
        setPageSize(newState.pageSize);
      }
    },
    manualPagination: false,
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-grey-50 to-grey-100/50">
      {/* Header */}
      <div className="bg-white px-6 py-5 border-b border-grey-300 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-grey text-2xl font-bold">{storage.name}</h1>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                Files
              </Badge>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="gap-2 shadow-sm hover:shadow transition-shadow"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white px-6 py-4 border-b border-grey-300 flex-shrink-0">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-grey-500" />
              <Input
                type="text"
                placeholder="Search by filename or process ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-grey-50 border-grey-300 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-grey-600">
              <Filter className="h-4 w-4" />
              <span>Filters:</span>
            </div>

            <Select
              value={filters.fileType}
              onValueChange={(value) => {
                setFilters((prev) => ({ ...prev, fileType: value }));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] h-9 bg-white border-grey-300 shadow-sm">
                <SelectValue placeholder="File Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="archive">Archives</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.provider}
              onValueChange={(value) => {
                setFilters((prev) => ({ ...prev, provider: value }));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] h-9 bg-white border-grey-300 shadow-sm">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="aws">AWS</SelectItem>
                <SelectItem value="gcp">GCP</SelectItem>
                <SelectItem value="azure">Azure</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.environment}
              onValueChange={(value) => {
                setFilters((prev) => ({ ...prev, environment: value }));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] h-9 bg-white border-grey-300 shadow-sm">
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="dev">Development</SelectItem>
                <SelectItem value="stg">Staging</SelectItem>
                <SelectItem value="prd">Production</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-2 h-9 text-grey-600 hover:text-grey hover:bg-grey-100"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-grey-100 rounded-md border border-grey-300">
              <span className="text-xs text-grey-600">Total:</span>
              <span className="text-sm font-bold text-grey">{filteredFiles.length}</span>
              <span className="text-xs text-grey-600">file{filteredFiles.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {isRefreshing ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-lg border border-grey-300 shadow-sm">
            <div className="relative mb-4">
              <Loader className="animate-spin w-8 h-8 text-primary" />
              <div className="absolute inset-0 blur-lg bg-primary/20 animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-grey-700">Loading files...</p>
            <p className="text-xs text-grey-500 mt-1">Please wait</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-lg border border-grey-300 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-grey-100 flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-grey-400" />
            </div>
            <p className="text-base font-semibold text-grey mb-1">No files found</p>
            {hasActiveFilters && (
              <p className="text-sm text-grey-600">Try adjusting your filters or search query</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-grey-400 overflow-hidden">
            <div className="overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-grey-400 scrollbar-track-grey-100">
              <Table className="w-full min-w-[1200px]">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-b border-grey-400">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="bg-grey-50 text-grey-600 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                          {header.isPlaceholder ? null : (
                            <div
                              {...{
                                className: header.column.getCanSort()
                                  ? 'cursor-pointer select-none flex items-center hover:text-primary transition-colors'
                                  : 'flex items-center',
                                onClick: header.column.getToggleSortingHandler(),
                              }}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {
                                {
                                  asc: <ChevronUpIcon className="ml-2 h-4 w-4 text-primary" />,
                                  desc: <ChevronDownIcon className="ml-2 h-4 w-4 text-primary" />,
                                }[header.column.getIsSorted() as string] ?? null
                              }
                            </div>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="divide-y divide-grey-400">
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="hover:bg-grey-50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="text-sm text-grey whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination - Attached to table */}
            <div className="bg-grey-50 border-t border-grey-400 px-4 py-3">
              <div className="flex items-center justify-between text-sm text-grey-600">
                <div className="flex items-center gap-4">
                  <div>
                    Showing <span className="font-semibold text-grey">
                      {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredFiles.length)}
                    </span> of{' '}
                    <span className="font-semibold text-grey">
                      {filteredFiles.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-7 px-2 py-1 text-xs border border-grey-400 rounded bg-white"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs px-2">
                    Page {currentPage} of {Math.ceil(filteredFiles.length / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= Math.ceil(filteredFiles.length / pageSize)}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
