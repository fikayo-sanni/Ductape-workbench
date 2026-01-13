import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  LinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2,
  RefreshCw,
  Search,
  X,
  FolderOpen,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  File,
  HardDrive,
  Upload,
  Trash2,
  Download,
  Eye,
  MoreVertical,
  Filter,
  Folder,
  ChevronRight,
  LayoutDashboard,
  List,
  TrendingUp,
  TrendingDown,
  Database,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CheckCircle,
  XCircle,
  BarChart3,
  Package,
  ExternalLink,
  PanelLeftClose,
  PanelLeft,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  createColumnHelper,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useAuth } from '@/store/useAuth';
import { SDKProxyService, SDKProxyConfig } from '@/services/sdkProxy';
import logsServices, { StorageDashboardMetrics } from '@/services/logsServices';
import { saveTabState, getTabState } from '@/lib/tab-state-manager';

/**
 * Storage file info from SDK - matches IStorageFileInfo from @ductape/sdk
 */
interface IStorageFileInfo {
  name: string;
  size: number;
  lastModified: Date | string;
  url?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result from SDK storage.listFiles - matches IListFilesResult from @ductape/sdk
 */
interface IListFilesResult {
  success: boolean;
  files: IStorageFileInfo[];
  total?: number;
  page?: number;
  limit?: number;
  nextToken?: string;
  hasMore: boolean;
}

/**
 * Result from SDK storage.stats - matches IStorageStatsResult from @ductape/sdk
 */
interface IStorageStatsResult {
  success: boolean;
  totalFiles: number;
  totalSize: number;
  byType: {
    image: { count: number; size: number };
    video: { count: number; size: number };
    audio: { count: number; size: number };
    document: { count: number; size: number };
    archive: { count: number; size: number };
    other: { count: number; size: number };
  };
}

interface StorageExplorerTabProps {
  tabId: string;
  storage: {
    name: string;
    tag: string;
    type?: string;
    provider?: string;
    productTag?: string;
    productName?: string;
    productId?: string;
    env: {
      slug: string;
      config: any;
    };
  };
}

/**
 * Interface for persisted storage explorer state
 */
interface StorageExplorerPersistedState {
  files: IStorageFileInfo[];
  hasMore: boolean;
  nextToken?: string;
  viewMode: ViewMode;
  selectedFileType: FileTypeFilter;
  searchQuery: string;
  storageStats: IStorageStatsResult | null;
  dashboardMetrics: StorageDashboardMetrics | null;
}

type FileTypeFilter = 'all' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

// File type categorization
const FILE_TYPES: { value: FileTypeFilter; label: string; icon: React.ReactNode; count: number }[] = [
  { value: 'all', label: 'All Files', icon: <Folder className="h-4 w-4" />, count: 8 },
  { value: 'image', label: 'Images', icon: <FileImage className="h-4 w-4" />, count: 2 },
  { value: 'video', label: 'Videos', icon: <FileVideo className="h-4 w-4" />, count: 1 },
  { value: 'audio', label: 'Audio', icon: <FileAudio className="h-4 w-4" />, count: 1 },
  { value: 'document', label: 'Documents', icon: <FileText className="h-4 w-4" />, count: 3 },
  { value: 'archive', label: 'Archives', icon: <FileArchive className="h-4 w-4" />, count: 1 },
  { value: 'other', label: 'Other', icon: <File className="h-4 w-4" />, count: 0 },
];

type ViewMode = 'overview' | 'files';

/**
 * Get MIME type from file name extension
 */
function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    // Archives
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    '7z': 'application/x-7z-compressed',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export default function StorageExplorerTab({ tabId, storage }: StorageExplorerTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const hasRestoredStateRef = useRef(false);

  // Guard: Check for incomplete storage data (can happen after tab restoration)
  if (!storage?.name || !storage?.tag || !storage?.env?.slug) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <HardDrive className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete storage data</p>
          <p className="text-sm text-grey-500">Please close this tab and reopen the storage from the explorer.</p>
        </div>
      </div>
    );
  }

  // SDK proxy configuration
  const sdkProxyConfig: SDKProxyConfig | null = useMemo(() => {
    if (!currentWorkspaceId || !user?._id || !user?.auth_token || !user?.public_key) {
      return null;
    }
    return {
      workspace_id: currentWorkspaceId,
      user_id: user._id,
      token: user.auth_token,
      public_key: user.public_key,
    };
  }, [currentWorkspaceId, user?._id, user?.auth_token, user?.public_key]);

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize] = useState(25); // Server-side page size
  const [selectedFileType, setSelectedFileType] = useState<FileTypeFilter>('all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Data State
  const [files, setFiles] = useState<IStorageFileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextToken, setNextToken] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFetchedFilesRef = useRef<string | null>(null);
  const hasFetchedMetricsRef = useRef<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Dashboard metrics from logs endpoint
  const [dashboardMetrics, setDashboardMetrics] = useState<StorageDashboardMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Storage stats from SDK stats() API - accurate counts across all files
  const [storageStats, setStorageStats] = useState<IStorageStatsResult | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const hasFetchedStatsRef = useRef<string | null>(null);

  // Filter State (read-only for this storage instance)
  const providerFilter = storage.provider || storage.type || 'all';
  const envFilter = storage.env.slug || 'all';

  // Restore state from tab state manager on mount
  useEffect(() => {
    if (hasRestoredStateRef.current) return;

    const savedState = getTabState(tabId);
    if (savedState?.data) {
      const persistedState = savedState.data as StorageExplorerPersistedState;

      // Restore all persisted state
      if (persistedState.files && persistedState.files.length > 0) {
        setFiles(persistedState.files);
        setHasMore(persistedState.hasMore);
        setNextToken(persistedState.nextToken);
        setIsLoading(false);

        // Mark that we've already fetched files so we don't refetch
        const storageKey = `${storage.productTag}:${storage.tag}:${storage.env.slug}`;
        hasFetchedFilesRef.current = storageKey;
      }

      if (persistedState.viewMode) {
        setViewMode(persistedState.viewMode);
      }

      if (persistedState.selectedFileType) {
        setSelectedFileType(persistedState.selectedFileType);
      }

      if (persistedState.searchQuery) {
        setSearchQuery(persistedState.searchQuery);
      }

      if (persistedState.storageStats) {
        setStorageStats(persistedState.storageStats);
        setIsLoadingStats(false);
        const storageKey = `${storage.productTag}:${storage.tag}:${storage.env.slug}`;
        hasFetchedStatsRef.current = storageKey;
      }

      if (persistedState.dashboardMetrics) {
        setDashboardMetrics(persistedState.dashboardMetrics);
        setIsLoadingMetrics(false);
        const storageKey = `${storage.productTag}:${storage.tag}:${storage.env.slug}`;
        hasFetchedMetricsRef.current = storageKey;
      }
    }

    hasRestoredStateRef.current = true;
  }, [tabId, storage.productTag, storage.tag, storage.env.slug]);

  // Save state to tab state manager when data changes
  useEffect(() => {
    // Only save after initial load is complete and we have some data
    if (!hasRestoredStateRef.current) return;
    if (isLoading && files.length === 0) return;

    const persistedState: StorageExplorerPersistedState = {
      files,
      hasMore,
      nextToken,
      viewMode,
      selectedFileType,
      searchQuery,
      storageStats,
      dashboardMetrics,
    };

    saveTabState(
      tabId,
      'storage-explorer',
      `${storage.name} (${storage.env.slug})`,
      persistedState,
      undefined,
      `${storage.tag}:${storage.env.slug}`
    );
  }, [tabId, storage.name, storage.tag, storage.env.slug, files, hasMore, nextToken, viewMode, selectedFileType, searchQuery, storageStats, dashboardMetrics, isLoading]);

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  /**
   * Fetch files from the SDK proxy with server-side pagination and optional file type filtering
   */
  const fetchFiles = useCallback(async (options?: {
    refresh?: boolean;
    loadMore?: boolean;
    continuationToken?: string;
    fileType?: FileTypeFilter;
  }) => {
    if (!sdkProxyConfig || !storage.productTag) {
      setIsLoading(false);
      setError('Missing SDK configuration or product tag');
      return;
    }

    try {
      if (options?.refresh) {
        setIsRefreshing(true);
      } else if (options?.loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const sdkProxy = new SDKProxyService(sdkProxyConfig);

      // Build request params - only include fileType if it's not 'all'
      const requestParams: Record<string, any> = {
        product: storage.productTag,
        env: storage.env.slug,
        storage: storage.tag,
        limit: pageSize,
        continuationToken: options?.loadMore ? options.continuationToken : undefined,
      };

      // Add fileType filter if specified and not 'all'
      const filterType = options?.fileType;
      if (filterType && filterType !== 'all') {
        requestParams.fileType = filterType;
      }

      const result = await sdkProxy.storage.listFiles<IListFilesResult>(requestParams);

      if (result && result.files) {
        if (options?.loadMore) {
          // Append to existing files
          setFiles(prev => [...prev, ...result.files]);
        } else {
          // Replace files (initial load or refresh)
          setFiles(result.files);
        }
        setHasMore(result.hasMore);
        setNextToken(result.nextToken);
      } else {
        if (!options?.loadMore) {
          setFiles([]);
        }
        setHasMore(false);
      }
    } catch (err) {
      console.error('[StorageExplorer] Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
      if (!options?.loadMore) {
        setFiles([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [sdkProxyConfig, storage.productTag, storage.env.slug, storage.tag, pageSize]);

  // Fetch files on mount - only fetch once per storage instance
  useEffect(() => {
    const storageKey = `${storage.productTag}:${storage.tag}:${storage.env.slug}`;
    if (hasFetchedFilesRef.current !== storageKey) {
      hasFetchedFilesRef.current = storageKey;
      fetchFiles();
    }
  }, [fetchFiles, storage.productTag, storage.tag, storage.env.slug]);

  /**
   * Fetch dashboard metrics from logs endpoint
   */
  const fetchDashboardMetrics = useCallback(async () => {
    if (!currentWorkspaceId || !user?._id || !user?.public_key || !storage.productTag) {
      setIsLoadingMetrics(false);
      return;
    }

    try {
      setIsLoadingMetrics(true);
      const metrics = await logsServices.fetchStorageDashboard(
        currentWorkspaceId,
        user._id,
        user.public_key,
        {
          product_tag: storage.productTag,
          storage_tag: storage.tag,
          env: storage.env.slug,
          groupBy: 'day',
        }
      );
      setDashboardMetrics(metrics);
    } catch (err) {
      console.error('[StorageExplorer] Error fetching dashboard metrics:', err);
      // Don't set error state, we have fallback data
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [currentWorkspaceId, user?._id, user?.public_key, storage.productTag, storage.tag, storage.env.slug]);

  // Fetch dashboard metrics on mount - only fetch once per storage instance
  useEffect(() => {
    const storageKey = `${storage.productTag}:${storage.tag}:${storage.env.slug}`;
    if (hasFetchedMetricsRef.current !== storageKey) {
      hasFetchedMetricsRef.current = storageKey;
      fetchDashboardMetrics();
    }
  }, [fetchDashboardMetrics, storage.productTag, storage.tag, storage.env.slug]);

  /**
   * Fetch storage stats from SDK stats() API
   * This provides accurate total file counts and breakdown by type
   */
  const fetchStorageStats = useCallback(async () => {
    if (!sdkProxyConfig || !storage.productTag) {
      setIsLoadingStats(false);
      return;
    }

    try {
      setIsLoadingStats(true);
      const sdkProxy = new SDKProxyService(sdkProxyConfig);
      const result = await sdkProxy.storage.stats<IStorageStatsResult>({
        product: storage.productTag,
        env: storage.env.slug,
        storage: storage.tag,
      });

      if (result && result.success) {
        setStorageStats(result);
      }
    } catch (err) {
      console.error('[StorageExplorer] Error fetching storage stats:', err);
      // Don't set error state, we have fallback to local calculation
    } finally {
      setIsLoadingStats(false);
    }
  }, [sdkProxyConfig, storage.productTag, storage.env.slug, storage.tag]);

  // Fetch storage stats on mount - only fetch once per storage instance
  useEffect(() => {
    const storageKey = `${storage.productTag}:${storage.tag}:${storage.env.slug}`;
    if (hasFetchedStatsRef.current !== storageKey) {
      hasFetchedStatsRef.current = storageKey;
      fetchStorageStats();
    }
  }, [fetchStorageStats, storage.productTag, storage.tag, storage.env.slug]);

  // Infinite scroll - load more when sentinel element is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoadingMore && nextToken) {
          handleLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px', // Start loading 100px before reaching the end
        threshold: 0.1,
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, isLoadingMore, nextToken]);

  // Calculate storage metrics - use stats() API when available, fall back to local calculation
  const storageMetrics = useMemo(() => {
    const loadedCount = files.length;

    // If we have stats from the API, use those for accurate counts
    if (storageStats) {
      return {
        totalFiles: storageStats.totalFiles,
        totalSize: storageStats.totalSize,
        imageCount: storageStats.byType.image.count,
        videoCount: storageStats.byType.video.count,
        audioCount: storageStats.byType.audio.count,
        documentCount: storageStats.byType.document.count,
        archiveCount: storageStats.byType.archive.count,
        otherCount: storageStats.byType.other.count,
        imageSize: storageStats.byType.image.size,
        videoSize: storageStats.byType.video.size,
        audioSize: storageStats.byType.audio.size,
        documentSize: storageStats.byType.document.size,
        archiveSize: storageStats.byType.archive.size,
        otherSize: storageStats.byType.other.size,
        loadedCount,
        hasMore,
        isFromStats: true,
      };
    }

    // Fallback: Calculate from loaded files when stats API hasn't loaded yet
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

    // Helper to get mime type for a file
    const getType = (f: IStorageFileInfo) => (f.mimeType || getMimeTypeFromFileName(f.name)).toLowerCase();

    // Calculate counts from loaded files
    const imageCount = files.filter(f => getType(f).includes('image')).length;
    const videoCount = files.filter(f => getType(f).includes('video')).length;
    const audioCount = files.filter(f => getType(f).includes('audio')).length;
    const documentCount = files.filter(f => {
      const type = getType(f);
      return type.includes('pdf') || type.includes('doc') || type.includes('text') ||
        type.includes('spreadsheet') || type.includes('csv') || type.includes('word') ||
        type.includes('excel') || type.includes('powerpoint');
    }).length;
    const archiveCount = files.filter(f => {
      const type = getType(f);
      return type.includes('zip') || type.includes('rar') || type.includes('tar') || type.includes('gz') || type.includes('7z');
    }).length;
    const otherCount = loadedCount - imageCount - videoCount - audioCount - documentCount - archiveCount;

    // Size by type (can only calculate from loaded files)
    const imageSize = files.filter(f => getType(f).includes('image')).reduce((sum, f) => sum + (f.size || 0), 0);
    const videoSize = files.filter(f => getType(f).includes('video')).reduce((sum, f) => sum + (f.size || 0), 0);
    const audioSize = files.filter(f => getType(f).includes('audio')).reduce((sum, f) => sum + (f.size || 0), 0);
    const documentSize = files.filter(f => {
      const type = getType(f);
      return type.includes('pdf') || type.includes('doc') || type.includes('text') ||
        type.includes('spreadsheet') || type.includes('csv');
    }).reduce((sum, f) => sum + (f.size || 0), 0);
    const archiveSize = files.filter(f => {
      const type = getType(f);
      return type.includes('zip') || type.includes('rar') || type.includes('tar');
    }).reduce((sum, f) => sum + (f.size || 0), 0);
    const otherSize = totalSize - imageSize - videoSize - audioSize - documentSize - archiveSize;

    return {
      totalFiles: loadedCount,
      totalSize,
      imageCount,
      videoCount,
      audioCount,
      documentCount,
      archiveCount,
      otherCount,
      imageSize,
      videoSize,
      audioSize,
      documentSize,
      archiveSize,
      otherSize,
      loadedCount,
      hasMore,
      isFromStats: false,
    };
  }, [files, hasMore, storageStats]);

  // Activity stats from dashboard metrics (7-day data from logs endpoint)
  const weeklyStats = useMemo(() => {
    // Use real data from logs endpoint if available
    if (dashboardMetrics) {
      // Calculate bandwidth from bytes uploaded + downloaded
      const bandwidthBytes = dashboardMetrics.recentActivity.last7Days.totalSize || 0;
      const bandwidthMB = Math.round(bandwidthBytes / (1024 * 1024));

      // Map dailyActivity to the expected format
      const dailyTrend = dashboardMetrics.dailyActivity.map(day => ({
        day: day.day,
        uploads: day.uploads,
        downloads: day.downloads,
      }));

      // Map operationsByFileType to the expected format
      const byTypeMap: Record<string, { uploads: number; downloads: number }> = {
        image: { uploads: 0, downloads: 0 },
        video: { uploads: 0, downloads: 0 },
        document: { uploads: 0, downloads: 0 },
        audio: { uploads: 0, downloads: 0 },
        archive: { uploads: 0, downloads: 0 },
      };

      dashboardMetrics.operationsByFileType.forEach(item => {
        const ft = item.fileType.toLowerCase();
        if (ft.includes('image') || ft.includes('png') || ft.includes('jpg') || ft.includes('jpeg') || ft.includes('gif') || ft.includes('webp')) {
          byTypeMap.image.uploads += item.uploads;
          byTypeMap.image.downloads += item.downloads;
        } else if (ft.includes('video') || ft.includes('mp4') || ft.includes('webm') || ft.includes('mov')) {
          byTypeMap.video.uploads += item.uploads;
          byTypeMap.video.downloads += item.downloads;
        } else if (ft.includes('audio') || ft.includes('mp3') || ft.includes('wav') || ft.includes('ogg')) {
          byTypeMap.audio.uploads += item.uploads;
          byTypeMap.audio.downloads += item.downloads;
        } else if (ft.includes('zip') || ft.includes('rar') || ft.includes('tar') || ft.includes('gz') || ft.includes('7z')) {
          byTypeMap.archive.uploads += item.uploads;
          byTypeMap.archive.downloads += item.downloads;
        } else {
          // Default to document for pdf, doc, text, etc.
          byTypeMap.document.uploads += item.uploads;
          byTypeMap.document.downloads += item.downloads;
        }
      });

      return {
        totalUploads: dashboardMetrics.recentActivity.last7Days.uploads,
        totalDownloads: dashboardMetrics.recentActivity.last7Days.downloads,
        totalDeletes: dashboardMetrics.recentActivity.last7Days.deletes,
        bandwidthUsed: bandwidthMB,
        dailyTrend,
        byType: byTypeMap,
      };
    }

    // Fallback to zero values while loading
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return {
      totalUploads: 0,
      totalDownloads: 0,
      totalDeletes: 0,
      bandwidthUsed: 0,
      dailyTrend: days.map((day) => ({
        day,
        uploads: 0,
        downloads: 0,
      })),
      byType: {
        image: { uploads: 0, downloads: 0 },
        video: { uploads: 0, downloads: 0 },
        document: { uploads: 0, downloads: 0 },
        audio: { uploads: 0, downloads: 0 },
        archive: { uploads: 0, downloads: 0 },
      },
    };
  }, [dashboardMetrics]);

  // Filter files based on search query only
  // Note: File type filtering is done server-side via the fileType parameter in fetchFiles()
  // We only apply client-side search filtering here
  const filteredFiles = useMemo(() => {
    let filtered = [...files];

    // Apply search filter (client-side only)
    if (searchQuery) {
      filtered = filtered.filter((file) => {
        const filename = file.name.toLowerCase();
        return filename.includes(searchQuery.toLowerCase());
      });
    }

    return filtered;
  }, [files, searchQuery]);

  const handleRefresh = async () => {
    // Refetch both files and stats in parallel (with current file type filter)
    await Promise.all([
      fetchFiles({ refresh: true, fileType: selectedFileType }),
      fetchStorageStats(),
    ]);
    toast.success('Files refreshed');
  };

  /**
   * Load more files (server-side pagination)
   */
  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore || !nextToken) return;
    await fetchFiles({ loadMore: true, continuationToken: nextToken, fileType: selectedFileType });
  };

  /**
   * Handle file upload
   * Uses signed URLs for large files (>20MB) to upload directly to cloud storage
   * Uses base64 encoding for small files (<=20MB) through the proxy
   */
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!sdkProxyConfig || !storage.productTag) {
      toast.error('Missing SDK configuration or product tag');
      return;
    }

    const TWENTY_MB = 20 * 1024 * 1024;
    const sdkProxy = new SDKProxyService(sdkProxyConfig);

    try {
      setIsUploading(true);

      if (file.size > TWENTY_MB) {
        // Large file: Use signed URL for direct upload to cloud storage
        try {
          // Get a signed URL for uploading
          const signedUrlResult = await sdkProxy.storage.getSignedUrl({
            product: storage.productTag,
            env: storage.env.slug,
            storage: storage.tag,
            fileName: file.name,
            action: 'write',
            expiresIn: 3600, // 1 hour
            contentType: file.type || 'application/octet-stream',
          });

          if (!signedUrlResult?.url) {
            throw new Error('Failed to get signed URL for upload');
          }

          // Upload directly to cloud storage using the signed URL
          const uploadResponse = await fetch(signedUrlResult.url, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
          }

          toast.success(`Uploaded ${file.name} successfully`);
          await fetchFiles({ refresh: true });
        } catch (err) {
          console.error('[StorageExplorer] Signed URL upload error:', err);
          toast.error(err instanceof Error ? err.message : 'Failed to upload file');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      } else {
        // Small file: Use base64 encoding through proxy
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Content = (reader.result as string).split(',')[1]; // Remove data:... prefix

            await sdkProxy.storage.upload({
              product: storage.productTag,
              env: storage.env.slug,
              storage: storage.tag,
              fileName: file.name,
              buffer: base64Content,
              mimeType: file.type || 'application/octet-stream',
            });

            toast.success(`Uploaded ${file.name} successfully`);
            await fetchFiles({ refresh: true });
          } catch (err) {
            console.error('[StorageExplorer] Upload error:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to upload file');
          } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        };

        reader.onerror = () => {
          toast.error('Failed to read file');
          setIsUploading(false);
        };

        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('[StorageExplorer] Upload error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload file');
      setIsUploading(false);
    }
  };

  const clearFilters = () => {
    setSelectedFileType('all');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedFileType !== 'all' ||
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
    } catch {
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
    if (lowerType.includes('image')) return <FileImage className="h-4 w-4 text-blue" />;
    if (lowerType.includes('video')) return <FileVideo className="h-4 w-4 text-purple-500" />;
    if (lowerType.includes('audio')) return <FileAudio className="h-4 w-4 text-orange-500" />;
    if (lowerType.includes('pdf')) return <FileText className="h-4 w-4 text-red" />;
    if (lowerType.includes('spreadsheet') || lowerType.includes('excel')) return <FileSpreadsheet className="h-4 w-4 text-green" />;
    if (lowerType.includes('zip') || lowerType.includes('rar') || lowerType.includes('tar')) return <FileArchive className="h-4 w-4 text-yellow" />;
    if (lowerType.includes('text') || lowerType.includes('csv')) return <FileText className="h-4 w-4 text-grey-600" />;
    return <File className="h-4 w-4 text-grey-500" />;
  }

  function getProviderColor(provider: string) {
    const lowerProvider = provider.toLowerCase();
    switch (lowerProvider) {
      case 'aws':
      case 's3':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'azure':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'gcp':
      case 'google':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-grey-100 text-grey-700 border-grey-300';
    }
  }

  // Get the provider from props or use storage type
  const storageProvider = storage.provider || storage.type || 'cloud';

  const columnHelper = createColumnHelper<IStorageFileInfo>();
  const columns = useMemo<ColumnDef<IStorageFileInfo, any>[]>(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const mimeType = row.original.mimeType || getMimeTypeFromFileName(row.original.name);
          return (
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => row.original.url && window.open(row.original.url, '_blank')}
            >
              {getFileIcon(mimeType)}
              <div className="min-w-0">
                <span className="text-sm font-medium text-grey group-hover:text-primary transition-colors">
                  {row.original.name}
                </span>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('mimeType', {
        header: 'Type',
        cell: ({ row }) => {
          const mimeType = row.original.mimeType || getMimeTypeFromFileName(row.original.name);
          return (
            <span className="text-sm text-grey-600">
              {getFileTypeLabel(mimeType)}
            </span>
          );
        },
      }),
      columnHelper.accessor('size', {
        header: 'Size',
        cell: ({ row }) => (
          <span className="text-sm text-grey-600 font-mono">
            {formatSize(row.original.size || 0)}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'provider',
        header: 'Provider',
        cell: () => (
          <span className={cn(
            'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border',
            getProviderColor(storageProvider)
          )}>
            {storageProvider.toUpperCase()}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'env',
        header: 'Env',
        cell: () => (
          <Badge
            variant="secondary"
            className={cn(
              'text-xs font-medium',
              storage.env.slug === 'prd' || storage.env.slug === 'production'
                ? 'bg-red/10 text-red border-red/20'
                : storage.env.slug === 'dev' || storage.env.slug === 'development'
                ? 'bg-blue/10 text-blue border-blue/20'
                : 'bg-yellow/10 text-yellow border-yellow/20'
            )}
          >
            {storage.env.slug.toUpperCase()}
          </Badge>
        ),
      }),
      columnHelper.accessor('lastModified', {
        header: 'Modified',
        cell: ({ row }) => (
          <span className="text-sm text-grey-600">
            {row.original.lastModified
              ? format(new Date(row.original.lastModified), 'MMM dd, yyyy')
              : '-'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4 text-grey-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => row.original.url && window.open(row.original.url, '_blank')}
                disabled={!row.original.url}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => row.original.url && window.open(row.original.url, '_blank')}
                disabled={!row.original.url}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (row.original.url) {
                    navigator.clipboard.writeText(row.original.url);
                    toast.success('URL copied');
                  }
                }}
                disabled={!row.original.url}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ],
    [storage.env.slug, storageProvider]
  );

  const table = useReactTable({
    data: filteredFiles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background-tertiary">
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-grey-400 flex flex-col flex-shrink-0 transition-all duration-300",
        isSidebarCollapsed ? "w-14" : "w-64"
      )}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="h-5 w-5 text-purple-500 flex-shrink-0" />
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-grey text-sm truncate">{storage.name}</h2>
                <p className="text-xs text-grey-600 truncate">{storage.env.slug}</p>
              </div>
            )}
          </div>

          {/* Search - only show when expanded */}
          {!isSidebarCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {/* Product Context */}
          {storage.productName && (
            <div className="mb-4">
              <button
                onClick={() => {
                  if (storage.productId) {
                    openTab({
                      id: `product-${storage.productId}`,
                      type: 'product',
                      title: storage.productName || 'Product',
                      itemId: storage.productId,
                      data: {
                        _id: storage.productId,
                        name: storage.productName,
                        tag: storage.productTag,
                      },
                    });
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-2 rounded-lg bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 transition-colors group",
                  isSidebarCollapsed ? "p-2 justify-center" : "px-3 py-2"
                )}
                title={isSidebarCollapsed ? storage.productName : undefined}
              >
                <div className="w-7 h-7 rounded-md bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 text-purple-500" />
                </div>
                {!isSidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs text-grey-500">Product</p>
                      <p className="text-sm font-medium text-grey truncate">{storage.productName}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-grey-400 group-hover:text-purple-500 transition-colors" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Overview Link */}
          <div className="mb-4">
            <button
              onClick={() => setViewMode('overview')}
              className={cn(
                'w-full flex items-center gap-2 rounded-md text-sm transition-colors',
                isSidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2',
                viewMode === 'overview'
                  ? 'bg-purple-500/10 text-purple-600'
                  : 'text-grey hover:bg-background-secondary'
              )}
              title={isSidebarCollapsed ? 'Overview' : undefined}
            >
              <LayoutDashboard className={cn(
                'h-4 w-4 flex-shrink-0',
                viewMode === 'overview' ? 'text-purple-500' : 'text-grey-600'
              )} />
              {!isSidebarCollapsed && <span className="flex-1 text-left font-medium">Overview</span>}
            </button>
          </div>

          {!isSidebarCollapsed && (
            <div className="flex items-center justify-between px-2 py-2">
              <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
                File Types
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-grey-600 hover:text-purple-500 transition-colors"
                title="Refresh files"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
              </button>
            </div>
          )}

          <div className="space-y-0.5">
            {FILE_TYPES.map((fileType) => {
              // Use metrics from storageMetrics for counts
              let count = 0;
              switch (fileType.value) {
                case 'all':
                  count = storageMetrics.totalFiles;
                  break;
                case 'image':
                  count = storageMetrics.imageCount;
                  break;
                case 'video':
                  count = storageMetrics.videoCount;
                  break;
                case 'audio':
                  count = storageMetrics.audioCount;
                  break;
                case 'document':
                  count = storageMetrics.documentCount;
                  break;
                case 'archive':
                  count = storageMetrics.archiveCount;
                  break;
                case 'other':
                  count = storageMetrics.otherCount;
                  break;
              }

              // Show "+" when there are more files to load AND we don't have accurate stats from the API
              // When storageMetrics.isFromStats is true, we have accurate counts and don't need the "+" indicator
              const showPlus = !storageMetrics.isFromStats && fileType.value === 'all' && storageMetrics.hasMore;

              const isSelected = viewMode === 'files' && selectedFileType === fileType.value;
              return (
                <button
                  key={fileType.value}
                  onClick={() => {
                    const newFileType = fileType.value;
                    setSelectedFileType(newFileType);
                    setViewMode('files');
                    // Refetch files with server-side file type filter
                    fetchFiles({ refresh: true, fileType: newFileType });
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-md text-sm transition-colors',
                    isSidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2',
                    isSelected
                      ? 'bg-purple-500/10 text-purple-600'
                      : 'text-grey hover:bg-background-secondary'
                  )}
                  title={isSidebarCollapsed ? fileType.label : undefined}
                >
                  <span className={cn(
                    'flex-shrink-0',
                    isSelected ? 'text-purple-500' : 'text-grey-600'
                  )}>
                    {fileType.icon}
                  </span>
                  {!isSidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{fileType.label}</span>
                      {(isLoading || isLoadingStats) ? (
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          isSelected
                            ? 'bg-purple-500/20 text-purple-600'
                            : 'bg-background-secondary text-grey-600'
                        )}>
                          <span className="inline-block w-4 h-3 bg-grey-300 rounded animate-pulse"></span>
                        </span>
                      ) : (
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          isSelected
                            ? 'bg-purple-500/20 text-purple-600'
                            : 'bg-background-secondary text-grey-600'
                        )}>
                          {count}{showPlus && '+'}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Provider Info - only show when expanded */}
          {!isSidebarCollapsed && (
            <div className="mt-4 px-2">
              <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-2">
                Provider
              </div>
              <div className={cn(
                'h-9 px-3 flex items-center rounded-md border text-sm',
                getProviderColor(storageProvider)
              )}>
                {storageProvider.toUpperCase()}
              </div>
            </div>
          )}

          {/* Environment Info - only show when expanded */}
          {!isSidebarCollapsed && (
            <div className="mt-3 px-2">
              <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-2">
                Environment
              </div>
              <div className={cn(
                'h-9 px-3 flex items-center rounded-md border text-sm font-medium',
                storage.env.slug === 'prd' || storage.env.slug === 'production'
                  ? 'bg-red/10 text-red border-red/20'
                  : storage.env.slug === 'dev' || storage.env.slug === 'development'
                  ? 'bg-blue/10 text-blue border-blue/20'
                  : 'bg-yellow/10 text-yellow border-yellow/20'
              )}>
                {storage.env.slug.toUpperCase()}
              </div>
            </div>
          )}

          {hasActiveFilters && !isSidebarCollapsed && (
            <div className="mt-3 px-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full text-grey-600 hover:text-grey"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <div className="flex-shrink-0 p-2 border-t border-grey-400">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm text-grey-600 hover:bg-background-secondary hover:text-purple-500 transition-colors"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-white">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <HardDrive className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">{storage.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{storage.tag}</code>
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-semibold rounded-full',
                      storage.env.slug === 'production' || storage.env.slug === 'prd' ? 'bg-red/10 text-red' :
                      storage.env.slug === 'staging' || storage.env.slug === 'stg' ? 'bg-yellow/10 text-yellow' :
                      'bg-red/10 text-red'
                    )}>
                      {storage.env.slug}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border-border text-grey-600 hover:text-grey hover:bg-background-secondary"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-500 text-purple-500 hover:bg-purple-500/10"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </Button>
                {/* Hidden file input for upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex-shrink-0 mx-6 mt-4 p-4 bg-red/5 border border-red/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red">Failed to load files</p>
                <p className="text-xs text-grey-600 mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchFiles()}
                  className="mt-2 text-xs"
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-3" />
              <p className="text-sm text-grey-600">Loading storage files...</p>
            </div>
          </div>
        )}

        {viewMode === 'overview' && !isLoading ? (
          /* Overview Content */
          <div className="flex-1 overflow-auto p-6">
            {/* Key Metrics - Session Dashboard Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Total Files */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Folder className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green">
                    <TrendingUp className="h-3 w-3" />
                    {((weeklyStats.totalUploads / Math.max(storageMetrics.totalFiles, 1)) * 10).toFixed(1)}%
                  </div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{storageMetrics.totalFiles}</div>
                <div className="text-xs text-grey-600 font-medium">Total Files</div>
                <div className="text-xs text-grey-500 mt-1">{formatSize(storageMetrics.totalSize)} used</div>
              </div>

              {/* Uploads (7 days) */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-green" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green">
                    <TrendingUp className="h-3 w-3" />
                    12.5%
                  </div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{weeklyStats.totalUploads}</div>
                <div className="text-xs text-grey-600 font-medium">Uploads (7 days)</div>
              </div>

              {/* Downloads (7 days) */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Download className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green">
                    <TrendingUp className="h-3 w-3" />
                    8.3%
                  </div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{weeklyStats.totalDownloads}</div>
                <div className="text-xs text-grey-600 font-medium">Downloads (7 days)</div>
              </div>

              {/* Bandwidth Used */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green">
                    <TrendingUp className="h-3 w-3" />
                    5.2%
                  </div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{weeklyStats.bandwidthUsed} MB</div>
                <div className="text-xs text-grey-600 font-medium">Bandwidth (7 days)</div>
              </div>

              {/* Deleted Files */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-red-500">
                    <TrendingDown className="h-3 w-3" />
                    -3.1%
                  </div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{weeklyStats.totalDeletes}</div>
                <div className="text-xs text-grey-600 font-medium">Deleted (7 days)</div>
              </div>

              {/* Storage Used */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <HardDrive className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green">
                    <TrendingUp className="h-3 w-3" />
                    4.7%
                  </div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{formatSize(storageMetrics.totalSize)}</div>
                <div className="text-xs text-grey-600 font-medium">Total Storage</div>
              </div>
            </div>

            {/* Activity Timeline - Session Dashboard Style */}
            <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm mb-6">
              <h2 className="text-lg font-semibold text-grey mb-4">Activity Timeline (7 Days)</h2>
              <div className="space-y-3">
                {weeklyStats.dailyTrend.map((day) => {
                  const maxActivity = Math.max(...weeklyStats.dailyTrend.map(d => d.uploads + d.downloads));
                  const percentage = maxActivity > 0 ? ((day.uploads + day.downloads) / maxActivity) * 100 : 0;

                  return (
                    <div key={day.day} className="flex items-center gap-3">
                      <div className="w-12 text-xs font-medium text-grey-600">{day.day}</div>
                      <div className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center px-3">
                          <span className="text-xs font-semibold text-white">
                            {day.uploads} uploads, {day.downloads} downloads
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* File Type Breakdown - Session Dashboard Style */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* File Types */}
              <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-grey">Files by Type</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { type: 'Images', count: storageMetrics.imageCount, size: storageMetrics.imageSize, color: 'bg-blue', icon: FileImage },
                    { type: 'Videos', count: storageMetrics.videoCount, size: storageMetrics.videoSize, color: 'bg-purple-500', icon: FileVideo },
                    { type: 'Documents', count: storageMetrics.documentCount, size: storageMetrics.documentSize, color: 'bg-red', icon: FileText },
                    { type: 'Audio', count: storageMetrics.audioCount, size: storageMetrics.audioSize, color: 'bg-orange-500', icon: FileAudio },
                    { type: 'Archives', count: storageMetrics.archiveCount, size: storageMetrics.archiveSize, color: 'bg-yellow', icon: FileArchive },
                  ].map((item) => {
                    const percentage = storageMetrics.totalFiles > 0 ? (item.count / storageMetrics.totalFiles) * 100 : 0;
                    const Icon = item.icon;
                    return (
                      <div key={item.type} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-grey-500" />
                            <span className="text-grey-600 font-medium">{item.type}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-grey-600 font-medium">{item.count} files</span>
                            <span className="text-grey-700 font-bold min-w-[3rem] text-right">{percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-grey-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activity by Type */}
              <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-green" />
                  <h2 className="text-lg font-semibold text-grey">Activity by Type (7 days)</h2>
                </div>
                <div className="space-y-4">
                  {[
                    { type: 'Images', uploads: weeklyStats.byType.image.uploads, downloads: weeklyStats.byType.image.downloads, icon: FileImage, color: 'blue' },
                    { type: 'Videos', uploads: weeklyStats.byType.video.uploads, downloads: weeklyStats.byType.video.downloads, icon: FileVideo, color: 'purple' },
                    { type: 'Documents', uploads: weeklyStats.byType.document.uploads, downloads: weeklyStats.byType.document.downloads, icon: FileText, color: 'red' },
                    { type: 'Audio', uploads: weeklyStats.byType.audio.uploads, downloads: weeklyStats.byType.audio.downloads, icon: FileAudio, color: 'orange' },
                    { type: 'Archives', uploads: weeklyStats.byType.archive.uploads, downloads: weeklyStats.byType.archive.downloads, icon: FileArchive, color: 'yellow' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.type} className="flex items-center justify-between p-3 bg-grey-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-grey-500" />
                          <span className="text-sm text-grey-700 font-medium">{item.type}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-green">
                            <Upload className="h-3.5 w-3.5" />
                            <span className="text-xs font-semibold">{item.uploads}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-blue">
                            <Download className="h-3.5 w-3.5" />
                            <span className="text-xs font-semibold">{item.downloads}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Storage Info & Performance */}
            <div className="grid grid-cols-2 gap-4">
              {/* Storage Info */}
              <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                <h3 className="text-sm font-semibold text-grey mb-4">Storage Configuration</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-grey-600">Provider</span>
                    <span className={cn(
                      'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border',
                      getProviderColor(storageProvider)
                    )}>
                      {storageProvider.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-grey-600">Environment</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs font-medium',
                        storage.env.slug === 'prd' || storage.env.slug === 'production'
                          ? 'bg-red/10 text-red border-red/20'
                          : storage.env.slug === 'dev' || storage.env.slug === 'development'
                          ? 'bg-blue/10 text-blue border-blue/20'
                          : 'bg-yellow/10 text-yellow border-yellow/20'
                      )}
                    >
                      {storage.env.slug.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-grey-600">Total Files</span>
                    <span className="text-sm font-medium text-grey">{storageMetrics.totalFiles}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-grey-600">Total Size</span>
                    <span className="text-sm font-medium text-grey">{formatSize(storageMetrics.totalSize)}</span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                <h3 className="text-sm font-semibold text-grey mb-4">Performance (7 days)</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-grey-600">Success Rate</span>
                    <span className={cn(
                      'text-sm font-medium',
                      dashboardMetrics && dashboardMetrics.successRate >= 95 ? 'text-green' :
                      dashboardMetrics && dashboardMetrics.successRate >= 80 ? 'text-yellow' : 'text-red'
                    )}>
                      {dashboardMetrics ? `${dashboardMetrics.successRate.toFixed(1)}%` : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-grey-600">Total Operations</span>
                    <span className="text-sm font-medium text-grey">
                      {dashboardMetrics ? dashboardMetrics.totalOperations : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-grey-600">Avg. Operation Time</span>
                    <span className="text-sm font-medium text-grey">
                      {dashboardMetrics ? `${dashboardMetrics.averageOperationDuration.toFixed(0)}ms` : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-grey-600">Avg. File Size</span>
                    <span className="text-sm font-medium text-grey">
                      {dashboardMetrics ? formatSize(dashboardMetrics.averageFileSize) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Files */}
            <div className="mt-6 bg-white rounded-lg border border-border shadow-sm">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-grey">Recent Files</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFileType('all');
                    setViewMode('files');
                  }}
                  className="text-red hover:text-red/80 text-xs"
                >
                  View All Files
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="divide-y divide-border">
                {files.length === 0 ? (
                  <div className="px-5 py-8 text-center text-grey-500 text-sm">
                    {isLoading ? 'Loading files...' : 'No files found'}
                  </div>
                ) : (
                  // Sort by lastModified and take top 5
                  [...files]
                    .sort((a, b) => {
                      const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
                      const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
                      return dateB - dateA;
                    })
                    .slice(0, 5)
                    .map((file) => {
                      const mimeType = file.mimeType || getMimeTypeFromFileName(file.name);
                      return (
                        <div key={file.name} className="px-5 py-3 flex items-center justify-between hover:bg-background-secondary transition-colors">
                          <div className="flex items-center gap-3">
                            {getFileIcon(mimeType)}
                            <div>
                              <p className="text-sm font-medium text-grey">{file.name}</p>
                              <p className="text-xs text-grey-500">{formatSize(file.size || 0)} • {storageProvider.toUpperCase()}</p>
                            </div>
                          </div>
                          <span className="text-xs text-grey-500">
                            {file.lastModified ? format(new Date(file.lastModified), 'MMM dd, yyyy') : '-'}
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        ) : viewMode === 'files' && !isLoading ? (
          /* Files View */
          <>
            {/* Toolbar */}
            <div className="flex-shrink-0 px-6 py-3 bg-white border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-grey-600">
                    Showing <span className="font-medium text-grey">{filteredFiles.length}</span> files
                    {/* Show total from stats when filtering and there's a mismatch */}
                    {selectedFileType !== 'all' && storageMetrics.isFromStats && (() => {
                      const expectedCount = selectedFileType === 'image' ? storageMetrics.imageCount :
                        selectedFileType === 'video' ? storageMetrics.videoCount :
                        selectedFileType === 'audio' ? storageMetrics.audioCount :
                        selectedFileType === 'document' ? storageMetrics.documentCount :
                        selectedFileType === 'archive' ? storageMetrics.archiveCount :
                        selectedFileType === 'other' ? storageMetrics.otherCount : 0;

                      if (expectedCount > filteredFiles.length) {
                        return (
                          <span className="text-purple-500 text-sm">
                            of {expectedCount} total
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </span>
                  {hasActiveFilters && (
                    <span className="text-xs text-grey-500">(filtered)</span>
                  )}
                </div>
                {/* Load more button when filtered and more files exist */}
                {selectedFileType !== 'all' && hasMore && storageMetrics.isFromStats && (() => {
                  const expectedCount = selectedFileType === 'image' ? storageMetrics.imageCount :
                    selectedFileType === 'video' ? storageMetrics.videoCount :
                    selectedFileType === 'audio' ? storageMetrics.audioCount :
                    selectedFileType === 'document' ? storageMetrics.documentCount :
                    selectedFileType === 'archive' ? storageMetrics.archiveCount :
                    selectedFileType === 'other' ? storageMetrics.otherCount : 0;

                  if (expectedCount > filteredFiles.length) {
                    return (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="text-purple-500 hover:bg-purple-500/10"
                      >
                        {isLoadingMore ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Load More
                      </Button>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white rounded-lg border border-border h-full overflow-auto">
              {isRefreshing ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="animate-spin w-8 h-8 text-purple-500 mb-4" />
                  <p className="text-sm font-medium text-grey">Loading files...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center mb-4">
                    <FolderOpen className="h-8 w-8 text-grey-500" />
                  </div>
                  <p className="text-grey font-medium">No files found in loaded results</p>
                  {/* Show helpful message when stats indicate files exist but aren't in loaded results */}
                  {selectedFileType !== 'all' && storageMetrics.isFromStats && (() => {
                    // Get the expected count from stats for this filter type
                    const expectedCount = selectedFileType === 'image' ? storageMetrics.imageCount :
                      selectedFileType === 'video' ? storageMetrics.videoCount :
                      selectedFileType === 'audio' ? storageMetrics.audioCount :
                      selectedFileType === 'document' ? storageMetrics.documentCount :
                      selectedFileType === 'archive' ? storageMetrics.archiveCount :
                      selectedFileType === 'other' ? storageMetrics.otherCount : 0;

                    if (expectedCount > 0) {
                      return (
                        <div className="text-center mt-2">
                          <p className="text-grey-600 text-sm">
                            {expectedCount} {selectedFileType} file{expectedCount !== 1 ? 's' : ''} exist{expectedCount === 1 ? 's' : ''} in storage
                          </p>
                          <p className="text-grey-500 text-xs mt-1">
                            {hasMore ? 'Scroll down to load more files, or' : 'The files may be in a different location, or'} try clearing the filter
                          </p>
                          {hasMore && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleLoadMore}
                              disabled={isLoadingMore}
                              className="mt-3 text-purple-500 border-purple-500 hover:bg-purple-500/10"
                            >
                              {isLoadingMore ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : null}
                              Load More Files
                            </Button>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {hasActiveFilters && !storageMetrics.isFromStats && (
                    <p className="text-grey-600 text-sm mt-1">Try adjusting your filters</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="border-b border-border bg-background-secondary">
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className="text-grey-600 font-medium text-xs uppercase tracking-wider px-6 py-3"
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                {...{
                                  className: header.column.getCanSort()
                                    ? 'cursor-pointer select-none flex items-center hover:text-grey'
                                    : 'flex items-center',
                                  onClick: header.column.getToggleSortingHandler(),
                                }}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {
                                  {
                                    asc: <ChevronUpIcon className="ml-1 h-4 w-4" />,
                                    desc: <ChevronDownIcon className="ml-1 h-4 w-4" />,
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
                      <TableRow
                        key={row.id}
                        className="border-b border-border hover:bg-background-secondary transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-6 py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {/* Infinite scroll sentinel - triggers load more when visible */}
              {hasMore && (
                <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                  {isLoadingMore && (
                    <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                  )}
                </div>
              )}
              </div>
            </div>
          </>
        ) : null}

        {/* Status bar */}
        {files.length > 0 && (
          <div className="flex-shrink-0 px-6 py-2">
            <div className="flex items-center justify-between text-sm text-grey-600">
              <div className="flex items-center gap-3">
                <span>
                  <span className="font-medium text-grey">{files.length}</span> files loaded
                  {hasMore && <span className="text-purple-500">+</span>}
                </span>
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-purple-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs">Loading more...</span>
                  </div>
                )}
              </div>
              {hasMore && !isLoadingMore && (
                <span className="text-xs text-grey-500">Scroll to load more</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
