import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Boxes,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Plus,
  Play,
  Zap,
  Table2,
  Save,
  Bookmark,
  Trash2,
  Check,
  Settings2,
  X,
  Code,
  Tag,
  Hash,
  FileText,
  Upload,
  Download,
  Filter,
  ChevronRight,
  Database,
  Sparkles,
  Target,
  Layers,
  Copy,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  EyeOff,
  Braces,
  BarChart3,
  Gauge,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  List,
  ArrowLeft,
  Activity,
  Server,
  Cpu,
  PanelLeftClose,
  PanelRightClose,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import CodeSidebar from '@/components/CodeSidebar';
import { JsonViewer } from '@/components/JsonViewer';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDuctapeVector } from '@/hooks/useDuctapeVector';
import { useAuth } from '@/store/useAuth';

interface VectorExplorerTabProps {
  vector: {
    name: string;
    vector: string;
    type?: string;
    productTag?: string;
    productName?: string;
    dimensions?: number;
    metric?: string;
    env?: {
      slug: string;
      endpoint?: string;
      index?: string;
      namespace?: string;
    };
    envs?: Array<{ slug: string; active?: boolean }>;
  };
}

type SidebarView = 'namespaces' | 'actions';
type MainView = 'overview' | 'namespace' | 'vector' | 'query' | 'results';

// Vector operation types based on SDK VectorDatabaseService
type VectorOperation =
  | 'upsert'
  | 'upsertOne'
  | 'query'
  | 'findSimilar'
  | 'fetch'
  | 'fetchOne'
  | 'update'
  | 'deleteByIds'
  | 'deleteByFilter'
  | 'deleteAll'
  | 'list'
  | 'count'
  | 'exists'
  | 'listNamespaces'
  | 'getStats'
  | 'describeIndex';

// Vector operations configuration
const VECTOR_OPERATIONS: Record<VectorOperation, {
  label: string;
  description: string;
  color: string;
  category: 'write' | 'read' | 'search' | 'delete' | 'info';
}> = {
  // Write operations
  upsert: { label: 'Upsert Vectors', description: 'Insert or update multiple vectors', color: 'bg-green/10 text-green', category: 'write' },
  upsertOne: { label: 'Upsert One', description: 'Insert or update a single vector', color: 'bg-green/10 text-green', category: 'write' },
  update: { label: 'Update Metadata', description: 'Update vector metadata by ID', color: 'bg-yellow/10 text-yellow', category: 'write' },

  // Search operations
  query: { label: 'Query', description: 'Perform semantic similarity search', color: 'bg-primary/10 text-primary', category: 'search' },
  findSimilar: { label: 'Find Similar', description: 'Find similar vectors with optional filters', color: 'bg-primary/10 text-primary', category: 'search' },

  // Read operations
  fetch: { label: 'Fetch Vectors', description: 'Fetch multiple vectors by IDs', color: 'bg-blue/10 text-blue', category: 'read' },
  fetchOne: { label: 'Fetch One', description: 'Fetch a single vector by ID', color: 'bg-blue/10 text-blue', category: 'read' },
  list: { label: 'List Vectors', description: 'List vectors in a namespace', color: 'bg-blue/10 text-blue', category: 'read' },
  exists: { label: 'Check Exists', description: 'Check if a vector exists', color: 'bg-blue/10 text-blue', category: 'read' },
  count: { label: 'Count', description: 'Count vectors in namespace', color: 'bg-blue/10 text-blue', category: 'read' },

  // Delete operations
  deleteByIds: { label: 'Delete by IDs', description: 'Delete vectors by their IDs', color: 'bg-red/10 text-red', category: 'delete' },
  deleteByFilter: { label: 'Delete by Filter', description: 'Delete vectors matching filter', color: 'bg-red/10 text-red', category: 'delete' },
  deleteAll: { label: 'Delete All', description: 'Delete all vectors in namespace', color: 'bg-red/10 text-red', category: 'delete' },

  // Info operations
  listNamespaces: { label: 'List Namespaces', description: 'List all namespaces/collections', color: 'bg-grey/10 text-grey', category: 'info' },
  getStats: { label: 'Get Stats', description: 'Get index statistics', color: 'bg-grey/10 text-grey', category: 'info' },
  describeIndex: { label: 'Describe Index', description: 'Get index configuration', color: 'bg-grey/10 text-grey', category: 'info' },
};

// Vector action interface
interface IVectorAction {
  id: string;
  vector: string;
  name: string;
  description?: string;
  operation: VectorOperation;
  query: Record<string, any>;
  parameters: Array<{
    name: string;
    path: string;
    defaultValue: any;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  }>;
  createdAt: string;
}

// Namespace/Collection interface
interface VectorNamespace {
  name: string;
  vectorCount: number;
  dimensions?: number;
  metric?: string;
  status: 'ready' | 'indexing' | 'error';
}

// Vector record interface
interface VectorRecord {
  id: string;
  values?: number[];
  metadata?: Record<string, any>;
  score?: number;
  sparseValues?: { indices: number[]; values: number[] };
}

// Index stats interface
interface IndexStats {
  totalVectorCount: number;
  namespaces: Record<string, { vectorCount: number }>;
  dimension: number;
  indexFullness: number;
  totalIndexSize?: string;
}

// Helper function to generate tag from name
const generateActionTag = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};




// SDK-style query templates
const getDefaultQuery = () => JSON.stringify({
  operation: 'query',
  options: {
    namespace: 'default',
    topK: 10,
    includeMetadata: true,
    includeValues: false,
  }
}, null, 2);

const getNamespaceQuery = (namespace: string) => JSON.stringify({
  operation: 'list',
  options: {
    namespace: namespace,
    limit: 100,
    includeMetadata: true,
  }
}, null, 2);

const getVectorFetchQuery = (id: string, namespace: string) => JSON.stringify({
  operation: 'fetchOne',
  options: {
    id: id,
    namespace: namespace,
    includeMetadata: true,
    includeValues: true,
  }
}, null, 2);

// Helper functions
const getVectorDBDisplayName = (type?: string) => {
  if (!type) return 'Vector DB';
  const map: Record<string, string> = {
    pinecone: 'Pinecone',
    weaviate: 'Weaviate',
    qdrant: 'Qdrant',
    milvus: 'Milvus',
    chroma: 'Chroma',
    memory: 'In-Memory',
  };
  return map[type.toLowerCase()] || type;
};

const getMetricDisplayName = (metric?: string) => {
  if (!metric) return 'Unknown';
  const map: Record<string, string> = {
    cosine: 'Cosine Similarity',
    euclidean: 'Euclidean Distance',
    dotproduct: 'Dot Product',
    manhattan: 'Manhattan Distance',
  };
  return map[metric.toLowerCase()] || metric;
};

const getVectorTypeColor = (type?: string) => {
  if (!type) return 'bg-grey-100 text-grey-600';
  const map: Record<string, string> = {
    pinecone: 'bg-emerald-100 text-emerald-700',
    weaviate: 'bg-pink-100 text-pink-700',
    qdrant: 'bg-red-100 text-red-700',
    milvus: 'bg-blue-100 text-blue-700',
    chroma: 'bg-orange-100 text-orange-700',
    memory: 'bg-purple-100 text-purple-700',
  };
  return map[type.toLowerCase()] || 'bg-grey-100 text-grey-600';
};

