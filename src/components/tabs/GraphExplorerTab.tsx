import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

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

type SidebarView = 'labels' | 'relationships' | 'constraints' | 'indexes';

// Dummy data for graph schema based on SDK types
const DUMMY_LABELS = [
  { name: 'Person', count: 1247, color: 'bg-blue' },
  { name: 'Company', count: 532, color: 'bg-green' },
  { name: 'Product', count: 2891, color: 'bg-purple-500' },
  { name: 'Location', count: 456, color: 'bg-orange-500' },
  { name: 'Order', count: 8934, color: 'bg-pink-500' },
  { name: 'Category', count: 67, color: 'bg-yellow-500' },
];

const DUMMY_RELATIONSHIPS = [
  { type: 'KNOWS', count: 3456, fromLabel: 'Person', toLabel: 'Person' },
  { type: 'WORKS_AT', count: 1234, fromLabel: 'Person', toLabel: 'Company' },
  { type: 'PURCHASED', count: 8934, fromLabel: 'Person', toLabel: 'Product' },
  { type: 'LOCATED_IN', count: 988, fromLabel: 'Company', toLabel: 'Location' },
  { type: 'BELONGS_TO', count: 2891, fromLabel: 'Product', toLabel: 'Category' },
  { type: 'CONTAINS', count: 12453, fromLabel: 'Order', toLabel: 'Product' },
];

const DUMMY_CONSTRAINTS = [
  { name: 'person_email_unique', type: 'UNIQUENESS', entityType: 'NODE', labelsOrTypes: ['Person'], properties: ['email'] },
  { name: 'company_id_unique', type: 'UNIQUENESS', entityType: 'NODE', labelsOrTypes: ['Company'], properties: ['companyId'] },
  { name: 'product_sku_unique', type: 'UNIQUENESS', entityType: 'NODE', labelsOrTypes: ['Product'], properties: ['sku'] },
  { name: 'person_email_exists', type: 'NODE_PROPERTY_EXISTENCE', entityType: 'NODE', labelsOrTypes: ['Person'], properties: ['email'] },
];

