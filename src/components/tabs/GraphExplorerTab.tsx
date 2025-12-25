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
  Hash,
} from 'lucide-react';
// Import SDK types for graph operations
import type {
  IGraphAction,
  IGraphActionParameter,
  GraphActionParameterType,
  IGraphLabel,
  IGraphLabelProperty,
  GraphPropertyType,
  IGraphRelationshipType,
  IGraphIndex,
  IGraphConstraint,
} from '@ductape/sdk';
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
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import CodeSidebar from '@/components/CodeSidebar';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface GraphExplorerTabProps {
  graph: {
    name: string;
    tag: string;
    type: string;
    env: {
      slug: string;
      connection_url: string;
      database?: string;
      graphName?: string;
      region?: string;
    };
  };
}

type SidebarView = 'labels' | 'relationships' | 'constraints' | 'indexes' | 'actions';

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

// IGraphAction is now imported from SDK

// Helper function to generate tag from name
const generateActionTag = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Sample saved actions
const DUMMY_ACTIONS: IGraphAction[] = [
  {
    id: 'action_1',
    tag: 'find-persons',
    name: 'Find Persons',
    description: 'Find persons with configurable limit and skip',
    operation: 'findNodes',
    query: {
      operation: 'findNodes',
      options: {
        labels: ['Person'],
        limit: '{{limit}}',
        skip: '{{skip}}',
        orderBy: { property: 'name', direction: '{{direction}}' }
      }
    },
    parameters: [
      { name: 'limit', path: 'options.limit', defaultValue: 25, type: 'number' },
      { name: 'skip', path: 'options.skip', defaultValue: 0, type: 'number' },
      { name: 'direction', path: 'options.orderBy.direction', defaultValue: 'ASC', type: 'string' },
    ],
    createdAt: '2024-03-01T10:30:00Z',
  },
  {
    id: 'action_2',
    tag: 'traverse-from-company',
    name: 'Traverse from Company',
    description: 'Traverse graph starting from Company nodes',
    operation: 'traverse',
    query: {
      operation: 'traverse',
      options: {
        startNode: { labels: ['Company'] },
        direction: '{{direction}}',
        maxDepth: '{{maxDepth}}',
        limit: '{{limit}}'
      }
    },
    parameters: [
      { name: 'direction', path: 'options.direction', defaultValue: 'OUTBOUND', type: 'string' },
      { name: 'maxDepth', path: 'options.maxDepth', defaultValue: 2, type: 'number' },
      { name: 'limit', path: 'options.limit', defaultValue: 25, type: 'number' },
    ],
    createdAt: '2024-03-05T14:15:00Z',
  },
  {
    id: 'action_3',
    tag: 'find-knows-relationships',
    name: 'Find KNOWS Relationships',
    description: 'Find KNOWS relationships between persons',
    operation: 'findRelationships',
    query: {
      operation: 'findRelationships',
      options: {
        type: 'KNOWS',
        limit: '{{limit}}',
        includeNodes: '{{includeNodes}}'
      }
    },
    parameters: [
      { name: 'limit', path: 'options.limit', defaultValue: 50, type: 'number' },
      { name: 'includeNodes', path: 'options.includeNodes', defaultValue: true, type: 'boolean' },
    ],
    createdAt: '2024-03-10T09:45:00Z',
  },
];

// Property types and label definitions now imported from SDK (GraphPropertyType, IGraphLabelProperty, IGraphLabel)

