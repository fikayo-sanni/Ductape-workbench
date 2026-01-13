import { Zap, Clock, Tag, Layers, Server, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface CacheTabContentProps {
  cache: any;
}

export default function CacheTabContent({ cache }: CacheTabContentProps) {
  const { openTab } = useWorkbenchStore();

  // Show error if cache data is incomplete and can't be fetched
  if (!cache?.name && !cache?.tag) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Layers className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete cache data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the cache from your product to reload it.
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

  // Get environments from productEnvironments
  const environments = cache?.productEnvironments || [];

  const formatExpiry = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  const handleViewCache = (env: any) => {
    openTab({
      id: `cache-values-${cache.tag}-${env.slug}`,
      type: 'cache-values',
      title: `${cache.name} (${env.slug})`,
      itemId: `${cache._id}-${env.slug}`,
      data: {
        ...cache,
        cacheTag: cache.tag,
        productTag: cache.productTag,
        env: { slug: env.slug },
      },
    });
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
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
                  <h2 className="text-xl font-bold text-grey">Cache for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This cache is connected to your product and available across all environments
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Layers className="h-6 w-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{cache.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Tag: <span className="font-mono">{cache.tag}</span></span>
                {cache.expiry !== undefined && (
                  <span className="px-3 py-1 rounded text-xs font-medium bg-orange-500/10 text-orange-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    TTL: {formatExpiry(cache.expiry)}
                  </span>
                )}
              </div>
              {cache.description && (
                <p className="text-sm text-grey-600">{cache.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Environment Connections */}
        {environments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-grey">Environment Connections</h2>
            {environments.map((env: any, index: number) => (
              <div key={index} className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold text-grey">{env.slug}</h3>
                  </div>
                  <Button
                    onClick={() => handleViewCache(env)}
                    className="gap-2"
                    size="sm"
                  >
                    <Layers className="h-4 w-4" />
                    View Cache Values
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {env.name && env.name !== env.slug && (
                  <p className="text-sm text-grey-600 mb-3">{env.name}</p>
                )}

                {/* Cache Info for this env */}
                <div className="p-3 rounded-lg bg-grey-50 border border-grey-400">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-grey-600">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span>TTL: <strong className="text-grey">{formatExpiry(cache.expiry || 0)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-grey-600">
                      <Tag className="h-4 w-4 text-primary" />
                      <span>Cache Key Prefix: <strong className="font-mono text-grey">{cache.tag}:{env.slug}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cache Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Cache Configuration</h2>

          <div className="space-y-4">
            {/* Cache Name */}
            <div>
              <Label className="text-sm font-semibold text-grey">Cache Name</Label>
              <Input
                value={cache.name}
                readOnly
                className="mt-2"
              />
            </div>

            {/* Cache Tag */}
            <div>
              <Label className="text-sm font-semibold text-grey">Tag</Label>
              <Input
                value={cache.tag}
                readOnly
                className="mt-2 font-mono"
              />
            </div>

            {/* Expiry Time */}
            <div>
              <Label className="text-sm font-semibold text-grey">Expiry Time (TTL)</Label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Input
                  value={`${cache.expiry || 0} seconds`}
                  readOnly
                />
                <Input
                  value={formatExpiry(cache.expiry || 0)}
                  readOnly
                  className="text-grey-600"
                />
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Cached data will automatically expire after this duration
              </p>
            </div>

            {/* Description */}
            {cache.description && (
              <div>
                <Label className="text-sm font-semibold text-grey">Description</Label>
                <textarea
                  value={cache.description}
                  readOnly
                  className="mt-2 w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-grey-400 bg-white resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Cache Behavior Info */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">How Caching Works</h2>
          <div className="space-y-3 text-sm text-grey-600">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                1
              </span>
              <div>
                <p className="font-semibold text-grey">First Request</p>
                <p className="text-xs">Data is fetched from the source and stored in cache</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                2
              </span>
              <div>
                <p className="font-semibold text-grey">Subsequent Requests</p>
                <p className="text-xs">Data is served directly from cache (faster response)</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                3
              </span>
              <div>
                <p className="font-semibold text-grey">After Expiry</p>
                <p className="text-xs">Cache expires after {formatExpiry(cache.expiry || 0)} and data is refreshed on next request</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-orange-500" />
              <h3 className="text-sm font-semibold text-grey">Faster Response</h3>
            </div>
            <p className="text-xs text-grey-600">
              Cached data is served instantly without querying the source
            </p>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <h3 className="text-sm font-semibold text-grey">Reduced Load</h3>
            </div>
            <p className="text-xs text-grey-600">
              Less pressure on databases and external APIs
            </p>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-5 w-5 text-green" />
              <h3 className="text-sm font-semibold text-grey">Auto-Refresh</h3>
            </div>
            <p className="text-xs text-grey-600">
              Stale data is automatically refreshed based on TTL
            </p>
          </div>
        </div>

        {/* Empty State for no environments */}
        {environments.length === 0 && (
          <div className="bg-white rounded-lg border border-grey-400 p-12 shadow-sm text-center">
            <Layers className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-grey mb-2">No Environments Available</h3>
            <p className="text-sm text-grey-600">
              Configure environments in your product to view cache values per environment.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ About Caching</h3>
          <p className="text-xs text-blue-800">
            Caching stores frequently accessed data in memory for faster retrieval. The TTL (Time To Live) determines how long data stays cached before being refreshed. Lower TTLs mean fresher data but more frequent updates, while higher TTLs mean better performance but potentially stale data.
          </p>
        </div>
      </div>
    </div>
  );
}