const DUMMY_INDEXES = [
  { name: 'person_name_index', type: 'RANGE', entityType: 'NODE', labelsOrTypes: ['Person'], properties: ['name'], state: 'ONLINE' },
  { name: 'product_search_index', type: 'FULLTEXT', entityType: 'NODE', labelsOrTypes: ['Product'], properties: ['name', 'description'], state: 'ONLINE' },
  { name: 'company_location_index', type: 'POINT', entityType: 'NODE', labelsOrTypes: ['Company'], properties: ['location'], state: 'ONLINE' },
  { name: 'person_vector_index', type: 'VECTOR', entityType: 'NODE', labelsOrTypes: ['Person'], properties: ['embedding'], state: 'POPULATING' },
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
  const [sidebarView, setSidebarView] = useState<SidebarView>('labels');
  const [searchQuery, setSearchQuery] = useState('');
  const [queryInput, setQueryInput] = useState(getDefaultQuery());
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSidebarRefreshing, setIsSidebarRefreshing] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<any>(null);
  const [selectedRelType, setSelectedRelType] = useState<any>(null);
  const [resultsView, setResultsView] = useState<'table' | 'graph'>('table');
  const [graphZoom, setGraphZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<any>(null);

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

  const getIndexStateColor = (state: string) => {
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
              <Share2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-grey text-sm truncate">{graph.name}</h2>
              <p className="text-xs text-grey truncate">{graph.env.slug}</p>
            </div>
          </div>

          {/* View Tabs */}
          <div className="grid grid-cols-2 gap-1 mb-3">
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
            </div>
            <div className="flex gap-1">
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
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
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
                    <span className="px-1.5 py-0.5 bg-grey-100 rounded">{rel.fromLabel}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="px-1.5 py-0.5 bg-grey-100 rounded">{rel.toLabel}</span>
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
                      :{constraint.labelsOrTypes.join(':')}
                    </span>
                  </div>
                  <div className="text-xs text-grey mt-1">
                    {constraint.properties.join(', ')}
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
                      :{index.labelsOrTypes.join(':')}
                    </span>
                  </div>
                  <div className="text-xs text-grey mt-1">
                    {index.properties.join(', ')}
                  </div>
                </div>
              ))}
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
        {/* Query Editor - Fixed */}
        <div className="flex-shrink-0 bg-white border-b border-grey-400 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-semibold text-grey">
                Graph Adapter Query
              </Label>
              <span className={cn('px-2 py-0.5 rounded text-xs font-medium uppercase', getGraphTypeColor(graph.type))}>
                {graph.type}
              </span>
              <span className="text-xs text-grey">
                ({getQueryLanguageName(graph.type)} backend)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQueryInput(getDefaultQuery())}
              >
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteQuery}
                disabled={isExecuting}
                className="gap-2"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Execute
                  </>
                )}
              </Button>
            </div>
          </div>
          <textarea
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={getDefaultQuery()}
            className="w-full h-32 px-3 py-2 border border-grey-400 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-grey-50"
          />

          {/* Query Statistics Bar - Shows after execution */}
          {queryResult && (
            <div className="mt-3 flex items-center justify-between px-3 py-2 bg-grey-50 rounded-lg border border-grey-400">
              <div className="flex items-center gap-4">
                <span className="text-xs text-grey">
                  <span className="font-semibold text-grey">{queryResult.count}</span> rows in <span className="font-semibold text-grey">{queryResult.executionTime}ms</span>
                </span>
                {queryResult.statistics && (
                  <div className="flex items-center gap-3 text-xs text-grey border-l border-grey-400 pl-4">
                    {queryResult.statistics.nodesCreated > 0 && (
                      <span><span className="font-medium text-green">{queryResult.statistics.nodesCreated}</span> nodes+</span>
                    )}
                    {queryResult.statistics.nodesDeleted > 0 && (
                      <span><span className="font-medium text-red">{queryResult.statistics.nodesDeleted}</span> nodes-</span>
                    )}
                    {queryResult.statistics.relationshipsCreated > 0 && (
                      <span><span className="font-medium text-blue">{queryResult.statistics.relationshipsCreated}</span> rels+</span>
                    )}
                    {queryResult.statistics.relationshipsDeleted > 0 && (
                      <span><span className="font-medium text-orange-500">{queryResult.statistics.relationshipsDeleted}</span> rels-</span>
                    )}
                    {queryResult.statistics.propertiesSet > 0 && (
                      <span><span className="font-medium text-purple-500">{queryResult.statistics.propertiesSet}</span> props</span>
                    )}
                    {queryResult.statistics.labelsAdded > 0 && (
                      <span><span className="font-medium text-yellow-600">{queryResult.statistics.labelsAdded}</span> labels</span>
                    )}
                    {Object.values(queryResult.statistics).every((v: any) => v === 0) && (
                      <span className="text-grey-400">read-only</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {queryResult.columns?.map((col: string) => (
                  <span key={col} className="px-1.5 py-0.5 bg-white border border-grey-400 rounded font-mono text-grey">
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

          {!queryResult && !queryError && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Network className="h-16 w-16 text-grey-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-grey mb-2">Ready to Explore</h3>
                <p className="text-sm text-grey max-w-md mb-4">
                  Write a graph adapter query above and click Execute to explore your graph data.
                  The SDK will translate it to {getQueryLanguageName(graph.type)} for {graph.type}.
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQueryInput(getNodeCountsQuery());
                      handleExecuteQuery();
                    }}
                  >
                    Show Node Counts
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQueryInput(getRelationshipCountsQuery());
                      handleExecuteQuery();
                    }}
                  >
                    Show Relationship Counts
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQueryInput(getNeighborhoodQuery());
                    }}
                  >
                    Neighborhood Query
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQueryInput(getTraverseQuery('Person'));
                    }}
                  >
                    Traverse Example
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
