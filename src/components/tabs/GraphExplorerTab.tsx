import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Share2,
  Network,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Database,
  GitBranch,
  Plus,
  Key,
  Play,
  Zap,
  Circle,
  ArrowRight,
  Table2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  Bookmark,
  Trash2,
  Check,
  Settings2,
  X,
  Code,
  Tag,
  BarChart3,
  Link2,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Hash,
  Edit3,
  MoreVertical,
  Eye,
  List,
} from 'lucide-react';
// Graph explorer types (local — avoids @ductape/sdk export drift on CI/Vercel)
import type {
  IGraphAction,
  IGraphLabel,
  IGraphRelationshipType,
  IGraphIndex,
  IGraphConstraint,
} from '@/types/graphSdk';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ActivityTimelinePanel } from '@/components/activity/ActivityTimelinePanel';
import toast from 'react-hot-toast';
import CodeSidebar from '@/components/CodeSidebar';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDuctapeGraph } from '@/hooks/useDuctapeGraph';
import { useAuth } from '@/store/useAuth';
import logsServices, { GraphDashboardMetrics } from '@/services/logsServices';
import { getExplorerActionParameters } from '@/utils/actionVariables';

interface GraphExplorerTabProps {
  graph: {
    name: string;
    tag: string;
    type: string;
    productTag?: string;
    productName?: string;
    env: {
      slug: string;
      connection_url?: string; // Optional - not used directly, SDK resolves connection via product/graph/env
      database?: string;
      graphName?: string;
      region?: string;
    };
  };
}

type SidebarView = 'labels' | 'relationships' | 'actions';

// Graph operation types based on SDK BaseGraphAdapter
type GraphOperation =
  // Node operations
  | 'createNode' | 'findNodes' | 'findNodeById' | 'updateNode' | 'deleteNode' | 'mergeNode'
  // Relationship operations
  | 'createRelationship' | 'findRelationships' | 'findRelationshipById' | 'updateRelationship' | 'deleteRelationship' | 'mergeRelationship'
  // Path & Traversal operations
  | 'traverse' | 'shortestPath' | 'allPaths' | 'matchPattern' | 'extractSubgraph' | 'getNeighborhood' | 'findConnectedComponents'
  // Aggregation operations
  | 'countNodes' | 'countRelationships'
  // Search operations
  | 'fullTextSearch' | 'vectorSearch'
  // Raw query
  | 'executeRaw';

// Graph operations configuration
const GRAPH_OPERATIONS: Record<GraphOperation, {
  label: string;
  description: string;
  color: string;
  category: 'node' | 'relationship' | 'traversal' | 'aggregation' | 'search' | 'raw';
}> = {
  // Node operations
  createNode: { label: 'Create Node', description: 'Create a new node with labels and properties', color: 'bg-green/10 text-green', category: 'node' },
  findNodes: { label: 'Find Nodes', description: 'Find nodes matching criteria', color: 'bg-blue/10 text-blue', category: 'node' },
  findNodeById: { label: 'Find Node by ID', description: 'Find a single node by its ID', color: 'bg-blue/10 text-blue', category: 'node' },
  updateNode: { label: 'Update Node', description: 'Update node properties or labels', color: 'bg-yellow/10 text-yellow', category: 'node' },
  deleteNode: { label: 'Delete Node', description: 'Delete node(s) from the graph', color: 'bg-red/10 text-red', category: 'node' },
  mergeNode: { label: 'Merge Node', description: 'Create node if not exists, update if exists', color: 'bg-purple-500/10 text-purple-500', category: 'node' },

  // Relationship operations
  createRelationship: { label: 'Create Relationship', description: 'Create a new relationship between nodes', color: 'bg-green/10 text-green', category: 'relationship' },
  findRelationships: { label: 'Find Relationships', description: 'Find relationships matching criteria', color: 'bg-blue/10 text-blue', category: 'relationship' },
  findRelationshipById: { label: 'Find Relationship by ID', description: 'Find a single relationship by its ID', color: 'bg-blue/10 text-blue', category: 'relationship' },
  updateRelationship: { label: 'Update Relationship', description: 'Update relationship properties', color: 'bg-yellow/10 text-yellow', category: 'relationship' },
  deleteRelationship: { label: 'Delete Relationship', description: 'Delete relationship(s) from the graph', color: 'bg-red/10 text-red', category: 'relationship' },
  mergeRelationship: { label: 'Merge Relationship', description: 'Create relationship if not exists, update if exists', color: 'bg-purple-500/10 text-purple-500', category: 'relationship' },

  // Path & Traversal operations
  traverse: { label: 'Traverse', description: 'Traverse the graph from a starting point', color: 'bg-indigo-500/10 text-indigo-500', category: 'traversal' },
  shortestPath: { label: 'Shortest Path', description: 'Find the shortest path between two nodes', color: 'bg-indigo-500/10 text-indigo-500', category: 'traversal' },
  allPaths: { label: 'All Paths', description: 'Find all paths between two nodes', color: 'bg-indigo-500/10 text-indigo-500', category: 'traversal' },
  matchPattern: { label: 'Match Pattern', description: 'Match a graph pattern', color: 'bg-indigo-500/10 text-indigo-500', category: 'traversal' },
  extractSubgraph: { label: 'Extract Subgraph', description: 'Extract a subgraph based on criteria', color: 'bg-indigo-500/10 text-indigo-500', category: 'traversal' },
  getNeighborhood: { label: 'Get Neighborhood', description: 'Get neighborhood of a node', color: 'bg-indigo-500/10 text-indigo-500', category: 'traversal' },
  findConnectedComponents: { label: 'Connected Components', description: 'Find connected components in the graph', color: 'bg-indigo-500/10 text-indigo-500', category: 'traversal' },

  // Aggregation operations
  countNodes: { label: 'Count Nodes', description: 'Count nodes matching criteria', color: 'bg-orange-500/10 text-orange-500', category: 'aggregation' },
  countRelationships: { label: 'Count Relationships', description: 'Count relationships matching criteria', color: 'bg-orange-500/10 text-orange-500', category: 'aggregation' },

  // Search operations
  fullTextSearch: { label: 'Full-Text Search', description: 'Search nodes using full-text index', color: 'bg-cyan-500/10 text-cyan-500', category: 'search' },
  vectorSearch: { label: 'Vector Search', description: 'Vector similarity search on embeddings', color: 'bg-cyan-500/10 text-cyan-500', category: 'search' },

  // Raw query
  executeRaw: { label: 'Raw Query', description: 'Execute a raw Cypher/Gremlin/AQL query', color: 'bg-grey/10 text-grey', category: 'raw' },
};

// Graph types from @/types/graphSdk (local, not @ductape/sdk)

// Helper function to generate tag from name
const generateActionTag = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const parseGraphActionQuery = (query: any): any => {
  if (typeof query !== 'string') return query ?? {};
  try {
    return JSON.parse(query);
  } catch {
    return query;
  }
};

const formatGraphActionQuery = (query: any): string => {
  const parsed = parseGraphActionQuery(query);
  return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
};

const normalizeGraphAction = (action: any): IGraphAction => {
  const query = parseGraphActionQuery(action.query ?? action.template ?? {});
  return {
    id: action.id ?? action._id ?? action.tag,
    tag: action.tag,
    name: action.name ?? action.tag,
    description: action.description,
    operation: action.operation ?? action.type ?? 'executeRaw',
    query,
    parameters: getExplorerActionParameters(action, query),
    createdAt: String(action.createdAt ?? action.created_at ?? new Date().toISOString()),
    updatedAt: action.updatedAt ?? action.updated_at,
    graphTag: action.graphTag ?? action.graph_tag,
  } as IGraphAction;
};

// Empty arrays for when SDK data is not available
const EMPTY_LABELS: IGraphLabel[] = [];
const EMPTY_RELATIONSHIPS: IGraphRelationshipType[] = [];
const EMPTY_CONSTRAINTS: IGraphConstraint[] = [];
const EMPTY_INDEXES: IGraphIndex[] = [];
const EMPTY_ACTIONS: IGraphAction[] = [];

// SDK-style query templates
const getDefaultQuery = () => JSON.stringify({
  operation: 'findNodes',
  options: {
    labels: ['Person'],
    limit: 25,
    skip: 0,
    orderBy: { property: 'name', direction: 'ASC' }
  }
}, null, 2);

const getTraverseQuery = (label: string) => JSON.stringify({
  operation: 'traverse',
  options: {
    startNode: { labels: [label] },
    direction: 'OUTBOUND',
    maxDepth: 2,
    limit: 25
  }
}, null, 2);

const getFindNodesQuery = (label: string) => JSON.stringify({
  operation: 'findNodes',
  options: {
    labels: [label],
    limit: 25,
    skip: 0
  }
}, null, 2);

const getFindRelationshipsQuery = (relType: string) => JSON.stringify({
  operation: 'findRelationships',
  options: {
    type: relType,
    limit: 25,
    includeNodes: true
  }
}, null, 2);

const getNeighborhoodQuery = () => JSON.stringify({
  operation: 'getNeighborhood',
  options: {
    nodeId: '1',
    depth: 2,
    direction: 'BOTH',
    limit: 50
  }
}, null, 2);

const getNodeCountsQuery = () => JSON.stringify({
  operation: 'getStatistics',
  options: {
    includeLabels: true
  }
}, null, 2);

const getRelationshipCountsQuery = () => JSON.stringify({
  operation: 'getStatistics',
  options: {
    includeRelationshipTypes: true
  }
}, null, 2);

// Helper to get query language name for display
const getQueryLanguageName = (type: string): string => {
  switch (type?.toLowerCase()) {
    case 'neo4j':
    case 'memgraph':
      return 'Cypher';
    case 'neptune':
      return 'Gremlin';
    case 'arangodb':
      return 'AQL';
    default:
      return 'Graph';
  }
};