export default function VectorExplorerTab({ vector }: VectorExplorerTabProps) {
  const { setSidebarCollapsed } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Guard: Show error if critical vector data is missing (e.g., tab restored with incomplete data)
  if (!vector?.name || !vector?.vector) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Boxes className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete vector data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the vector store from your product to reload it.
          </p>
        </div>
      </div>
    );
  }

  // Compute current environment slug with fallback
  // Prioritize currentEnvSlug, fall back to first env in envs array, or 'default'
  const currentEnvSlug = vector.env?.slug || vector.envs?.[0]?.slug || 'default';

  // Initialize Vector Proxy Service
  const vectorConfig = {
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
  };

  const vectorService = useDuctapeVector(vectorConfig);

  // Collapse workbench sidebar when VectorExplorer opens
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  // Persistent state key
  const stateKey = `vector-explorer-state-${vector.vector}-${vector.env?.slug || 'default'}`;

  // Load persisted state from localStorage
  const getPersistedState = () => {
    try {
      const saved = localStorage.getItem(stateKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const persistedState = getPersistedState();

  // Main view state
  const [mainView, setMainView] = useState<MainView>(persistedState?.mainView || 'overview');
  const [sidebarView, setSidebarView] = useState<SidebarView>(persistedState?.sidebarView || 'namespaces');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected items - Note: We'll restore selected namespace after namespaces load
  const [selectedNamespace, setSelectedNamespace] = useState<VectorNamespace | null>(null);
  const persistedNamespaceName = persistedState?.selectedNamespaceName;
  const [selectedVector, setSelectedVector] = useState<VectorRecord | null>(persistedState?.selectedVector || null);
  const [selectedAction, setSelectedAction] = useState<IVectorAction | null>(null);

  // Query state
  const [queryInput, setQueryInput] = useState(persistedState?.queryInput || getDefaultQuery());
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSidebarRefreshing, setIsSidebarRefreshing] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(persistedState?.queryResult || null);
  const [queryError, setQueryError] = useState<string | null>(persistedState?.queryError || null);
  const [resultsView, setResultsView] = useState<'table' | 'json' | 'cards'>(persistedState?.resultsView || 'table');

  // Modal states
  const [showSaveActionModal, setShowSaveActionModal] = useState(false);
  const [showExecuteActionModal, setShowExecuteActionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);

  // Query Builder state
  const [showQueryBuilder, setShowQueryBuilder] = useState(persistedState?.showQueryBuilder || false);
  const [queryBuilderOperation, setQueryBuilderOperation] = useState<VectorOperation>(persistedState?.queryBuilderOperation || 'query');
  const [queryBuilderNamespace, setQueryBuilderNamespace] = useState(persistedState?.queryBuilderNamespace || '');
  const [queryBuilderTopK, setQueryBuilderTopK] = useState(persistedState?.queryBuilderTopK || '10');
  const [queryBuilderIncludeMetadata, setQueryBuilderIncludeMetadata] = useState(persistedState?.queryBuilderIncludeMetadata ?? true);
  const [queryBuilderIncludeValues, setQueryBuilderIncludeValues] = useState(persistedState?.queryBuilderIncludeValues ?? false);
  const [queryBuilderFilters, setQueryBuilderFilters] = useState<Array<{ field: string; operator: string; value: string }>>(
    persistedState?.queryBuilderFilters || []
  );
  const [queryBuilderIds, setQueryBuilderIds] = useState(persistedState?.queryBuilderIds || '');

  // Actions state
  const [savedActions, setSavedActions] = useState<IVectorAction[]>([]);

  // Save action form state
  const [actionName, setActionName] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [extractedValues, setExtractedValues] = useState<Array<{
    path: string;
    value: any;
    type: string;
    selected: boolean;
    paramName: string;
  }>>([]);

  // Execute action form state
  const [actionParamValues, setActionParamValues] = useState<Record<string, any>>({});

  // Loading states
  const [isLoadingNamespace, setIsLoadingNamespace] = useState(false);
  const [isLoadingVector, setIsLoadingVector] = useState(false);

  // ==================== VECTOR PROXY QUERIES ====================

  // Test connection to vector database by fetching stats
  const { data: connectionResult, isLoading: isConnecting, error: connectionError, isSuccess: isConnected } = useQuery({
    queryKey: ['vector-connection', vector.productTag, vector.vector, currentEnvSlug],
    queryFn: async () => {
      if (!vectorService || !vector.productTag) {
        throw new Error('Vector service not available');
      }
      // Use getStats to verify connection
      const result = await vectorService.getStats({
        product: vector.productTag,
        env: currentEnvSlug,
        vector: vector.vector,
      });
      return result;
    },
    enabled: !!vectorService && !!vector.productTag,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Fetch namespaces from the vector database
  const { data: sdkNamespaces, isLoading: isLoadingNamespaces, refetch: refetchNamespaces } = useQuery({
    queryKey: ['vector-namespaces', vector.productTag, vector.vector, currentEnvSlug],
    queryFn: async () => {
      if (!vectorService || !vector.productTag) return null;
      try {
        const result = await vectorService.listNamespaces({
          product: vector.productTag,
          env: currentEnvSlug,
          vector: vector.vector,
        });
        console.log('[Vector-Explorer] Namespaces result:', result);
        return result?.namespaces || [];
      } catch (error) {
        console.error('Error fetching namespaces:', error);
        return null;
      }
    },
    enabled: !!vectorService && !!vector.productTag && isConnected,
    staleTime: 30000,
  });

  // Fetch index stats
  const { data: sdkStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['vector-stats', vector.productTag, vector.vector, currentEnvSlug],
    queryFn: async () => {
      if (!vectorService || !vector.productTag) return null;
      try {
        const result = await vectorService.getStats({
          product: vector.productTag,
          env: currentEnvSlug,
          vector: vector.vector,
        });
        console.log('[Vector-Explorer] Stats result:', result);
        return result;
      } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
      }
    },
    enabled: !!vectorService && !!vector.productTag && isConnected,
    staleTime: 30000,
  });

  // Fetch index info
  const { data: sdkIndexInfo, refetch: refetchIndexInfo } = useQuery({
    queryKey: ['vector-index-info', vector.productTag, vector.vector, currentEnvSlug],
    queryFn: async () => {
      if (!vectorService || !vector.productTag) return null;
      try {
        const result = await vectorService.describeIndex({
          product: vector.productTag,
          env: currentEnvSlug,
          vector: vector.vector,
        });
        console.log('[Vector-Explorer] Index info:', result);
        return result;
      } catch (error) {
        console.error('Error fetching index info:', error);
        return null;
      }
    },
    enabled: !!vectorService && !!vector.productTag && isConnected,
    staleTime: 60000,
  });

  // Transform SDK namespaces to local format
  const namespaces: VectorNamespace[] = useMemo(() => {
    if (sdkNamespaces && Array.isArray(sdkNamespaces)) {
      return sdkNamespaces.map((ns: any) => ({
        name: typeof ns === 'string' ? ns : ns.name,
        vectorCount: ns.vectorCount || sdkStats?.namespaces?.[typeof ns === 'string' ? ns : ns.name]?.vectorCount || 0,
        dimensions: ns.dimensions || sdkIndexInfo?.dimensions || vector.dimensions,
        metric: ns.metric || sdkIndexInfo?.metric || vector.metric,
        status: 'ready' as const,
      }));
    }
    // Return empty array when no SDK data available
    return [];
  }, [sdkNamespaces, sdkStats, sdkIndexInfo, vector.dimensions, vector.metric]);

  // State for vectors fetched from SDK
  const [namespaceVectors, setNamespaceVectors] = useState<VectorRecord[]>(persistedState?.namespaceVectors || []);
  const [isLoadingVectors, setIsLoadingVectors] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [totalVectorCount, setTotalVectorCount] = useState(0);

  // Restore selected namespace from persisted state after namespaces load
  useEffect(() => {
    if (persistedNamespaceName && namespaces.length > 0 && !selectedNamespace) {
      const found = namespaces.find(n => n.name === persistedNamespaceName);
      if (found) {
        setSelectedNamespace(found);
      }
    }
  }, [persistedNamespaceName, namespaces, selectedNamespace]);

  // ==================== MUTATIONS ====================

  // Execute a vector query
  const executeQueryMutation = useMutation({
    mutationFn: async (queryData: any) => {
      if (!vectorService || !vector.productTag) throw new Error('Vector service not available');
      const result = await vectorService.query({
        product: vector.productTag,
        env: currentEnvSlug,
        vector: vector.vector,
        ...queryData,
      });
      return result;
    },
    onSuccess: (data) => {
      setQueryResult(data);
      setQueryError(null);
      toast.success('Query executed successfully');
    },
    onError: (error: Error) => {
      setQueryError(error.message);
      setQueryResult(null);
      toast.error(`Query failed: ${error.message}`);
    },
  });

  // Upsert vectors mutation
  const upsertMutation = useMutation({
    mutationFn: async (upsertData: any) => {
      if (!vectorService || !vector.productTag) throw new Error('Vector service not available');
      return vectorService.upsert({
        product: vector.productTag,
        env: currentEnvSlug,
        vector: vector.vector,
        ...upsertData,
      });
    },
    onSuccess: () => {
      refetchStats();
      refetchNamespaces();
      toast.success('Vectors upserted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Upsert failed: ${error.message}`);
    },
  });

  // Delete vectors mutation
  const deleteMutation = useMutation({
    mutationFn: async (deleteData: { ids: string[]; namespace?: string }) => {
      if (!vectorService || !vector.productTag) throw new Error('Vector service not available');
      return vectorService.deleteByIds({
        product: vector.productTag,
        env: currentEnvSlug,
        vector: vector.vector,
        ...deleteData,
      });
    },
    onSuccess: () => {
      refetchStats();
      toast.success('Vectors deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // Fetch vectors mutation
  const fetchVectorsMutation = useMutation({
    mutationFn: async (fetchData: { ids: string[]; namespace?: string }) => {
      if (!vectorService || !vector.productTag) throw new Error('Vector service not available');
      return vectorService.fetchVectors({
        product: vector.productTag,
        env: currentEnvSlug,
        vector: vector.vector,
        ...fetchData,
      });
    },
  });

  // Refresh all data
  const handleRefreshData = async () => {
    setIsSidebarRefreshing(true);
    try {
      await Promise.all([
        refetchNamespaces(),
        refetchStats(),
        refetchIndexInfo(),
      ]);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsSidebarRefreshing(false);
    }
  };

  // Persist state to localStorage
  useEffect(() => {
    const stateToSave = {
      mainView,
      sidebarView,
      queryInput,
      queryResult,
      queryError,
      selectedNamespaceName: selectedNamespace?.name,
      namespaceVectors, // Persist loaded vectors
      selectedVector, // Persist selected vector
      resultsView,
      selectedActionTag: selectedAction?.vector,
      showQueryBuilder,
      queryBuilderOperation,
      queryBuilderNamespace,
      queryBuilderTopK,
      queryBuilderIncludeMetadata,
      queryBuilderIncludeValues,
      queryBuilderFilters,
      queryBuilderIds,
    };
    localStorage.setItem(stateKey, JSON.stringify(stateToSave));
  }, [
    stateKey,
    mainView,
    sidebarView,
    queryInput,
    queryResult,
    queryError,
    selectedNamespace,
    namespaceVectors, // Add to dependency array
    selectedVector, // Add to dependency array
    resultsView,
    selectedAction,
    showQueryBuilder,
    queryBuilderOperation,
    queryBuilderNamespace,
    queryBuilderTopK,
    queryBuilderIncludeMetadata,
    queryBuilderIncludeValues,
    queryBuilderFilters,
    queryBuilderIds,
  ]);

  // Filter namespaces based on search
  const filteredNamespaces = useMemo(() => {
    return namespaces.filter(ns =>
      ns.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [namespaces, searchQuery]);

  // Filter vectors based on selected namespace
  const filteredVectors = useMemo(() => {
    if (!selectedNamespace) {
      console.log('[Vector-Explorer] filteredVectors: no selected namespace');
      return [];
    }
    // Use real vectors from SDK
    const filtered = namespaceVectors.filter(v =>
      v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.metadata && JSON.stringify(v.metadata).toLowerCase().includes(searchQuery.toLowerCase()))
    );
    console.log('[Vector-Explorer] filteredVectors:', {
      total: namespaceVectors.length,
      filtered: filtered.length,
      searchQuery,
      selectedNamespace: selectedNamespace.name,
    });
    return filtered;
  }, [selectedNamespace, searchQuery, namespaceVectors]);

  // For server-side pagination, we use namespaceVectors directly (already paginated from server)
  // Only apply client-side filtering if search query is active
  const displayVectors = useMemo(() => {
    if (!searchQuery) {
      return namespaceVectors;
    }
    // If searching, filter the current page results
    return namespaceVectors.filter(v =>
      v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.metadata && JSON.stringify(v.metadata).toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [namespaceVectors, searchQuery]);

  const totalPages = Math.ceil(totalVectorCount / itemsPerPage);

  // Fetch new page when currentPage changes
  useEffect(() => {
    if (selectedNamespace && currentPage > 1) {
      fetchVectorsForPage(selectedNamespace, currentPage);
    }
  }, [currentPage]);

  // Reset to page 1 when search query or namespace changes
  useEffect(() => {
    if (searchQuery) {
      // For search, we need all data - this is a limitation
      // In production, you'd want server-side search too
      setCurrentPage(1);
    }
  }, [searchQuery]);

  // Filter actions based on search
  const filteredActions = useMemo(() => {
    return savedActions.filter(a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.vector.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [savedActions, searchQuery]);

  // Calculate total stats - use SDK stats if available, otherwise compute from namespaces
  const totalStats = useMemo(() => {
    // Prefer SDK stats if available
    if (sdkStats?.totalVectorCount !== undefined) {
      return {
        totalVectors: sdkStats.totalVectorCount,
        avgDimensions: sdkStats.dimension || sdkIndexInfo?.dimension || vector.dimensions || 0,
        namespaceCount: Object.keys(sdkStats.namespaces || {}).length || namespaces.length,
      };
    }
    // Fall back to computing from namespaces
    if (namespaces.length === 0) {
      return { totalVectors: 0, avgDimensions: vector.dimensions || 0, namespaceCount: 0 };
    }
    const total = namespaces.reduce((acc, ns) => acc + ns.vectorCount, 0);
    const avgDimensions = Math.round(
      namespaces.reduce((acc, ns) => acc + (ns.dimensions || 0), 0) / namespaces.length
    );
    return { totalVectors: total, avgDimensions, namespaceCount: namespaces.length };
  }, [sdkStats, sdkIndexInfo, namespaces, vector.dimensions]);

  // Fetch vectors for current page
  const fetchVectorsForPage = async (namespace: VectorNamespace, page: number) => {
    if (!vectorService || !vector.productTag) {
      console.log('[Vector-Explorer] No vector service available');
      return;
    }

    setIsLoadingVectors(true);

    try {
      // Calculate pagination offset
      const offset = (page - 1) * itemsPerPage;

      // First, get the total count and list of IDs with pagination
      const listResult = await vectorService.listVectors({
        product: vector.productTag,
        env: currentEnvSlug,
        vector: vector.vector,
        namespace: namespace.name,
        limit: itemsPerPage,
        offset: offset,
      });
      console.log('[Vector-Explorer] Vector IDs for page', page, ':', listResult);

      // Store total count for pagination
      if (listResult?.totalCount !== undefined) {
        setTotalVectorCount(listResult.totalCount);
      } else if (listResult?.ids) {
        // If totalCount not available, use namespace vector count
        setTotalVectorCount(namespace.vectorCount);
      }

      // If we got IDs, fetch the full vector data with metadata
      if (listResult?.ids && Array.isArray(listResult.ids) && listResult.ids.length > 0) {
        const fetchResult = await vectorService.fetchVectors({
          product: vector.productTag,
          env: currentEnvSlug,
          vector: vector.vector,
          namespace: namespace.name,
          ids: listResult.ids,
        });
        console.log('[Vector-Explorer] Fetched vectors for page:', fetchResult);

        // fetchResult.vectors is an object/dict keyed by ID, convert to array
        if (fetchResult?.vectors && typeof fetchResult.vectors === 'object') {
          const vectorsArray = Object.entries(fetchResult.vectors)
            .filter(([_, v]) => v !== null) // Filter out null entries (not found)
            .map(([id, v]: [string, any]) => ({
              id: v?.id || id,
              values: v?.values,
              metadata: v?.metadata || {},
              score: v?.score,
              sparseValues: v?.sparseValues,
            }));
          console.log('[Vector-Explorer] Setting namespace vectors:', vectorsArray.length, 'vectors');
          setNamespaceVectors(vectorsArray);
        } else {
          console.log('[Vector-Explorer] fetchResult has no vectors object, using IDs only');
          // If fetch doesn't return full vectors, at least show the IDs
          const idsArray = listResult.ids.map((id: string) => ({
            id,
            metadata: {},
          }));
          setNamespaceVectors(idsArray);
        }
      } else {
        console.log('[Vector-Explorer] No vectors found for page', page);
        setNamespaceVectors([]);
      }
    } catch (error) {
      console.error('[Vector-Explorer] Error fetching vectors:', error);
      toast.error(`Failed to load vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setNamespaceVectors([]);
    } finally {
      setIsLoadingVectors(false);
    }
  };

  // Handle namespace selection
  const handleSelectNamespace = async (namespace: VectorNamespace) => {
    console.log('[Vector-Explorer] handleSelectNamespace called:', {
      namespace: namespace.name,
      vectorService: !!vectorService,
      productTag: vector.productTag,
      vectorTag: vector.vector,
      env: currentEnvSlug,
    });

    setSelectedNamespace(namespace);
    setSelectedVector(null);
    setMainView('namespace');
    setQueryBuilderNamespace(namespace.name);
    setIsLoadingNamespace(true);
    setNamespaceVectors([]);
    setCurrentPage(1); // Reset to first page
    setTotalVectorCount(namespace.vectorCount); // Set initial count from namespace

    try {
      // Validate required data
      if (!vectorService) {
        console.error('[Vector-Explorer] Vector service not available');
        toast.error('Vector service not available');
        return;
      }

      if (!vector.productTag) {
        console.error('[Vector-Explorer] Product tag missing');
        toast.error('Product tag missing');
        return;
      }

      if (!vector.vector) {
        console.error('[Vector-Explorer] Vector tag missing');
        toast.error('Vector configuration missing');
        return;
      }

      // Fetch first page of vectors
      await fetchVectorsForPage(namespace, 1);
    } finally {
      setIsLoadingNamespace(false);
      setIsLoadingVectors(false);
    }

    // Update query to list vectors in this namespace
    setQueryInput(getNamespaceQuery(namespace.name));
  };

  // Handle vector selection
  const handleSelectVector = async (vec: VectorRecord) => {
    setSelectedVector(vec);
    setMainView('vector');

    // Simulate loading vector data
    setIsLoadingVector(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsLoadingVector(false);

    // Update query to fetch this vector
    if (selectedNamespace) {
      setQueryInput(getVectorFetchQuery(vec.id, selectedNamespace.name));
    }
  };

  // Handle action selection
  const handleLoadAction = (action: IVectorAction) => {
    setSelectedAction(action);
    setQueryInput(JSON.stringify(action.query, null, 2));
    setMainView('query');
    setShowQueryBuilder(false);

    // If action has parameters, open execute modal
    if (action.parameters.length > 0) {
      const defaultValues: Record<string, any> = {};
      action.parameters.forEach(p => {
        defaultValues[p.name] = p.defaultValue;
      });
      setActionParamValues(defaultValues);
      setShowExecuteActionModal(true);
    }
  };

  // Handle refresh sidebar - uses real SDK data when available
  const handleRefreshSidebar = async () => {
    await handleRefreshData();
  };

  // Handle execute query - uses real SDK when available
  const handleExecuteQuery = async () => {
    if (!queryInput.trim()) {
      toast.error('Please enter a query');
      return;
    }

    let parsedQuery: any;
    try {
      parsedQuery = JSON.parse(queryInput);
    } catch {
      toast.error('Invalid JSON query format');
      return;
    }

    setIsExecuting(true);
    setQueryError(null);
    setQueryResult(null);

    const startTime = Date.now();

    try {
      // Use real SDK if available
      if (vectorService && vector.productTag) {
        const operation = parsedQuery.operation;
        const options = parsedQuery.options || {};
        let result: any;

        switch (operation) {
          case 'query':
          case 'findSimilar':
            result = await vectorService.query({
              product: vector.productTag,
              env: currentEnvSlug,
              vector: vector.vector,
              ...options,
            });
            break;
          case 'fetch':
          case 'fetchOne':
            result = await vectorService.fetchVectors({
              product: vector.productTag,
              env: currentEnvSlug,
              vector: vector.vector,
              ...options,
            });
            break;
          case 'list':
            result = await vectorService.listVectors({
              product: vector.productTag,
              env: currentEnvSlug,
              vector: vector.vector,
              ...options,
            });
            break;
          case 'upsert':
          case 'upsertOne':
            result = await vectorService.upsert({
              product: vector.productTag,
              env: currentEnvSlug,
              vector: vector.vector,
              ...options,
            });
            break;
          case 'deleteByIds':
            result = await vectorService.deleteByIds({
              product: vector.productTag,
              env: currentEnvSlug,
              vector: vector.vector,
              ...options,
            });
            break;
          case 'count':
            result = await vectorService.count({
              product: vector.productTag,
              env: currentEnvSlug,
              vector: vector.vector,
              ...options,
            });
            break;
          case 'listNamespaces':
            result = await vectorService.listNamespaces({
              product: vector.productTag,
              env: currentEnvSlug,
              vector: vector.vector,
            });
            break;
          case 'getStats':
            result = await vectorService.getStats({
              product: vector.productTag,
              env: currentEnvSlug,
              vector: vector.vector,
            });
            break;
          case 'describeIndex':
            result = await vectorService.describeIndex({
              product: vector.productTag,
              env: currentEnvSlug,
              vector: vector.vector,
            });
            break;
          default:
            throw new Error(`Unsupported operation: ${operation}`);
        }

        const executionTime = Date.now() - startTime;
        setQueryResult({
          success: true,
          executionTime,
          ...result,
          matches: result?.vectors || result?.matches || result?.results || [],
        });
        setMainView('results');
        toast.success(`Query executed in ${executionTime}ms`);
      } else {
        throw new Error('Vector service not available. Please check your connection.');
      }
    } catch (error: any) {
      setQueryError(error.message || 'Failed to execute query');
      toast.error('Failed to execute query');
    } finally {
      setIsExecuting(false);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Go back to overview
  const handleBackToOverview = () => {
    setMainView('overview');
    setSelectedNamespace(null);
    setSelectedVector(null);
    setSelectedAction(null);
  };

  // Extract parameterizable values from query
  const extractParameterizableValues = useCallback((obj: any, path = ''): Array<{
    path: string;
    value: any;
    type: string;
  }> => {
    const results: Array<{ path: string; value: any; type: string }> = [];

    const processValue = (key: string, value: any, currentPath: string) => {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;

      if (value === null || value === undefined) return;

      if (Array.isArray(value)) {
        if (value.every(v => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
          results.push({ path: fullPath, value, type: 'array' });
        } else {
          value.forEach((item, idx) => {
            if (typeof item === 'object' && item !== null) {
              results.push(...extractParameterizableValues(item, `${fullPath}[${idx}]`));
            }
          });
        }
      } else if (typeof value === 'object') {
        results.push(...extractParameterizableValues(value, fullPath));
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        results.push({ path: fullPath, value, type: typeof value });
      }
    };

    Object.entries(obj).forEach(([key, value]) => {
      if (key === 'operation') return;
      processValue(key, value, path);
    });

    return results;
  }, []);

  // Generate parameter name from path
  const generateParamName = (path: string): string => {
    const parts = path.split('.');
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/\[\d+\]/g, '');
  };

  // Open save action modal
  const handleOpenSaveActionModal = () => {
    try {
      const query = JSON.parse(queryInput);
      const values = extractParameterizableValues(query);
      setExtractedValues(values.map(v => ({
        ...v,
        selected: false,
        paramName: generateParamName(v.path),
      })));
      setActionName('');
      setActionDescription('');
      setShowSaveActionModal(true);
    } catch {
      toast.error('Invalid JSON query - cannot extract parameters');
    }
  };

  // Save action
  const handleSaveAction = () => {
    if (!actionName.trim()) {
      toast.error('Please enter an action name');
      return;
    }

    try {
      const query = JSON.parse(queryInput);
      const selectedParams = extractedValues.filter(v => v.selected);

      let parameterizedQuery = JSON.parse(JSON.stringify(query));

      const setNestedValue = (obj: any, path: string, value: any) => {
        const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
      };

      selectedParams.forEach(param => {
        setNestedValue(parameterizedQuery, param.path, `{{${param.paramName}}}`);
      });

      const actionTag = generateActionTag(actionName);

      const newAction: IVectorAction = {
        id: `action_${Date.now()}`,
        vector: actionTag,
        name: actionName,
        description: actionDescription || undefined,
        operation: query.operation,
        query: parameterizedQuery,
        parameters: selectedParams.map(p => ({
          name: p.paramName,
          path: p.path,
          defaultValue: p.value,
          type: p.type as any,
        })),
        createdAt: new Date().toISOString(),
      };

      setSavedActions([...savedActions, newAction]);
      setShowSaveActionModal(false);
      toast.success(`Action "${actionName}" saved`);
    } catch {
      toast.error('Failed to save action');
    }
  };

  // Execute action with parameters
  const handleExecuteAction = async () => {
    if (!selectedAction) return;

    let queryWithParams = JSON.parse(JSON.stringify(selectedAction.query));

    const replaceParams = (obj: any): any => {
      if (typeof obj === 'string') {
        const match = obj.match(/^\{\{(\w+)\}\}$/);
        if (match && actionParamValues[match[1]] !== undefined) {
          return actionParamValues[match[1]];
        }
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(replaceParams);
      }
      if (typeof obj === 'object' && obj !== null) {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = replaceParams(value);
        }
        return result;
      }
      return obj;
    };

    queryWithParams = replaceParams(queryWithParams);
    setQueryInput(JSON.stringify(queryWithParams, null, 2));
    setShowExecuteActionModal(false);

    // Execute the query
    await handleExecuteQuery();
  };

  // Generate code sections for CodeSidebar
  const generateCodeSections = (language: string, env?: string) => {
    const productTag = vector.productTag || 'your-product';
    const envSlug = env || vector.env?.slug || 'prd';
    const vectorTag = vector.vector;
    const namespace = selectedNamespace?.name || 'default';

    return [
      {
        title: 'Semantic Search',
        code: `const results = await ductape.vector.query({
  product: '${productTag}',
  env: '${envSlug}',
  vector: '${vectorTag}',
  queryVector: embeddings, // Your query embedding
  topK: 10,
  namespace: '${namespace}',
  includeMetadata: true,
});`,
      },
      {
        title: 'Upsert Vectors',
        code: `await ductape.vector.upsert({
  product: '${productTag}',
  env: '${envSlug}',
  vector: '${vectorTag}',
  vectors: [
    {
      id: 'vec_001',
      values: embeddings, // Your embedding array
      metadata: { key: 'value' },
    }
  ],
  namespace: '${namespace}',
});`,
      },
      {
        title: 'Fetch by IDs',
        code: `const vectors = await ductape.vector.fetch({
  product: '${productTag}',
  env: '${envSlug}',
  vector: '${vectorTag}',
  ids: ['vec_001', 'vec_002'],
  namespace: '${namespace}',
});`,
      },
      {
        title: 'Initialize SDK',
        code: `import Ductape from '@ductape/sdk';

const ductape = new Ductape({
  workspaceId: 'your-workspace-id',
  publicKey: 'your-public-key',
  secretKey: 'your-secret-key',
});

await ductape.init();`,
      },
    ];
  };

  // Render namespace status badge
  const renderNamespaceStatus = (status: VectorNamespace['status']) => {
    switch (status) {
      case 'ready':
        return (
          <span className="flex items-center gap-1 text-xs text-green">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </span>
        );
      case 'indexing':
        return (
          <span className="flex items-center gap-1 text-xs text-yellow-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            Indexing
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs text-red">
            <XCircle className="h-3 w-3" />
            Error
          </span>
        );
    }
  };

  // Render overview content
  const renderOverview = () => (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-grey-400 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-grey">{totalStats.totalVectors.toLocaleString()}</div>
              <div className="text-xs text-grey-500">Total Vectors</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-grey-400 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-blue" />
            </div>
            <div>
              <div className="text-2xl font-bold text-grey">{totalStats.namespaceCount}</div>
              <div className="text-xs text-grey-500">Namespaces</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-grey-400 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
              <Hash className="h-5 w-5 text-green" />
            </div>
            <div>
              <div className="text-2xl font-bold text-grey">{totalStats.avgDimensions}</div>
              <div className="text-xs text-grey-500">Avg Dimensions</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-grey-400 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Bookmark className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-grey">{savedActions.length}</div>
              <div className="text-xs text-grey-500">Saved Actions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline (7 Days) */}
      <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-grey mb-4">Activity Timeline (7 Days)</h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BarChart3 className="h-12 w-12 text-grey-300 mb-3" />
          <p className="text-sm text-grey-600 font-medium mb-1">No vector activity data available</p>
          <p className="text-xs text-grey-500">Activity charts will appear once vector operations are logged</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-grey mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => {
              setMainView('query');
              setQueryBuilderOperation('query');
              setShowQueryBuilder(true);
            }}
          >
            <Search className="h-5 w-5 text-primary" />
            <span className="text-sm">Semantic Search</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => {
              setMainView('query');
              setQueryBuilderOperation('upsert');
              setShowQueryBuilder(true);
            }}
          >
            <Upload className="h-5 w-5 text-green" />
            <span className="text-sm">Upsert Vectors</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => {
              setMainView('query');
              setQueryBuilderOperation('fetch');
              setShowQueryBuilder(true);
            }}
          >
            <Download className="h-5 w-5 text-blue" />
            <span className="text-sm">Fetch Vectors</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => {
              setMainView('query');
              setQueryBuilderOperation('getStats');
              setShowQueryBuilder(true);
            }}
          >
            <BarChart3 className="h-5 w-5 text-orange-500" />
            <span className="text-sm">Get Stats</span>
          </Button>
        </div>
      </div>

      {/* Namespaces Overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-grey">Namespaces</h3>
          <Button variant="ghost" size="sm" onClick={handleRefreshSidebar}>
            <RefreshCw className={cn('h-4 w-4', isSidebarRefreshing && 'animate-spin')} />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {namespaces.slice(0, 4).map((ns) => (
            <button
              key={ns.name}
              onClick={() => handleSelectNamespace(ns)}
              className="bg-white rounded-lg border border-grey-400 p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="font-medium text-grey">{ns.name}</span>
                </div>
                {renderNamespaceStatus(ns.status)}
              </div>
              <div className="flex items-center gap-4 text-xs text-grey-500">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {ns.vectorCount.toLocaleString()} vectors
                </span>
                {ns.dimensions && (
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {ns.dimensions}d
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
        {namespaces.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setSidebarView('namespaces')}
          >
            View all {namespaces.length} namespaces
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Recent Actions */}
      {savedActions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-grey">Saved Actions</h3>
            <Button variant="ghost" size="sm" onClick={() => setSidebarView('actions')}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {savedActions.slice(0, 3).map((action) => (
              <button
                key={action.id}
                onClick={() => handleLoadAction(action)}
                className="w-full bg-white rounded-lg border border-grey-400 p-3 text-left hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-grey">{action.name}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded', VECTOR_OPERATIONS[action.operation].color)}>
                    {VECTOR_OPERATIONS[action.operation].label}
                  </span>
                </div>
                {action.description && (
                  <p className="text-xs text-grey-500 truncate">{action.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render namespace detail view
  const renderNamespaceView = () => {
    if (!selectedNamespace) return null;

    if (isLoadingNamespace) {
      return (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header - Fixed */}
          <div className="flex-shrink-0 bg-white border-b border-grey-400 p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBackToOverview} className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="w-px h-6 bg-grey-400" />
              <Layers className="h-5 w-5 text-blue" />
              <div>
                <h2 className="text-lg font-semibold text-grey">{selectedNamespace.name}</h2>
                <p className="text-xs text-grey-600">Loading namespace data...</p>
              </div>
            </div>
          </div>

          {/* Loading Content */}
          <div className="flex-1 flex items-center justify-center bg-grey-50">
            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
                </div>
                <Loader2 className="h-16 w-16 animate-spin text-primary relative" />
              </div>
              <p className="text-grey-600 mt-6 text-sm">Loading vectors...</p>
              <p className="text-grey-500 mt-2 text-xs">This may take a moment</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Namespace Header - Fixed */}
        <div className="flex-shrink-0 bg-white border-b border-grey-400 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBackToOverview} className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="w-px h-6 bg-grey-400" />
              <Layers className="h-5 w-5 text-blue" />
              <div>
                <h2 className="text-lg font-semibold text-grey">{selectedNamespace.name}</h2>
                <p className="text-xs text-grey-600">{selectedNamespace.vectorCount.toLocaleString()} vectors</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setResultsView('table')} className={cn(resultsView === 'table' && 'bg-grey-100')}>
                <Table2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setResultsView('cards')} className={cn(resultsView === 'cards' && 'bg-grey-100')}>
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setResultsView('json')} className={cn(resultsView === 'json' && 'bg-grey-100')}>
                <Braces className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-grey-400 mx-1" />
              <Button variant="outline" size="sm" onClick={() => {
                setQueryInput(getNamespaceQuery(selectedNamespace.name));
                setMainView('query');
              }} className="gap-2">
                <Code className="h-4 w-4" />
                Query
              </Button>
              <Button size="sm" onClick={handleExecuteQuery} className="gap-2">
                <Play className="h-4 w-4" />
                Execute
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4">

          {isLoadingVectors ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-lg border border-grey-400">
              <div className="text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary/20 rounded-full"></div>
                  </div>
                  <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
                </div>
                <p className="text-grey-600 font-medium">Loading vectors...</p>
                <p className="text-grey-500 text-sm mt-1">Fetching data from {selectedNamespace.name}</p>
              </div>
            </div>
          ) : displayVectors.length === 0 ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-lg border border-grey-400">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 rounded-full bg-grey-100 flex items-center justify-center mx-auto mb-4">
                  <Database className="h-8 w-8 text-grey-400" />
                </div>
                <h3 className="text-lg font-semibold text-grey mb-2">No vectors found</h3>
                <p className="text-grey-500 text-sm mb-4">This namespace doesn't contain any vectors yet, or they haven't been loaded.</p>
                <Button size="sm" onClick={handleExecuteQuery} className="gap-2">
                  <Play className="h-4 w-4" />
                  Load Vectors
                </Button>
              </div>
            </div>
          ) : (
            <>
              {resultsView === 'table' && (
                <div className="bg-white rounded-lg border border-grey-400 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-grey-50">
                      <tr className="border-b border-grey-400">
                        <th className="text-left py-3 px-4 font-medium text-grey-600">ID</th>
                        <th className="text-left py-3 px-4 font-medium text-grey-600">Metadata</th>
                        <th className="text-right py-3 px-4 font-medium text-grey-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayVectors.map((vec) => (
                        <tr
                          key={vec.id}
                          className="border-b border-grey-400 hover:bg-grey-50 cursor-pointer"
                          onClick={() => handleSelectVector(vec)}
                        >
                          <td className="py-3 px-4">
                            <code className="text-sm text-grey dark:text-grey bg-grey-100 dark:bg-grey-400 px-2 py-1 rounded">{vec.id}</code>
                          </td>
                          <td className="py-3 px-4 text-grey-600 dark:text-grey truncate max-w-md">
                            {vec.metadata ? JSON.stringify(vec.metadata) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="sm" onClick={(e) => {
                              e.stopPropagation();
                              handleCopyToClipboard(vec.id);
                            }}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {resultsView === 'table' && totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 bg-white rounded-lg border border-grey-400 px-4 py-3">
                  <div className="text-sm text-grey-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalVectorCount)} of {totalVectorCount.toLocaleString()} vectors
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {resultsView === 'cards' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {displayVectors.map((vec) => (
                      <button
                        key={vec.id}
                        onClick={() => handleSelectVector(vec)}
                        className="bg-white rounded-lg border border-grey-400 p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-sm font-medium text-grey bg-grey-100 px-2 py-1 rounded">{vec.id}</code>
                          <Button variant="ghost" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            handleCopyToClipboard(vec.id);
                          }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        {vec.metadata && (
                          <div className="space-y-1">
                            {Object.entries(vec.metadata).slice(0, 3).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2 text-xs">
                                <span className="text-grey-500">{key}:</span>
                                <span className="text-grey truncate">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 bg-white rounded-lg border border-grey-400 px-4 py-3">
                      <div className="text-sm text-grey-600">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalVectorCount)} of {totalVectorCount.toLocaleString()} vectors
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {resultsView === 'json' && (
                <JsonViewer
                  data={filteredVectors}
                  defaultExpanded={false}
                  onCopy={handleCopyToClipboard}
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Render vector detail view
  const renderVectorView = () => {
    if (!selectedVector) return null;

    if (isLoadingVector) {
      return (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header - Fixed */}
          <div className="flex-shrink-0 bg-white border-b border-grey-400 p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setMainView('namespace')} className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="w-px h-6 bg-grey-400" />
              <FileText className="h-5 w-5 text-blue" />
              <div>
                <h2 className="text-lg font-semibold text-grey font-mono">{selectedVector.id}</h2>
                <p className="text-xs text-grey-600">Loading vector details...</p>
              </div>
            </div>
          </div>

          {/* Loading Content */}
          <div className="flex-1 flex items-center justify-center bg-grey-50">
            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
                </div>
                <Loader2 className="h-16 w-16 animate-spin text-primary relative" />
              </div>
              <p className="text-grey-600 mt-6 text-sm">Loading vector data...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Vector Header - Fixed */}
        <div className="flex-shrink-0 bg-white border-b border-grey-400 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setMainView('namespace')} className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="w-px h-6 bg-grey-400" />
              <FileText className="h-5 w-5 text-blue" />
              <div>
                <h2 className="text-lg font-semibold text-grey font-mono">{selectedVector.id}</h2>
                <p className="text-xs text-grey-600">Vector in {selectedNamespace?.name || 'namespace'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(selectedVector.id)} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy ID
              </Button>
              <Button variant="outline" size="sm" className="text-red hover:text-red gap-2" onClick={() => setShowDeleteModal(true)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">

        {/* Vector Properties */}
        <div className="bg-white rounded-lg border border-grey-400 p-4">
          <h3 className="text-sm font-semibold text-grey mb-4 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue" />
            Vector Properties
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="flex flex-col col-span-2">
              <span className="text-xs text-grey-500 mb-1">ID</span>
              <code className="text-sm text-grey dark:text-grey bg-slate-50 dark:bg-grey-400 px-2 py-1.5 rounded border border-grey-400 font-mono break-all">{selectedVector.id}</code>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-grey-500 mb-1">Namespace</span>
              <span className="text-sm text-grey px-2 py-1.5">{selectedNamespace?.name || 'default'}</span>
            </div>
            {selectedVector.score !== undefined && (
              <div className="flex flex-col">
                <span className="text-xs text-grey-500 mb-1">Similarity Score</span>
                <span className="text-sm text-blue-700 font-semibold px-2 py-1.5">{selectedVector.score.toFixed(4)}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs text-grey-500 mb-1">Has Vector Values</span>
              <span className="text-sm text-grey px-2 py-1.5">{selectedVector.values ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Metadata */}
        {selectedVector.metadata && Object.keys(selectedVector.metadata).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-grey mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4 text-emerald-600" />
              Metadata
            </h3>
            <JsonViewer
              data={selectedVector.metadata}
              defaultExpanded={true}
              onCopy={handleCopyToClipboard}
            />
          </div>
        )}

        {/* Full Vector Data */}
        <div>
          <h3 className="text-sm font-semibold text-grey mb-2 flex items-center gap-2">
            <Braces className="h-4 w-4 text-slate-600" />
            Complete Vector Data
          </h3>
          <JsonViewer
            data={selectedVector}
            defaultExpanded={false}
            onCopy={handleCopyToClipboard}
          />
        </div>
        </div>
      </div>
    );
  };

  // Render query view
  const renderQueryView = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Query Header */}
      <div className="h-14 border-b border-grey-400 bg-white flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBackToOverview}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {showQueryBuilder ? (
              <>
                <Settings2 className="h-5 w-5 text-primary" />
                <span className="font-semibold text-grey">Query Builder</span>
              </>
            ) : selectedAction ? (
              <>
                <Bookmark className="h-5 w-5 text-primary" />
                <span className="font-semibold text-grey">{selectedAction.name}</span>
                <code className="text-xs bg-grey-100 px-2 py-1 rounded text-grey-600">{selectedAction.vector}</code>
              </>
            ) : (
              <>
                <Code className="h-5 w-5 text-primary" />
                <span className="font-semibold text-grey">Query Editor</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCodeSidebar(true)}
            className="gap-2"
          >
            <Code className="h-4 w-4" />
            Code
          </Button>
          <Button
            variant={showQueryBuilder ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowQueryBuilder(!showQueryBuilder);
              setSelectedAction(null);
            }}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Builder
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSaveActionModal}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Action
          </Button>
          <Button
            onClick={handleExecuteQuery}
            size="sm"
            disabled={isExecuting}
            className="gap-2"
          >
            {isExecuting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Execute
          </Button>
        </div>
      </div>

      {/* Query Content - Vertical Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Query Panel */}
        <div className="h-1/2 border-b border-grey-400 flex flex-col">
          {showQueryBuilder ? (
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                {/* Operation Select */}
                <div>
                  <Label className="text-xs text-grey-600 mb-2 block">Operation</Label>
                  <Select value={queryBuilderOperation} onValueChange={(v) => setQueryBuilderOperation(v as VectorOperation)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VECTOR_OPERATIONS).map(([op, config]) => (
                        <SelectItem key={op} value={op}>
                          <div className="flex items-center gap-2">
                            <span className={cn('text-xs px-1.5 py-0.5 rounded', config.color)}>{config.category}</span>
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-grey-500 mt-1">{VECTOR_OPERATIONS[queryBuilderOperation].description}</p>
                </div>

                {/* Namespace */}
                <div>
                  <Label className="text-xs text-grey-600 mb-2 block">Namespace</Label>
                  <Select value={queryBuilderNamespace} onValueChange={setQueryBuilderNamespace}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select namespace" />
                    </SelectTrigger>
                    <SelectContent>
                      {namespaces.map(ns => (
                        <SelectItem key={ns.name} value={ns.name}>{ns.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search-specific fields */}
                {(queryBuilderOperation === 'query' || queryBuilderOperation === 'findSimilar') && (
                  <>
                    <div>
                      <Label className="text-xs text-grey-600 mb-2 block">Top K Results</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[parseInt(queryBuilderTopK) || 10]}
                          onValueChange={(v) => setQueryBuilderTopK(String(v[0]))}
                          min={1}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={queryBuilderTopK}
                          onChange={(e) => setQueryBuilderTopK(e.target.value)}
                          className="w-20"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={queryBuilderIncludeMetadata}
                          onCheckedChange={(v) => setQueryBuilderIncludeMetadata(!!v)}
                        />
                        <span className="text-sm text-grey">Include Metadata</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={queryBuilderIncludeValues}
                          onCheckedChange={(v) => setQueryBuilderIncludeValues(!!v)}
                        />
                        <span className="text-sm text-grey">Include Values</span>
                      </label>
                    </div>
                  </>
                )}

                {/* Fetch-specific fields */}
                {(queryBuilderOperation === 'fetch' || queryBuilderOperation === 'fetchOne' || queryBuilderOperation === 'deleteByIds') && (
                  <div>
                    <Label className="text-xs text-grey-600 mb-2 block">Vector IDs</Label>
                    <Textarea
                      value={queryBuilderIds}
                      onChange={(e) => setQueryBuilderIds(e.target.value)}
                      placeholder="vec_001, vec_002, vec_003"
                      className="h-20"
                    />
                    <p className="text-xs text-grey-500 mt-1">Comma-separated list of vector IDs</p>
                  </div>
                )}

                {/* Filters */}
                {(queryBuilderOperation === 'query' || queryBuilderOperation === 'findSimilar' || queryBuilderOperation === 'deleteByFilter') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-grey-600">Metadata Filters</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQueryBuilderFilters([...queryBuilderFilters, { field: '', operator: '$eq', value: '' }])}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Filter
                      </Button>
                    </div>
                    {queryBuilderFilters.map((filter, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <Input
                          placeholder="Field"
                          value={filter.field}
                          onChange={(e) => {
                            const updated = [...queryBuilderFilters];
                            updated[idx].field = e.target.value;
                            setQueryBuilderFilters(updated);
                          }}
                          className="flex-1"
                        />
                        <Select
                          value={filter.operator}
                          onValueChange={(v) => {
                            const updated = [...queryBuilderFilters];
                            updated[idx].operator = v;
                            setQueryBuilderFilters(updated);
                          }}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="$eq">=</SelectItem>
                            <SelectItem value="$ne">≠</SelectItem>
                            <SelectItem value="$gt">&gt;</SelectItem>
                            <SelectItem value="$gte">≥</SelectItem>
                            <SelectItem value="$lt">&lt;</SelectItem>
                            <SelectItem value="$lte">≤</SelectItem>
                            <SelectItem value="$in">in</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Value"
                          value={filter.value}
                          onChange={(e) => {
                            const updated = [...queryBuilderFilters];
                            updated[idx].value = e.target.value;
                            setQueryBuilderFilters(updated);
                          }}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setQueryBuilderFilters(queryBuilderFilters.filter((_, i) => i !== idx))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Generate Query Button */}
                <Button
                  onClick={() => {
                    const query: any = {
                      operation: queryBuilderOperation,
                      options: {
                        namespace: queryBuilderNamespace || 'default',
                      }
                    };

                    if (queryBuilderOperation === 'query' || queryBuilderOperation === 'findSimilar') {
                      query.options.topK = parseInt(queryBuilderTopK) || 10;
                      query.options.includeMetadata = queryBuilderIncludeMetadata;
                      query.options.includeValues = queryBuilderIncludeValues;
                      if (queryBuilderFilters.length > 0) {
                        query.options.filter = {};
                        queryBuilderFilters.forEach(f => {
                          if (f.field && f.value) {
                            query.options.filter[f.field] = { [f.operator]: f.value };
                          }
                        });
                      }
                    }

                    if (queryBuilderIds && (queryBuilderOperation === 'fetch' || queryBuilderOperation === 'fetchOne' || queryBuilderOperation === 'deleteByIds')) {
                      query.options.ids = queryBuilderIds.split(',').map(id => id.trim());
                    }

                    setQueryInput(JSON.stringify(query, null, 2));
                    toast.success('Query generated');
                  }}
                  className="w-full"
                >
                  Generate Query
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <Textarea
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                className="flex-1 font-mono text-sm resize-none border-0 rounded-none focus-visible:ring-0"
                placeholder="Enter your query JSON..."
              />
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="h-1/2 flex flex-col bg-grey-50">
          <div className="h-10 border-b border-grey-400 bg-white flex items-center justify-between px-4">
            <span className="text-sm font-medium text-grey">Results</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setResultsView('table')}>
                <Table2 className={cn('h-4 w-4', resultsView === 'table' && 'text-primary')} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setResultsView('cards')}>
                <Grid3X3 className={cn('h-4 w-4', resultsView === 'cards' && 'text-primary')} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setResultsView('json')}>
                <Braces className={cn('h-4 w-4', resultsView === 'json' && 'text-primary')} />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {isExecuting ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-grey-500">Executing query...</p>
                </div>
              </div>
            ) : queryError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-red mx-auto mb-3" />
                  <p className="text-red font-medium mb-1">Query Failed</p>
                  <p className="text-sm text-grey-500">{queryError}</p>
                </div>
              </div>
            ) : queryResult ? (
              <div className="space-y-4">
                {/* Execution Info */}
                <div className="flex items-center gap-4 text-sm text-grey-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {queryResult.executionTime}ms
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {queryResult.matches?.length || 0} results
                  </span>
                </div>

                {/* Results */}
                {resultsView === 'json' && (
                  <JsonViewer
                    data={queryResult}
                    defaultExpanded={false}
                    onCopy={handleCopyToClipboard}
                  />
                )}

                {resultsView === 'table' && queryResult.matches && (
                  <div className="bg-white rounded-lg border border-grey-400 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-grey-50">
                        <tr className="border-b border-grey-400">
                          <th className="text-left py-3 px-4 font-medium text-grey-600">#</th>
                          <th className="text-left py-3 px-4 font-medium text-grey-600">ID</th>
                          <th className="text-left py-3 px-4 font-medium text-grey-600">Score</th>
                          <th className="text-left py-3 px-4 font-medium text-grey-600">Metadata</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.matches.map((vec: VectorRecord, idx: number) => (
                          <tr key={vec.id} className="border-b border-grey-400 hover:bg-grey-50">
                            <td className="py-3 px-4 text-grey-500">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <code className="text-sm bg-grey-100 px-2 py-1 rounded">{vec.id}</code>
                            </td>
                            <td className="py-3 px-4">
                              {vec.score !== undefined && (
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-grey-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full"
                                      style={{ width: `${vec.score * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-grey-600">{vec.score.toFixed(4)}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-grey-600 truncate max-w-xs">
                              {vec.metadata ? JSON.stringify(vec.metadata) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {resultsView === 'cards' && queryResult.matches && (
                  <div className="grid grid-cols-2 gap-3">
                    {queryResult.matches.map((vec: VectorRecord, idx: number) => (
                      <div key={vec.id} className="bg-white rounded-lg border border-grey-400 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <code className="text-sm font-medium text-grey bg-grey-100 px-2 py-1 rounded">{vec.id}</code>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">#{idx + 1}</span>
                        </div>
                        {vec.score !== undefined && (
                          <div className="flex items-center gap-1 mb-2 text-sm text-grey-600">
                            <Target className="h-3 w-3" />
                            Score: {vec.score.toFixed(4)}
                          </div>
                        )}
                        {vec.metadata && (
                          <div className="space-y-1">
                            {Object.entries(vec.metadata).slice(0, 3).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2 text-xs">
                                <span className="text-grey-500">{key}:</span>
                                <span className="text-grey truncate">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Play className="h-12 w-12 text-grey-300 mx-auto mb-3" />
                  <p className="text-grey-500 mb-1">No results yet</p>
                  <p className="text-sm text-grey-400">Execute a query to see results</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render results view
  const renderResultsView = () => (
    <div className="flex-1 flex flex-col">
      <div className="h-14 border-b border-grey-400 bg-white flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMainView('query')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Query
          </Button>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green" />
            <span className="font-semibold text-grey">Query Results</span>
            {queryResult && (
              <span className="text-sm text-grey-500">
                {queryResult.executionTime}ms • {queryResult.matches?.length || 0} results
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setResultsView('table')}>
            <Table2 className={cn('h-4 w-4', resultsView === 'table' && 'text-primary')} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setResultsView('cards')}>
            <Grid3X3 className={cn('h-4 w-4', resultsView === 'cards' && 'text-primary')} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setResultsView('json')}>
            <Braces className={cn('h-4 w-4', resultsView === 'json' && 'text-primary')} />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {queryResult && queryResult.matches && (
          <>
            {resultsView === 'table' && (
              <div className="bg-white rounded-lg border border-grey-400 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-grey-50">
                    <tr className="border-b border-grey-400">
                      <th className="text-left py-3 px-4 font-medium text-grey-600">#</th>
                      <th className="text-left py-3 px-4 font-medium text-grey-600">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-grey-600">Score</th>
                      <th className="text-left py-3 px-4 font-medium text-grey-600">Metadata</th>
                      <th className="text-right py-3 px-4 font-medium text-grey-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.matches.map((vec: VectorRecord, idx: number) => (
                      <tr
                        key={vec.id}
                        className="border-b border-grey-400 hover:bg-grey-50 cursor-pointer"
                        onClick={() => handleSelectVector(vec)}
                      >
                        <td className="py-3 px-4 text-grey-500">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <code className="text-sm bg-grey-100 px-2 py-1 rounded">{vec.id}</code>
                        </td>
                        <td className="py-3 px-4">
                          {vec.score !== undefined && (
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-grey-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${vec.score * 100}%` }}
                                />
                              </div>
                              <span className="text-grey-600">{vec.score.toFixed(4)}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-grey-600">
                          {vec.metadata ? (
                            <div className="max-w-md truncate">
                              {JSON.stringify(vec.metadata)}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyToClipboard(vec.id);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {resultsView === 'cards' && (
              <div className="grid grid-cols-3 gap-4">
                {queryResult.matches.map((vec: VectorRecord, idx: number) => (
                  <button
                    key={vec.id}
                    onClick={() => handleSelectVector(vec)}
                    className="bg-white rounded-lg border border-grey-400 p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <code className="text-sm font-medium text-grey bg-grey-100 px-2 py-1 rounded">{vec.id}</code>
                        {vec.score !== undefined && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-grey-600">
                            <Target className="h-3 w-3" />
                            Score: {vec.score.toFixed(4)}
                          </div>
                        )}
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">#{idx + 1}</span>
                    </div>
                    {vec.metadata && (
                      <div className="space-y-1">
                        {Object.entries(vec.metadata).slice(0, 4).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            <span className="text-grey-500">{key}:</span>
                            <span className="text-grey truncate">{String(value)}</span>
                          </div>
                        ))}
                        {Object.keys(vec.metadata).length > 4 && (
                          <div className="text-xs text-grey-500">+{Object.keys(vec.metadata).length - 4} more fields</div>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {resultsView === 'json' && (
              <JsonViewer
                data={queryResult}
                defaultExpanded={false}
                onCopy={handleCopyToClipboard}
              />
            )}
          </>
        )}
      </div>
    </div>
  );

  // Show loading state while initializing the vector service
  if (!vectorService) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-gradient-to-br from-grey-50 via-grey-100 to-grey-200">
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-2xl animate-pulse delay-150" />
          </div>

          {/* Main content card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-sm text-center">
            {/* Animated vector icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Boxes className="h-10 w-10 text-primary" />
              </div>
              {/* Animated ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-2 border-primary/20 rounded-full animate-ping" />
              </div>
            </div>

            {/* Loading status */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-grey-800">Initializing</h3>
              <p className="text-sm text-grey-600">
                Setting up vector service...
              </p>
            </div>

            {/* Progress indicator */}
            <div className="mt-6">
              <div className="flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show connecting state while establishing vector database connection
  if (isConnecting) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-gradient-to-br from-grey-50 via-grey-100 to-grey-200">
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-2xl animate-pulse delay-150" />
          </div>

          {/* Main content card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-sm text-center">
            {/* Animated vector icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Boxes className="h-10 w-10 text-primary" />
              </div>
              {/* Animated ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-2 border-primary/20 rounded-full animate-ping" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 border border-primary/10 rounded-full animate-[ping_2s_ease-in-out_infinite]" />
              </div>
            </div>

            {/* Connection status */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-grey-800">Connecting to Vector Database</h3>
              <p className="text-sm text-grey-600">
                Establishing secure connection to
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grey-100 rounded-lg">
                <Boxes className="h-4 w-4 text-primary" />
                <span className="font-medium text-grey-800">{vector.name}</span>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs text-grey-500">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                </div>
              </div>
              <p className="text-xs text-grey-400">
                Environment: <span className="font-medium text-grey-500">{currentEnvSlug}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show connection error state
  if (connectionError) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-gradient-to-br from-grey-50 via-grey-100 to-grey-200">
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red/5 rounded-full blur-3xl" />
          </div>

          {/* Main content card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-md text-center">
            {/* Error icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red/20 to-red/5 flex items-center justify-center">
                <Boxes className="h-10 w-10 text-red" />
              </div>
              {/* X indicator */}
              <div className="absolute -bottom-1 -right-1 left-1/2 ml-4 w-8 h-8 bg-red rounded-full flex items-center justify-center shadow-lg">
                <X className="h-5 w-5 text-white" />
              </div>
            </div>

            {/* Error content */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-grey-800">Connection Failed</h3>
              <p className="text-sm text-grey-600">
                Unable to connect to
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grey-100 rounded-lg">
                <Boxes className="h-4 w-4 text-grey-500" />
                <span className="font-medium text-grey-800">{vector.name}</span>
              </div>
            </div>

            {/* Error message */}
            <div className="mt-4 p-4 bg-red/5 border border-red/20 rounded-xl">
              <p className="text-sm text-red font-medium">
                {connectionError instanceof Error ? connectionError.message : 'Unknown error occurred'}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['vector-connection', vector.productTag, vector.vector, currentEnvSlug] })}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
              <p className="text-xs text-grey-400">
                Environment: <span className="font-medium text-grey-500">{currentEnvSlug}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-grey-100">
      {/* Sidebar */}
      <div className={cn(
        'bg-white border-r border-grey-400 flex flex-col flex-shrink-0 transition-all duration-200',
        isSidebarCollapsed ? 'w-14' : 'w-64'
      )}>
        {/* Sidebar Header */}
        <div className={cn('flex-shrink-0 border-b border-grey-400', isSidebarCollapsed ? 'p-2' : 'p-4')}>
          <div className={cn('flex items-center', isSidebarCollapsed ? 'justify-center' : 'gap-2 mb-3')}>
            {/* Vector Icon Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={cn(
                'flex items-center justify-center rounded-lg flex-shrink-0',
                getVectorTypeColor(vector.type),
                isSidebarCollapsed ? 'w-8 h-8' : 'w-9 h-9'
              )}
            >
              <Boxes className="h-5 w-5" />
            </button>

            {!isSidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-grey text-sm truncate">{vector.name || 'Vector Explorer'}</h2>
                  <div className="flex items-center gap-2 text-xs text-grey-600">
                    {vector.env?.slug && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        {currentEnvSlug}
                      </span>
                    )}
                    {vector.type && (
                      <span className="truncate">{getVectorDBDisplayName(vector.type)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1.5 text-grey-500 hover:text-grey hover:bg-grey-100 rounded transition-colors"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Quick Stats - Only show when expanded */}
          {!isSidebarCollapsed && (vector.dimensions || vector.metric) && (
            <div className="flex items-center gap-3 text-xs text-grey-600 mb-3">
              {vector.dimensions && (
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {vector.dimensions}d
                </span>
              )}
              {vector.metric && (
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {vector.metric}
                </span>
              )}
            </div>
          )}

          {/* View Selector - Only show when expanded */}
          {!isSidebarCollapsed && (
            <div className="flex gap-1 mb-3 bg-grey-100 p-1 rounded">
              <button
                onClick={() => setSidebarView('namespaces')}
                className={cn(
                  'flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors',
                  sidebarView === 'namespaces'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-grey-600 hover:text-grey'
                )}
              >
                <Layers className="h-3 w-3 inline mr-1" />
                Namespaces
              </button>
              <button
                onClick={() => setSidebarView('actions')}
                className={cn(
                  'flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors',
                  sidebarView === 'actions'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-grey-600 hover:text-grey'
                )}
              >
                <Zap className="h-3 w-3 inline mr-1" />
                Actions
              </button>
            </div>
          )}

          {/* Search - Only show when expanded */}
          {!isSidebarCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                placeholder={`Search ${sidebarView}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          )}
        </div>

        {/* Collapsed View Selector - Only show when collapsed */}
        {isSidebarCollapsed && (
          <div className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto">
            <button
              onClick={() => {
                setIsSidebarCollapsed(false);
                setSidebarView('namespaces');
              }}
              className={cn(
                'w-full h-10 flex items-center justify-center rounded-lg transition-colors',
                sidebarView === 'namespaces'
                  ? 'bg-primary/10 text-primary'
                  : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
              )}
              title="Namespaces"
            >
              <Layers className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                setIsSidebarCollapsed(false);
                setSidebarView('actions');
              }}
              className={cn(
                'w-full h-10 flex items-center justify-center rounded-lg transition-colors',
                sidebarView === 'actions'
                  ? 'bg-primary/10 text-primary'
                  : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
              )}
              title="Actions"
            >
              <Zap className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Sidebar Content Header - Only show when expanded */}
        {!isSidebarCollapsed && (
          <div className="px-3 pt-2 pb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">
              {sidebarView === 'namespaces' ? 'Namespaces' : 'Saved Actions'}
            </span>
            <div className="flex gap-1">
              <button
                onClick={handleRefreshSidebar}
                disabled={isSidebarRefreshing}
                className="text-grey-600 hover:text-primary transition-colors"
                title="Refresh list"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isSidebarRefreshing && 'animate-spin')} />
              </button>
              {sidebarView === 'namespaces' && (
                <button
                  onClick={() => {
                    // TODO: Open create namespace modal
                    console.log('Create new namespace');
                  }}
                  className="text-grey-600 hover:text-primary transition-colors"
                  title="Create new namespace"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
              {sidebarView === 'actions' && (
                <button
                  onClick={() => {
                    setMainView('query');
                    setShowQueryBuilder(true);
                  }}
                  className="text-grey-600 hover:text-primary transition-colors"
                  title="Create new action"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sidebar Content - Only show when expanded */}
        {!isSidebarCollapsed && (
          <div className="flex-1 overflow-auto px-3 pb-3 min-h-0">
          {sidebarView === 'namespaces' && (
            <div className="space-y-1">
              {filteredNamespaces.map((ns) => (
                <button
                  key={ns.name}
                  onClick={() => handleSelectNamespace(ns)}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-2 rounded text-sm transition-colors',
                    selectedNamespace?.name === ns.name
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-grey hover:bg-grey-100'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Layers className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{ns.name}</span>
                  </div>
                  <span className="text-xs text-grey-600 flex-shrink-0 ml-2">
                    {ns.vectorCount.toLocaleString()}
                  </span>
                </button>
              ))}
              {isLoadingNamespaces ? (
                <div className="text-center py-8 text-grey-500">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                  <p className="text-sm">Loading namespaces...</p>
                </div>
              ) : filteredNamespaces.length === 0 && (
                <div className="text-center py-8 text-grey-500">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{isConnected ? 'No namespaces found' : 'Connect to view namespaces'}</p>
                </div>
              )}
            </div>
          )}

          {sidebarView === 'actions' && (
            <div className="space-y-1">
              {filteredActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleLoadAction(action)}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-2 rounded text-sm transition-colors',
                    selectedAction?.id === action.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-grey hover:bg-grey-100'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Zap className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{action.name}</span>
                  </div>
                  <span className="text-xs text-grey-600 flex-shrink-0 ml-2">
                    {action.parameters.length > 0 ? `${action.parameters.length} params` : ''}
                  </span>
                </button>
              ))}
              {filteredActions.length === 0 && (
                <div className="text-center py-8 text-grey-500">
                  <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No saved actions</p>
                </div>
              )}
            </div>
          )}
          </div>
        )}

        {/* Bottom Status Bar - Only show when expanded */}
        {!isSidebarCollapsed && (
          <div className="flex-shrink-0 border-t border-grey-400 bg-grey-50 p-3">
            <div className="text-xs text-grey-600">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-green" />
                      <span className="text-green">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-red" />
                      <span className="text-red">Disconnected</span>
                    </>
                  )}
                </div>
                {isLoadingNamespaces && (
                  <div className="flex items-center gap-1 text-grey-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading...</span>
                  </div>
                )}
              </div>
              <div className="text-grey-500">
                {totalStats.namespaceCount} namespace{totalStats.namespaceCount !== 1 ? 's' : ''} · {totalStats.totalVectors.toLocaleString()} vectors
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {mainView === 'overview' && renderOverview()}
        {mainView === 'namespace' && renderNamespaceView()}
        {mainView === 'vector' && renderVectorView()}
        {mainView === 'query' && renderQueryView()}
        {mainView === 'results' && renderResultsView()}
      </div>

      {/* Code Sidebar */}
      {showCodeSidebar && (
        <CodeSidebar
          title="Vector SDK"
          subtitle={vector.name}
          tag={vector.vector}
          onClose={() => setShowCodeSidebar(false)}
          generateCodeSections={generateCodeSections}
          environments={vector.envs || (vector.env ? [{ slug: currentEnvSlug }] : [])}
        />
      )}

      {/* Save Action Modal */}
      <Dialog open={showSaveActionModal} onOpenChange={setShowSaveActionModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Save as Action</DialogTitle>
            <DialogDescription>
              Create a reusable action from your query with configurable parameters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Action Name</Label>
              <Input
                value={actionName}
                onChange={(e) => setActionName(e.target.value)}
                placeholder="e.g., Search Products by Category"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={actionDescription}
                onChange={(e) => setActionDescription(e.target.value)}
                placeholder="Describe what this action does..."
                className="mt-1 h-20"
              />
            </div>

            {extractedValues.length > 0 && (
              <div>
                <Label>Select Parameters to Expose</Label>
                <div className="mt-2 max-h-48 overflow-auto space-y-2">
                  {extractedValues.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-grey-50 rounded">
                      <Checkbox
                        checked={val.selected}
                        onCheckedChange={(checked) => {
                          const updated = [...extractedValues];
                          updated[idx].selected = !!checked;
                          setExtractedValues(updated);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <code className="text-xs text-grey-600">{val.path}</code>
                        <div className="text-xs text-grey-500 truncate">
                          Current: {JSON.stringify(val.value)}
                        </div>
                      </div>
                      {val.selected && (
                        <Input
                          value={val.paramName}
                          onChange={(e) => {
                            const updated = [...extractedValues];
                            updated[idx].paramName = e.target.value;
                            setExtractedValues(updated);
                          }}
                          className="w-32 h-7 text-xs"
                          placeholder="Param name"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveActionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAction}>
              Save Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execute Action Modal */}
      <Dialog open={showExecuteActionModal} onOpenChange={setShowExecuteActionModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Execute {selectedAction?.name}</DialogTitle>
            <DialogDescription>
              Fill in the parameter values to execute this action
            </DialogDescription>
          </DialogHeader>

          {selectedAction && (
            <div className="space-y-4">
              {selectedAction.parameters.map((param) => (
                <div key={param.name}>
                  <Label>{param.name}</Label>
                  <Input
                    value={actionParamValues[param.name] ?? param.defaultValue}
                    onChange={(e) => setActionParamValues({
                      ...actionParamValues,
                      [param.name]: e.target.value
                    })}
                    className="mt-1"
                  />
                  <p className="text-xs text-grey-500 mt-1">Path: {param.path}</p>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecuteActionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecuteAction}>
              <Play className="h-4 w-4 mr-1" />
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vector</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete vector "{selectedVector?.id}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                toast.success(`Vector ${selectedVector?.id} deleted`);
                setShowDeleteModal(false);
                setSelectedVector(null);
                setMainView('namespace');
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
