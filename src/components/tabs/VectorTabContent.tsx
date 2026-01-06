import { Boxes, Server, Link, Copy, Check, Eye, EyeOff, Loader2, CheckCircle, ArrowRight, Key as KeyIcon, Database as DatabaseIcon, Globe, Hash } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useSDKProxy } from '@/services/sdkProxy';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface VectorTabContentProps {
  vector: any;
}

export default function VectorTabContent({ vector }: VectorTabContentProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showEndpoints, setShowEndpoints] = useState<Record<number, boolean>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<number, boolean>>({});
  const { user, currentWorkspaceId } = useAuth();
  const { openTab } = useWorkbenchStore();

  // Initialize SDK Proxy
  const sdkProxy = useSDKProxy(
    vector?.productTag && user?._id
      ? {
          workspace_id: currentWorkspaceId || '',
          user_id: user._id || '',
          token: user.auth_token || '',
          public_key: user.public_key || '',
        }
      : null
  );

  // Fetch vector details from SDK Proxy
  const { data: vectorData, isLoading } = useQuery({
    queryKey: ['vector', vector?.productTag, vector?.tag],
    queryFn: async () => {
      if (!sdkProxy || !vector?.tag || !vector?.productTag) {
        return vector;
      }

      const result = await sdkProxy.vector.fetch({product: vector.productTag, tag: vector.tag});
      return result;
    },
    enabled: !!sdkProxy && !!vector?.tag && !!vector?.productTag,
  });

  const displayData = vectorData || vector;

  // Extract product info for header
  const product = vector?.productName && vector?.productTag ? {
    name: vector.productName,
    tag: vector.productTag,
    logo: vector.productLogo,
  } : null;

  // Show loader only when actually loading
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading vector store details...</p>
        </div>
      </div>
    );
  }

  // Show error if vector data is incomplete and can't be fetched
  if (!vector?.name && !vector?.tag) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Boxes className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete vector store data</p>
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

  if (!displayData) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Boxes className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600">Vector store not found</p>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleShowEndpoint = (index: number) => {
    setShowEndpoints(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleExploreVectors = (env: any) => {
    openTab({
      id: `vector-explorer-${displayData.tag}-${env.slug}`,
      type: 'vector',
      title: `${displayData.name} (${env.slug})`,
      itemId: `${displayData.tag}-${env.slug}`,
      data: {
        vector: {
          name: displayData.name,
          vector: displayData.tag,
          type: displayData.type,
          dimensions: displayData.dimensions,
          metric: displayData.metric,
          env: env,
          productTag: vector?.productTag,
          productName: vector?.productName,
        },
        isExplorer: true,
      },
    });
  };

  const getVectorTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pinecone':
        return 'bg-emerald-500/10 text-emerald-600';
      case 'qdrant':
        return 'bg-blue-500/10 text-blue-600';
      case 'weaviate':
        return 'bg-green-500/10 text-green-600';
      case 'milvus':
        return 'bg-purple-500/10 text-purple-600';
      case 'chroma':
        return 'bg-orange-500/10 text-orange-600';
      default:
        return 'bg-grey-400 text-grey';
    }
  };

  const getVectorTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pinecone':
        return 'Pinecone';
      case 'qdrant':
        return 'Qdrant';
      case 'weaviate':
        return 'Weaviate';
      case 'milvus':
        return 'Milvus';
      case 'chroma':
        return 'Chroma';
      default:
        return type || 'Vector';
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric?.toLowerCase()) {
      case 'cosine':
        return 'Cosine Similarity';
      case 'euclidean':
        return 'Euclidean Distance';
      case 'dotproduct':
        return 'Dot Product';
      default:
        return metric || 'Unknown';
    }
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
                  <h2 className="text-xl font-bold text-grey">Vector Store for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This vector store is connected to your product and configured for its environments
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-grey-600">
                <CheckCircle className="h-4 w-4 text-green" />
                <span>Auto-connect enabled</span>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Boxes className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{displayData.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Tag: <span className="font-mono">{displayData.tag}</span></span>
                {displayData.type && (
                  <span className={cn('px-3 py-1 rounded text-xs font-medium uppercase', getVectorTypeColor(displayData.type))}>
                    {getVectorTypeIcon(displayData.type)}
                  </span>
                )}
              </div>
              {displayData.description && (
                <p className="text-sm text-grey-600 mb-3">{displayData.description}</p>
              )}
              {/* Vector Configuration */}
              <div className="flex items-center gap-4 mt-3">
                {displayData.dimensions && (
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-grey-600" />
                    <span className="text-grey-600">Dimensions:</span>
                    <span className="font-mono font-semibold text-grey">{displayData.dimensions}</span>
                  </div>
                )}
                {displayData.metric && (
                  <div className="flex items-center gap-2 text-sm">
                    <DatabaseIcon className="h-4 w-4 text-grey-600" />
                    <span className="text-grey-600">Metric:</span>
                    <span className="font-semibold text-grey">{getMetricLabel(displayData.metric)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vector Environments */}
        {displayData.envs && displayData.envs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-grey">Environment Connections</h2>
            {displayData.envs.map((env: any, index: number) => (
              <div key={index} className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold text-grey">{env.slug}</h3>
                  </div>
                  <Button
                    onClick={() => handleExploreVectors(env)}
                    className="gap-2"
                    size="sm"
                  >
                    <Boxes className="h-4 w-4" />
                    Explore Vectors
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {env.description && (
                  <p className="text-sm text-grey-600 mb-3">{env.description}</p>
                )}

                {/* Endpoint URL */}
                {env.endpoint && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-semibold text-grey mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Endpoint URL
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="relative flex-1">
                          <Input
                            type={showEndpoints[index] ? 'text' : 'password'}
                            value={env.endpoint}
                            readOnly
                            className="font-mono text-sm pr-10"
                          />
                          <button
                            onClick={() => toggleShowEndpoint(index)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey"
                          >
                            {showEndpoints[index] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(env.endpoint, `endpoint-${index}`)}
                        >
                          {copiedKey === `endpoint-${index}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* API Key */}
                    {env.apiKey && (
                      <div>
                        <Label className="text-sm font-semibold text-grey mb-2 flex items-center gap-2">
                          <KeyIcon className="h-4 w-4" />
                          API Key
                        </Label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showApiKeys[index] ? 'text' : 'password'}
                              value={env.apiKey}
                              readOnly
                              className="font-mono text-sm pr-10"
                            />
                            <button
                              onClick={() => setShowApiKeys(prev => ({ ...prev, [index]: !prev[index] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey"
                            >
                              {showApiKeys[index] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(env.apiKey, `apiKey-${index}`)}
                          >
                            {copiedKey === `apiKey-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Index/Collection/Class Name and Namespace */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {env.index && (
                        <div>
                          <Label className="text-sm font-semibold text-grey mb-2 flex items-center gap-2">
                            <DatabaseIcon className="h-4 w-4" />
                            {displayData.type?.toLowerCase() === 'pinecone' ? 'Index Name' :
                             displayData.type?.toLowerCase() === 'qdrant' ? 'Collection Name' :
                             displayData.type?.toLowerCase() === 'weaviate' ? 'Class Name' : 'Index'}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={env.index}
                              readOnly
                              className="font-mono text-sm flex-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(env.index, `index-${index}`)}
                            >
                              {copiedKey === `index-${index}` ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                      {env.namespace && (
                        <div>
                          <Label className="text-sm font-semibold text-grey mb-2 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Namespace
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={env.namespace}
                              readOnly
                              className="font-mono text-sm flex-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(env.namespace, `namespace-${index}`)}
                            >
                              {copiedKey === `namespace-${index}` ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Region (if applicable) */}
                    {env.region && (
                      <div>
                        <Label className="text-sm font-semibold text-grey mb-2 flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Region
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={env.region}
                            readOnly
                            className="font-mono text-sm flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(env.region, `region-${index}`)}
                          >
                            {copiedKey === `region-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No environments message */}
        {(!displayData.envs || displayData.envs.length === 0) && (
          <div className="bg-white rounded-lg border border-grey-400 p-8 text-center">
            <Server className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-grey-600 mb-2">No environments configured</p>
            <p className="text-sm text-grey-500">
              This vector store doesn't have any environment connections set up yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