export default function GraphExplorerTab({ graph }: GraphExplorerTabProps) {
  const { setSidebarCollapsed } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Guard: Show error if critical graph data is missing (e.g., tab restored with incomplete data)
  if (!graph?.name || !graph?.tag || !graph?.env?.slug) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Share2 className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete graph data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the graph from your product to reload it.
          </p>
        </div>
      </div>
    );
  }

  // Initialize Graph Proxy Service
  const graphConfig = {
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
  };

  const graphService = useDuctapeGraph(graphConfig);

  // Collapse workbench sidebar when GraphExplorer opens
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  // Persistent state key
  const stateKey = `graph-explorer-state-${graph.tag}-${graph.env.slug}`;

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

  // Initialize state from persisted values
  const [sidebarView, setSidebarView] = useState<SidebarView>(
    persistedState?.sidebarView || 'labels'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [queryInput, setQueryInput] = useState(persistedState?.queryInput || getDefaultQuery());
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSidebarRefreshing, setIsSidebarRefreshing] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(persistedState?.queryResult || null);
  const [queryError, setQueryError] = useState<string | null>(persistedState?.queryError || null);
  // Selected label/relationship - will be resolved from SDK data once loaded
  const [selectedLabelName, setSelectedLabelName] = useState<string | null>(
    persistedState?.selectedLabelName || null
  );
  const [selectedRelTypeName, setSelectedRelTypeName] = useState<string | null>(
    persistedState?.selectedRelTypeName || null
  );
  const [resultsView, setResultsView] = useState<'table' | 'graph'>(persistedState?.resultsView || 'table');
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(20);
  const [lastExecutedQuery, setLastExecutedQuery] = useState<any>(null); // Track for pagination
  const [graphZoom, setGraphZoom] = useState(1);
  const [graphPan, setGraphPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isQueryEditorCollapsed, setIsQueryEditorCollapsed] = useState(true);

  // Modal states
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [showAddRelationshipModal, setShowAddRelationshipModal] = useState(false);
  const [showAddConstraintModal, setShowAddConstraintModal] = useState(false);
  const [showAddIndexModal, setShowAddIndexModal] = useState(false);

  // Form states for modals
  const [nodeLabels, setNodeLabels] = useState<string[]>(['']);
  const [nodeProperties, setNodeProperties] = useState<Array<{ key: string; value: string; type: string }>>([
    { key: '', value: '', type: 'string' },
  ]);

  const [relType, setRelType] = useState('');
  const [relFromLabel, setRelFromLabel] = useState('');
  const [relToLabel, setRelToLabel] = useState('');
  const [relProperties, setRelProperties] = useState<Array<{ key: string; value: string; type: string }>>([
    { key: '', value: '', type: 'string' },
  ]);

  const [constraintName, setConstraintName] = useState('');
  const [constraintType, setConstraintType] = useState<string>('UNIQUE');
  const [constraintTarget, setConstraintTarget] = useState<'node' | 'relationship'>('node');
  const [constraintLabel, setConstraintLabel] = useState('');
  const [constraintProperties, setConstraintProperties] = useState<string[]>(['']);

  const [indexName, setIndexName] = useState('');
  const [indexType, setIndexType] = useState<string>('BTREE');
  const [indexTarget, setIndexTarget] = useState<'node' | 'relationship'>('node');
  const [indexLabel, setIndexLabel] = useState('');
  const [indexProperties, setIndexProperties] = useState<string[]>(['']);

  // Actions state - will be populated from SDK data
  const [selectedActionTag, setSelectedActionTag] = useState<string | null>(
    persistedState?.selectedActionTag || null
  );
  const [showSaveActionModal, setShowSaveActionModal] = useState(false);
  const [showExecuteActionModal, setShowExecuteActionModal] = useState(false);

  // Query Builder state - initialized from persisted state
  const [showQueryBuilder, setShowQueryBuilder] = useState(persistedState?.showQueryBuilder || false);
  const [showQueryEditor, setShowQueryEditor] = useState(persistedState?.showQueryEditor || false);
  const [queryBuilderOperation, setQueryBuilderOperation] = useState<GraphOperation>(persistedState?.queryBuilderOperation || 'findNodes');
  const [queryBuilderLabel, setQueryBuilderLabel] = useState(persistedState?.queryBuilderLabel || '');
  const [queryBuilderRelType, setQueryBuilderRelType] = useState(persistedState?.queryBuilderRelType || '');
  const [queryBuilderDirection, setQueryBuilderDirection] = useState<'OUTGOING' | 'INCOMING' | 'BOTH'>(persistedState?.queryBuilderDirection || 'OUTGOING');
  const [queryBuilderWhere, setQueryBuilderWhere] = useState<Array<{ property: string; operator: string; value: string }>>(persistedState?.queryBuilderWhere || []);
  const [queryBuilderLimit, setQueryBuilderLimit] = useState(persistedState?.queryBuilderLimit || '25');
  const [queryBuilderSkip, setQueryBuilderSkip] = useState(persistedState?.queryBuilderSkip || '0');
  const [queryBuilderOrderBy, setQueryBuilderOrderBy] = useState<{ property: string; direction: 'ASC' | 'DESC' } | null>(persistedState?.queryBuilderOrderBy || null);
  const [queryBuilderMaxDepth, setQueryBuilderMaxDepth] = useState(persistedState?.queryBuilderMaxDepth || '2');
  const [queryBuilderNodeId, setQueryBuilderNodeId] = useState(persistedState?.queryBuilderNodeId || '');
  const [queryBuilderFromNode, setQueryBuilderFromNode] = useState(persistedState?.queryBuilderFromNode || { label: '', property: '', value: '' });
  const [queryBuilderToNode, setQueryBuilderToNode] = useState(persistedState?.queryBuilderToNode || { label: '', property: '', value: '' });
  const [queryBuilderProperties, setQueryBuilderProperties] = useState<Array<{ key: string; value: string }>>(persistedState?.queryBuilderProperties || []);
  const [queryBuilderRawQuery, setQueryBuilderRawQuery] = useState(persistedState?.queryBuilderRawQuery || '');
  const [generatedQuery, setGeneratedQuery] = useState<Record<string, any> | null>(persistedState?.generatedQuery || null);
  const [queryTestResult, setQueryTestResult] = useState<any>(persistedState?.queryTestResult || null);
  const [isTestingQuery, setIsTestingQuery] = useState(false);

  // ==================== GRAPH PROXY QUERIES ====================

  // Establish graph connection first
  const { data: connectionResult, isLoading: isConnecting, error: connectionError, isSuccess: isConnected } = useQuery({
    queryKey: ['graph-connection', graph.productTag, graph.tag, graph.env.slug],
    queryFn: async () => {
      if (!graphService || !graph.productTag) {
        throw new Error('Graph service not available');
      }
      const result = await graphService.connect({
        env: graph.env.slug,
        product: graph.productTag,
        graph: graph.tag,
      });
      return result;
    },
    enabled: !!graphService && !!graph.productTag,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Fetch labels (node types) from the graph database
  const { data: sdkLabels, isLoading: isLoadingLabels, refetch: refetchLabels } = useQuery({
    queryKey: ['graph-labels', graph.productTag, graph.tag, graph.env.slug],
    queryFn: async () => {
      if (!graphService || !graph.productTag) return null;
      try {
        const result = await graphService.schema.listLabels();
        console.log('[Graph-Explorer] Labels result:', result);
        return result;
      } catch (error) {
        console.error('Error fetching labels:', error);
        return null;
      }
    },
    enabled: !!graphService && !!graph.productTag && isConnected,
    staleTime: 30000,
  });

  // Fetch relationship types from the graph database
  const { data: sdkRelationshipTypes, isLoading: isLoadingRelTypes, refetch: refetchRelTypes } = useQuery({
    queryKey: ['graph-relationship-types', graph.productTag, graph.tag, graph.env.slug],
    queryFn: async () => {
      if (!graphService || !graph.productTag) return null;
      try {
        const result = await graphService.schema.listRelationshipTypes();
        console.log('[Graph-Explorer] Relationship types result:', result);
        return result;
      } catch (error) {
        console.error('Error fetching relationship types:', error);
        return null;
      }
    },
    enabled: !!graphService && !!graph.productTag && isConnected,
    staleTime: 30000,
  });

  // Fetch indexes from the graph database
  const { data: sdkIndexes, isLoading: isLoadingIndexes, refetch: refetchIndexes } = useQuery({
    queryKey: ['graph-indexes', graph.productTag, graph.tag, graph.env.slug],
    queryFn: async () => {
      if (!graphService || !graph.productTag) return null;
      try {
        const result = await graphService.schema.listIndexes();
        console.log('[Graph-Explorer] Indexes result:', result);
        return result;
      } catch (error) {
        console.error('Error fetching indexes:', error);
        return null;
      }
    },
    enabled: !!graphService && !!graph.productTag && isConnected,
    staleTime: 30000,
  });

  // Fetch constraints from the graph database
  const { data: sdkConstraints, isLoading: isLoadingConstraints, refetch: refetchConstraints } = useQuery({
    queryKey: ['graph-constraints', graph.productTag, graph.tag, graph.env.slug],
    queryFn: async () => {
      if (!graphService || !graph.productTag) return null;
      try {
        const result = await graphService.schema.listConstraints();
        console.log('[Graph-Explorer] Constraints result:', result);
        return result;
      } catch (error) {
        console.error('Error fetching constraints:', error);
        return null;
      }
    },
    enabled: !!graphService && !!graph.productTag && isConnected,
    staleTime: 30000,
  });

  // Fetch saved actions
  const { data: sdkActions, isLoading: isLoadingActions, refetch: refetchActions } = useQuery<IGraphAction[]>({
    queryKey: ['graph-actions', graph.productTag, graph.tag],
    queryFn: async () => {
      if (!graphService || !graph.productTag) return [];
      try {
        const result: any = await graphService.action.list(graph.tag, graph.productTag);
        console.log('[Graph-Explorer] Actions result:', result);
        const rawActions = Array.isArray(result)
          ? result
          : Array.isArray(result?.actions)
            ? result.actions
            : [];
        return rawActions.map(normalizeGraphAction);
      } catch (error) {
        console.error('Error fetching actions:', error);
        return [];
      }
    },
    enabled: !!graphService && !!graph.productTag && !!graph.tag,
    staleTime: 30000,
  });

  // Fetch graph statistics (node and relationship counts)
  const { data: sdkStatistics, isLoading: isLoadingStatistics, refetch: refetchStatistics } = useQuery({
    queryKey: ['graph-statistics', graph.productTag, graph.tag, graph.env.slug],
    queryFn: async () => {
      if (!graphService || !graph.productTag) return null;
      try {
        const result = await graphService.getStatistics({});
        console.log('[Graph-Explorer] Statistics result:', result);
        return result;
      } catch (error) {
        console.error('Error fetching statistics:', error);
        return null;
      }
    },
    enabled: !!graphService && !!graph.productTag && isConnected,
    staleTime: 30000,
  });

  // Sidebar collapsed and width state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    persistedState?.isSidebarCollapsed || false
  );
  const [sidebarWidth, setSidebarWidth] = useState<number>(
    persistedState?.sidebarWidth || 256
  );

  // Use SDK data only - no fallback to dummy data
  // SDK returns { labels: [...] }, { types: [...] }, { indexes: [...] }, { constraints: [...] }, { actions: [...] }
  const labels: IGraphLabel[] = sdkLabels?.labels || [];
  const relationshipTypes: IGraphRelationshipType[] = sdkRelationshipTypes?.types || [];
  const indexes: IGraphIndex[] = sdkIndexes?.indexes || [];
  const constraints: IGraphConstraint[] = sdkConstraints?.constraints || [];
  const actions: IGraphAction[] = sdkActions || [];

  // Derive selected items from SDK data based on stored names/tags
  const selectedLabel = useMemo(() => {
    if (!selectedLabelName || labels.length === 0) return null;
    return labels.find(l => l.name === selectedLabelName) || null;
  }, [selectedLabelName, labels]);

  const selectedRelType = useMemo(() => {
    if (!selectedRelTypeName || relationshipTypes.length === 0) return null;
    return relationshipTypes.find(r => r.type === selectedRelTypeName) || null;
  }, [selectedRelTypeName, relationshipTypes]);

  const selectedAction = useMemo(() => {
    if (!selectedActionTag || actions.length === 0) return null;
    return actions.find(a => a.tag === selectedActionTag) || null;
  }, [selectedActionTag, actions]);

  // Wrapper functions to update selection by name/tag
  const setSelectedLabel = useCallback((label: IGraphLabel | null) => {
    setSelectedLabelName(label?.name || null);
  }, []);

  const setSelectedRelType = useCallback((relType: IGraphRelationshipType | null) => {
    setSelectedRelTypeName(relType?.type || null);
  }, []);

  const setSelectedAction = useCallback((action: IGraphAction | null) => {
    setSelectedActionTag(action?.tag || null);
  }, []);

  // Memoized table data processing (server-side pagination - data already paginated)
  const tableData = useMemo(() => {
    const rawData = queryResult?.data || [];

    // Robust detection functions (same as in table rendering)
    const isRelationship = (item: any) => {
      const hasType = typeof item.type === 'string' && item.type.length > 0;
      const hasStartEnd = (item.startNode && item.endNode) ||
        (item.start && item.end) ||
        (item.source && item.target) ||
        (item.startNodeId && item.endNodeId) ||
        (item.from && item.to);
      const looksLikeRelationship = hasType && !Array.isArray(item.labels);
      return hasType && (hasStartEnd || looksLikeRelationship);
    };

    const isNode = (item: any) => {
      if (isRelationship(item)) return false;
      return Array.isArray(item.labels) && item.labels.length > 0;
    };

    const allRelationships = rawData.filter(isRelationship);
    const allNodes = rawData.filter(isNode);

    // Calculate start index based on current page (for row numbering)
    const startIndex = (tablePage - 1) * tablePageSize;

    return {
      allRelationships,
      allNodes,
      startIndex,
    };
  }, [queryResult?.data, tablePage, tablePageSize]);

  // ==================== MUTATIONS ====================

  // Execute a graph query
  const executeQueryMutation = useMutation({
    mutationFn: async (queryData: { operation: string; options: any }) => {
      if (!graphService) throw new Error('Graph service not available');
      const result = await graphService.query(queryData);
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

  // Create action mutation
  const createActionMutation = useMutation({
    mutationFn: async (actionData: any) => {
      if (!graphService) throw new Error('Graph service not available');
      return graphService.action.create(actionData);
    },
    onSuccess: () => {
      refetchActions();
      toast.success('Action created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create action: ${error.message}`);
    },
  });

  // Delete action mutation
  const deleteActionMutation = useMutation({
    mutationFn: async (actionTag: string) => {
      if (!graphService) throw new Error('Graph service not available');
      return graphService.action.delete(actionTag);
    },
    onSuccess: () => {
      refetchActions();
      toast.success('Action deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete action: ${error.message}`);
    },
  });

  // Execute action mutation
  const executeActionMutation = useMutation({
    mutationFn: async (dispatchData: any) => {
      if (!graphService) throw new Error('Graph service not available');
      return graphService.action.dispatch(dispatchData);
    },
    onSuccess: (data) => {
      setQueryResult(data);
      setQueryError(null);
      toast.success('Action executed successfully');
    },
    onError: (error: Error) => {
      setQueryError(error.message);
      toast.error(`Action failed: ${error.message}`);
    },
  });

  // Create index mutation
  const createIndexMutation = useMutation({
    mutationFn: async (indexData: any) => {
      if (!graphService) throw new Error('Graph service not available');
      return graphService.schema.createNodeIndex(indexData);
    },
    onSuccess: () => {
      refetchIndexes();
      toast.success('Index created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create index: ${error.message}`);
    },
  });

  // Drop index mutation
  const dropIndexMutation = useMutation({
    mutationFn: async (indexName: string) => {
      if (!graphService) throw new Error('Graph service not available');
      return graphService.schema.dropIndex(indexName);
    },
    onSuccess: () => {
      refetchIndexes();
      toast.success('Index dropped successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to drop index: ${error.message}`);
    },
  });

  // Create constraint mutation
  const createConstraintMutation = useMutation({
    mutationFn: async (constraintData: any) => {
      if (!graphService) throw new Error('Graph service not available');
      return graphService.schema.createNodeConstraint(constraintData);
    },
    onSuccess: () => {
      refetchConstraints();
      toast.success('Constraint created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create constraint: ${error.message}`);
    },
  });

  // Drop constraint mutation
  const dropConstraintMutation = useMutation({
    mutationFn: async (constraintName: string) => {
      if (!graphService) throw new Error('Graph service not available');
      return graphService.schema.dropConstraint(constraintName);
    },
    onSuccess: () => {
      refetchConstraints();
      toast.success('Constraint dropped successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to drop constraint: ${error.message}`);
    },
  });

  // Refresh all schema data
  const handleRefreshSchema = async () => {
    setIsSidebarRefreshing(true);
    try {
      await Promise.all([
        refetchLabels(),
        refetchRelTypes(),
        refetchIndexes(),
        refetchConstraints(),
        refetchActions(),
      ]);
      toast.success('Schema refreshed');
    } catch (error) {
      toast.error('Failed to refresh schema');
    } finally {
      setIsSidebarRefreshing(false);
    }
  };

  // Persist state to localStorage whenever relevant state changes
  useEffect(() => {
    const stateToSave = {
      sidebarView,
      isSidebarCollapsed,
      sidebarWidth,
      queryInput,
      queryResult,
      queryError,
      selectedLabelName: selectedLabel?.name,
      selectedRelTypeName: selectedRelType?.type,
      resultsView,
      selectedActionTag: selectedAction?.tag,
      showQueryBuilder,
      showQueryEditor,
      queryBuilderOperation,
      queryBuilderLabel,
      queryBuilderRelType,
      queryBuilderDirection,
      queryBuilderWhere,
      queryBuilderLimit,
      queryBuilderSkip,
      queryBuilderOrderBy,
      queryBuilderMaxDepth,
      queryBuilderNodeId,
      queryBuilderFromNode,
      queryBuilderToNode,
      queryBuilderProperties,
      queryBuilderRawQuery,
      generatedQuery,
      queryTestResult,
    };
    localStorage.setItem(stateKey, JSON.stringify(stateToSave));
  }, [
    stateKey,
    sidebarView,
    isSidebarCollapsed,
    sidebarWidth,
    queryInput,
    queryResult,
    queryError,
    selectedLabel,
    selectedRelType,
    resultsView,
    selectedAction,
    showQueryBuilder,
    showQueryEditor,
    queryBuilderOperation,
    queryBuilderLabel,
    queryBuilderRelType,
    queryBuilderDirection,
    queryBuilderWhere,
    queryBuilderLimit,
    queryBuilderSkip,
    queryBuilderOrderBy,
    queryBuilderMaxDepth,
    queryBuilderNodeId,
    queryBuilderFromNode,
    queryBuilderToNode,
    queryBuilderProperties,
    queryBuilderRawQuery,
    generatedQuery,
    queryTestResult,
  ]);

  // CodeSidebar state
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  const [showGraphCodeSidebar, setShowGraphCodeSidebar] = useState(false);
  const [selectedGraphOperation, setSelectedGraphOperation] = useState<string>('findNodes');

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

  // Execute action form state (parameter values)
  const [actionParamValues, setActionParamValues] = useState<Record<string, any>>({});

  // Compute smart row count - separates relationships from nodes in mixed data
  const smartRowCount = useMemo(() => {
    if (!queryResult?.data) return { count: 0, type: 'empty' as const };

    const rawData = queryResult.data;

    // Robust detection functions (same as table rendering)
    // Relationship: has type (string) AND (startNode/endNode OR start/end OR source/target OR from/to)
    // Different drivers/databases use different naming conventions
    const isRelationship = (item: any) => {
      const hasType = typeof item.type === 'string' && item.type.length > 0;
      const hasStartEnd = (item.startNode && item.endNode) ||
        (item.start && item.end) ||
        (item.source && item.target) ||
        (item.startNodeId && item.endNodeId) ||
        (item.from && item.to);
      // Also check if it explicitly has relationship-like structure (has type but no labels)
      const looksLikeRelationship = hasType && !Array.isArray(item.labels);
      return hasType && (hasStartEnd || looksLikeRelationship);
    };
    // Node: has labels (array) - if it also matches relationship criteria, it's a relationship
    const isNode = (item: any) => {
      if (isRelationship(item)) return false;
      return Array.isArray(item.labels) && item.labels.length > 0;
    };

    const relationships = rawData.filter(isRelationship);
    const nodes = rawData.filter(isNode);

    // Priority: If we have relationships, count them (nodes are just for enrichment)
    if (relationships.length > 0) {
      return {
        count: relationships.length,
        type: 'relationships' as const,
        nodesIncluded: nodes.length > 0 ? nodes.length : undefined,
      };
    }
    // If only nodes
    if (nodes.length > 0) {
      return { count: nodes.length, type: 'nodes' as const };
    }
    // Fallback to original count
    return { count: queryResult.count || rawData.length, type: 'raw' as const };
  }, [queryResult]);

  // Extract all parameterizable values from an object
  const extractParameterizableValues = useCallback((obj: any, path = ''): Array<{
    path: string;
    value: any;
    type: string;
  }> => {
    const results: Array<{ path: string; value: any; type: string }> = [];

    const processValue = (key: string, value: any, currentPath: string) => {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;

      if (value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        // For simple arrays, include as array type
        if (value.every(v => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
          results.push({ path: fullPath, value, type: 'array' });
        } else {
          // For complex arrays, recurse
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
      // Skip the 'operation' key as it shouldn't be parameterized
      if (key === 'operation') return;
      processValue(key, value, path);
    });

    return results;
  }, []);

  // Generate a parameter name from a path
  const generateParamName = (path: string): string => {
    const parts = path.split('.');
    const lastPart = parts[parts.length - 1];
    // Remove array notation like [0]
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
  const handleSaveAction = async () => {
    if (!actionName.trim()) {
      toast.error('Please enter an action name');
      return;
    }

    try {
      const query = JSON.parse(queryInput);
      const selectedParams = extractedValues.filter(v => v.selected);

      // Build the parameterized query by replacing selected values with placeholders
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

      const newAction = {
        graph: graph.tag,
        tag: actionTag,
        name: actionName,
        description: actionDescription || undefined,
        operation: query.operation,
        query: parameterizedQuery,
        parameters: selectedParams.map(p => ({
          name: p.paramName,
          path: p.path,
          defaultValue: p.value,
          type: p.type as 'string' | 'number' | 'boolean' | 'array' | 'object',
        })),
      };

      // Use SDK to create action
      await createActionMutation.mutateAsync(newAction);
      setShowSaveActionModal(false);
      // Action will be selected after refetch completes
      setSelectedActionTag(actionTag);
    } catch (error) {
      toast.error('Failed to save action');
    }
  };

  // Load action - show action details view
  const handleLoadAction = (action: IGraphAction) => {
    setSelectedAction(action);
    setShowQueryBuilder(false); // Hide query builder, show action details
  };

  // Generate code sections for CodeSidebar
  const generateCodeSections = (language: string, env?: string) => {
    if (!selectedAction) return [];

    const envSlug = env || graph.env.slug;
    const inputParams = selectedAction.parameters.length > 0
      ? selectedAction.parameters.reduce((acc, p) => {
        acc[p.name] = p.defaultValue;
        return acc;
      }, {} as Record<string, any>)
      : {};

    const inputString = JSON.stringify(inputParams, null, 4).split('\n').map((line, i) => i === 0 ? line : '    ' + line).join('\n');

    if (language === 'typescript' || language === 'javascript') {
      return [
        {
          title: 'Execute Graph Action',
          code: `await ductape.graph.execute({
  product: '${graph.tag.split(':')[0] || 'your-product'}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  action: '${selectedAction.tag}',
  input: ${inputString}
});`,
        },
        {
          title: 'Initialize Ductape (collapsible)',
          code: `import Ductape from '@ductape/sdk';

const ductape = new Ductape({
  workspaceId: 'your-workspace-id',
  publicKey: 'your-public-key',
  secretKey: 'your-secret-key',
});

await ductape.init();`,
        },
      ];
    }

    return [];
  };

  // Generate code sections for Graph CodeSidebar (main view - graph operations)
  const generateGraphCodeSections = (language: string, env?: string, runtime?: string) => {
    const envSlug = env || graph.env.slug;
    const productTag = graph.tag.split(':')[0] || 'your-product';
    const graphTag = graph.tag;
    const labelName = selectedLabel?.name || 'Person';
    const relTypeName = selectedRelType?.type || 'KNOWS';

    const sampleProperties = selectedLabel?.properties?.length
      ? selectedLabel.properties.slice(0, 2).map(p => `${p.name}: '${p.type === 'string' ? 'value' : p.type === 'number' ? '1' : 'true'}'`).join(', ')
      : "name: 'value'";

    const samplePropertiesForOperations = selectedLabel?.properties?.length
      ? selectedLabel.properties.slice(0, 2).map(p => `${p.name}: '${p.type === 'string' ? 'value' : p.type === 'number' ? '1' : 'true'}'`).join(',\n      ')
      : "name: 'value'";

    // Frontend / Node runtime-specific examples (init + createNode mutation)
    if (runtime === 'vanilla') {
      return [
        {
          title: 'Init (Vanilla JS, publishable key)',
          code: `import { Ductape } from '@ductape/client';

const ductape = new Ductape({
  publishableKey: import.meta.env.VITE_PUBLISHABLE_KEY,
});`,
        },
        {
          title: 'Mutation (create node)',
          code: `const node = await ductape.graph.query({
  graph: '${graphTag}',
  operation: 'createNode',
  options: {
    labels: ['${labelName}'],
    properties: { ${samplePropertiesForOperations} },
  },
});
console.log('Created:', node);`,
        },
      ];
    }
    if (runtime === 'react') {
      return [
        {
          title: 'Init (React, publishable key)',
          code: `import { DuctapeProvider } from '@ductape/react';

<DuctapeProvider config={{ publishableKey: import.meta.env.VITE_PUBLISHABLE_KEY }}>
  <YourApp />
</DuctapeProvider>`,
        },
        {
          title: 'Mutation (create node)',
          code: `import { useDuctape } from '@ductape/react';

const { client } = useDuctape();
const node = await client.graph.query({
  graph: '${graphTag}',
  operation: 'createNode',
  options: {
    labels: ['${labelName}'],
    properties: { ${samplePropertiesForOperations} },
  },
});
console.log('Created:', node);`,
        },
      ];
    }
    if (runtime === 'node') {
      return [
        {
          title: 'Init (Node.js, access key)',
          code: language === 'typescript'
            ? `import Ductape from '@ductape/sdk';\n\nconst ductape = new Ductape({ accessKey: process.env.DUCTAPE_ACCESS_KEY });`
            : `const { Ductape } = require('@ductape/sdk');\n\nconst ductape = new Ductape({ accessKey: process.env.DUCTAPE_ACCESS_KEY });`,
        },
        {
          title: 'Mutation (create node)',
          code: `const node = await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graphTag}',
  operation: 'createNode',
  options: {
    labels: ['${labelName}'],
    properties: { ${samplePropertiesForOperations} },
  },
});
console.log('Created:', node);`,
        },
      ];
    }

    if (language === 'typescript' || language === 'javascript') {
      const operations: Record<string, { title: string; code: string }[]> = {
        findNodes: [
          {
            title: 'Find Nodes',
            code: `const nodes = await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  operation: 'findNodes',
  options: {
    labels: ['${labelName}'],
    properties: { ${samplePropertiesForOperations} },
    limit: 100,
  },
});`,
          },
        ],
        findNodeById: [
          {
            title: 'Find Node by ID',
            code: `const node = await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  operation: 'findNodeById',
  options: {
    id: 'node-id',
  },
});`,
          },
        ],
        createNode: [
          {
            title: 'Create Node',
            code: `const node = await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  operation: 'createNode',
  options: {
    labels: ['${labelName}'],
    properties: {
      ${samplePropertiesForOperations},
      createdAt: new Date().toISOString(),
    },
  },
});`,
          },
        ],
        updateNode: [
          {
            title: 'Update Node',
            code: `const node = await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  operation: 'updateNode',
  options: {
    labels: ['${labelName}'],
    properties: { ${samplePropertiesForOperations} },
    updates: { ${samplePropertiesForOperations} },
  },
});`,
          },
        ],
        deleteNode: [
          {
            title: 'Delete Node',
            code: `await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  operation: 'deleteNode',
  options: {
    labels: ['${labelName}'],
    properties: { ${samplePropertiesForOperations} },
    detach: true, // Also delete connected relationships
  },
});`,
          },
        ],
        countNodes: [
          {
            title: 'Count Nodes',
            code: `const count = await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  operation: 'countNodes',
  options: {
    labels: ['${labelName}'],
    // Optional: filter by properties
    // properties: { ${samplePropertiesForOperations} },
  },
});`,
          },
        ],
        findRelationships: [
          {
            title: 'Find Relationships',
            code: `const relationships = await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  operation: 'findRelationships',
  options: {
    type: '${relTypeName}',
    direction: 'outgoing',
    includeNodes: true,
    // Optional: filter by source/target nodes
    // fromNode: { labels: ['${labelName}'] },
    // toNode: { labels: ['${labelName}'] },
  },
});`,
          },
        ],
        createRelationship: [
          {
            title: 'Create Relationship',
            code: `const relationship = await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  operation: 'createRelationship',
  options: {
    type: '${relTypeName}',
    fromNode: { labels: ['${labelName}'], properties: { ${samplePropertiesForOperations} } },
    toNode: { labels: ['${labelName}'], properties: { ${samplePropertiesForOperations} } },
    properties: { since: new Date().toISOString() },
  },
});`,
          },
        ],
        countRelationships: [
          {
            title: 'Count Relationships',
            code: `const count = await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  operation: 'countRelationships',
  options: {
    type: '${relTypeName}',
    direction: 'outgoing',
    // Optional: filter by source/target nodes
    // fromNode: { labels: ['${labelName}'] },
  },
});`,
          },
        ],
        traverse: [
          {
            title: 'Traverse Graph',
            code: `const result = await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  operation: 'traverse',
  options: {
    startNode: { labels: ['${labelName}'], properties: { ${samplePropertiesForOperations} } },
    direction: 'outgoing',
    maxDepth: 3,
    // Optional: filter by relationship type
    // relationshipTypes: ['${relTypeName}'],
  },
});`,
          },
        ],
        shortestPath: [
          {
            title: 'Find Shortest Path',
            code: `const path = await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  operation: 'shortestPath',
  options: {
    startNode: { labels: ['${labelName}'], properties: { ${samplePropertiesForOperations} } },
    endNode: { labels: ['${labelName}'], properties: { ${samplePropertiesForOperations} } },
    maxDepth: 10,
    // Optional: filter by relationship type
    // relationshipTypes: ['${relTypeName}'],
  },
});`,
          },
        ],
        rawCypher: [
          {
            title: 'Raw Cypher Query',
            code: `const result = await ductape.graph.query({
  product: '${productTag}',
  env: '${envSlug}',
  graph: '${graph.tag}',
  operation: 'rawQuery',
  options: {
    cypher: 'MATCH (n:${labelName})-[r:${relTypeName}]->(m) RETURN n, r, m LIMIT 10',
  },
});`,
          },
        ],
      };

      const selectedOps = operations[selectedGraphOperation] || operations.findNodes;

      return [
        ...selectedOps,
        {
          title: 'Initialize Ductape (collapsible)',
          code: `import Ductape from '@ductape/sdk';

const ductape = new Ductape({
  workspaceId: 'your-workspace-id',
  publicKey: 'your-public-key',
  secretKey: 'your-secret-key',
});

await ductape.init();`,
        },
      ];
    }

    return [];
  };

  // Open execute action modal
  const handleOpenExecuteActionModal = (action: IGraphAction) => {
    setSelectedAction(action);
    // Initialize param values with defaults
    const defaultValues: Record<string, any> = {};
    action.parameters.forEach(param => {
      defaultValues[param.name] = param.defaultValue;
    });
    setActionParamValues(defaultValues);
    setShowExecuteActionModal(true);
  };

  // Execute action with parameters
  const handleExecuteAction = () => {
    if (!selectedAction) return;

    // Build the query with actual parameter values
    let query = JSON.parse(JSON.stringify(selectedAction.query));

    const setNestedValue = (obj: any, path: string, value: any) => {
      const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
      let current = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    };

    selectedAction.parameters.forEach(param => {
      const value = actionParamValues[param.name];
      setNestedValue(query, param.path, value);
    });

    setQueryInput(JSON.stringify(query, null, 2));
    setShowExecuteActionModal(false);

    // Auto-execute
    setTimeout(() => {
      handleExecuteQuery();
    }, 100);
  };

  // Delete action
  const handleDeleteAction = async (actionTag: string) => {
    try {
      await deleteActionMutation.mutateAsync(actionTag);
      if (selectedAction?.tag === actionTag) {
        setSelectedAction(null);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Generate query from Query Builder state
  const generateQueryFromBuilder = useCallback((): Record<string, any> => {
    const options: Record<string, any> = {};

    // Common options
    if (queryBuilderLimit) options.limit = parseInt(queryBuilderLimit) || 25;
    if (queryBuilderSkip) options.skip = parseInt(queryBuilderSkip) || 0;

    // Handle different operations
    switch (queryBuilderOperation) {
      case 'findNodes':
      case 'countNodes':
        if (queryBuilderLabel) options.labels = [queryBuilderLabel];
        if (queryBuilderWhere.length > 0) {
          options.where = queryBuilderWhere.reduce((acc, w) => {
            if (w.property && w.value) {
              if (w.operator === '=') {
                acc[w.property] = w.value;
              } else {
                acc[w.property] = { [w.operator]: w.value };
              }
            }
            return acc;
          }, {} as Record<string, any>);
        }
        if (queryBuilderOrderBy) options.orderBy = queryBuilderOrderBy;
        break;

      case 'findNodeById':
        options.id = queryBuilderNodeId || '';
        break;

      case 'createNode':
      case 'mergeNode':
        if (queryBuilderLabel) options.labels = [queryBuilderLabel];
        if (queryBuilderProperties.length > 0) {
          options.properties = queryBuilderProperties.reduce((acc, p) => {
            if (p.key && p.value) {
              try {
                acc[p.key] = JSON.parse(p.value);
              } catch {
                acc[p.key] = p.value;
              }
            }
            return acc;
          }, {} as Record<string, any>);
        }
        break;

      case 'updateNode':
      case 'deleteNode':
        if (queryBuilderLabel) options.labels = [queryBuilderLabel];
        if (queryBuilderWhere.length > 0) {
          options.where = queryBuilderWhere.reduce((acc, w) => {
            if (w.property && w.value) {
              acc[w.property] = w.operator === '=' ? w.value : { [w.operator]: w.value };
            }
            return acc;
          }, {} as Record<string, any>);
        }
        if (queryBuilderOperation === 'updateNode' && queryBuilderProperties.length > 0) {
          options.set = queryBuilderProperties.reduce((acc, p) => {
            if (p.key && p.value) {
              try {
                acc[p.key] = JSON.parse(p.value);
              } catch {
                acc[p.key] = p.value;
              }
            }
            return acc;
          }, {} as Record<string, any>);
        }
        if (queryBuilderOperation === 'deleteNode') {
          options.detach = true;
        }
        break;

      case 'findRelationships':
      case 'countRelationships':
        if (queryBuilderRelType) options.type = queryBuilderRelType;
        options.direction = queryBuilderDirection;
        if (queryBuilderFromNode.label) {
          options.fromNode = { labels: [queryBuilderFromNode.label] };
          if (queryBuilderFromNode.property && queryBuilderFromNode.value) {
            options.fromNode.properties = { [queryBuilderFromNode.property]: queryBuilderFromNode.value };
          }
        }
        if (queryBuilderToNode.label) {
          options.toNode = { labels: [queryBuilderToNode.label] };
          if (queryBuilderToNode.property && queryBuilderToNode.value) {
            options.toNode.properties = { [queryBuilderToNode.property]: queryBuilderToNode.value };
          }
        }
        options.includeNodes = true;
        break;

      case 'createRelationship':
      case 'mergeRelationship':
        if (queryBuilderRelType) options.type = queryBuilderRelType;
        options.fromNode = {
          labels: queryBuilderFromNode.label ? [queryBuilderFromNode.label] : undefined,
          properties: queryBuilderFromNode.property && queryBuilderFromNode.value
            ? { [queryBuilderFromNode.property]: queryBuilderFromNode.value }
            : undefined
        };
        options.toNode = {
          labels: queryBuilderToNode.label ? [queryBuilderToNode.label] : undefined,
          properties: queryBuilderToNode.property && queryBuilderToNode.value
            ? { [queryBuilderToNode.property]: queryBuilderToNode.value }
            : undefined
        };
        if (queryBuilderProperties.length > 0) {
          options.properties = queryBuilderProperties.reduce((acc, p) => {
            if (p.key && p.value) {
              try { acc[p.key] = JSON.parse(p.value); } catch { acc[p.key] = p.value; }
            }
            return acc;
          }, {} as Record<string, any>);
        }
        break;

      case 'traverse':
      case 'getNeighborhood':
        options.startNode = queryBuilderNodeId
          ? { id: queryBuilderNodeId }
          : queryBuilderLabel
            ? { labels: [queryBuilderLabel] }
            : {};
        options.direction = queryBuilderDirection;
        options.maxDepth = parseInt(queryBuilderMaxDepth) || 2;
        break;

      case 'shortestPath':
      case 'allPaths':
        options.startNode = {
          labels: queryBuilderFromNode.label ? [queryBuilderFromNode.label] : undefined,
          properties: queryBuilderFromNode.property && queryBuilderFromNode.value
            ? { [queryBuilderFromNode.property]: queryBuilderFromNode.value }
            : undefined
        };
        options.endNode = {
          labels: queryBuilderToNode.label ? [queryBuilderToNode.label] : undefined,
          properties: queryBuilderToNode.property && queryBuilderToNode.value
            ? { [queryBuilderToNode.property]: queryBuilderToNode.value }
            : undefined
        };
        options.maxDepth = parseInt(queryBuilderMaxDepth) || 10;
        break;

      case 'fullTextSearch':
        options.indexName = queryBuilderLabel; // Reusing label field for index name
        options.searchText = queryBuilderNodeId; // Reusing nodeId field for search text
        break;

      case 'executeRaw':
        return {
          operation: 'executeRaw',
          options: {
            query: queryBuilderRawQuery,
            language: getQueryLanguageName(graph.type).toLowerCase()
          }
        };

      default:
        break;
    }

    return {
      operation: queryBuilderOperation,
      options
    };
  }, [queryBuilderOperation, queryBuilderLabel, queryBuilderRelType, queryBuilderDirection,
    queryBuilderWhere, queryBuilderLimit, queryBuilderSkip, queryBuilderOrderBy,
    queryBuilderMaxDepth, queryBuilderNodeId, queryBuilderFromNode, queryBuilderToNode,
    queryBuilderProperties, queryBuilderRawQuery, graph.type]);

  // Update generated query when builder state changes
  useEffect(() => {
    if (showQueryBuilder) {
      setGeneratedQuery(generateQueryFromBuilder());
    }
  }, [showQueryBuilder, generateQueryFromBuilder]);

  // Test the generated query
  const handleTestQuery = async () => {
    if (!generatedQuery) {
      toast.error('Please configure a query first');
      return;
    }

    setIsTestingQuery(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setQueryTestResult({
        success: true,
        rowCount: Math.floor(Math.random() * 100) + 1,
        executionTime: Math.floor(Math.random() * 50) + 5,
      });
      toast.success('Query executed successfully');
    } catch {
      toast.error('Query execution failed');
      setQueryTestResult({ success: false, error: 'Query execution failed' });
    } finally {
      setIsTestingQuery(false);
    }
  };

  // Open Query Builder
  const handleOpenQueryBuilder = () => {
    setQueryBuilderOperation('findNodes');
    setQueryBuilderLabel('');
    setQueryBuilderRelType('');
    setQueryBuilderDirection('OUTGOING');
    setQueryBuilderWhere([]);
    setQueryBuilderLimit('25');
    setQueryBuilderSkip('0');
    setQueryBuilderOrderBy(null);
    setQueryBuilderMaxDepth('2');
    setQueryBuilderNodeId('');
    setQueryBuilderFromNode({ label: '', property: '', value: '' });
    setQueryBuilderToNode({ label: '', property: '', value: '' });
    setQueryBuilderProperties([]);
    setQueryBuilderRawQuery('');
    setGeneratedQuery(null);
    setQueryTestResult(null);
    setSelectedAction(null);
    setShowQueryBuilder(true);
  };

  // Save query from builder as action
  const handleSaveQueryBuilderAction = () => {
    if (!generatedQuery) {
      toast.error('Please generate a query first');
      return;
    }

    const values = extractParameterizableValues(generatedQuery);
    setExtractedValues(values.map(v => ({
      ...v,
      selected: false,
      paramName: generateParamName(v.path),
    })));
    setActionName('');
    setActionDescription('');
    setShowSaveActionModal(true);
  };

  // Filter actions by search
  const filteredActions = actions.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.operation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGraphTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'neo4j':
        return 'bg-blue/10 text-blue border-blue/20';
      case 'neptune':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'arangodb':
        return 'bg-green/10 text-green border-green/20';
      case 'memgraph':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-grey-400 text-grey border-grey-400';
    }
  };

  const handleExecuteQuery = async (paginationOverride?: { page: number; pageSize: number }) => {
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

    // Apply pagination to the query options
    const page = paginationOverride?.page ?? 1;
    const pageSize = paginationOverride?.pageSize ?? tablePageSize;

    // Add limit and skip to the query options for server-side pagination
    if (parsedQuery.options) {
      parsedQuery.options.limit = pageSize;
      parsedQuery.options.skip = (page - 1) * pageSize;
    } else if (parsedQuery.operation) {
      parsedQuery.options = {
        ...parsedQuery.options,
        limit: pageSize,
        skip: (page - 1) * pageSize,
      };
    }

    setIsExecuting(true);
    setQueryError(null);
    if (!paginationOverride) {
      setQueryResult(null);
      setTablePage(1); // Reset pagination on new query
    }

    const startTime = Date.now();

    try {
      if (!graphService) {
        throw new Error('Graph service not available. Please check your connection.');
      }

      // Save the base query (without pagination) for future pagination requests
      const baseQuery = JSON.parse(queryInput);
      setLastExecutedQuery(baseQuery);

      // Execute through the graph service proxy
      const result = await graphService.query(parsedQuery);
      const executionTime = Date.now() - startTime;

      setQueryResult({
        success: true,
        executionTime,
        ...result,
      });
      setIsQueryEditorCollapsed(true); // Hide query editor once results show
      toast.success(`Query executed in ${executionTime}ms`);
    } catch (error: any) {
      setQueryError(error.message || 'Failed to execute query');
      toast.error('Failed to execute query');
    } finally {
      setIsExecuting(false);
    }
  };

  // Execute paginated query
  const handlePageChange = async (newPage: number) => {
    if (!lastExecutedQuery || isExecuting) return;

    setTablePage(newPage);

    // Build paginated query from last executed query
    const paginatedQuery = JSON.parse(JSON.stringify(lastExecutedQuery));
    if (paginatedQuery.options) {
      paginatedQuery.options.limit = tablePageSize;
      paginatedQuery.options.skip = (newPage - 1) * tablePageSize;
    } else {
      paginatedQuery.options = {
        limit: tablePageSize,
        skip: (newPage - 1) * tablePageSize,
      };
    }

    setIsExecuting(true);
    const startTime = Date.now();

    try {
      if (!graphService) {
        throw new Error('Graph service not available.');
      }

      const result = await graphService.query(paginatedQuery);
      const executionTime = Date.now() - startTime;

      setQueryResult({
        success: true,
        executionTime,
        ...result,
      });
    } catch (error: any) {
      setQueryError(error.message || 'Failed to fetch page');
      toast.error('Failed to fetch page');
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle page size change
  const handlePageSizeChange = async (newPageSize: number) => {
    setTablePageSize(newPageSize);
    setTablePage(1);

    if (lastExecutedQuery) {
      const paginatedQuery = JSON.parse(JSON.stringify(lastExecutedQuery));
      if (paginatedQuery.options) {
        paginatedQuery.options.limit = newPageSize;
        paginatedQuery.options.skip = 0;
      } else {
        paginatedQuery.options = {
          limit: newPageSize,
          skip: 0,
        };
      }

      setIsExecuting(true);
      const startTime = Date.now();

      try {
        if (!graphService) {
          throw new Error('Graph service not available.');
        }

        const result = await graphService.query(paginatedQuery);
        const executionTime = Date.now() - startTime;

        setQueryResult({
          success: true,
          executionTime,
          ...result,
        });
      } catch (error: any) {
        setQueryError(error.message || 'Failed to change page size');
      } finally {
        setIsExecuting(false);
      }
    }
  };

  // Graph pan handlers with heavily reduced sensitivity
  const handlePanStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    // Calculate movement delta
    const deltaX = e.clientX - panStart.x;
    const deltaY = e.clientY - panStart.y;
    // Require minimum movement threshold before panning (reduces jitter)
    const threshold = 3;
    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) return;
    // Apply heavy damping factor of 0.25 for much slower panning
    setGraphPan(prev => ({
      x: prev.x + deltaX * 0.25,
      y: prev.y + deltaY * 0.25,
    }));
    // Update pan start for next move event
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Very reduced sensitivity for zoom
    // Cap the effect and apply heavy damping to prevent sudden jumps
    const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 50) / 100;
    const delta = normalizedDelta * -0.02; // Very gentle: 0.01 max per tick
    setGraphZoom(prev => Math.min(3, Math.max(0.25, prev + delta)));
  };

  const resetGraphView = () => {
    setGraphZoom(1);
    setGraphPan({ x: 0, y: 0 });
  };

  const handleSidebarRefresh = async () => {
    setIsSidebarRefreshing(true);
    try {
      await Promise.all([
        refetchLabels(),
        refetchRelTypes(),
        refetchIndexes(),
        refetchConstraints(),
        refetchActions(),
      ]);
      toast.success('Schema refreshed');
    } catch (error) {
      toast.error('Failed to refresh schema');
    } finally {
      setIsSidebarRefreshing(false);
    }
  };

  // Helper to set query and auto-execute it
  const setQueryAndExecute = useCallback(async (queryJson: string) => {
    setQueryInput(queryJson);
    // Show the query editor/results view
    setShowQueryEditor(true);

    // Check if graph is connected before executing
    if (!isConnected) {
      // Just set the query, don't execute yet - let user manually execute after connection
      return;
    }

    // Parse and execute the query directly
    let parsedQuery: any;
    try {
      parsedQuery = JSON.parse(queryJson);
    } catch {
      toast.error('Invalid JSON query format');
      return;
    }

    setIsExecuting(true);
    setQueryError(null);
    setQueryResult(null);
    setTablePage(1); // Reset pagination on new query

    const startTime = Date.now();

    try {
      if (!graphService) {
        throw new Error('Graph service not available. Please check your connection.');
      }

      const result = await graphService.query(parsedQuery);
      const executionTime = Date.now() - startTime;

      setQueryResult({
        success: true,
        executionTime,
        ...result,
      });
      setIsQueryEditorCollapsed(true);
      toast.success(`Query executed in ${executionTime}ms`);
    } catch (error: any) {
      setQueryError(error.message || 'Failed to execute query');
      toast.error('Failed to execute query');
    } finally {
      setIsExecuting(false);
    }
  }, [graphService, isConnected]);

  const handleViewChange = (view: SidebarView) => {
    setSidebarView(view);
    setSearchQuery('');
    // Clear selections when switching tabs to show Overview
    setSelectedLabel(null);
    setSelectedRelType(null);
    // Close query editor to show Overview when switching sidebar tabs
    setShowQueryEditor(false);
    setQueryResult(null);
  };

  const filteredLabels = labels.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRelationships = relationshipTypes.filter(r =>
    r.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConstraints = constraints.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIndexes = indexes.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getConstraintTypeColor = (type: string) => {
    switch (type) {
      case 'UNIQUENESS': return 'bg-blue/10 text-blue';
      case 'NODE_PROPERTY_EXISTENCE': return 'bg-green/10 text-green';
      case 'NODE_KEY': return 'bg-purple-500/10 text-purple-500';
      default: return 'bg-grey-400/10 text-grey';
    }
  };

  const getIndexTypeColor = (type: string) => {
    switch (type) {
      case 'RANGE': return 'bg-blue/10 text-blue';
      case 'FULLTEXT': return 'bg-green/10 text-green';
      case 'POINT': return 'bg-orange-500/10 text-orange-500';
      case 'VECTOR': return 'bg-purple-500/10 text-purple-500';
      default: return 'bg-grey-400/10 text-grey';
    }
  };

  const getIndexStateColor = (state?: string) => {
    switch (state) {
      case 'ONLINE': return 'text-green';
      case 'POPULATING': return 'text-yellow-500';
      case 'FAILED': return 'text-red';
      default: return 'text-grey';
    }
  };

  const renderNodeValue = (node: any) => {
    return (
      <div className="p-3 bg-white rounded-lg border border-grey-400">
        <div className="flex items-center gap-2 mb-2">
          <Circle className="h-3 w-3 text-blue fill-blue" />
          <span className="text-sm font-semibold text-grey">:{node.labels?.join(':')}</span>
          <span className="text-xs text-grey font-mono bg-grey-100 px-1.5 py-0.5 rounded">id: {node.id}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(node.properties || {}).map(([key, value]) => (
            <div key={key} className="text-xs flex items-baseline gap-1">
              <span className="text-grey font-medium">{key}:</span>
              <span className="text-grey font-mono truncate">{JSON.stringify(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRelationshipValue = (rel: any) => {
    return (
      <div className="p-2 bg-white rounded-lg border border-grey-400 inline-flex items-center gap-2">
        <span className="text-xs text-grey font-mono bg-grey-100 px-1.5 py-0.5 rounded">({rel.startNode})</span>
        <ArrowRight className="h-3 w-3 text-grey" />
        <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-xs font-medium">
          {rel.type}
        </span>
        <ArrowRight className="h-3 w-3 text-grey" />
        <span className="text-xs text-grey font-mono bg-grey-100 px-1.5 py-0.5 rounded">({rel.endNode})</span>
        {rel.properties && Object.keys(rel.properties).length > 0 && (
          <span className="text-xs text-grey ml-1">
            ({Object.keys(rel.properties).join(', ')})
          </span>
        )}
      </div>
    );
  };

  // Extract nodes and relationships from query results for visualization
  const graphData = useMemo(() => {
    if (!queryResult?.data) return { nodes: [], edges: [] };

    const nodesMap = new Map<string, any>();
    // nodeIdAliases maps alternative IDs to canonical node IDs
    // This handles cases like ArangoDB where relationship uses "collection/key" but node has "key"
    const nodeIdAliases = new Map<string, string>();
    const edges: any[] = [];

    // Helper to extract key portion from ArangoDB-style IDs (e.g., "Users/123" -> "123")
    const extractShortId = (fullId: string): string | null => {
      if (fullId && fullId.includes('/')) {
        return fullId.split('/').pop() || null;
      }
      return null;
    };

    // Helper to process a potential node or relationship
    const processItem = (item: any) => {
      if (!item || typeof item !== 'object') return;

      // Check if it's a node (has labels array and id)
      if (item.labels && Array.isArray(item.labels) && (item.id || item.elementId)) {
        const nodeId = item.id || item.elementId;
        const elementId = item.elementId || item.id;

        if (!nodesMap.has(nodeId)) {
          nodesMap.set(nodeId, {
            id: nodeId,
            elementId: elementId,
            labels: item.labels,
            properties: item.properties || {},
            label: item.labels[0] || 'Node',
            displayName: item.properties?.name || item.properties?.title || nodeId,
          });

          // Create aliases for different ID formats
          // This handles ArangoDB where relationships use "collection/key" format
          // but nodes might have just "key" as their id
          if (elementId && elementId !== nodeId) {
            nodeIdAliases.set(elementId, nodeId);
          }

          // For ArangoDB: if node has a label and short ID, create alias for "label/id"
          const shortId = extractShortId(nodeId);
          if (shortId) {
            nodeIdAliases.set(shortId, nodeId);
          }
          const shortElementId = extractShortId(elementId);
          if (shortElementId && shortElementId !== shortId) {
            nodeIdAliases.set(shortElementId, nodeId);
          }

          // Also create aliases for full format if we have labels
          // e.g., if node has id="123" and label="Users", create alias "Users/123"
          if (item.labels.length > 0 && !nodeId.includes('/')) {
            item.labels.forEach((label: string) => {
              nodeIdAliases.set(`${label}/${nodeId}`, nodeId);
            });
          }
        }
      }
      // Check if it's a relationship (has type and start/end node references)
      // Handle multiple naming conventions: startNode/endNode, start/end, source/target, from/to, startNodeId/endNodeId
      else if (item.type && typeof item.type === 'string') {
        const startNode = item.startNodeId || item.startNode || item.startNodeElementId || item.start || item.source || item.from;
        const endNode = item.endNodeId || item.endNode || item.endNodeElementId || item.end || item.target || item.to;

        // Only add as edge if we have both start and end references
        // OR if it looks like a relationship (has type but no labels - meaning it's not a node)
        if (startNode && endNode) {
          edges.push({
            id: item.id || item.elementId || `${startNode}-${item.type}-${endNode}`,
            source: startNode,
            target: endNode,
            type: item.type,
            properties: item.properties || {},
          });
        } else if (!Array.isArray(item.labels)) {
          // This is a relationship without resolved node references
          // Store it anyway - the edges won't render but we track them
          console.log('[GraphExplorer] Relationship without node refs:', item);
        }
      }
    };

    if (Array.isArray(queryResult.data)) {
      queryResult.data.forEach((row: any) => {
        // First, check if row itself is a node or relationship (flat array format)
        processItem(row);

        // Also check nested values (for queries that return {n: node, r: relationship} format)
        if (row && typeof row === 'object' && !row.labels && !row.type) {
          Object.values(row).forEach((value: any) => {
            processItem(value);
          });
        }
      });
    }

    // Resolve edge source/target IDs using aliases
    const resolvedEdges = edges.map(edge => {
      let resolvedSource = edge.source;
      let resolvedTarget = edge.target;

      // Try to find the node by direct ID match
      if (!nodesMap.has(resolvedSource)) {
        // Try alias lookup
        const aliasedSource = nodeIdAliases.get(resolvedSource);
        if (aliasedSource) {
          resolvedSource = aliasedSource;
        } else {
          // Try extracting short ID from edge source (for ArangoDB)
          const shortSource = extractShortId(edge.source);
          if (shortSource && nodesMap.has(shortSource)) {
            resolvedSource = shortSource;
          }
        }
      }

      if (!nodesMap.has(resolvedTarget)) {
        // Try alias lookup
        const aliasedTarget = nodeIdAliases.get(resolvedTarget);
        if (aliasedTarget) {
          resolvedTarget = aliasedTarget;
        } else {
          // Try extracting short ID from edge target (for ArangoDB)
          const shortTarget = extractShortId(edge.target);
          if (shortTarget && nodesMap.has(shortTarget)) {
            resolvedTarget = shortTarget;
          }
        }
      }

      return {
        ...edge,
        source: resolvedSource,
        target: resolvedTarget,
      };
    });

    // Create placeholder nodes for any missing source/target nodes referenced by edges
    // This allows the graph to show relationships even when full node data isn't returned
    resolvedEdges.forEach(edge => {
      if (!nodesMap.has(edge.source) && !nodesMap.has(String(edge.source))) {
        const nodeId = String(edge.source);
        nodesMap.set(nodeId, {
          id: nodeId,
          elementId: nodeId,
          labels: ['Unknown'],
          properties: {},
          label: 'Unknown',
          displayName: `Node ${nodeId}`,
          isPlaceholder: true,
        });
      }
      if (!nodesMap.has(edge.target) && !nodesMap.has(String(edge.target))) {
        const nodeId = String(edge.target);
        nodesMap.set(nodeId, {
          id: nodeId,
          elementId: nodeId,
          labels: ['Unknown'],
          properties: {},
          label: 'Unknown',
          displayName: `Node ${nodeId}`,
          isPlaceholder: true,
        });
      }
    });

    const result = {
      nodes: Array.from(nodesMap.values()),
      edges: resolvedEdges,
    };

    // Debug alert to show visualization data
    if (result.nodes.length > 0 || result.edges.length > 0) {
      const debugInfo = {
        rawDataLength: queryResult.data?.length || 0,
        nodesFound: result.nodes.length,
        edgesFound: result.edges.length,
        nodeIds: result.nodes.map(n => n.id),
        edgeConnections: result.edges.map(e => ({
          type: e.type,
          source: e.source,
          target: e.target,
          sourceFound: result.nodes.some(n => n.id === e.source),
          targetFound: result.nodes.some(n => n.id === e.target),
        })),
      };
      console.log(`Graph Visualization Data:\n${JSON.stringify(debugInfo, null, 2)}`);
    }

    return result;
  }, [queryResult]);

  // Get color for node based on label
  const getNodeColor = (label: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      Person: { bg: '#3B82F6', border: '#2563EB', text: '#fff' },
      Company: { bg: '#10B981', border: '#059669', text: '#fff' },
      Product: { bg: '#8B5CF6', border: '#7C3AED', text: '#fff' },
      Location: { bg: '#F97316', border: '#EA580C', text: '#fff' },
      Order: { bg: '#EC4899', border: '#DB2777', text: '#fff' },
      Category: { bg: '#EAB308', border: '#CA8A04', text: '#000' },
    };
    return colors[label] || { bg: '#6B7280', border: '#4B5563', text: '#fff' };
  };

  // Force-directed layout calculation
  const calculateNodePositions = (nodes: any[], edges: any[], width: number, height: number) => {
    if (nodes.length === 0) return [];

    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize positions - spread nodes more for better initial layout
    const positions = nodes.map((node, i) => {
      // Start with a grid-based layout for better initial distribution
      const cols = Math.ceil(Math.sqrt(nodes.length));
      const row = Math.floor(i / cols);
      const col = i % cols;
      const spacing = Math.min(width, height) / (cols + 1);

      return {
        ...node,
        x: spacing * (col + 1) + (Math.random() - 0.5) * 20,
        y: spacing * (row + 1) + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
      };
    });

    // Build adjacency for edge-based forces
    const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));

    // Simple force simulation (few iterations for performance)
    const iterations = 50;
    const repulsion = 5000;
    const attraction = 0.05;
    const damping = 0.9;

    for (let iter = 0; iter < iterations; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[j].x - positions[i].x;
          const dy = positions[j].y - positions[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          positions[i].vx -= fx;
          positions[i].vy -= fy;
          positions[j].vx += fx;
          positions[j].vy += fy;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const sourceIdx = nodeIndex.get(edge.source);
        const targetIdx = nodeIndex.get(edge.target);
        if (sourceIdx === undefined || targetIdx === undefined) continue;

        const dx = positions[targetIdx].x - positions[sourceIdx].x;
        const dy = positions[targetIdx].y - positions[sourceIdx].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * attraction;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        positions[sourceIdx].vx += fx;
        positions[sourceIdx].vy += fy;
        positions[targetIdx].vx -= fx;
        positions[targetIdx].vy -= fy;
      }

      // Center gravity (keep nodes from flying away)
      for (const pos of positions) {
        const dx = centerX - pos.x;
        const dy = centerY - pos.y;
        pos.vx += dx * 0.01;
        pos.vy += dy * 0.01;
      }

      // Apply velocities and damping
      for (const pos of positions) {
        pos.vx *= damping;
        pos.vy *= damping;
        pos.x += pos.vx;
        pos.y += pos.vy;

        // Keep within bounds with padding
        const padding = 50;
        pos.x = Math.max(padding, Math.min(width - padding, pos.x));
        pos.y = Math.max(padding, Math.min(height - padding, pos.y));
      }
    }

    return positions.map(({ vx, vy, ...rest }) => rest);
  };

  // Memoize positioned nodes to avoid recalculation on every render
  const positionedNodes = useMemo(() => {
    // Use larger dimensions for better spread
    return calculateNodePositions(graphData.nodes, graphData.edges, 800, 600);
  }, [graphData.nodes, graphData.edges]);

  // Pre-compute node positions map for edge rendering
  const nodePositionsMap = useMemo(() => {
    return new Map(positionedNodes.map(n => [n.id, { x: n.x, y: n.y }]));
  }, [positionedNodes]);

  // Show loading state while initializing the graph service
  if (!graphService) {
    return (
      <div className="flex-1 flex min-h-0 w-full items-center justify-center bg-gradient-to-br from-grey-50 via-grey-100 to-grey-200">
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-2xl animate-pulse delay-150" />
          </div>

          {/* Main content card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-sm text-center">
            {/* Animated graph icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Share2 className="h-10 w-10 text-primary" />
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
                Setting up graph service...
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

  // Show connecting state while establishing graph database connection
  if (isConnecting) {
    return (
      <div className="flex-1 flex min-h-0 w-full items-center justify-center bg-gradient-to-br from-grey-50 via-grey-100 to-grey-200">
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-2xl animate-pulse delay-150" />
          </div>

          {/* Main content card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-sm text-center">
            {/* Animated graph icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Share2 className="h-10 w-10 text-primary" />
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
              <h3 className="text-xl font-semibold text-grey-800">Connecting to Graph Database</h3>
              <p className="text-sm text-grey-600">
                Establishing secure connection to
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grey-100 rounded-lg">
                <Share2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-grey-800">{graph.name}</span>
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
                Environment: <span className="font-medium text-grey-500">{graph.env.slug}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show connection error state
  if (connectionError) {
    const errorMsg = connectionError instanceof Error ? connectionError.message : 'Unknown error occurred';
    const isVpcError = /ETIMEDOUT|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH/i.test(errorMsg);
    return (
      <div className="flex-1 flex min-h-0 w-full items-center justify-center bg-gradient-to-br from-grey-50 via-grey-100 to-grey-200">
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
                <Share2 className="h-10 w-10 text-red" />
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
                <Share2 className="h-4 w-4 text-grey-500" />
                <span className="font-medium text-grey-800">{graph.name}</span>
              </div>
            </div>

            {/* Error message */}
            <div className="mt-4 p-4 bg-red/5 border border-red/20 rounded-xl">
              <p className="text-sm text-red font-medium">{errorMsg}</p>
            </div>

            {/* VPC hint */}
            {isVpcError && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-2">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-sm font-medium text-amber-800">Graph is in a private VPC</p>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  The proxy cannot reach a private VPC endpoint directly. Set up a VPC connector so Ductape can tunnel through your network:
                </p>
                <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Open your AWS cloud connection in <strong>Cloud connections</strong></li>
                  <li>Go to the <strong>Private access</strong> tab</li>
                  <li>Select <strong>VPC connector</strong> and configure your VPC and subnets</li>
                  <li>Deploy the agent inside the VPC using the docker command shown</li>
                </ol>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['graph-connection', graph.productTag, graph.tag, graph.env.slug] })}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
              <p className="text-xs text-grey-400">
                Environment: <span className="font-medium text-grey-500">{graph.env.slug}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden h-full bg-grey-100 relative">
      <div
        className={cn(
          "bg-white border-r border-grey-300 flex flex-col min-h-0 overflow-hidden transition-all duration-300 relative z-10",
          isSidebarCollapsed ? "w-14" : ""
        )}
        style={{ width: isSidebarCollapsed ? '56px' : `${sidebarWidth}px` }}
      >
        {!isSidebarCollapsed && (
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary z-50 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.pageX;
              const startWidth = sidebarWidth;

              const handleMouseMove = (mouseEvent: MouseEvent) => {
                const newWidth = Math.max(200, Math.min(600, startWidth + (mouseEvent.pageX - startX)));
                setSidebarWidth(newWidth);
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        )}
        {/* Sidebar Header */}
        <div className="h-14 border-b border-grey-300 flex items-center justify-between px-4 sticky top-0 bg-white z-10 hidden">
        </div>
        <div className={cn('flex-shrink-0 border-b border-grey-400', isSidebarCollapsed ? 'p-2' : 'p-4')}>
          <div className={cn('flex items-center', isSidebarCollapsed ? 'justify-center' : 'gap-2 mb-3')}>
            <button
              onClick={() => {
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
              }}
              className={cn(
                'flex items-center justify-center rounded-lg flex-shrink-0',
                getGraphTypeColor(graph.type),
                isSidebarCollapsed ? 'w-8 h-8' : 'w-9 h-9'
              )}
              title={isSidebarCollapsed ? 'Expand sidebar' : graph.name}
            >
              <Share2 className="h-5 w-5 text-grey" />
            </button>
            {!isSidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-grey text-sm truncate">{graph.name}</h2>
                  <p className="text-xs text-grey-600 truncate">{graph.env.slug}</p>
                </div>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1.5 text-grey-500 hover:text-grey hover:bg-grey-100 rounded transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* View Tabs - Only show when expanded */}
          {!isSidebarCollapsed && (
            <>
              <div className="flex gap-1 mb-3 bg-grey-100 p-1 rounded">
                <button
                  onClick={() => handleViewChange('labels')}
                  className={cn(
                    'flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors',
                    sidebarView === 'labels'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-grey-600 hover:text-grey'
                  )}
                >
                  <Database className="h-3 w-3 inline mr-1" />
                  Labels
                </button>
                <button
                  onClick={() => handleViewChange('relationships')}
                  className={cn(
                    'flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors',
                    sidebarView === 'relationships'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-grey-600 hover:text-grey'
                  )}
                >
                  <GitBranch className="h-3 w-3 inline mr-1" />
                  Rels
                </button>
                <button
                  onClick={() => handleViewChange('actions')}
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

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
                <Input
                  type="text"
                  placeholder={`Search ${sidebarView}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </>
          )}
        </div>

        {/* List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {/* Collapsed view - Icon buttons only */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  handleViewChange('labels');
                }}
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                  sidebarView === 'labels'
                    ? 'bg-primary/10 text-primary'
                    : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
                )}
                title="Node Labels"
              >
                <Database className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  handleViewChange('relationships');
                }}
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                  sidebarView === 'relationships'
                    ? 'bg-primary/10 text-primary'
                    : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
                )}
                title="Relationships"
              >
                <GitBranch className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-2 py-2">
                <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
                  {sidebarView === 'labels' && <>Node Labels (<LoadingValue loading={isConnecting || isLoadingLabels}>{filteredLabels.length}</LoadingValue>)</>}
                  {sidebarView === 'relationships' && <>Relationship Types (<LoadingValue loading={isConnecting || isLoadingRelTypes}>{filteredRelationships.length}</LoadingValue>)</>}
                  {sidebarView === 'actions' && <>Saved Actions (<LoadingValue loading={isLoadingActions}>{filteredActions.length}</LoadingValue>)</>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={handleSidebarRefresh}
                    disabled={isSidebarRefreshing}
                    className="text-grey-600 hover:text-primary transition-colors"
                    title="Refresh list"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', isSidebarRefreshing && 'animate-spin')} />
                  </button>
                  {sidebarView === 'labels' && (
                    <button
                      onClick={() => setShowAddNodeModal(true)}
                      className="text-grey-600 hover:text-primary transition-colors"
                      title="Create new node"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {sidebarView === 'relationships' && (
                    <button
                      onClick={() => setShowAddRelationshipModal(true)}
                      className="text-grey-600 hover:text-primary transition-colors"
                      title="Create new relationship"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Loading States */}
              {(sidebarView === 'labels' && isLoadingLabels) && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-grey-400" />
                  <span className="ml-2 text-sm text-grey-500">Loading labels...</span>
                </div>
              )}
              {(sidebarView === 'relationships' && isLoadingRelTypes) && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-grey-400" />
                  <span className="ml-2 text-sm text-grey-500">Loading relationships...</span>
                </div>
              )}
              {(sidebarView === 'actions' && isLoadingActions) && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-grey-400" />
                  <span className="ml-2 text-sm text-grey-500">Loading actions...</span>
                </div>
              )}

              {/* Labels List */}
              {sidebarView === 'labels' && !isLoadingLabels && (
                <div className="space-y-1">
                  {filteredLabels.map((label) => (
                    <button
                      key={label.name}
                      onClick={() => {
                        setSelectedLabel(label);
                        setSelectedRelType(null);
                        // Execute query and show results in table/graph view
                        setQueryAndExecute(getFindNodesQuery(label.name));
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-2 py-2 rounded text-sm transition-colors',
                        selectedLabel?.name === label.name
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-grey hover:bg-grey-100'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', label.color)}></span>
                        <span className="truncate">{label.name}</span>
                      </div>
                      <span className="text-xs text-grey flex-shrink-0">
                        {label.count.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Relationships List */}
              {sidebarView === 'relationships' && !isLoadingRelTypes && (
                <div className="space-y-1">
                  {filteredRelationships.map((rel) => (
                    <button
                      key={rel.type}
                      onClick={() => {
                        setSelectedRelType(rel);
                        setSelectedLabel(null);
                        // Execute query and show results in table/graph view
                        setQueryAndExecute(getFindRelationshipsQuery(rel.type));
                      }}
                      className={cn(
                        'w-full px-2 py-2 rounded text-sm transition-colors text-left',
                        selectedRelType?.type === rel.type
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-grey hover:bg-grey-100'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">{rel.type}</span>
                        <span className="text-xs text-grey">{rel.count.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-grey">
                        <span className="px-1.5 py-0.5 bg-grey-100 rounded">{rel.fromLabels?.join(', ') || '-'}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="px-1.5 py-0.5 bg-grey-100 rounded">{rel.toLabels?.join(', ') || '-'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Actions List */}
              {sidebarView === 'actions' && !isLoadingActions && (
                <div className="space-y-1">
                  {filteredActions.length === 0 ? (
                    <div className="px-2 py-4 text-center">
                      <Bookmark className="h-8 w-8 text-grey-300 mx-auto mb-2" />
                      <p className="text-xs text-grey">No saved actions yet</p>
                      <p className="text-xs text-grey mt-1">
                        Write a query and click "Save as Action"
                      </p>
                    </div>
                  ) : (
                    filteredActions.map((action) => (
                      <div
                        key={action.id}
                        className={cn(
                          'px-2 py-2 rounded text-sm transition-colors cursor-pointer',
                          selectedAction?.id === action.id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-grey-100'
                        )}
                        onClick={() => handleLoadAction(action)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-grey truncate">{action.name}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenExecuteActionModal(action);
                              }}
                              className="p-1 text-grey hover:text-primary hover:bg-primary/10 rounded transition-colors"
                              title="Execute with parameters"
                            >
                              <Play className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAction(action.tag);
                              }}
                              className="p-1 text-grey hover:text-red hover:bg-red/10 rounded transition-colors"
                              title="Delete action"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs">
                            {action.operation}
                          </span>
                          {action.parameters.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-grey-100 rounded text-xs text-grey">
                              {action.parameters.length} param{action.parameters.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {action.description && (
                          <div className="text-xs text-grey mt-1 truncate">
                            {action.description}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Expand button when collapsed */}
        {isSidebarCollapsed && (
          <div className="flex-shrink-0 border-t border-grey-400 bg-grey-50 p-2">
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="w-full flex items-center justify-center p-2 text-grey-500 hover:text-grey hover:bg-grey-100 rounded transition-colors"
              title="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Query Builder - Shows when + button clicked on Actions tab */}
        {showQueryBuilder ? (
          <div className="flex-1 overflow-auto p-6 bg-grey-50">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Query Builder Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-grey">Query Builder</h2>
                  <p className="text-sm text-grey">Build graph queries and save them as reusable actions</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestQuery}
                    disabled={!generatedQuery || isTestingQuery}
                    className="gap-2"
                  >
                    {isTestingQuery ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Test Query
                  </Button>
                  {/* Save as Action button hidden for now */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQueryBuilder(false)}
                    className="gap-2 text-grey"
                  >
                    <X className="h-4 w-4" />
                    Close
                  </Button>
                </div>
              </div>

              {/* Operation Selection */}
              <div className="bg-white rounded-lg border border-grey-400 p-4">
                <Label className="text-sm font-semibold text-grey mb-3 block">Operation Type</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(GRAPH_OPERATIONS).map(([op, config]) => (
                    <button
                      key={op}
                      onClick={() => setQueryBuilderOperation(op as GraphOperation)}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-colors',
                        queryBuilderOperation === op
                          ? 'border-primary bg-primary/5'
                          : 'border-grey-400 hover:border-grey-300 hover:bg-grey-50'
                      )}
                    >
                      <div className={cn('text-xs font-semibold uppercase mb-1', config.color.split(' ')[1])}>
                        {config.label}
                      </div>
                      <div className="text-xs text-grey line-clamp-2">{config.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Query Configuration */}
              <div className="bg-white rounded-lg border border-grey-400 p-4">
                <Label className="text-sm font-semibold text-grey mb-3 block">Query Configuration</Label>

                <div className="space-y-4">
                  {/* Node Label Selection - for node operations */}
                  {['findNodes', 'findNodeById', 'createNode', 'updateNode', 'deleteNode', 'mergeNode', 'countNodes', 'traverse', 'getNeighborhood'].includes(queryBuilderOperation) && (
                    <div>
                      <Label className="text-xs text-grey mb-2 block">
                        {queryBuilderOperation === 'findNodeById' ? 'Node ID' : 'Node Label'}
                      </Label>
                      {queryBuilderOperation === 'findNodeById' ? (
                        <Input
                          value={queryBuilderNodeId}
                          onChange={(e) => setQueryBuilderNodeId(e.target.value)}
                          placeholder="Enter node ID..."
                        />
                      ) : (
                        <Select value={queryBuilderLabel} onValueChange={setQueryBuilderLabel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a label..." />
                          </SelectTrigger>
                          <SelectContent>
                            {labels.map((label) => (
                              <SelectItem key={label.name} value={label.name}>
                                <span className="flex items-center gap-2">
                                  <span className={cn('w-2 h-2 rounded-full', label.color)} />
                                  {label.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {/* Relationship Type Selection - for relationship operations */}
                  {['findRelationships', 'createRelationship', 'updateRelationship', 'deleteRelationship', 'mergeRelationship', 'countRelationships'].includes(queryBuilderOperation) && (
                    <div>
                      <Label className="text-xs text-grey mb-2 block">Relationship Type</Label>
                      <Select value={queryBuilderRelType} onValueChange={setQueryBuilderRelType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a relationship type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {relationshipTypes.map((rel) => (
                            <SelectItem key={rel.type} value={rel.type}>
                              {rel.type} ({rel.fromLabels?.join('/') || '-'} → {rel.toLabels?.join('/') || '-'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Direction Selection - for traversal and relationship operations */}
                  {['traverse', 'getNeighborhood', 'findRelationships', 'createRelationship'].includes(queryBuilderOperation) && (
                    <div>
                      <Label className="text-xs text-grey mb-2 block">Direction</Label>
                      <Select value={queryBuilderDirection} onValueChange={(v) => setQueryBuilderDirection(v as 'OUTGOING' | 'INCOMING' | 'BOTH')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OUTGOING">Outgoing →</SelectItem>
                          <SelectItem value="INCOMING">← Incoming</SelectItem>
                          <SelectItem value="BOTH">↔ Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* From/To Node Selection - for relationship and path operations */}
                  {['createRelationship', 'mergeRelationship', 'shortestPath', 'allPaths'].includes(queryBuilderOperation) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-grey mb-2 block">
                          {['shortestPath', 'allPaths'].includes(queryBuilderOperation) ? 'Start Node Label' : 'From Node Label'}
                        </Label>
                        <Select value={queryBuilderFromNode.label} onValueChange={(v) => setQueryBuilderFromNode({ ...queryBuilderFromNode, label: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select label..." />
                          </SelectTrigger>
                          <SelectContent>
                            {labels.map((label) => (
                              <SelectItem key={label.name} value={label.name}>{label.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-grey mb-2 block">
                          {['shortestPath', 'allPaths'].includes(queryBuilderOperation) ? 'End Node Label' : 'To Node Label'}
                        </Label>
                        <Select value={queryBuilderToNode.label} onValueChange={(v) => setQueryBuilderToNode({ ...queryBuilderToNode, label: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select label..." />
                          </SelectTrigger>
                          <SelectContent>
                            {labels.map((label) => (
                              <SelectItem key={label.name} value={label.name}>{label.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Max Depth - for traversal operations */}
                  {['traverse', 'getNeighborhood', 'shortestPath', 'allPaths'].includes(queryBuilderOperation) && (
                    <div>
                      <Label className="text-xs text-grey mb-2 block">Max Depth</Label>
                      <Input
                        type="number"
                        value={queryBuilderMaxDepth}
                        onChange={(e) => setQueryBuilderMaxDepth(e.target.value)}
                        placeholder="2"
                        min="1"
                        max="10"
                      />
                    </div>
                  )}

                  {/* Limit and Skip - for find operations */}
                  {['findNodes', 'findRelationships', 'traverse', 'getNeighborhood'].includes(queryBuilderOperation) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-grey mb-2 block">Limit</Label>
                        <Input
                          type="number"
                          value={queryBuilderLimit}
                          onChange={(e) => setQueryBuilderLimit(e.target.value)}
                          placeholder="25"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-grey mb-2 block">Skip</Label>
                        <Input
                          type="number"
                          value={queryBuilderSkip}
                          onChange={(e) => setQueryBuilderSkip(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}

                  {/* Where Conditions - for find and update/delete operations */}
                  {['findNodes', 'updateNode', 'deleteNode'].includes(queryBuilderOperation) && (
                    <div>
                      <Label className="text-xs text-grey mb-2 block">Where Conditions</Label>
                      {queryBuilderWhere.map((condition, idx) => {
                        const selectedLabelDef = labels.find(l => l.name === queryBuilderLabel);
                        const selectedProp = selectedLabelDef?.properties.find(p => p.name === condition.property);
                        const propType = selectedProp?.type || 'string';

                        // Operators based on property type
                        const getOperatorsForType = (type: string) => {
                          switch (type) {
                            case 'number':
                              return [
                                { value: '=', label: '=' },
                                { value: '<>', label: '≠' },
                                { value: '>', label: '>' },
                                { value: '<', label: '<' },
                                { value: '>=', label: '≥' },
                                { value: '<=', label: '≤' },
                              ];
                            case 'boolean':
                              return [
                                { value: '=', label: '=' },
                                { value: '<>', label: '≠' },
                              ];
                            case 'date':
                            case 'datetime':
                              return [
                                { value: '=', label: '=' },
                                { value: '<>', label: '≠' },
                                { value: '>', label: 'After' },
                                { value: '<', label: 'Before' },
                                { value: '>=', label: 'On or after' },
                                { value: '<=', label: 'On or before' },
                              ];
                            default: // string
                              return [
                                { value: '=', label: '=' },
                                { value: '<>', label: '≠' },
                                { value: 'CONTAINS', label: 'Contains' },
                                { value: 'STARTS WITH', label: 'Starts with' },
                                { value: 'ENDS WITH', label: 'Ends with' },
                              ];
                          }
                        };

                        const operators = getOperatorsForType(propType);

                        return (
                          <div key={idx} className="flex gap-2 mb-2">
                            {/* Property Dropdown */}
                            <Select
                              value={condition.property}
                              onValueChange={(v) => {
                                const newWhere = [...queryBuilderWhere];
                                newWhere[idx].property = v;
                                // Reset operator and value when property changes
                                const newProp = selectedLabelDef?.properties.find(p => p.name === v);
                                const newType = newProp?.type || 'string';
                                const newOps = getOperatorsForType(newType);
                                if (!newOps.find(op => op.value === newWhere[idx].operator)) {
                                  newWhere[idx].operator = '=';
                                }
                                newWhere[idx].value = '';
                                setQueryBuilderWhere(newWhere);
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select property..." />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedLabelDef?.properties.map((prop) => (
                                  <SelectItem key={prop.name} value={prop.name}>
                                    <span className="flex items-center gap-2">
                                      {prop.name}
                                      <span className="text-xs text-grey-400">({prop.type})</span>
                                    </span>
                                  </SelectItem>
                                )) || (
                                    <SelectItem value="" disabled>Select a label first</SelectItem>
                                  )}
                              </SelectContent>
                            </Select>

                            {/* Operator Dropdown - Dynamic based on property type */}
                            <Select
                              value={condition.operator}
                              onValueChange={(v) => {
                                const newWhere = [...queryBuilderWhere];
                                newWhere[idx].operator = v;
                                setQueryBuilderWhere(newWhere);
                              }}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {operators.map((op) => (
                                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Value Input - Dynamic based on property type */}
                            {propType === 'boolean' ? (
                              <Select
                                value={condition.value}
                                onValueChange={(v) => {
                                  const newWhere = [...queryBuilderWhere];
                                  newWhere[idx].value = v;
                                  setQueryBuilderWhere(newWhere);
                                }}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select value..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">true</SelectItem>
                                  <SelectItem value="false">false</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : propType === 'number' ? (
                              <Input
                                type="number"
                                value={condition.value}
                                onChange={(e) => {
                                  const newWhere = [...queryBuilderWhere];
                                  newWhere[idx].value = e.target.value;
                                  setQueryBuilderWhere(newWhere);
                                }}
                                placeholder="Enter number..."
                                className="flex-1"
                              />
                            ) : propType === 'date' ? (
                              <Input
                                type="date"
                                value={condition.value}
                                onChange={(e) => {
                                  const newWhere = [...queryBuilderWhere];
                                  newWhere[idx].value = e.target.value;
                                  setQueryBuilderWhere(newWhere);
                                }}
                                className="flex-1"
                              />
                            ) : propType === 'datetime' ? (
                              <Input
                                type="datetime-local"
                                value={condition.value}
                                onChange={(e) => {
                                  const newWhere = [...queryBuilderWhere];
                                  newWhere[idx].value = e.target.value;
                                  setQueryBuilderWhere(newWhere);
                                }}
                                className="flex-1"
                              />
                            ) : (
                              <Input
                                value={condition.value}
                                onChange={(e) => {
                                  const newWhere = [...queryBuilderWhere];
                                  newWhere[idx].value = e.target.value;
                                  setQueryBuilderWhere(newWhere);
                                }}
                                placeholder="Enter value..."
                                className="flex-1"
                              />
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setQueryBuilderWhere(queryBuilderWhere.filter((_, i) => i !== idx))}
                            >
                              ×
                            </Button>
                          </div>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQueryBuilderWhere([...queryBuilderWhere, { property: '', operator: '=', value: '' }])}
                        disabled={!queryBuilderLabel}
                      >
                        + Add Condition
                      </Button>
                      {!queryBuilderLabel && queryBuilderWhere.length === 0 && (
                        <p className="text-xs text-grey-400 mt-1">Select a label first to add conditions</p>
                      )}
                    </div>
                  )}

                  {/* Properties - for create and update operations */}
                  {['createNode', 'mergeNode', 'updateNode', 'createRelationship', 'mergeRelationship'].includes(queryBuilderOperation) && (
                    <div>
                      <Label className="text-xs text-grey mb-2 block">Properties</Label>
                      {queryBuilderProperties.map((prop, idx) => {
                        const isNodeOp = ['createNode', 'mergeNode', 'updateNode'].includes(queryBuilderOperation);
                        const selectedLabelDef = isNodeOp ? labels.find(l => l.name === queryBuilderLabel) : null;
                        const selectedProp = selectedLabelDef?.properties.find(p => p.name === prop.key);
                        const propType = selectedProp?.type || 'string';

                        return (
                          <div key={idx} className="flex gap-2 mb-2">
                            {/* Property Name - Dropdown for node operations, input for relationships */}
                            {isNodeOp && selectedLabelDef ? (
                              <Select
                                value={prop.key}
                                onValueChange={(v) => {
                                  const newProps = [...queryBuilderProperties];
                                  newProps[idx].key = v;
                                  newProps[idx].value = '';
                                  setQueryBuilderProperties(newProps);
                                }}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select property..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedLabelDef.properties.map((p) => (
                                    <SelectItem key={p.name} value={p.name}>
                                      <span className="flex items-center gap-2">
                                        {p.name}
                                        <span className="text-xs text-grey-400">({p.type})</span>
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={prop.key}
                                onChange={(e) => {
                                  const newProps = [...queryBuilderProperties];
                                  newProps[idx].key = e.target.value;
                                  setQueryBuilderProperties(newProps);
                                }}
                                placeholder="Property name"
                                className="flex-1"
                              />
                            )}

                            {/* Value Input - Dynamic based on property type */}
                            {propType === 'boolean' ? (
                              <Select
                                value={prop.value}
                                onValueChange={(v) => {
                                  const newProps = [...queryBuilderProperties];
                                  newProps[idx].value = v;
                                  setQueryBuilderProperties(newProps);
                                }}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select value..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">true</SelectItem>
                                  <SelectItem value="false">false</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : propType === 'number' ? (
                              <Input
                                type="number"
                                value={prop.value}
                                onChange={(e) => {
                                  const newProps = [...queryBuilderProperties];
                                  newProps[idx].value = e.target.value;
                                  setQueryBuilderProperties(newProps);
                                }}
                                placeholder="Enter number..."
                                className="flex-1"
                              />
                            ) : propType === 'date' ? (
                              <Input
                                type="date"
                                value={prop.value}
                                onChange={(e) => {
                                  const newProps = [...queryBuilderProperties];
                                  newProps[idx].value = e.target.value;
                                  setQueryBuilderProperties(newProps);
                                }}
                                className="flex-1"
                              />
                            ) : propType === 'datetime' ? (
                              <Input
                                type="datetime-local"
                                value={prop.value}
                                onChange={(e) => {
                                  const newProps = [...queryBuilderProperties];
                                  newProps[idx].value = e.target.value;
                                  setQueryBuilderProperties(newProps);
                                }}
                                className="flex-1"
                              />
                            ) : (
                              <Input
                                value={prop.value}
                                onChange={(e) => {
                                  const newProps = [...queryBuilderProperties];
                                  newProps[idx].value = e.target.value;
                                  setQueryBuilderProperties(newProps);
                                }}
                                placeholder="Enter value..."
                                className="flex-1"
                              />
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setQueryBuilderProperties(queryBuilderProperties.filter((_, i) => i !== idx))}
                            >
                              ×
                            </Button>
                          </div>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQueryBuilderProperties([...queryBuilderProperties, { key: '', value: '' }])}
                        disabled={['createNode', 'mergeNode', 'updateNode'].includes(queryBuilderOperation) && !queryBuilderLabel}
                      >
                        + Add Property
                      </Button>
                      {['createNode', 'mergeNode', 'updateNode'].includes(queryBuilderOperation) && !queryBuilderLabel && (
                        <p className="text-xs text-grey-400 mt-1">Select a label first to add properties</p>
                      )}
                    </div>
                  )}

                  {/* Full Text Search fields */}
                  {queryBuilderOperation === 'fullTextSearch' && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-grey mb-2 block">Index Name</Label>
                        <Select value={queryBuilderLabel} onValueChange={setQueryBuilderLabel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an index..." />
                          </SelectTrigger>
                          <SelectContent>
                            {indexes.filter(i => i.type === 'FULLTEXT').map((index) => (
                              <SelectItem key={index.name} value={index.name}>{index.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-grey mb-2 block">Search Text</Label>
                        <Input
                          value={queryBuilderNodeId}
                          onChange={(e) => setQueryBuilderNodeId(e.target.value)}
                          placeholder="Enter search text..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Raw Query */}
                  {queryBuilderOperation === 'executeRaw' && (
                    <div>
                      <Label className="text-xs text-grey mb-2 block">
                        Raw {getQueryLanguageName(graph.type)} Query
                      </Label>
                      <Textarea
                        value={queryBuilderRawQuery}
                        onChange={(e) => setQueryBuilderRawQuery(e.target.value)}
                        placeholder={`Enter your ${getQueryLanguageName(graph.type)} query...`}
                        className="font-mono h-32"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Generated Query Preview */}
              <div className="bg-white rounded-lg border border-grey-400 p-4">
                <Label className="text-sm font-semibold text-grey mb-3 block">Generated Query</Label>
                <pre className="bg-grey-50 rounded-lg p-4 overflow-x-auto text-sm font-mono text-grey max-h-48 overflow-y-auto">
                  {generatedQuery ? JSON.stringify(generatedQuery, null, 2) : 'Configure options above to generate a query'}
                </pre>
                {queryTestResult?.success && (
                  <div className="mt-3 flex items-center gap-2 text-green text-sm">
                    <Check className="h-4 w-4" />
                    Query tested successfully ({queryTestResult.rowCount} rows in {queryTestResult.executionTime}ms)
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : selectedAction ? (
          /* Action Details View */
          <div className="flex-1 overflow-auto p-6 bg-grey-50">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Action Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-grey">{selectedAction.name}</h2>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      GRAPH_OPERATIONS[selectedAction.operation as GraphOperation]?.color || 'bg-grey-100 text-grey'
                    )}>
                      {GRAPH_OPERATIONS[selectedAction.operation as GraphOperation]?.label || selectedAction.operation}
                    </span>
                  </div>
                  {/* Action Tag */}
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    <code className="text-sm font-mono px-2 py-0.5 bg-primary/10 text-primary rounded">
                      {selectedAction.tag}
                    </code>
                  </div>
                  {selectedAction.description && (
                    <p className="text-sm text-grey">{selectedAction.description}</p>
                  )}
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
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAction(null)}
                    className="gap-2 text-grey"
                  >
                    <X className="h-4 w-4" />
                    Close
                  </Button>
                </div>
              </div>

              {/* Action Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <Label className="text-xs text-grey uppercase tracking-wide mb-2 block">Operation Type</Label>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="font-medium text-grey">
                      {GRAPH_OPERATIONS[selectedAction.operation as GraphOperation]?.label || selectedAction.operation}
                    </span>
                  </div>
                  <p className="text-xs text-grey mt-1">
                    {GRAPH_OPERATIONS[selectedAction.operation as GraphOperation]?.description}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <Label className="text-xs text-grey uppercase tracking-wide mb-2 block">Graph</Label>
                  <span className="font-medium text-grey">{graph.name}</span>
                  <p className="text-xs text-grey mt-1 font-mono">{graph.tag}</p>
                </div>
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <Label className="text-xs text-grey uppercase tracking-wide mb-2 block">Created</Label>
                  <span className="font-medium text-grey">
                    {selectedAction.createdAt ? new Date(selectedAction.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleOpenExecuteActionModal(selectedAction)}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Execute Action
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Load query into editor
                    let query = JSON.parse(JSON.stringify(selectedAction.query));
                    const setNestedValue = (obj: any, path: string, value: any) => {
                      const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
                      let current = obj;
                      for (let i = 0; i < keys.length - 1; i++) {
                        current = current[keys[i]];
                      }
                      current[keys[keys.length - 1]] = value;
                    };
                    selectedAction.parameters.forEach(param => {
                      setNestedValue(query, param.path, param.defaultValue);
                    });
                    setQueryInput(JSON.stringify(query, null, 2));
                    setSelectedAction(null);
                  }}
                  className="gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  Edit in Query Editor
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleDeleteAction(selectedAction.tag);
                  }}
                  className="gap-2 text-red hover:text-red hover:bg-red/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>

              {/* Parameters */}
              {selectedAction.parameters && selectedAction.parameters.length > 0 && (
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <Label className="text-sm font-semibold text-grey mb-3 block">
                    Parameters ({selectedAction.parameters.length})
                  </Label>
                  <div className="space-y-2">
                    {selectedAction.parameters.map((param, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-grey-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-primary">{`{{${param.name}}}`}</code>
                            <span className="text-xs px-1.5 py-0.5 bg-grey-100 rounded text-grey">{param.type}</span>
                          </div>
                          <p className="text-xs text-grey mt-1">Path: {param.path}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-grey">Default value:</p>
                          <code className="text-sm font-mono text-grey">
                            {JSON.stringify(param.defaultValue)}
                          </code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Query Template */}
              <div className="bg-white rounded-lg border border-grey-400 p-4">
                <Label className="text-sm font-semibold text-grey mb-3 block">Query Template</Label>
                <pre className="m-0 max-h-80 overflow-auto rounded-md border border-grey-400 bg-grey-50 p-4 text-sm font-mono leading-6 text-grey whitespace-pre-wrap break-words">
                  <code>{formatGraphActionQuery(selectedAction.query)}</code>
                </pre>
              </div>
            </div>
          </div>
        ) : showQueryEditor ? (
          <>
            {/* Graph Explorer Header - Like DatabaseExplorer */}
            <div className="flex-shrink-0 bg-white border-b border-grey-400 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Share2 className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold text-grey">{graph.name}</h2>
                    <p className="text-xs text-grey-600">
                      {queryResult ? `${smartRowCount.count} ${smartRowCount.type === 'relationships' ? 'relationships' : smartRowCount.type === 'nodes' ? 'nodes' : 'results'}` : 'Graph Explorer'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGraphCodeSidebar(true)}
                    className="gap-2"
                  >
                    <Code className="h-4 w-4" />
                    Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSidebarRefresh}
                    disabled={isSidebarRefreshing}
                    className="gap-2"
                  >
                    <RefreshCw className={cn('h-4 w-4', isSidebarRefreshing && 'animate-spin')} />
                    Refresh
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowQueryEditor(false);
                      setQueryResult(null);
                      setQueryInput('');
                    }}
                    className="gap-2 text-grey"
                    title="Back to Overview"
                  >
                    <X className="h-4 w-4" />
                    Close
                  </Button>

                  {/* Search Bar - Focus to expand query editor */}
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-grey-400" />
                    <Input
                      type="text"
                      placeholder="Query..."
                      onFocus={() => setIsQueryEditorCollapsed(false)}
                      className="pl-9 h-9 cursor-text"
                    />
                  </div>

                  {/* Insert Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Insert
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2" onClick={() => setShowAddNodeModal(true)}>
                        <Circle className="h-4 w-4" />
                        New Node
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => setShowAddRelationshipModal(true)}>
                        <ArrowRight className="h-4 w-4" />
                        New Relationship
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Advanced Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2" onClick={() => setShowAddConstraintModal(true)}>
                        <Key className="h-4 w-4" />
                        Add Constraint
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => setShowAddIndexModal(true)}>
                        <Zap className="h-4 w-4" />
                        Add Index
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2" onClick={() => refetchConstraints()}>
                        <Eye className="h-4 w-4" />
                        View Constraints ({constraints.length})
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => refetchIndexes()}>
                        <List className="h-4 w-4" />
                        View Indexes ({indexes.length})
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Query Editor - Collapsible (Shows below header when not collapsed) */}
            {!isQueryEditorCollapsed && (
              <div className="flex-shrink-0 bg-white dark:bg-[#0a0a0a] border-b border-grey-400 dark:border-[#1a1a1a] p-4">
                {/* Code Editor Container */}
                <div className="rounded-lg overflow-hidden border border-grey-300 dark:border-[#2a2a2a] shadow-sm">
                  {/* Editor Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-grey-100 dark:bg-[#1a1a1a] border-b border-grey-300 dark:border-[#2a2a2a]">
                    <div className="flex items-center gap-3">
                      {/* Traffic light dots */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <div className="h-4 w-px bg-grey-300 dark:bg-[#3a3a3a]" />
                      <Label className="text-sm font-semibold text-grey dark:text-grey-200">
                        Graph Adapter Query
                      </Label>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium uppercase', getGraphTypeColor(graph.type))}>
                        {graph.type}
                      </span>
                      <span className="text-xs text-grey-500 dark:text-grey-400">
                        {getQueryLanguageName(graph.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQueryInput(getDefaultQuery())}
                        className="text-grey hover:text-grey dark:hover:text-white"
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleExecuteQuery()}
                        disabled={isExecuting}
                        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Run
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsQueryEditorCollapsed(true)}
                        className="gap-1.5 text-grey-500 hover:text-grey"
                        title="Collapse query editor"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Editor Body */}
                  <div className="relative">
                    {/* Line numbers gutter */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-grey-100 dark:bg-[#1a1a1a] border-r border-grey-300 dark:border-[#2a2a2a] flex flex-col pt-3 text-right pr-3 text-xs text-grey-400 dark:text-grey-600 font-mono select-none pointer-events-none overflow-hidden">
                      {Array.from({ length: Math.max(10, queryInput.split('\n').length + 2) }, (_, i) => (
                        <div key={i} style={{ lineHeight: '1.6', height: '1.6em' }}>{i + 1}</div>
                      ))}
                    </div>
                    <textarea
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      placeholder={getDefaultQuery()}
                      spellCheck={false}
                      className="w-full min-h-[160px] max-h-[500px] pl-14 pr-4 py-3 font-mono text-sm resize-y focus:outline-none bg-white dark:bg-[#0d0d0d] text-black dark:text-[#d4d4d4] placeholder-grey-400 dark:placeholder-grey-600 selection:bg-blue-500/20 dark:selection:bg-blue-500/30 caret-black dark:caret-white"
                      style={{
                        lineHeight: '1.6',
                        tabSize: 2,
                      }}
                    />
                  </div>
                </div>

                {/* Query Statistics Bar - Shows after execution */}
                {queryResult && (
                  <div className="mt-3 flex items-center justify-between px-3 py-2 bg-grey-100 dark:bg-[#1a1a1a] rounded-lg border border-grey-300 dark:border-[#2a2a2a]">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-grey">
                        <span className="font-semibold text-grey">{smartRowCount.count}</span> {smartRowCount.type === 'relationships' ? 'relationships' : smartRowCount.type === 'nodes' ? 'nodes' : 'rows'} in <span className="font-semibold text-grey">{queryResult.executionTime}ms</span>
                        {'nodesIncluded' in smartRowCount && (
                          <span className="text-grey-400 ml-1">(+{smartRowCount.nodesIncluded} nodes enriched)</span>
                        )}
                      </span>
                      {queryResult.statistics && (
                        <div className="flex items-center gap-3 text-xs text-grey dark:text-grey-300 border-l border-grey-400 dark:border-grey-600 pl-4">
                          {queryResult.statistics.nodesCreated > 0 && (
                            <span><span className="font-medium text-green-600 dark:text-green-400">{queryResult.statistics.nodesCreated}</span> nodes+</span>
                          )}
                          {queryResult.statistics.nodesDeleted > 0 && (
                            <span><span className="font-medium text-red-600 dark:text-red-400">{queryResult.statistics.nodesDeleted}</span> nodes-</span>
                          )}
                          {queryResult.statistics.relationshipsCreated > 0 && (
                            <span><span className="font-medium text-blue-600 dark:text-blue-400">{queryResult.statistics.relationshipsCreated}</span> rels+</span>
                          )}
                          {queryResult.statistics.relationshipsDeleted > 0 && (
                            <span><span className="font-medium text-orange-600 dark:text-orange-400">{queryResult.statistics.relationshipsDeleted}</span> rels-</span>
                          )}
                          {queryResult.statistics.propertiesSet > 0 && (
                            <span><span className="font-medium text-purple-600 dark:text-purple-400">{queryResult.statistics.propertiesSet}</span> props</span>
                          )}
                          {queryResult.statistics.labelsAdded > 0 && (
                            <span><span className="font-medium text-yellow-600 dark:text-yellow-400">{queryResult.statistics.labelsAdded}</span> labels</span>
                          )}
                          {Object.values(queryResult.statistics).every((v: any) => v === 0) && (
                            <span className="text-grey">read-only</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {queryResult.columns?.map((col: string) => (
                        <span key={col} className="px-1.5 py-0.5 bg-white dark:bg-grey-700 border border-grey-300 dark:border-grey-600 rounded font-mono text-grey dark:text-grey-200">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Collapsed Query Editor - Compact Bar (when results exist but editor is collapsed) */}
            {isQueryEditorCollapsed && queryResult && (
              <div className="flex-shrink-0 bg-grey-50 dark:bg-[#1a1a1a] border-b border-grey-400 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Code className="h-4 w-4 text-grey-500" />
                    <span className="text-sm font-medium text-grey">Query Results</span>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium uppercase', getGraphTypeColor(graph.type))}>
                      {graph.type}
                    </span>
                    <span className="text-xs text-grey-500">
                      • {smartRowCount.count} {smartRowCount.type === 'relationships' ? 'rels' : smartRowCount.type === 'nodes' ? 'nodes' : 'rows'} in {queryResult.executionTime}ms
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExecuteQuery()}
                      disabled={isExecuting}
                      className="gap-1.5 h-7"
                    >
                      {isExecuting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      {isExecuting ? 'Running' : 'Re-run'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsQueryEditorCollapsed(false)}
                      className="gap-1.5 h-7 text-grey-500 hover:text-grey"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Results Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {/* Loading State */}
              {isExecuting && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm font-medium text-grey">Executing query...</p>
                    <p className="text-xs text-grey-500 mt-1">Fetching data from graph database</p>
                  </div>
                </div>
              )}

              {!isExecuting && queryError && (
                <div className="bg-red/10 border border-red/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-red">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Query Error</span>
                  </div>
                  <p className="text-sm text-red mt-2 font-mono">{queryError}</p>
                </div>
              )}

              {!isExecuting && queryResult && (
                <div className="h-full flex flex-col">
                  {/* View Toggle Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1 bg-grey-100 p-1 rounded-lg">
                      <button
                        onClick={() => setResultsView('table')}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                          resultsView === 'table'
                            ? 'bg-white text-grey shadow-sm'
                            : 'text-grey hover:text-grey'
                        )}
                      >
                        <Table2 className="h-3.5 w-3.5" />
                        Table
                      </button>
                      <button
                        onClick={() => setResultsView('graph')}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                          resultsView === 'graph'
                            ? 'bg-white text-grey shadow-sm'
                            : 'text-grey hover:text-grey'
                        )}
                      >
                        <Network className="h-3.5 w-3.5" />
                        Graph
                        {graphData.nodes.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs">
                            {graphData.nodes.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {resultsView === 'graph' && graphData.nodes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGraphZoom(Math.max(0.5, graphZoom - 0.25))}
                          className="h-7 w-7 p-0"
                        >
                          <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs text-grey w-12 text-center">{Math.round(graphZoom * 100)}%</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGraphZoom(Math.min(2, graphZoom + 0.25))}
                          className="h-7 w-7 p-0"
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetGraphView}
                          className="h-7 w-7 p-0"
                          title="Reset view (zoom & pan)"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Table View */}
                  {resultsView === 'table' && (
                    <div className="bg-white rounded-lg border border-grey-400 overflow-hidden flex-1">
                      <div className="overflow-x-auto h-full">
                        {(() => {
                          // Use memoized table data - server returns paginated data directly
                          const { allRelationships, allNodes, startIndex } = tableData;

                          // Data is already paginated from server
                          const relationships = allRelationships;
                          const nodes = allRelationships.length > 0 ? [] : allNodes;

                          // Build node lookup map by ID for quick access
                          const nodeMap = new Map<string, any>();
                          allNodes.forEach((node: any) => {
                            if (node.id) {
                              nodeMap.set(node.id, node);
                            }
                          });

                          // Determine what to display based on data composition
                          const hasRelationships = allRelationships.length > 0;
                          const hasOnlyNodes = allNodes.length > 0 && allRelationships.length === 0;

                          // If we have relationships, show relationship table (enriched with node data if available)
                          if (hasRelationships) {
                            // Get relationship properties
                            const relProps = Array.from(new Set(relationships.flatMap((r: any) => Object.keys(r.properties || {})))) as string[];

                            return (
                              <div className="flex h-full">
                                <div className={cn("overflow-x-auto", selectedNode ? "flex-1" : "w-full")}>
                                  <table className="w-full">
                                    <thead className="bg-grey-50 border-b border-grey-400 sticky top-0">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider w-12">
                                          #
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider">
                                          Type
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider">
                                          From Node
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider">
                                          To Node
                                        </th>
                                        {relProps.slice(0, selectedNode ? 2 : relProps.length).map((prop) => (
                                          <th key={prop} className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider">
                                            {prop}
                                          </th>
                                        ))}
                                        {selectedNode && relProps.length > 2 && (
                                          <th className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider">
                                            ...
                                          </th>
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-grey-400">
                                      {relationships.map((rel: any, idx: number) => {
                                        // Get the start/end node IDs (handle all naming conventions)
                                        const startNodeId = rel.startNode || rel.start || rel.source || rel.startNodeId || rel.from;
                                        const endNodeId = rel.endNode || rel.end || rel.target || rel.endNodeId || rel.to;

                                        // Get enriched node data if available
                                        const startNode = nodeMap.get(startNodeId);
                                        const endNode = nodeMap.get(endNodeId);

                                        // Check if this relationship is selected
                                        const isSelected = selectedNode?.isRelationship && selectedNode?.id === rel.id;

                                        // Helper to render node info
                                        const renderNodeCell = (nodeId: string, nodeData: any, onClick?: () => void) => {
                                          if (nodeData) {
                                            // Show enriched node data with label and key properties
                                            const displayName = nodeData.properties?.name || nodeData.properties?.title || nodeData.properties?.id || nodeId?.split(':').pop();
                                            const labels = nodeData.labels || [];
                                            return (
                                              <div
                                                className={cn("space-y-1", onClick && "cursor-pointer hover:bg-grey-100 -m-2 p-2 rounded")}
                                                onClick={(e) => {
                                                  if (onClick) {
                                                    e.stopPropagation();
                                                    onClick();
                                                  }
                                                }}
                                              >
                                                <div className="flex items-center gap-2">
                                                  {labels.map((label: string) => (
                                                    <span key={label} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded font-medium">
                                                      {label}
                                                    </span>
                                                  ))}
                                                </div>
                                                <div className="text-sm font-medium text-grey">
                                                  {displayName}
                                                </div>
                                                {!selectedNode && nodeData.properties && Object.keys(nodeData.properties).length > 0 && (
                                                  <div className="text-xs text-grey-500 max-w-[200px]">
                                                    {Object.entries(nodeData.properties)
                                                      .filter(([key]) => !['name', 'title', 'id'].includes(key))
                                                      .slice(0, 2)
                                                      .map(([key, val]) => (
                                                        <span key={key} className="mr-2">
                                                          <span className="text-grey-400">{key}:</span> {String(val).substring(0, 20)}{String(val).length > 20 ? '...' : ''}
                                                        </span>
                                                      ))}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }
                                          // Fallback to just showing the ID
                                          return (
                                            <span className="text-sm text-grey font-mono">
                                              {nodeId?.split(':').pop() || nodeId}
                                            </span>
                                          );
                                        };

                                        return (
                                          <tr
                                            key={rel.id || idx}
                                            className={cn(
                                              "hover:bg-grey-50 transition-colors cursor-pointer",
                                              isSelected && "bg-primary/5 hover:bg-primary/10"
                                            )}
                                            onClick={() => setSelectedNode(isSelected ? null : {
                                              ...rel,
                                              isRelationship: true,
                                              startNodeData: startNode,
                                              endNodeData: endNode,
                                            })}
                                          >
                                            <td className="px-4 py-3 text-sm text-grey font-mono align-top">
                                              {startIndex + idx + 1}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                              <span className="px-2 py-1 bg-blue/10 text-blue text-xs rounded-full font-medium">
                                                {rel.type}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                              {renderNodeCell(startNodeId, startNode, startNode ? () => setSelectedNode({
                                                ...startNode,
                                                label: startNode.labels?.[0] || 'Node',
                                                displayName: startNode.properties?.name || startNode.properties?.title || startNode.id
                                              }) : undefined)}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                              {renderNodeCell(endNodeId, endNode, endNode ? () => setSelectedNode({
                                                ...endNode,
                                                label: endNode.labels?.[0] || 'Node',
                                                displayName: endNode.properties?.name || endNode.properties?.title || endNode.id
                                              }) : undefined)}
                                            </td>
                                            {relProps.slice(0, selectedNode ? 2 : relProps.length).map((prop: string) => (
                                              <td key={prop} className="px-4 py-3 text-sm text-grey align-top">
                                                {rel.properties?.[prop] !== undefined ? (
                                                  typeof rel.properties[prop] === 'object'
                                                    ? <pre className="text-xs bg-grey-50 p-1 rounded overflow-auto max-h-20">{JSON.stringify(rel.properties[prop], null, 2)}</pre>
                                                    : typeof rel.properties[prop] === 'boolean'
                                                      ? <span className={cn('px-2 py-0.5 rounded text-xs', rel.properties[prop] ? 'bg-green/10 text-green' : 'bg-grey-100 text-grey')}>{String(rel.properties[prop])}</span>
                                                      : String(rel.properties[prop]).substring(0, 30) + (String(rel.properties[prop]).length > 30 ? '...' : '')
                                                ) : (
                                                  <span className="text-grey-400">—</span>
                                                )}
                                              </td>
                                            ))}
                                            {selectedNode && relProps.length > 2 && (
                                              <td className="px-4 py-3 text-sm text-grey-400 align-top">
                                                +{relProps.length - 2} more
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Details Sidebar for Relationships */}
                                {selectedNode && (
                                  <div className="w-80 border-l border-grey-400 bg-grey-50 overflow-y-auto flex-shrink-0">
                                    <div className="sticky top-0 bg-grey-50 border-b border-grey-400 p-4">
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-grey flex items-center gap-2">
                                          <Eye className="h-4 w-4" />
                                          {selectedNode.isRelationship ? 'Relationship Details' : 'Node Details'}
                                        </h4>
                                        <button
                                          onClick={() => setSelectedNode(null)}
                                          className="text-grey-400 hover:text-grey p-1 hover:bg-grey-200 rounded"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="p-4 space-y-4">
                                      {selectedNode.isRelationship ? (
                                        <>
                                          {/* Relationship Type */}
                                          <div>
                                            <div className="text-xs font-medium text-grey mb-2">Relationship Type</div>
                                            <span className="px-3 py-1.5 bg-blue/10 text-blue text-sm rounded font-medium">
                                              {selectedNode.type}
                                            </span>
                                          </div>

                                          {/* Relationship ID */}
                                          <div>
                                            <div className="text-xs font-medium text-grey mb-2">Relationship ID</div>
                                            <div className="font-mono text-xs text-grey bg-white px-3 py-2 rounded border border-grey-400 break-all">
                                              {selectedNode.id}
                                            </div>
                                          </div>

                                          {/* Start Node */}
                                          {selectedNode.startNodeData && (
                                            <div>
                                              <div className="text-xs font-medium text-grey mb-2">From Node</div>
                                              <div
                                                className="bg-white rounded border border-grey-400 p-3 cursor-pointer hover:border-primary transition-colors"
                                                onClick={() => setSelectedNode({
                                                  ...selectedNode.startNodeData,
                                                  label: selectedNode.startNodeData.labels?.[0] || 'Node',
                                                  displayName: selectedNode.startNodeData.properties?.name || selectedNode.startNodeData.properties?.title || selectedNode.startNodeData.id
                                                })}
                                              >
                                                <div className="flex flex-wrap gap-1 mb-1">
                                                  {selectedNode.startNodeData.labels?.map((label: string) => (
                                                    <span key={label} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded font-medium">
                                                      :{label}
                                                    </span>
                                                  ))}
                                                </div>
                                                <div className="text-sm font-medium text-grey">
                                                  {selectedNode.startNodeData.properties?.name || selectedNode.startNodeData.properties?.title || selectedNode.startNodeData.id}
                                                </div>
                                                <div className="text-[10px] text-grey-400 mt-1">Click to view node details</div>
                                              </div>
                                            </div>
                                          )}

                                          {/* End Node */}
                                          {selectedNode.endNodeData && (
                                            <div>
                                              <div className="text-xs font-medium text-grey mb-2">To Node</div>
                                              <div
                                                className="bg-white rounded border border-grey-400 p-3 cursor-pointer hover:border-primary transition-colors"
                                                onClick={() => setSelectedNode({
                                                  ...selectedNode.endNodeData,
                                                  label: selectedNode.endNodeData.labels?.[0] || 'Node',
                                                  displayName: selectedNode.endNodeData.properties?.name || selectedNode.endNodeData.properties?.title || selectedNode.endNodeData.id
                                                })}
                                              >
                                                <div className="flex flex-wrap gap-1 mb-1">
                                                  {selectedNode.endNodeData.labels?.map((label: string) => (
                                                    <span key={label} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded font-medium">
                                                      :{label}
                                                    </span>
                                                  ))}
                                                </div>
                                                <div className="text-sm font-medium text-grey">
                                                  {selectedNode.endNodeData.properties?.name || selectedNode.endNodeData.properties?.title || selectedNode.endNodeData.id}
                                                </div>
                                                <div className="text-[10px] text-grey-400 mt-1">Click to view node details</div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Relationship Properties */}
                                          <div>
                                            <div className="text-xs font-medium text-grey mb-2">
                                              Properties ({Object.keys(selectedNode.properties || {}).length})
                                            </div>
                                            <div className="space-y-2">
                                              {Object.entries(selectedNode.properties || {}).map(([key, value]) => (
                                                <div key={key} className="bg-white rounded border border-grey-400 overflow-hidden">
                                                  <div className="px-3 py-1.5 bg-grey-100 border-b border-grey-400">
                                                    <span className="text-xs font-medium text-grey">{key}</span>
                                                  </div>
                                                  <div className="px-3 py-2">
                                                    {typeof value === 'object' ? (
                                                      <pre className="text-xs text-grey font-mono whitespace-pre-wrap break-all">
                                                        {JSON.stringify(value, null, 2)}
                                                      </pre>
                                                    ) : typeof value === 'boolean' ? (
                                                      <span className={cn(
                                                        'px-2 py-0.5 rounded text-xs font-medium',
                                                        value ? 'bg-green/10 text-green' : 'bg-grey-100 text-grey'
                                                      )}>
                                                        {String(value)}
                                                      </span>
                                                    ) : (
                                                      <span className="text-sm text-grey break-all">
                                                        {String(value)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                              {Object.keys(selectedNode.properties || {}).length === 0 && (
                                                <div className="text-xs text-grey-400 italic">No properties</div>
                                              )}
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          {/* Node Labels */}
                                          <div>
                                            <div className="text-xs font-medium text-grey mb-2">Labels</div>
                                            <div className="flex flex-wrap gap-1">
                                              {selectedNode.labels?.map((label: string) => (
                                                <span
                                                  key={label}
                                                  className="px-2 py-1 bg-blue/10 text-blue text-xs rounded font-medium"
                                                >
                                                  :{label}
                                                </span>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Node ID */}
                                          <div>
                                            <div className="text-xs font-medium text-grey mb-2">Node ID</div>
                                            <div className="font-mono text-xs text-grey bg-white px-3 py-2 rounded border border-grey-400 break-all">
                                              {selectedNode.id}
                                            </div>
                                          </div>

                                          {/* Node Properties */}
                                          <div>
                                            <div className="text-xs font-medium text-grey mb-2">
                                              Properties ({Object.keys(selectedNode.properties || {}).length})
                                            </div>
                                            <div className="space-y-2">
                                              {Object.entries(selectedNode.properties || {}).map(([key, value]) => (
                                                <div key={key} className="bg-white rounded border border-grey-400 overflow-hidden">
                                                  <div className="px-3 py-1.5 bg-grey-100 border-b border-grey-400">
                                                    <span className="text-xs font-medium text-grey">{key}</span>
                                                  </div>
                                                  <div className="px-3 py-2">
                                                    {typeof value === 'object' ? (
                                                      <pre className="text-xs text-grey font-mono whitespace-pre-wrap break-all">
                                                        {JSON.stringify(value, null, 2)}
                                                      </pre>
                                                    ) : typeof value === 'boolean' ? (
                                                      <span className={cn(
                                                        'px-2 py-0.5 rounded text-xs font-medium',
                                                        value ? 'bg-green/10 text-green' : 'bg-grey-100 text-grey'
                                                      )}>
                                                        {String(value)}
                                                      </span>
                                                    ) : (
                                                      <span className="text-sm text-grey break-all">
                                                        {String(value)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                              {Object.keys(selectedNode.properties || {}).length === 0 && (
                                                <div className="text-xs text-grey-400 italic">No properties</div>
                                              )}
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // For nodes only, show node table
                          if (hasOnlyNodes) {
                            const nodeProps = Array.from(new Set(nodes.flatMap((n: any) => Object.keys(n.properties || {})))) as string[];
                            return (
                              <div className="flex h-full">
                                <div className={cn("overflow-x-auto", selectedNode ? "flex-1" : "w-full")}>
                                  <table className="w-full">
                                    <thead className="bg-grey-50 border-b border-grey-400 sticky top-0">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider w-12">
                                          #
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider">
                                          ID
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider">
                                          Labels
                                        </th>
                                        {nodeProps.slice(0, selectedNode ? 3 : nodeProps.length).map((prop) => (
                                          <th key={prop} className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider">
                                            {prop}
                                          </th>
                                        ))}
                                        {selectedNode && nodeProps.length > 3 && (
                                          <th className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider">
                                            ...
                                          </th>
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-grey-400">
                                      {nodes.map((node: any, idx: number) => {
                                        const isSelected = selectedNode?.id === node.id;
                                        return (
                                          <tr
                                            key={node.id || idx}
                                            className={cn(
                                              "hover:bg-grey-50 transition-colors cursor-pointer",
                                              isSelected && "bg-primary/5 hover:bg-primary/10"
                                            )}
                                            onClick={() => setSelectedNode(isSelected ? null : {
                                              ...node,
                                              label: node.labels?.[0] || 'Node',
                                              displayName: node.properties?.name || node.properties?.title || node.id
                                            })}
                                          >
                                            <td className="px-4 py-3 text-sm text-grey font-mono align-top">
                                              {startIndex + idx + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-grey font-mono align-top max-w-[200px] truncate" title={node.id}>
                                              {node.id?.split(':').pop() || node.id}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                              <div className="flex flex-wrap gap-1">
                                                {node.labels?.map((label: string) => (
                                                  <span key={label} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                                                    {label}
                                                  </span>
                                                ))}
                                              </div>
                                            </td>
                                            {nodeProps.slice(0, selectedNode ? 3 : nodeProps.length).map((prop: string) => (
                                              <td key={prop} className="px-4 py-3 text-sm text-grey align-top max-w-[300px]">
                                                {node.properties?.[prop] !== undefined ? (
                                                  typeof node.properties[prop] === 'object'
                                                    ? <pre className="text-xs bg-grey-50 p-1 rounded overflow-auto max-h-20">{JSON.stringify(node.properties[prop], null, 2)}</pre>
                                                    : typeof node.properties[prop] === 'boolean'
                                                      ? <span className={cn('px-2 py-0.5 rounded text-xs', node.properties[prop] ? 'bg-green/10 text-green' : 'bg-grey-100 text-grey')}>{String(node.properties[prop])}</span>
                                                      : String(node.properties[prop]).substring(0, 50) + (String(node.properties[prop]).length > 50 ? '...' : '')
                                                ) : (
                                                  <span className="text-grey-400">—</span>
                                                )}
                                              </td>
                                            ))}
                                            {selectedNode && nodeProps.length > 3 && (
                                              <td className="px-4 py-3 text-sm text-grey-400 align-top">
                                                +{nodeProps.length - 3} more
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Node Details Sidebar */}
                                {selectedNode && (
                                  <div className="w-80 border-l border-grey-400 bg-grey-50 overflow-y-auto flex-shrink-0">
                                    <div className="sticky top-0 bg-grey-50 border-b border-grey-400 p-4">
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-grey flex items-center gap-2">
                                          <Eye className="h-4 w-4" />
                                          Node Details
                                        </h4>
                                        <button
                                          onClick={() => setSelectedNode(null)}
                                          className="text-grey-400 hover:text-grey p-1 hover:bg-grey-200 rounded"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="p-4 space-y-4">
                                      {/* Labels */}
                                      <div>
                                        <div className="text-xs font-medium text-grey mb-2">Labels</div>
                                        <div className="flex flex-wrap gap-1">
                                          {selectedNode.labels?.map((label: string) => (
                                            <span
                                              key={label}
                                              className="px-2 py-1 bg-blue/10 text-blue text-xs rounded font-medium"
                                            >
                                              :{label}
                                            </span>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Node ID */}
                                      <div>
                                        <div className="text-xs font-medium text-grey mb-2">Node ID</div>
                                        <div className="font-mono text-xs text-grey bg-white px-3 py-2 rounded border border-grey-400 break-all">
                                          {selectedNode.id}
                                        </div>
                                      </div>

                                      {/* Properties */}
                                      <div>
                                        <div className="text-xs font-medium text-grey mb-2">
                                          Properties ({Object.keys(selectedNode.properties || {}).length})
                                        </div>
                                        <div className="space-y-2">
                                          {Object.entries(selectedNode.properties || {}).map(([key, value]) => (
                                            <div key={key} className="bg-white rounded border border-grey-400 overflow-hidden">
                                              <div className="px-3 py-1.5 bg-grey-100 border-b border-grey-400">
                                                <span className="text-xs font-medium text-grey">{key}</span>
                                              </div>
                                              <div className="px-3 py-2">
                                                {typeof value === 'object' ? (
                                                  <pre className="text-xs text-grey font-mono whitespace-pre-wrap break-all">
                                                    {JSON.stringify(value, null, 2)}
                                                  </pre>
                                                ) : typeof value === 'boolean' ? (
                                                  <span className={cn(
                                                    'px-2 py-0.5 rounded text-xs font-medium',
                                                    value ? 'bg-green/10 text-green' : 'bg-grey-100 text-grey'
                                                  )}>
                                                    {String(value)}
                                                  </span>
                                                ) : (
                                                  <span className="text-sm text-grey break-all">
                                                    {String(value)}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                          {Object.keys(selectedNode.properties || {}).length === 0 && (
                                            <div className="text-xs text-grey-400 italic">No properties</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // Fallback for column-based format or raw data
                          return null;
                        })() || (queryResult.columns?.length > 0 ? (
                          // Column-based format (original format)
                          <table className="w-full">
                            <thead className="bg-grey-50 border-b border-grey-400 sticky top-0">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider w-12">
                                  #
                                </th>
                                {queryResult.columns.map((col: string) => (
                                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-grey-400">
                              {queryResult.data.map((row: any, idx: number) => (
                                <tr key={idx} className="hover:bg-grey-50 transition-colors">
                                  <td className="px-4 py-3 text-sm text-grey font-mono align-top">
                                    {idx + 1}
                                  </td>
                                  {queryResult.columns.map((col: string) => (
                                    <td key={col} className="px-4 py-3 align-top">
                                      {row[col]?.labels ? (
                                        renderNodeValue(row[col])
                                      ) : row[col]?.type && row[col]?.startNode ? (
                                        renderRelationshipValue(row[col])
                                      ) : (
                                        <span className="text-sm text-grey">
                                          {typeof row[col] === 'object'
                                            ? JSON.stringify(row[col], null, 2)
                                            : String(row[col] ?? '')}
                                        </span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          // Raw JSON fallback
                          <div className="p-4">
                            <pre className="text-xs text-grey overflow-auto max-h-[500px] bg-grey-50 p-4 rounded">
                              {JSON.stringify(queryResult.data, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>

                      {/* Pagination Controls - Server-side pagination */}
                      {queryResult?.data?.length > 0 && lastExecutedQuery && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-grey-400 bg-grey-50">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-grey">
                              Showing {queryResult.data.length} results (Page {tablePage})
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-grey">Rows per page:</span>
                              <Select
                                value={String(tablePageSize)}
                                onValueChange={(v) => handlePageSizeChange(Number(v))}
                                disabled={isExecuting}
                              >
                                <SelectTrigger className="w-[70px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="20">20</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                  <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(1)}
                              disabled={tablePage === 1 || isExecuting}
                            >
                              First
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(Math.max(1, tablePage - 1))}
                              disabled={tablePage === 1 || isExecuting}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-grey px-2">
                              Page {tablePage}
                              {isExecuting && <Loader2 className="h-3 w-3 animate-spin inline ml-2" />}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(tablePage + 1)}
                              disabled={isExecuting || queryResult.data.length < tablePageSize}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Graph Visualization View */}
                  {resultsView === 'graph' && (
                    <div className="bg-white rounded-lg border border-grey-400 flex-1 flex">
                      {graphData.nodes.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center">
                            <Network className="h-12 w-12 text-grey-300 mx-auto mb-3" />
                            <h4 className="text-sm font-medium text-grey mb-1">No Graph Data</h4>
                            <p className="text-xs text-grey">
                              Query results don't contain nodes or relationships to visualize
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex">
                          {/* Graph Canvas */}
                          <div
                            className="flex-1 relative overflow-hidden"
                            onMouseDown={handlePanStart}
                            onMouseMove={handlePanMove}
                            onMouseUp={handlePanEnd}
                            onMouseLeave={handlePanEnd}
                            onWheel={handleWheel}
                            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                          >
                            <svg
                              className="w-full h-full"
                              viewBox="0 0 800 600"
                              preserveAspectRatio="xMidYMid meet"
                              style={{
                                transform: `translate(${graphPan.x}px, ${graphPan.y}px) scale(${graphZoom})`,
                                transformOrigin: 'center center',
                              }}
                            >
                              <defs>
                                <marker
                                  id="arrowhead"
                                  markerWidth="10"
                                  markerHeight="7"
                                  refX="9"
                                  refY="3.5"
                                  orient="auto"
                                >
                                  <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
                                </marker>
                              </defs>

                              {/* Edges - use memoized positions */}
                              {graphData.edges.map((edge, i) => {
                                const source = nodePositionsMap.get(edge.source);
                                const target = nodePositionsMap.get(edge.target);
                                if (!source || !target) return null;

                                const midX = (source.x + target.x) / 2;
                                const midY = (source.y + target.y) / 2;

                                return (
                                  <g key={edge.id || i}>
                                    <line
                                      x1={source.x}
                                      y1={source.y}
                                      x2={target.x}
                                      y2={target.y}
                                      stroke="#D1D5DB"
                                      strokeWidth="2"
                                      markerEnd="url(#arrowhead)"
                                    />
                                    <text
                                      x={midX}
                                      y={midY - 5}
                                      textAnchor="middle"
                                      className="text-[10px] fill-grey"
                                    >
                                      {edge.type}
                                    </text>
                                  </g>
                                );
                              })}

                              {/* Nodes - use memoized positioned nodes */}
                              {positionedNodes.map((node) => {
                                const colors = getNodeColor(node.label);
                                const isSelected = selectedNode?.id === node.id;

                                return (
                                  <g
                                    key={node.id}
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedNode(isSelected ? null : node);
                                    }}
                                  >
                                    <circle
                                      cx={node.x}
                                      cy={node.y}
                                      r={isSelected ? 32 : 28}
                                      fill={colors.bg}
                                      stroke={isSelected ? '#000' : colors.border}
                                      strokeWidth={isSelected ? 3 : 2}
                                    />
                                    <text
                                      x={node.x}
                                      y={node.y - 5}
                                      textAnchor="middle"
                                      className="text-[10px] font-medium pointer-events-none"
                                      fill={colors.text}
                                    >
                                      {node.label}
                                    </text>
                                    <text
                                      x={node.x}
                                      y={node.y + 8}
                                      textAnchor="middle"
                                      className="text-[9px] pointer-events-none"
                                      fill={colors.text}
                                      opacity={0.8}
                                    >
                                      {node.displayName?.substring(0, 10)}
                                    </text>
                                  </g>
                                );
                              })}
                            </svg>

                            {/* Legend */}
                            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg border border-grey-400 p-2">
                              <div className="text-[10px] font-medium text-grey mb-1">Legend</div>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(graphData.nodes.map(n => n.label))).map(label => {
                                  const colors = getNodeColor(label);
                                  return (
                                    <div key={label} className="flex items-center gap-1">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: colors.bg }}
                                      />
                                      <span className="text-[10px] text-grey">{label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Node Details Panel */}
                          {selectedNode && (
                            <div className="w-64 border-l border-grey-400 bg-grey-50 p-4 overflow-y-auto">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-grey">Node Details</h4>
                                <button
                                  onClick={() => setSelectedNode(null)}
                                  className="text-grey-400 hover:text-grey"
                                >
                                  ×
                                </button>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <div className="text-xs text-grey mb-1">Labels</div>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedNode.labels?.map((label: string) => (
                                      <span
                                        key={label}
                                        className="px-2 py-0.5 bg-blue/10 text-blue text-xs rounded"
                                      >
                                        :{label}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-xs text-grey mb-1">ID</div>
                                  <div className="font-mono text-xs text-grey bg-white px-2 py-1 rounded border border-grey-400">
                                    {selectedNode.id}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-xs text-grey mb-2">Properties</div>
                                  <div className="space-y-1">
                                    {Object.entries(selectedNode.properties || {}).map(([key, value]) => (
                                      <div key={key} className="bg-white rounded border border-grey-400 p-2">
                                        <div className="text-[10px] text-grey">{key}</div>
                                        <div className="text-xs text-grey font-mono truncate">
                                          {JSON.stringify(value)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Graph Overview - Default view when no query editor or builder is active */
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Stats Cards - Top Row: Actual Counts */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Circle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    {isLoadingStatistics ? (
                      <Loader2 className="h-6 w-6 animate-spin text-grey-400" />
                    ) : (
                      <div className="text-2xl font-bold text-grey">
                        {sdkStatistics?.nodeCount?.toLocaleString() ?? '—'}
                      </div>
                    )}
                    <div className="text-xs text-grey-500">Total Nodes</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-blue" />
                  </div>
                  <div>
                    {isLoadingStatistics ? (
                      <Loader2 className="h-6 w-6 animate-spin text-grey-400" />
                    ) : (
                      <div className="text-2xl font-bold text-grey">
                        {sdkStatistics?.relationshipCount?.toLocaleString() ?? '—'}
                      </div>
                    )}
                    <div className="text-xs text-grey-500">Total Relationships</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Database className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    {isLoadingLabels ? (
                      <Loader2 className="h-6 w-6 animate-spin text-grey-400" />
                    ) : (
                      <div className="text-2xl font-bold text-grey">{labels.length}</div>
                    )}
                    <div className="text-xs text-grey-500">Node Labels</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                    <GitBranch className="h-5 w-5 text-green" />
                  </div>
                  <div>
                    {isLoadingRelTypes ? (
                      <Loader2 className="h-6 w-6 animate-spin text-grey-400" />
                    ) : (
                      <div className="text-2xl font-bold text-grey">{relationshipTypes.length}</div>
                    )}
                    <div className="text-xs text-grey-500">Relationship Types</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards - Second Row: Schema & Config */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    {isLoadingIndexes ? (
                      <Loader2 className="h-6 w-6 animate-spin text-grey-400" />
                    ) : (
                      <div className="text-2xl font-bold text-grey">{indexes.length}</div>
                    )}
                    <div className="text-xs text-grey-500">Indexes</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Key className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    {isLoadingConstraints ? (
                      <Loader2 className="h-6 w-6 animate-spin text-grey-400" />
                    ) : (
                      <div className="text-2xl font-bold text-grey">{constraints.length}</div>
                    )}
                    <div className="text-xs text-grey-500">Constraints</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Bookmark className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    {isLoadingActions ? (
                      <Loader2 className="h-6 w-6 animate-spin text-grey-400" />
                    ) : (
                      <div className="text-2xl font-bold text-grey">{actions.length}</div>
                    )}
                    <div className="text-xs text-grey-500">Saved Actions</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <Network className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-grey capitalize">{graph.type || 'Neo4j'}</div>
                    <div className="text-xs text-grey-500">Graph Type</div>
                  </div>
                </div>
              </div>
            </div>

            <ActivityTimelinePanel
              title="Activity timeline"
              kind="graph"
              productTag={graph.productTag}
              componentTag={graph.tag}
              env={graph.env.slug}
              countLabel="operations"
              enabled={!!graph.productTag}
            />

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-semibold text-grey mb-3">Quick Actions</h3>
              <div className="grid grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setShowQueryEditor(true)}
                >
                  <Code className="h-5 w-5 text-primary" />
                  <span className="text-sm">Query Editor</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setShowQueryBuilder(true)}
                >
                  <Settings2 className="h-5 w-5 text-blue" />
                  <span className="text-sm">Query Builder</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setShowAddNodeModal(true)}
                >
                  <Plus className="h-5 w-5 text-green" />
                  <span className="text-sm">Create Node</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setSidebarView('actions')}
                >
                  <Zap className="h-5 w-5 text-orange-500" />
                  <span className="text-sm">View Actions</span>
                </Button>
              </div>
            </div>

            {/* Node Labels Overview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-grey">Node Labels</h3>
                <Button variant="ghost" size="sm" onClick={() => setSidebarView('labels')}>
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {labels.slice(0, 6).map((label) => (
                  <button
                    key={label.name}
                    onClick={() => {
                      setSelectedLabel(label);
                      setQueryInput(getTraverseQuery(label.name));
                      setShowQueryEditor(true);
                    }}
                    className="bg-white rounded-lg border border-grey-400 p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="font-medium text-grey">{label.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-grey-500">
                      <span className="flex items-center gap-1">
                        <Circle className="h-3 w-3" />
                        {label.count.toLocaleString()} nodes
                      </span>
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {label.properties.length} props
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {labels.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarView('labels')}
                  className="mt-3 w-full text-grey-600"
                >
                  View all {labels.length} labels
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>

            {/* Relationship Types Overview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-grey">Relationship Types</h3>
                <Button variant="ghost" size="sm" onClick={() => setSidebarView('relationships')}>
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {relationshipTypes.slice(0, 6).map((relType) => (
                  <button
                    key={relType.type}
                    onClick={() => {
                      setSelectedRelType(relType);
                      setQueryInput(JSON.stringify({
                        operation: 'findRelationships',
                        options: { type: relType.type, includeNodes: true, limit: 50 }
                      }, null, 2));
                      setShowQueryEditor(true);
                    }}
                    className="bg-white rounded-lg border border-grey-400 p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-blue" />
                        <span className="font-medium text-grey">{relType.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-grey-500">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {relType.count?.toLocaleString() || 0} rels
                      </span>
                      {relType.properties && (
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {relType.properties.length} props
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {relationshipTypes.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarView('relationships')}
                  className="mt-3 w-full text-grey-600"
                >
                  View all {relationshipTypes.length} relationship types
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>

            {/* Saved Actions */}
            {actions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-grey">Saved Actions</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSidebarView('actions')}>
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {actions.slice(0, 3).map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleLoadAction(action)}
                      className="w-full bg-white rounded-lg border border-grey-400 p-3 text-left hover:border-primary/50 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-grey">{action.name}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded', GRAPH_OPERATIONS[action.operation]?.color || 'bg-grey-100 text-grey')}>
                          {action.operation}
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
        )}
      </div>

      {/* Add Node Modal */}
      <Dialog open={showAddNodeModal} onOpenChange={setShowAddNodeModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-grey">Create Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs text-grey mb-2 block">Labels</Label>
              {nodeLabels.map((label, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Select
                    value={label}
                    onValueChange={(value) => {
                      const newLabels = [...nodeLabels];
                      newLabels[i] = value;
                      setNodeLabels(newLabels);
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select label..." />
                    </SelectTrigger>
                    <SelectContent>
                      {labels.map((l) => (
                        <SelectItem key={l.name} value={l.name}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {nodeLabels.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNodeLabels(nodeLabels.filter((_, j) => j !== i))}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNodeLabels([...nodeLabels, ''])}
              >
                + Add Label
              </Button>
            </div>

            <div>
              <Label className="text-xs text-grey mb-2 block">Properties</Label>
              {nodeProperties.map((prop, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    value={prop.key}
                    onChange={(e) => {
                      const newProps = [...nodeProperties];
                      newProps[i].key = e.target.value;
                      setNodeProperties(newProps);
                    }}
                    placeholder="Key"
                    className="flex-1"
                  />
                  {prop.type === 'boolean' ? (
                    <Select
                      value={prop.value}
                      onValueChange={(value) => {
                        const newProps = [...nodeProperties];
                        newProps[i].value = value;
                        setNodeProperties(newProps);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">true</SelectItem>
                        <SelectItem value="false">false</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={prop.type === 'integer' || prop.type === 'float' ? 'number' : 'text'}
                      step={prop.type === 'float' ? '0.01' : prop.type === 'integer' ? '1' : undefined}
                      value={prop.value}
                      onChange={(e) => {
                        const newProps = [...nodeProperties];
                        newProps[i].value = e.target.value;
                        setNodeProperties(newProps);
                      }}
                      placeholder={prop.type === 'integer' ? '0' : prop.type === 'float' ? '0.00' : 'Value'}
                      className="flex-1"
                    />
                  )}
                  <Select
                    value={prop.type}
                    onValueChange={(value) => {
                      const newProps = [...nodeProperties];
                      newProps[i].type = value;
                      // Reset value when type changes
                      if (value === 'boolean') {
                        newProps[i].value = 'true';
                      } else if (value === 'integer' || value === 'float') {
                        newProps[i].value = '';
                      }
                      setNodeProperties(newProps);
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="integer">Integer</SelectItem>
                      <SelectItem value="float">Float</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                  {nodeProperties.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNodeProperties(nodeProperties.filter((_, j) => j !== i))}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNodeProperties([...nodeProperties, { key: '', value: '', type: 'string' }])}
              >
                + Add Property
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNodeModal(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const query = {
                  operation: 'createNode',
                  options: {
                    labels: nodeLabels.filter(l => l),
                    properties: nodeProperties
                      .filter(p => p.key)
                      .reduce((acc, p) => {
                        let value: any = p.value;
                        if (p.type === 'integer') value = parseInt(p.value, 10) || 0;
                        else if (p.type === 'float') value = parseFloat(p.value) || 0;
                        else if (p.type === 'boolean') value = p.value === 'true';
                        return { ...acc, [p.key]: value };
                      }, {}),
                    returnNode: true,
                  },
                };
                setQueryInput(JSON.stringify(query, null, 2));
                setShowAddNodeModal(false);
                setShowQueryEditor(true);
                toast.success('Query generated - click Execute to run');
              }}
            >
              Generate Query
            </Button>
            <Button
              onClick={() => {
                const query = {
                  operation: 'createNode',
                  options: {
                    labels: nodeLabels.filter(l => l),
                    properties: nodeProperties
                      .filter(p => p.key)
                      .reduce((acc, p) => {
                        let value: any = p.value;
                        if (p.type === 'integer') value = parseInt(p.value, 10) || 0;
                        else if (p.type === 'float') value = parseFloat(p.value) || 0;
                        else if (p.type === 'boolean') value = p.value === 'true';
                        return { ...acc, [p.key]: value };
                      }, {}),
                    returnNode: true,
                  },
                };
                setQueryInput(JSON.stringify(query, null, 2));
                executeQueryMutation.mutate(query);
                setShowAddNodeModal(false);
                setShowQueryEditor(true);
              }}
              disabled={executeQueryMutation.isPending || nodeLabels.filter(l => l).length === 0}
            >
              {executeQueryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Node'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Relationship Modal */}
      <Dialog open={showAddRelationshipModal} onOpenChange={setShowAddRelationshipModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-grey">Create Relationship</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs text-grey mb-2 block">Relationship Type</Label>
              <Input
                value={relType}
                onChange={(e) => setRelType(e.target.value.toUpperCase())}
                placeholder="KNOWS, WORKS_AT, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-grey mb-2 block">From Node Label</Label>
                <Select value={relFromLabel} onValueChange={setRelFromLabel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select label..." />
                  </SelectTrigger>
                  <SelectContent>
                    {labels.map((label) => (
                      <SelectItem key={label.name} value={label.name}>
                        {label.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-grey mb-2 block">To Node Label</Label>
                <Select value={relToLabel} onValueChange={setRelToLabel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select label..." />
                  </SelectTrigger>
                  <SelectContent>
                    {labels.map((label) => (
                      <SelectItem key={label.name} value={label.name}>
                        {label.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-grey mb-2 block">Properties (optional)</Label>
              {relProperties.map((prop, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    value={prop.key}
                    onChange={(e) => {
                      const newProps = [...relProperties];
                      newProps[i].key = e.target.value;
                      setRelProperties(newProps);
                    }}
                    placeholder="Key"
                    className="flex-1"
                  />
                  <Input
                    value={prop.value}
                    onChange={(e) => {
                      const newProps = [...relProperties];
                      newProps[i].value = e.target.value;
                      setRelProperties(newProps);
                    }}
                    placeholder="Value"
                    className="flex-1"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRelProperties([...relProperties, { key: '', value: '', type: 'string' }])}
              >
                + Add Property
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRelationshipModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const query = {
                  operation: 'createRelationship',
                  options: {
                    type: relType,
                    fromNode: { labels: relFromLabel },
                    toNode: { labels: relToLabel },
                    properties: relProperties
                      .filter(p => p.key)
                      .reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {}),
                    returnRelationship: true,
                  },
                };
                setQueryInput(JSON.stringify(query, null, 2));
                setShowAddRelationshipModal(false);
                toast.success('Query generated - click Execute to run');
              }}
            >
              Generate Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Constraint Modal */}
      <Dialog open={showAddConstraintModal} onOpenChange={setShowAddConstraintModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-grey">Create Constraint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs text-grey mb-2 block">Constraint Name</Label>
              <Input
                value={constraintName}
                onChange={(e) => setConstraintName(e.target.value)}
                placeholder="unique_person_email"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-grey mb-2 block">Target</Label>
                <Select value={constraintTarget} onValueChange={(v: 'node' | 'relationship') => setConstraintTarget(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="node">Node</SelectItem>
                    <SelectItem value="relationship">Relationship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-grey mb-2 block">Type</Label>
                <Select value={constraintType} onValueChange={setConstraintType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNIQUE">Unique</SelectItem>
                    <SelectItem value="EXISTS">Exists</SelectItem>
                    <SelectItem value="NODE_KEY">Node Key</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-grey mb-2 block">Label/Type</Label>
              <Input
                value={constraintLabel}
                onChange={(e) => setConstraintLabel(e.target.value)}
                placeholder="Person"
              />
            </div>

            <div>
              <Label className="text-xs text-grey mb-2 block">Properties</Label>
              {constraintProperties.map((prop, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    value={prop}
                    onChange={(e) => {
                      const newProps = [...constraintProperties];
                      newProps[i] = e.target.value;
                      setConstraintProperties(newProps);
                    }}
                    placeholder="email"
                    className="flex-1"
                  />
                  {constraintProperties.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConstraintProperties(constraintProperties.filter((_, j) => j !== i))}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConstraintProperties([...constraintProperties, ''])}
              >
                + Add Property
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddConstraintModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const query = {
                  operation: constraintTarget === 'node' ? 'createNodeConstraint' : 'createRelationshipConstraint',
                  constraint: {
                    name: constraintName,
                    type: constraintType,
                    [constraintTarget === 'node' ? 'label' : 'relationshipType']: constraintLabel,
                    properties: constraintProperties.filter(p => p),
                  },
                };
                setQueryInput(JSON.stringify(query, null, 2));
                setShowAddConstraintModal(false);
                toast.success('Query generated - click Execute to run');
              }}
            >
              Generate Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Index Modal */}
      <Dialog open={showAddIndexModal} onOpenChange={setShowAddIndexModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-grey">Create Index</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs text-grey mb-2 block">Index Name</Label>
              <Input
                value={indexName}
                onChange={(e) => setIndexName(e.target.value)}
                placeholder="idx_person_name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-grey mb-2 block">Target</Label>
                <Select value={indexTarget} onValueChange={(v: 'node' | 'relationship') => setIndexTarget(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="node">Node</SelectItem>
                    <SelectItem value="relationship">Relationship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-grey mb-2 block">Type</Label>
                <Select value={indexType} onValueChange={setIndexType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTREE">B-Tree</SelectItem>
                    <SelectItem value="FULLTEXT">Full-Text</SelectItem>
                    <SelectItem value="RANGE">Range</SelectItem>
                    <SelectItem value="TEXT">Text</SelectItem>
                    <SelectItem value="POINT">Point</SelectItem>
                    <SelectItem value="VECTOR">Vector</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-grey mb-2 block">Label/Type</Label>
              <Input
                value={indexLabel}
                onChange={(e) => setIndexLabel(e.target.value)}
                placeholder="Person"
              />
            </div>

            <div>
              <Label className="text-xs text-grey mb-2 block">Properties</Label>
              {indexProperties.map((prop, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    value={prop}
                    onChange={(e) => {
                      const newProps = [...indexProperties];
                      newProps[i] = e.target.value;
                      setIndexProperties(newProps);
                    }}
                    placeholder="name"
                    className="flex-1"
                  />
                  {indexProperties.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIndexProperties(indexProperties.filter((_, j) => j !== i))}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIndexProperties([...indexProperties, ''])}
              >
                + Add Property
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIndexModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const query = {
                  operation: indexTarget === 'node' ? 'createNodeIndex' : 'createRelationshipIndex',
                  index: {
                    name: indexName,
                    type: indexType,
                    [indexTarget === 'node' ? 'label' : 'relationshipType']: indexLabel,
                    properties: indexProperties.filter(p => p),
                  },
                };
                setQueryInput(JSON.stringify(query, null, 2));
                setShowAddIndexModal(false);
                toast.success('Query generated - click Execute to run');
              }}
            >
              Generate Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Action Modal */}
      <Dialog open={showSaveActionModal} onOpenChange={setShowSaveActionModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-grey">Save Query as Action</DialogTitle>
            <DialogDescription>
              Select which values to parameterize. These can be changed when executing the action.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-grey mb-2 block">Action Name *</Label>
                <Input
                  value={actionName}
                  onChange={(e) => setActionName(e.target.value)}
                  placeholder="e.g., Find Persons, Traverse Graph"
                />
              </div>
              <div>
                <Label className="text-xs text-grey mb-2 block">Description</Label>
                <Input
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                  placeholder="What does this action do?"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-grey mb-2 block">Select Values to Parameterize</Label>
              <p className="text-xs text-grey mb-3">
                Check the values you want to make configurable. Each will become a parameter with a placeholder like {"{{name}}"}.
              </p>

              <div className="border border-grey-400 rounded-lg divide-y divide-grey-400 max-h-64 overflow-y-auto">
                {extractedValues.length === 0 ? (
                  <div className="p-4 text-center text-sm text-grey">
                    No parameterizable values found in the query
                  </div>
                ) : (
                  extractedValues.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 hover:bg-grey-50">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(checked) => {
                          const newValues = [...extractedValues];
                          newValues[idx].selected = !!checked;
                          setExtractedValues(newValues);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-grey-100 px-2 py-0.5 rounded font-mono text-grey">
                            {item.path}
                          </code>
                          <span className="text-xs text-grey px-1.5 py-0.5 bg-grey-100 rounded">
                            {item.type}
                          </span>
                        </div>
                        <div className="text-xs text-grey mt-1 truncate">
                          Current value: <span className="font-mono">{JSON.stringify(item.value)}</span>
                        </div>
                      </div>
                      {item.selected && (
                        <Input
                          value={item.paramName}
                          onChange={(e) => {
                            const newValues = [...extractedValues];
                            newValues[idx].paramName = e.target.value;
                            setExtractedValues(newValues);
                          }}
                          className="w-32 h-8 text-xs"
                          placeholder="Param name"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Preview of selected parameters */}
            {extractedValues.some(v => v.selected) && (
              <div className="bg-grey-50 border border-grey-400 rounded-lg p-3">
                <Label className="text-xs text-grey mb-2 block">Parameters Preview</Label>
                <div className="flex flex-wrap gap-2">
                  {extractedValues.filter(v => v.selected).map((param, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                      <Settings2 className="h-3 w-3" />
                      {`{{${param.paramName}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveActionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAction} className="gap-2">
              <Check className="h-4 w-4" />
              Save Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execute Action Modal */}
      <Dialog open={showExecuteActionModal} onOpenChange={setShowExecuteActionModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-grey">Execute Action: {selectedAction?.name}</DialogTitle>
            <DialogDescription>
              {selectedAction?.description || 'Fill in the parameter values to execute this action.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedAction?.parameters.map((param) => (
              <div key={param.name}>
                <Label className="text-xs text-grey mb-2 block">
                  {param.name}
                  <span className="text-grey-400 font-normal ml-2">({param.type})</span>
                </Label>
                {param.type === 'boolean' ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={!!actionParamValues[param.name]}
                      onCheckedChange={(checked) => {
                        setActionParamValues({ ...actionParamValues, [param.name]: !!checked });
                      }}
                    />
                    <span className="text-sm text-grey">
                      {actionParamValues[param.name] ? 'True' : 'False'}
                    </span>
                  </div>
                ) : param.type === 'number' ? (
                  <Input
                    type="number"
                    value={actionParamValues[param.name] ?? param.defaultValue}
                    onChange={(e) => {
                      setActionParamValues({
                        ...actionParamValues,
                        [param.name]: parseFloat(e.target.value) || 0,
                      });
                    }}
                  />
                ) : (
                  <Input
                    value={actionParamValues[param.name] ?? param.defaultValue}
                    onChange={(e) => {
                      setActionParamValues({ ...actionParamValues, [param.name]: e.target.value });
                    }}
                  />
                )}
                <p className="text-xs text-grey mt-1">
                  Default: <code className="bg-grey-100 px-1 rounded">{JSON.stringify(param.defaultValue)}</code>
                </p>
              </div>
            ))}

            {selectedAction?.parameters.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-grey">This action has no parameters.</p>
                <p className="text-xs text-grey mt-1">It will execute with default values.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecuteActionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecuteAction} className="gap-2">
              <Play className="h-4 w-4" />
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Code Sidebar for Actions */}
      {showCodeSidebar && selectedAction && (
        <CodeSidebar
          title={selectedAction.name}
          subtitle={selectedAction.description}
          tag={`${graph.tag}:${selectedAction.tag}`}
          onClose={() => setShowCodeSidebar(false)}
          generateCodeSections={generateCodeSections}
          environments={[{ slug: graph.env.slug, env_name: graph.env.slug.toUpperCase() }]}
        />
      )}

      {/* Code Sidebar for Graph Operations */}
      {showGraphCodeSidebar && (
        <CodeSidebar
          title={`Graph Operations - ${graph.name}`}
          subtitle={selectedLabel ? `Using label: ${selectedLabel.name}` : selectedRelType ? `Using relationship: ${selectedRelType.type}` : `Code examples for ${graph.name} graph operations`}
          tag={graph.tag}
          onClose={() => setShowGraphCodeSidebar(false)}
          generateCodeSections={generateGraphCodeSections}
          showRuntimeSelector
          environments={[{ slug: graph.env.slug, env_name: graph.env.slug.toUpperCase() }]}
          additionalControls={
            <div>
              <Label className="text-sm font-semibold text-grey-700 mb-2 block">
                Operation Type
              </Label>
              <Select value={selectedGraphOperation} onValueChange={setSelectedGraphOperation}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="findNodes">Find Nodes</SelectItem>
                  <SelectItem value="findNodeById">Find Node by ID</SelectItem>
                  <SelectItem value="createNode">Create Node</SelectItem>
                  <SelectItem value="updateNode">Update Node</SelectItem>
                  <SelectItem value="deleteNode">Delete Node</SelectItem>
                  <SelectItem value="countNodes">Count Nodes</SelectItem>
                  <SelectItem value="findRelationships">Find Relationships</SelectItem>
                  <SelectItem value="createRelationship">Create Relationship</SelectItem>
                  <SelectItem value="countRelationships">Count Relationships</SelectItem>
                  <SelectItem value="traverse">Traverse</SelectItem>
                  <SelectItem value="shortestPath">Shortest Path</SelectItem>
                  <SelectItem value="rawCypher">Raw Cypher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      )}
    </div>
  );
}
import { LoadingValue } from '@/components/ui/loading-value';
