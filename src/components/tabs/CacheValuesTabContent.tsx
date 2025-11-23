import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { Zap, Loader2, Tag, Search, RefreshCw, Clock, Layers, Code2, Database, ChevronDown, ChevronRight, HardDrive, MessageSquare, Box, Shield, Timer, Workflow, Bell, Heart, Settings2, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface IRemoteCache {
  expiry?: Date;
  key: string;
  value: string;
  cache_tag: string;
  product_tag: string;
  component_tag: string;
  component_type: string;
}

interface CacheValuesTabContentProps {
  cache: any;
}

// Dummy data for display
const DUMMY_CACHE_VALUES: IRemoteCache[] = [
  {
    key: 'user:session:12345',
    value: JSON.stringify({ userId: '12345', username: 'john_doe', email: 'john@example.com', role: 'admin' }),
    cache_tag: 'user-sessions',
    product_tag: 'auth-service',
    component_tag: 'session-manager',
    component_type: 'session',
    expiry: new Date(Date.now() + 3600000), // 1 hour from now
  },
  {
    key: 'product:inventory:98765',
    value: JSON.stringify({ productId: '98765', name: 'Premium Widget', stock: 150, price: 99.99 }),
    cache_tag: 'inventory',
    product_tag: 'ecommerce',
    component_tag: 'product-db',
    component_type: 'database',
    expiry: new Date(Date.now() + 7200000), // 2 hours from now
  },
  {
    key: 'config:feature-flags',
    value: JSON.stringify({ darkMode: true, betaFeatures: false, analytics: true }),
    cache_tag: 'configuration',
    product_tag: 'app-config',
    component_tag: 'config-storage',
    component_type: 'storage',
    expiry: new Date(Date.now() + 86400000), // 24 hours from now
  },
  {
    key: 'api:rate-limit:user-789',
    value: '{"requests": 45, "limit": 100, "resetTime": "2024-12-01T15:00:00Z"}',
    cache_tag: 'rate-limiting',
    product_tag: 'api-gateway',
    component_tag: 'notification-service',
    component_type: 'notification',
    expiry: new Date(Date.now() + 900000), // 15 minutes from now
  },
  {
    key: 'geo:location:ip-192.168.1.1',
    value: 'United States, California, San Francisco',
    cache_tag: 'geolocation',
    product_tag: 'location-service',
    component_tag: 'message-queue',
    component_type: 'message-broker',
  },
];

export default function CacheValuesTabContent({ cache }: CacheValuesTabContentProps) {
  const { user, currentWorkspaceId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  // Fetch cache values
  const { data: cacheValuesData, isLoading, refetch } = useQuery({
    queryKey: ['cache-values', cache.cacheTag, cache.productTag],
    queryFn: async () => {
      try {
        // TODO: Replace with actual API call to fetch cache values
        // This would call an endpoint like: /api/cache/values?cache_tag=${cache.cacheTag}&product_tag=${cache.productTag}
        const response = await fetch(`${import.meta.env.VITE_API_URL}/cache/values`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cache_tag: cache.cacheTag || cache.tag,
            product_tag: cache.productTag,
            workspace_id: currentWorkspaceId,
            user_id: user?._id,
            public_key: user?.public_key,
          }),
        });

        if (!response.ok) {
          // Return dummy data if API fails
          return DUMMY_CACHE_VALUES;
        }

        const data = await response.json();
        return data.data || DUMMY_CACHE_VALUES;
      } catch (error) {
        // Return dummy data on error
        console.log('Using dummy cache data:', error);
        return DUMMY_CACHE_VALUES;
      }
    },
    enabled: true, // Always enabled to show dummy data
  });

  const cacheValues: IRemoteCache[] = cacheValuesData || DUMMY_CACHE_VALUES;

  // Get unique types and tags
  const uniqueTypes = Array.from(new Set(cacheValues.map(item => item.component_type)));
  const uniqueTags = Array.from(new Set(cacheValues.map(item => item.component_tag)));

  const filteredValues = cacheValues.filter(item => {
    // Search filter
    const matchesSearch = !searchQuery ||
      item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.value.toLowerCase().includes(searchQuery.toLowerCase());

    // Type filter
    const matchesType = selectedType === 'all' || item.component_type === selectedType;

    // Tag filter
    const matchesTag = selectedTag === 'all' || item.component_tag === selectedTag;

    return matchesSearch && matchesType && matchesTag;
  });

  const formatCountdown = (date?: Date) => {
    if (!date) return 'Never';

    const now = new Date().getTime();
    const expiryTime = new Date(date).getTime();
    const diff = expiryTime - now;

    if (diff <= 0) return 'Expired';

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatValue = (value: string) => {
    try {
      // Try to parse as JSON for better display
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  const getComponentTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      database: Database,
      storage: HardDrive,
      cache: Layers,
      'message-broker': MessageSquare,
      job: Box,
      notification: Bell,
      feature: Workflow,
      fallback: Shield,
      quota: Timer,
      healthcheck: Heart,
      webhook: Settings2,
      session: KeyRound,
    };
    return icons[type] || Box;
  };

  // Show error if cache data is incomplete
  if (!cache?.tag && !cache?.cacheTag) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Zap className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete cache data</p>
          <p className="text-grey-500 text-sm">
            Unable to load cache values. Please try reopening this cache.
          </p>
        </div>
      </div>
    );
  }

  // Extract product info for header
  const product = cache?.productName && cache?.productTag ? {
    name: cache.productName,
    tag: cache.productTag,
    logo: cache.productLogo,
  } : null;

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Product Context Header */}
        {product && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {product.logo ? (
                  <img
                    src={product.logo}
                    alt={product.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  product.name?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-grey">Cache Values for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  Real-time view of cached data for {cache.name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
                <Layers className="h-6 w-6 text-red" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey mb-2">{cache.name}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="text-xs font-mono">
                    <Tag className="h-3 w-3 mr-1" />
                    {cache.cacheTag || cache.tag}
                  </Badge>
                  <Badge className="text-xs bg-red/10 text-red border-red/20 hover:bg-red/10">
                    <Database className="h-3 w-3 mr-1" />
                    {filteredValues.length} {filteredValues.length === 1 ? 'entry' : 'entries'}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {!isLoading && filteredValues.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-red" />
                <h3 className="text-sm font-semibold text-grey">Total Entries</h3>
              </div>
              <p className="text-2xl font-bold text-grey">{filteredValues.length}</p>
              <p className="text-xs text-grey-600 mt-1">
                Active cache entries
              </p>
            </div>

            <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <h3 className="text-sm font-semibold text-grey">With Expiry</h3>
              </div>
              <p className="text-2xl font-bold text-grey">
                {filteredValues.filter(v => v.expiry).length}
              </p>
              <p className="text-xs text-grey-600 mt-1">
                Entries with expiration
              </p>
            </div>

            <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-5 w-5 text-green" />
                <h3 className="text-sm font-semibold text-grey">Components</h3>
              </div>
              <p className="text-2xl font-bold text-grey">
                {new Set(filteredValues.map(v => v.component_tag)).size}
              </p>
              <p className="text-xs text-grey-600 mt-1">
                Unique components
              </p>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                placeholder="Search by key or value..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type Filter */}
            <div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(type => {
                    const Icon = getComponentTypeIcon(type);
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Tag Filter */}
            <div>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {uniqueTags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        {tag}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Cache Values Table */}
        <div className="bg-white rounded-lg border border-grey-400 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-grey-600">Loading cache values...</p>
              </div>
            </div>
          ) : filteredValues.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-grey-600 mb-2">
                {searchQuery ? 'No matching cache entries' : 'No cache entries yet'}
              </p>
              <p className="text-grey-500 text-sm">
                {searchQuery ? 'Try a different search term' : 'Cache values will appear here once data is cached'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-grey-50 hover:bg-grey-50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="font-semibold">Cache Key</TableHead>
                    <TableHead className="font-semibold">Tag</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Expires In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredValues.map((item, index) => {
                    const rowKey = `${item.key}-${index}`;
                    const isExpanded = expandedRows.has(rowKey);
                    const countdown = formatCountdown(item.expiry);
                    const isExpired = countdown === 'Expired';
                    const isNever = countdown === 'Never';

                    return (
                      <>
                        <TableRow
                          key={rowKey}
                          className="cursor-pointer hover:bg-grey-50"
                          onClick={() => toggleRow(rowKey)}
                        >
                          <TableCell className="text-center">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-grey-600 mx-auto" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-grey-600 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Code2 className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <span className="font-mono text-sm font-medium text-grey truncate max-w-md">
                                {item.key}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-medium text-grey">
                                <Layers className="h-3 w-3 mr-1" />
                                {item.component_tag}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-medium">
                              {(() => {
                                const Icon = getComponentTypeIcon(item.component_type);
                                return (
                                  <>
                                    <Icon className="h-3 w-3 mr-1" />
                                    {item.component_type}
                                  </>
                                );
                              })()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isNever ? (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100 font-mono">
                                <Clock className="h-3 w-3 mr-1" />
                                Never
                              </Badge>
                            ) : isExpired ? (
                              <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 hover:bg-red-100 font-mono">
                                <Clock className="h-3 w-3 mr-1" />
                                Expired
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100 font-mono">
                                <Clock className="h-3 w-3 mr-1" />
                                {countdown}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow key={`${rowKey}-expanded`} className="">
                            <TableCell colSpan={5} className="p-0">
                              <div className="p-6 space-y-4">
                                {/* Full Key */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Code2 className="h-4 w-4 text-grey-600" />
                                    <span className="text-xs font-semibold text-grey uppercase tracking-wide">Full Key</span>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 border border-grey-300">
                                    <code className="text-xs font-mono text-grey break-all">{item.key}</code>
                                  </div>
                                </div>

                                {/* Value */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Database className="h-4 w-4 text-grey-600" />
                                    <span className="text-xs font-semibold text-grey uppercase tracking-wide">Cached Value</span>
                                  </div>
                                  <div className="bg-gradient-to-br from-white to-grey-50 rounded-lg p-4 border border-grey-300">
                                    <pre className="text-xs font-mono text-grey overflow-x-auto whitespace-pre-wrap break-all max-h-80 overflow-y-auto">
{formatValue(item.value)}
                                    </pre>
                                  </div>
                                </div>

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="bg-white rounded-lg p-3 border border-grey-300">
                                    <div className="text-xs font-semibold mb-1">Cache Tag</div>
                                    <Badge variant="outline" className="text-xs">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {item.cache_tag}
                                    </Badge>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 border border-grey-300">
                                    <div className="text-xs font-semibold mb-1">Component Tag</div>
                                    <Badge variant="outline" className="text-xs">
                                      <Layers className="h-3 w-3 mr-1" />
                                      {item.component_tag}
                                    </Badge>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 border border-grey-300">
                                    <div className="text-xs font-semibold mb-1">Product Tag</div>
                                    <span className="text-xs font-mono">{item.product_tag}</span>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 border border-grey-300">
                                    <div className="text-xs font-semibold mb-1">Component Type</div>
                                    <span className="text-xs">{item.component_type}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Info Box */}
        {!isLoading && filteredValues.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Cache Values</h3>
            <p className="text-xs text-blue-800">
              These are the current values stored in this cache. Values automatically expire based on the cache TTL configuration.
              Expired entries are automatically removed from the cache. Each entry shows its key, value, component tag, and expiration time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
