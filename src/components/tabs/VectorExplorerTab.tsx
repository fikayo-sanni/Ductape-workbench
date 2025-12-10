import { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  RefreshCw,
  Loader2,
  Plus,
  Settings2,
  Code,
  Tag,
  Trash2,
  Upload,
  Download,
  Filter,
  ChevronRight,
  Database,
  FileText,
  Hash,
  Sparkles,
  Target,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import CodeSidebar from '@/components/CodeSidebar';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface VectorExplorerTabProps {
  vector: {
    name: string;
    tag: string;
    productTag: string;
    env: {
      slug: string;
    };
  };
}

type SidebarView = 'collections' | 'documents';

// Vector collection types
interface VectorCollection {
  id: string;
  name: string;
  tag: string;
  description?: string;
  dimensions: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
  documentCount: number;
  indexType: string;
  createdAt: string;
}

interface VectorDocument {
  id: string;
  collectionId: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  score?: number;
  createdAt: string;
}

// Dummy collections data
const DUMMY_COLLECTIONS: VectorCollection[] = [
  {
    id: 'col_1',
    name: 'Product Descriptions',
    tag: 'product-descriptions',
    description: 'Product catalog embeddings for semantic search',
    dimensions: 1536,
    metric: 'cosine',
    documentCount: 2847,
    indexType: 'HNSW',
    createdAt: '2024-02-15T10:00:00Z',
  },
  {
    id: 'col_2',
    name: 'Support Articles',
    tag: 'support-articles',
    description: 'Knowledge base articles for customer support',
    dimensions: 1536,
    metric: 'cosine',
    documentCount: 456,
    indexType: 'HNSW',
    createdAt: '2024-02-20T14:30:00Z',
  },
  {
    id: 'col_3',
    name: 'User Preferences',
    tag: 'user-preferences',
    description: 'User behavior embeddings for recommendations',
    dimensions: 768,
    metric: 'dotproduct',
    documentCount: 12453,
    indexType: 'IVF',
    createdAt: '2024-03-01T09:00:00Z',
  },
  {
    id: 'col_4',
    name: 'Code Snippets',
    tag: 'code-snippets',
    description: 'Code examples and documentation embeddings',
    dimensions: 1024,
    metric: 'cosine',
    documentCount: 891,
    indexType: 'HNSW',
    createdAt: '2024-03-10T11:15:00Z',
  },
];

// Dummy documents data
const DUMMY_DOCUMENTS: VectorDocument[] = [
  {
    id: 'doc_1',
    collectionId: 'col_1',
    content: 'Premium wireless headphones with noise cancellation and 30-hour battery life',
    metadata: { productId: 'prod_123', category: 'electronics', price: 299.99 },
    createdAt: '2024-03-15T10:30:00Z',
  },
  {
    id: 'doc_2',
    collectionId: 'col_1',
    content: 'Ergonomic office chair with lumbar support and adjustable armrests',
    metadata: { productId: 'prod_456', category: 'furniture', price: 449.99 },
    createdAt: '2024-03-15T11:00:00Z',
  },
  {
    id: 'doc_3',
    collectionId: 'col_2',
    content: 'How to reset your password: Go to settings > Security > Change password',
    metadata: { articleId: 'art_001', topic: 'account', views: 5432 },
    createdAt: '2024-03-14T09:00:00Z',
  },
  {
    id: 'doc_4',
    collectionId: 'col_2',
    content: 'Troubleshooting connection issues: Check your internet, restart the app',
    metadata: { articleId: 'art_002', topic: 'technical', views: 3211 },
    createdAt: '2024-03-14T10:30:00Z',
  },
];

export default function VectorExplorerTab({ vector }: VectorExplorerTabProps) {
  const { setSidebarCollapsed } = useWorkbenchStore();

  // Collapse workbench sidebar when VectorExplorer opens
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  // State
  const [sidebarView, setSidebarView] = useState<SidebarView>('collections');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<VectorCollection | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<VectorDocument | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Search modal state
  const [semanticQuery, setSemanticQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [searchResults, setSearchResults] = useState<VectorDocument[]>([]);

  // Add document modal state
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocMetadata, setNewDocMetadata] = useState('{}');
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  // Filter documents based on selected collection
  const filteredDocuments = selectedCollection
    ? DUMMY_DOCUMENTS.filter(doc => doc.collectionId === selectedCollection.id)
    : [];

  // Filter collections based on search
  const filteredCollections = DUMMY_COLLECTIONS.filter(col =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    col.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast.success('Refreshed vector data');
  };

  const handleSemanticSearch = async () => {
    if (!selectedCollection || !semanticQuery.trim()) return;

    setIsSearching(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate search results with scores
      const results = filteredDocuments.slice(0, topK).map((doc, idx) => ({
        ...doc,
        score: 0.95 - (idx * 0.05),
      }));

      setSearchResults(results);
      toast.success(`Found ${results.length} similar documents`);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddDocument = async () => {
    if (!selectedCollection || !newDocContent.trim()) return;

    setIsAddingDoc(true);
    try {
      // Validate JSON metadata
      JSON.parse(newDocMetadata);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success('Document added successfully');
      setShowAddDocModal(false);
      setNewDocContent('');
      setNewDocMetadata('{}');
    } catch (error) {
      toast.error('Invalid metadata JSON');
    } finally {
      setIsAddingDoc(false);
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'cosine':
        return 'Cosine Similarity';
      case 'euclidean':
        return 'Euclidean Distance';
      case 'dotproduct':
        return 'Dot Product';
      default:
        return metric;
    }
  };

  return (
    <div className="flex h-full bg-grey-100">
      {/* Sidebar */}
      <div className="w-72 border-r border-grey-400 bg-white flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <Boxes className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-grey">Vector Explorer</h2>
          </div>

          {/* Environment Badge */}
          <div className="flex items-center gap-2 text-xs text-grey-600 mb-3">
            <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">
              {vector.env.slug}
            </span>
            <span>{vector.productTag}</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-500" />
            <Input
              placeholder="Search collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-grey-400">
          {(['collections', 'documents'] as SidebarView[]).map((view) => (
            <button
              key={view}
              onClick={() => setSidebarView(view)}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                sidebarView === view
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-grey-600 hover:text-grey hover:bg-grey-100'
              )}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-auto p-3">
          {sidebarView === 'collections' && (
            <div className="space-y-2">
              {filteredCollections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => {
                    setSelectedCollection(col);
                    setSelectedDocument(null);
                    setSearchResults([]);
                  }}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-colors',
                    selectedCollection?.id === col.id
                      ? 'border-primary bg-primary/5'
                      : 'border-grey-400 hover:border-grey-500 hover:bg-grey-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-grey truncate">{col.name}</span>
                  </div>
                  <p className="text-xs text-grey-600 mb-2 line-clamp-1">{col.description}</p>
                  <div className="flex items-center gap-3 text-xs text-grey-500">
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {col.dimensions}d
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {col.documentCount.toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {sidebarView === 'documents' && (
            <div className="space-y-2">
              {selectedCollection ? (
                filteredDocuments.length > 0 ? (
                  filteredDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className={cn(
                        'w-full p-3 rounded-lg border text-left transition-colors',
                        selectedDocument?.id === doc.id
                          ? 'border-primary bg-primary/5'
                          : 'border-grey-400 hover:border-grey-500 hover:bg-grey-50'
                      )}
                    >
                      <div className="font-medium text-sm text-grey mb-1 line-clamp-2">{doc.content}</div>
                      <div className="text-xs text-grey-500">{doc.id}</div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-grey-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No documents in this collection</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-grey-500">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a collection first</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-grey-400">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="w-full gap-2"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-grey-400 bg-white flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {selectedCollection ? (
              <>
                <Boxes className="h-5 w-5 text-primary" />
                <span className="font-semibold text-grey">{selectedCollection.name}</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-grey-100 text-grey-600">
                  {selectedCollection.documentCount.toLocaleString()} docs
                </span>
              </>
            ) : (
              <span className="text-grey-600">Select a collection to explore</span>
            )}
          </div>

          {selectedCollection && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowSearchModal(true)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Semantic Search
              </Button>
              <Button
                onClick={() => setShowAddDocModal(true)}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Document
              </Button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {selectedCollection ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Collection Info Card */}
              <div className="bg-white rounded-lg border border-grey-400 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-grey mb-1">{selectedCollection.name}</h3>
                    <p className="text-sm text-grey-600">{selectedCollection.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-grey-500" />
                    <code className="text-sm bg-grey-100 px-2 py-1 rounded">{selectedCollection.tag}</code>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">{selectedCollection.dimensions}</div>
                    <div className="text-sm text-grey-600">Dimensions</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">{selectedCollection.documentCount.toLocaleString()}</div>
                    <div className="text-sm text-grey-600">Documents</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-lg font-bold text-grey">{getMetricLabel(selectedCollection.metric)}</div>
                    <div className="text-sm text-grey-600">Distance Metric</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-lg font-bold text-grey">{selectedCollection.indexType}</div>
                    <div className="text-sm text-grey-600">Index Type</div>
                  </div>
                </div>
              </div>

              {/* Search Results or Document Preview */}
              {searchResults.length > 0 ? (
                <div className="bg-white rounded-lg border border-grey-400 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-grey">Search Results</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchResults([])}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {searchResults.map((doc, idx) => (
                      <div
                        key={doc.id}
                        className="flex items-start gap-4 p-4 rounded-lg border border-grey-400 hover:bg-grey-50"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-grey mb-2">{doc.content}</p>
                          <div className="flex items-center gap-4 text-xs text-grey-500">
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Score: {doc.score?.toFixed(4)}
                            </span>
                            <span>{doc.id}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedDocument ? (
                <div className="bg-white rounded-lg border border-grey-400 p-6">
                  <h4 className="font-semibold text-grey mb-4">Document Details</h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-grey-600 mb-2 block">ID</Label>
                      <code className="text-sm bg-grey-100 px-2 py-1 rounded">{selectedDocument.id}</code>
                    </div>
                    <div>
                      <Label className="text-xs text-grey-600 mb-2 block">Content</Label>
                      <p className="text-sm text-grey bg-grey-50 p-4 rounded-lg">{selectedDocument.content}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-grey-600 mb-2 block">Metadata</Label>
                      <pre className="bg-grey-100 rounded-lg p-4 text-sm overflow-auto">
                        {JSON.stringify(selectedDocument.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-grey-400 p-6">
                  <h4 className="font-semibold text-grey mb-4">Recent Documents</h4>
                  <div className="space-y-3">
                    {filteredDocuments.slice(0, 5).map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocument(doc)}
                        className="flex items-center justify-between p-3 rounded-lg border border-grey-400 hover:bg-grey-50 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-grey truncate">{doc.content}</p>
                          <p className="text-xs text-grey-500 mt-1">{doc.id}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-grey-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-grey-500">
              <Boxes className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a collection</p>
              <p className="text-sm">Choose a vector collection from the sidebar to explore documents</p>
            </div>
          )}
        </div>
      </div>

      {/* Code Sidebar */}
      <CodeSidebar
        title="Vector SDK"
        language="typescript"
        code={`// Vector operations using Ductape SDK
import Ductape from '@ductape/sdk';

const ductape = new Ductape({
  user_id: 'your-user-id',
  workspace_id: 'your-workspace-id',
  private_key: 'your-private-key',
});

// Semantic search
const results = await ductape.vector.search({
  product: '${vector.productTag}',
  env: '${vector.env.slug}',
  collection: '${selectedCollection?.tag || 'collection-tag'}',
  query: 'your search query',
  topK: ${topK},
});

// Add document
await ductape.vector.upsert({
  product: '${vector.productTag}',
  env: '${vector.env.slug}',
  collection: '${selectedCollection?.tag || 'collection-tag'}',
  documents: [{
    id: 'doc-id',
    content: 'document content',
    metadata: { key: 'value' },
  }],
});

console.log('Search results:', results);`}
      />

      {/* Semantic Search Modal */}
      <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Semantic Search</DialogTitle>
            <DialogDescription>
              Search for similar documents using natural language
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Collection</Label>
              <div className="flex items-center gap-2 mt-1">
                <Boxes className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedCollection?.name}</span>
              </div>
            </div>

            <div>
              <Label>Search Query</Label>
              <Textarea
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                placeholder="Enter your search query..."
                className="h-24 mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Number of Results (Top K)</Label>
                <span className="text-sm text-grey-600">{topK}</span>
              </div>
              <Slider
                value={[topK]}
                onValueChange={(val) => setTopK(val[0])}
                min={1}
                max={20}
                step={1}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSearchModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleSemanticSearch();
                setShowSearchModal(false);
              }}
              disabled={isSearching || !semanticQuery.trim()}
              className="gap-2"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Document Modal */}
      <Dialog open={showAddDocModal} onOpenChange={setShowAddDocModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
            <DialogDescription>
              Add a new document to the vector collection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Collection</Label>
              <div className="flex items-center gap-2 mt-1">
                <Boxes className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedCollection?.name}</span>
              </div>
            </div>

            <div>
              <Label>Content</Label>
              <Textarea
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                placeholder="Enter document content..."
                className="h-32 mt-1"
              />
            </div>

            <div>
              <Label>Metadata (JSON)</Label>
              <Textarea
                value={newDocMetadata}
                onChange={(e) => setNewDocMetadata(e.target.value)}
                placeholder='{"key": "value"}'
                className="font-mono text-sm h-24 mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDocModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDocument}
              disabled={isAddingDoc || !newDocContent.trim()}
              className="gap-2"
            >
              {isAddingDoc ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