// Dummy data for graph schema based on SDK types
const DUMMY_LABELS: IGraphLabel[] = [
  {
    name: 'Person',
    count: 1247,
    color: 'bg-blue',
    properties: [
      { name: 'name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'age', type: 'number' },
      { name: 'isActive', type: 'boolean' },
      { name: 'birthDate', type: 'date' },
      { name: 'createdAt', type: 'datetime' },
    ]
  },
  {
    name: 'Company',
    count: 532,
    color: 'bg-green',
    properties: [
      { name: 'name', type: 'string' },
      { name: 'companyId', type: 'string' },
      { name: 'industry', type: 'string' },
      { name: 'employeeCount', type: 'number' },
      { name: 'isPublic', type: 'boolean' },
      { name: 'location', type: 'point' },
      { name: 'foundedAt', type: 'date' },
    ]
  },
  {
    name: 'Product',
    count: 2891,
    color: 'bg-purple-500',
    properties: [
      { name: 'name', type: 'string' },
      { name: 'sku', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'price', type: 'number' },
      { name: 'quantity', type: 'number' },
      { name: 'isAvailable', type: 'boolean' },
      { name: 'tags', type: 'array' },
    ]
  },
  {
    name: 'Location',
    count: 456,
    color: 'bg-orange-500',
    properties: [
      { name: 'name', type: 'string' },
      { name: 'city', type: 'string' },
      { name: 'country', type: 'string' },
      { name: 'coordinates', type: 'point' },
      { name: 'population', type: 'number' },
    ]
  },
  {
    name: 'Order',
    count: 8934,
    color: 'bg-pink-500',
    properties: [
      { name: 'orderId', type: 'string' },
      { name: 'totalAmount', type: 'number' },
      { name: 'status', type: 'string' },
      { name: 'isPaid', type: 'boolean' },
      { name: 'orderDate', type: 'datetime' },
      { name: 'items', type: 'array' },
    ]
  },
  {
    name: 'Category',
    count: 67,
    color: 'bg-yellow-500',
    properties: [
      { name: 'name', type: 'string' },
      { name: 'slug', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'isActive', type: 'boolean' },
    ]
  },
];

const DUMMY_RELATIONSHIPS: IGraphRelationshipType[] = [
  { type: 'KNOWS', count: 3456, fromLabels: ['Person'], toLabels: ['Person'] },
  { type: 'WORKS_AT', count: 1234, fromLabels: ['Person'], toLabels: ['Company'] },
  { type: 'PURCHASED', count: 8934, fromLabels: ['Person'], toLabels: ['Product'] },
  { type: 'LOCATED_IN', count: 988, fromLabels: ['Company'], toLabels: ['Location'] },
  { type: 'BELONGS_TO', count: 2891, fromLabels: ['Product'], toLabels: ['Category'] },
  { type: 'CONTAINS', count: 12453, fromLabels: ['Order'], toLabels: ['Product'] },
];

const DUMMY_CONSTRAINTS: IGraphConstraint[] = [
  { name: 'person_email_unique', type: 'UNIQUE', label: 'Person', property: 'email' },
  { name: 'company_id_unique', type: 'UNIQUE', label: 'Company', property: 'companyId' },
  { name: 'product_sku_unique', type: 'UNIQUE', label: 'Product', property: 'sku' },
  { name: 'person_email_exists', type: 'EXISTS', label: 'Person', property: 'email' },
];

const DUMMY_INDEXES: IGraphIndex[] = [
  { name: 'person_name_index', type: 'RANGE', labelOrType: 'Person', properties: ['name'], unique: false, state: 'ONLINE' },
  { name: 'product_search_index', type: 'FULLTEXT', labelOrType: 'Product', properties: ['name', 'description'], unique: false, state: 'ONLINE' },
  { name: 'company_location_index', type: 'POINT', labelOrType: 'Company', properties: ['location'], unique: false, state: 'ONLINE' },
  { name: 'person_vector_index', type: 'VECTOR', labelOrType: 'Person', properties: ['embedding'], unique: false, state: 'POPULATING' },
];

// Sample query results based on SDK IGraphQueryResult
const SAMPLE_QUERY_RESULTS = {
  success: true,
  executionTime: 42,
  columns: ['n', 'r', 'm'],
  count: 5,
  data: [
    {
      n: { id: '1', labels: ['Person'], properties: { name: 'Alice Johnson', email: 'alice@example.com', age: 32 } },
      r: { id: 'r1', type: 'KNOWS', startNode: '1', endNode: '2', properties: { since: '2020-01-15' } },
      m: { id: '2', labels: ['Person'], properties: { name: 'Bob Smith', email: 'bob@example.com', age: 28 } },
    },
    {
      n: { id: '1', labels: ['Person'], properties: { name: 'Alice Johnson', email: 'alice@example.com', age: 32 } },
      r: { id: 'r2', type: 'WORKS_AT', startNode: '1', endNode: '3', properties: { role: 'Engineer', since: '2019-06-01' } },
      m: { id: '3', labels: ['Company'], properties: { name: 'TechCorp', industry: 'Technology' } },
    },
    {
      n: { id: '4', labels: ['Person'], properties: { name: 'Carol White', email: 'carol@example.com', age: 45 } },
      r: { id: 'r3', type: 'PURCHASED', startNode: '4', endNode: '5', properties: { quantity: 2, date: '2024-03-10' } },
      m: { id: '5', labels: ['Product'], properties: { name: 'Laptop Pro', sku: 'LP-2024', price: 1299.99 } },
    },
  ],
  statistics: {
    nodesCreated: 0,
    nodesDeleted: 0,
    relationshipsCreated: 0,
    relationshipsDeleted: 0,
    propertiesSet: 0,
    labelsAdded: 0,
  },
};

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
  const [selectedLabel, setSelectedLabel] = useState<any>(() => {
    if (persistedState?.selectedLabelName) {
      return DUMMY_LABELS.find((l: IGraphLabel) => l.name === persistedState.selectedLabelName) || null;
    }
    return null;
  });
  const [selectedRelType, setSelectedRelType] = useState<any>(() => {
    if (persistedState?.selectedRelTypeName) {
      return DUMMY_RELATIONSHIPS.find((r: typeof DUMMY_RELATIONSHIPS[0]) => r.type === persistedState.selectedRelTypeName) || null;
    }
    return null;
  });
  const [resultsView, setResultsView] = useState<'table' | 'graph'>(persistedState?.resultsView || 'table');
  const [graphZoom, setGraphZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<any>(null);

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

  // Actions state
  const [savedActions, setSavedActions] = useState<IGraphAction[]>(DUMMY_ACTIONS);
  const [selectedAction, setSelectedAction] = useState<IGraphAction | null>(() => {
    if (persistedState?.selectedActionTag) {
      return DUMMY_ACTIONS.find(a => a.tag === persistedState.selectedActionTag) || null;
    }
    return null;
  });
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

  // Persist state to localStorage whenever relevant state changes
  useEffect(() => {
    const stateToSave = {
      sidebarView,
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
  const handleSaveAction = () => {
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

      const newAction: IGraphAction = {
        id: `action_${Date.now()}`,
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
        createdAt: new Date().toISOString(),
      };

      setSavedActions([newAction, ...savedActions]);
      setShowSaveActionModal(false);
      setSelectedAction(newAction); // Show the newly created action
      toast.success(`Action "${actionName}" saved with tag: ${actionTag}`);
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
  const handleDeleteAction = (actionId: string) => {
    setSavedActions(savedActions.filter(a => a.id !== actionId));
    if (selectedAction?.id === actionId) {
      setSelectedAction(null);
    }
    toast.success('Action deleted');
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
  const filteredActions = savedActions.filter(a =>
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

  const handleExecuteQuery = async () => {
    if (!queryInput.trim()) {
      toast.error('Please enter a query');
      return;
    }

    // Validate JSON
    try {
      JSON.parse(queryInput);
    } catch {
      toast.error('Invalid JSON query format');
      return;
    }

    setIsExecuting(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      // Simulated response based on SDK types
      await new Promise(resolve => setTimeout(resolve, 800));
      setQueryResult(SAMPLE_QUERY_RESULTS);
      toast.success(`Query executed in ${SAMPLE_QUERY_RESULTS.executionTime}ms`);
    } catch (error: any) {
      setQueryError(error.message || 'Failed to execute query');
      toast.error('Failed to execute query');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSidebarRefresh = async () => {
    setIsSidebarRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSidebarRefreshing(false);
    toast.success('Schema refreshed');
  };

  const handleViewChange = (view: SidebarView) => {
    setSidebarView(view);
    setSearchQuery('');
    setSelectedLabel(null);
    setSelectedRelType(null);
  };

  const filteredLabels = DUMMY_LABELS.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRelationships = DUMMY_RELATIONSHIPS.filter(r =>
    r.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConstraints = DUMMY_CONSTRAINTS.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIndexes = DUMMY_INDEXES.filter(i =>
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
    const edges: any[] = [];

    queryResult.data.forEach((row: any) => {
      Object.values(row).forEach((value: any) => {
        if (value?.labels && value?.id) {
          // It's a node
          if (!nodesMap.has(value.id)) {
            nodesMap.set(value.id, {
              id: value.id,
              labels: value.labels,
              properties: value.properties,
              label: value.labels[0] || 'Node',
              displayName: value.properties?.name || value.properties?.title || value.id,
            });
          }
        } else if (value?.type && value?.startNode && value?.endNode) {
          // It's a relationship
          edges.push({
            id: value.id || `${value.startNode}-${value.type}-${value.endNode}`,
            source: value.startNode,
            target: value.endNode,
            type: value.type,
            properties: value.properties,
          });
        }
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      edges,
    };
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

  // Simple circular layout calculation
  const calculateNodePositions = (nodes: any[], _edges: any[], width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    return nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-grey-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-grey-400 flex flex-col flex-shrink-0">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', getGraphTypeColor(graph.type))}>
              <Share2 className="h-4 w-4 text-grey" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-grey text-sm truncate">{graph.name}</h2>
              <p className="text-xs text-grey truncate">{graph.env.slug}</p>
            </div>
          </div>

          {/* View Tabs */}
          <div className="space-y-1 mb-3">
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => handleViewChange('labels')}
                className={cn(
                  'px-2 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1',
                  sidebarView === 'labels'
                    ? 'bg-primary/10 text-primary'
                    : 'text-grey hover:bg-grey-100'
                )}
              >
                <Database className="h-3 w-3" />
                Labels
              </button>
              <button
                onClick={() => handleViewChange('relationships')}
                className={cn(
                  'px-2 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1',
                  sidebarView === 'relationships'
                    ? 'bg-primary/10 text-primary'
                    : 'text-grey hover:bg-grey-100'
                )}
              >
                <GitBranch className="h-3 w-3" />
                Rels
              </button>
              <button
                onClick={() => handleViewChange('constraints')}
                className={cn(
                  'px-2 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1',
                  sidebarView === 'constraints'
                    ? 'bg-primary/10 text-primary'
                    : 'text-grey hover:bg-grey-100'
                )}
              >
                <Key className="h-3 w-3" />
                Constraints
              </button>
              <button
                onClick={() => handleViewChange('indexes')}
                className={cn(
                  'px-2 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1',
                  sidebarView === 'indexes'
                    ? 'bg-primary/10 text-primary'
                    : 'text-grey hover:bg-grey-100'
                )}
              >
                <Zap className="h-3 w-3" />
                Indexes
              </button>
            </div>
            <button
              onClick={() => handleViewChange('actions')}
              className={cn(
                'w-full px-2 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1',
                sidebarView === 'actions'
                  ? 'bg-primary/10 text-primary'
                  : 'text-grey hover:bg-grey-100'
              )}
            >
              <Bookmark className="h-3 w-3" />
              Actions
              {savedActions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-grey-100 rounded text-xs">
                  {savedActions.length}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey" />
            <Input
              type="text"
              placeholder={`Search ${sidebarView}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="text-xs font-semibold text-grey uppercase tracking-wide">
              {sidebarView === 'labels' && `Node Labels (${filteredLabels.length})`}
              {sidebarView === 'relationships' && `Relationship Types (${filteredRelationships.length})`}
              {sidebarView === 'constraints' && `Constraints (${filteredConstraints.length})`}
              {sidebarView === 'indexes' && `Indexes (${filteredIndexes.length})`}
              {sidebarView === 'actions' && `Saved Actions (${filteredActions.length})`}
            </div>
            <div className="flex gap-1">
              {sidebarView !== 'actions' ? (
                <>
                  <button
                    onClick={handleSidebarRefresh}
                    disabled={isSidebarRefreshing}
                    className="text-grey hover:text-primary transition-colors"
                    title="Refresh schema"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', isSidebarRefreshing && 'animate-spin')} />
                  </button>
                  <button
                    className="text-grey hover:text-primary transition-colors"
                    title="Add new"
                    onClick={() => {
                      if (sidebarView === 'labels') setShowAddNodeModal(true);
                      else if (sidebarView === 'relationships') setShowAddRelationshipModal(true);
                      else if (sidebarView === 'constraints') setShowAddConstraintModal(true);
                      else if (sidebarView === 'indexes') setShowAddIndexModal(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button
                  className="text-grey hover:text-primary transition-colors"
                  title="Create new action"
                  onClick={handleOpenQueryBuilder}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Labels List */}
          {sidebarView === 'labels' && (
            <div className="space-y-1">
              {filteredLabels.map((label) => (
                <button
                  key={label.name}
                  onClick={() => {
                    setSelectedLabel(label);
                    setQueryInput(getFindNodesQuery(label.name));
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
          {sidebarView === 'relationships' && (
            <div className="space-y-1">
              {filteredRelationships.map((rel) => (
                <button
                  key={rel.type}
                  onClick={() => {
                    setSelectedRelType(rel);
                    setQueryInput(getFindRelationshipsQuery(rel.type));
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

          {/* Constraints List */}
          {sidebarView === 'constraints' && (
            <div className="space-y-1">
              {filteredConstraints.map((constraint) => (
                <div
                  key={constraint.name}
                  className="px-2 py-2 rounded text-sm hover:bg-grey-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-grey truncate">{constraint.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={cn('px-1.5 py-0.5 rounded text-xs', getConstraintTypeColor(constraint.type))}>
                      {constraint.type.replace(/_/g, ' ')}
                    </span>
                    <span className="px-1.5 py-0.5 bg-grey-100 rounded text-xs text-grey">
                      :{constraint.label}
                    </span>
                  </div>
                  <div className="text-xs text-grey mt-1">
                    {constraint.property}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Indexes List */}
          {sidebarView === 'indexes' && (
            <div className="space-y-1">
              {filteredIndexes.map((index) => (
                <div
                  key={index.name}
                  className="px-2 py-2 rounded text-sm hover:bg-grey-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-grey truncate">{index.name}</span>
                    <span className={cn('text-xs', getIndexStateColor(index.state))}>
                      {index.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={cn('px-1.5 py-0.5 rounded text-xs', getIndexTypeColor(index.type))}>
                      {index.type}
                    </span>
                    <span className="px-1.5 py-0.5 bg-grey-100 rounded text-xs text-grey">
                      :{index.labelOrType}
                    </span>
                  </div>
                  <div className="text-xs text-grey mt-1">
                    {index.properties.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions List */}
          {sidebarView === 'actions' && (
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
                            handleDeleteAction(action.id);
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
        </div>

        {/* Stats Footer */}
        <div className="flex-shrink-0 p-3 border-t border-grey-400 bg-grey-50">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <div className="font-semibold text-grey">14,127</div>
              <div className="text-grey">Nodes</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-grey">27,045</div>
              <div className="text-grey">Relationships</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
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
                  <Button
                    size="sm"
                    onClick={handleSaveQueryBuilderAction}
                    disabled={!generatedQuery || !queryTestResult?.success}
                    className="gap-2"
                    title={!queryTestResult?.success ? 'Test the query successfully before saving' : undefined}
                  >
                    <Save className="h-4 w-4" />
                    Save as Action
                  </Button>
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
                            {DUMMY_LABELS.map((label) => (
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
                          {DUMMY_RELATIONSHIPS.map((rel) => (
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
                            {DUMMY_LABELS.map((label) => (
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
                            {DUMMY_LABELS.map((label) => (
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
                        const selectedLabelDef = DUMMY_LABELS.find(l => l.name === queryBuilderLabel);
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
                        const selectedLabelDef = isNodeOp ? DUMMY_LABELS.find(l => l.name === queryBuilderLabel) : null;
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
                            {DUMMY_INDEXES.filter(i => i.type === 'FULLTEXT').map((index) => (
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
                    handleDeleteAction(selectedAction.id);
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
                <pre className="bg-grey-50 rounded-lg p-4 overflow-x-auto text-sm font-mono text-grey max-h-64 overflow-y-auto">
                  {JSON.stringify(selectedAction.query, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ) : showQueryEditor ? (
          <>
            {/* Query Editor - Fixed */}
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
                      variant="outline"
                      size="sm"
                      onClick={handleOpenSaveActionModal}
                      className="gap-2 text-grey hover:text-grey dark:hover:text-white"
                    >
                      <Save className="h-4 w-4" />
                      Save as Action
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleExecuteQuery}
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
                      <span className="font-semibold text-grey">{queryResult.count}</span> rows in <span className="font-semibold text-grey">{queryResult.executionTime}ms</span>
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

            {/* Results Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {queryError && (
            <div className="bg-red/10 border border-red/20 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Query Error</span>
              </div>
              <p className="text-sm text-red mt-2 font-mono">{queryError}</p>
            </div>
          )}

          {queryResult && (
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
                      onClick={() => setGraphZoom(1)}
                      className="h-7 w-7 p-0"
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
                    <table className="w-full">
                      <thead className="bg-grey-50 border-b border-grey-400 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-grey uppercase tracking-wider w-12">
                            #
                          </th>
                          {queryResult.columns?.map((col: string) => (
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
                            {queryResult.columns?.map((col: string) => (
                              <td key={col} className="px-4 py-3 align-top">
                                {row[col]?.labels ? (
                                  renderNodeValue(row[col])
                                ) : row[col]?.type && row[col]?.startNode ? (
                                  renderRelationshipValue(row[col])
                                ) : (
                                  <span className="text-sm text-grey">
                                    {typeof row[col] === 'object'
                                      ? JSON.stringify(row[col], null, 2)
                                      : String(row[col])}
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                      <div className="flex-1 relative overflow-hidden">
                        <svg
                          className="w-full h-full"
                          style={{ transform: `scale(${graphZoom})`, transformOrigin: 'center center' }}
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

                          {/* Edges */}
                          {(() => {
                            const positionedNodes = calculateNodePositions(graphData.nodes, graphData.edges, 600, 400);
                            const nodePositions = new Map(positionedNodes.map(n => [n.id, { x: n.x, y: n.y }]));

                            return graphData.edges.map((edge, i) => {
                              const source = nodePositions.get(edge.source);
                              const target = nodePositions.get(edge.target);
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
                            });
                          })()}

                          {/* Nodes */}
                          {calculateNodePositions(graphData.nodes, graphData.edges, 600, 400).map((node) => {
                            const colors = getNodeColor(node.label);
                            const isSelected = selectedNode?.id === node.id;

                            return (
                              <g
                                key={node.id}
                                className="cursor-pointer"
                                onClick={() => setSelectedNode(isSelected ? null : node)}
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
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Circle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-grey">{DUMMY_LABELS.length}</div>
                    <div className="text-xs text-grey-500">Node Labels</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-blue" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-grey">{DUMMY_RELATIONSHIPS.length}</div>
                    <div className="text-xs text-grey-500">Relationship Types</div>
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
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                    <Network className="h-5 w-5 text-green" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-grey capitalize">{graph.type || 'Neo4j'}</div>
                    <div className="text-xs text-grey-500">Graph Type</div>
                  </div>
                </div>
              </div>
            </div>

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
                {DUMMY_LABELS.slice(0, 6).map((label) => (
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
            </div>

            {/* Saved Actions */}
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
                  <Input
                    value={label}
                    onChange={(e) => {
                      const newLabels = [...nodeLabels];
                      newLabels[i] = e.target.value;
                      setNodeLabels(newLabels);
                    }}
                    placeholder="Label name"
                    className="flex-1"
                  />
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
                  <Input
                    value={prop.value}
                    onChange={(e) => {
                      const newProps = [...nodeProperties];
                      newProps[i].value = e.target.value;
                      setNodeProperties(newProps);
                    }}
                    placeholder="Value"
                    className="flex-1"
                  />
                  <Select
                    value={prop.type}
                    onValueChange={(value) => {
                      const newProps = [...nodeProperties];
                      newProps[i].type = value;
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
              onClick={() => {
                const query = {
                  operation: 'createNode',
                  options: {
                    labels: nodeLabels.filter(l => l),
                    properties: nodeProperties
                      .filter(p => p.key)
                      .reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {}),
                    returnNode: true,
                  },
                };
                setQueryInput(JSON.stringify(query, null, 2));
                setShowAddNodeModal(false);
                toast.success('Query generated - click Execute to run');
              }}
            >
              Generate Query
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
                <Input
                  value={relFromLabel}
                  onChange={(e) => setRelFromLabel(e.target.value)}
                  placeholder="Person"
                />
              </div>
              <div>
                <Label className="text-xs text-grey mb-2 block">To Node Label</Label>
                <Input
                  value={relToLabel}
                  onChange={(e) => setRelToLabel(e.target.value)}
                  placeholder="Company"
                />
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

      {/* Code Sidebar */}
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
    </div>
  );
}
