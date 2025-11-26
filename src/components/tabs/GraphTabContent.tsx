import { Share2, Server, Link, Copy, Check, Eye, EyeOff, Loader2, CheckCircle, ArrowRight, Network } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface GraphTabContentProps {
  graph: any;
}

export default function GraphTabContent({ graph }: GraphTabContentProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState<Record<number, boolean>>({});
  const { user, currentWorkspaceId } = useAuth();
  const { openTab } = useWorkbenchStore();

  // Initialize SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  });

  // Fetch graph details from SDK
  const { data: graphData, isLoading } = useQuery({
    queryKey: ['graph', graph?.tag],
    queryFn: async () => {
      if (!ductape || !graph?.tag) {
        return graph;
      }

      const sdk = ductape as any;
      const result = await sdk.graphs.fetch(graph.tag);
      return result;
    },
    enabled: !!ductape && !!graph?.tag,
  });

  const displayData = graphData || graph;

  // Extract product info for header
  const product = graph?.productName && graph?.productTag ? {
    name: graph.productName,
    tag: graph.productTag,
    logo: graph.productLogo,
  } : null;

  // Show loader only when actually loading
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading graph details...</p>
        </div>
      </div>
    );
  }

  // Show error if graph data is incomplete and can't be fetched
  if (!graph?.name && !graph?.tag) {
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

  if (!displayData) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Share2 className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600">Graph not found</p>
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

  const toggleShowConnection = (index: number) => {
    setShowConnections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleViewGraph = (env: any) => {
    openTab({
      id: `graph-explorer-${displayData.tag}-${env.slug}`,
      type: 'graph',
      title: `${displayData.name} (${env.slug})`,
      itemId: `${displayData.tag}-${env.slug}`,
      data: {
        graph: {
          name: displayData.name,
          tag: displayData.tag,
          type: displayData.type,
          env: env,
        },
        isExplorer: true,
      },
    });
  };

  const getGraphTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'neo4j':
        return 'bg-blue/10 text-blue';
      case 'neptune':
        return 'bg-orange-500/10 text-orange-500';
      case 'arangodb':
        return 'bg-green/10 text-green';
      case 'memgraph':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return 'bg-grey-400 text-grey';
    }
  };

  const getGraphTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'neo4j':
        return 'Neo4j';
      case 'neptune':
        return 'Neptune';
      case 'arangodb':
        return 'ArangoDB';
      case 'memgraph':
        return 'Memgraph';
      default:
        return type || 'Graph';
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
                  <h2 className="text-xl font-bold text-grey">Graph Database for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This graph database is connected to your product and configured for its environments
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
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Share2 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{displayData.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Tag: <span className="font-mono">{displayData.tag}</span></span>
                {displayData.type && (
                  <span className={cn('px-3 py-1 rounded text-xs font-medium uppercase', getGraphTypeColor(displayData.type))}>
                    {getGraphTypeIcon(displayData.type)}
                  </span>
                )}
              </div>
              {displayData.description && (
                <p className="text-sm text-grey-600">{displayData.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Graph Environments */}
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
                    onClick={() => handleViewGraph(env)}
                    className="gap-2"
                    size="sm"
                  >
                    <Network className="h-4 w-4" />
                    Explore Graph
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {env.description && (
                  <p className="text-sm text-grey-600 mb-3">{env.description}</p>
                )}

                {/* Connection URL */}
                {env.connection_url && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-semibold text-grey mb-2 flex items-center gap-2">
                        <Link className="h-4 w-4" />
                        Connection URL
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="relative flex-1">
                          <Input
                            type={showConnections[index] ? 'text' : 'password'}
                            value={env.connection_url}
                            readOnly
                            className="font-mono text-sm pr-10"
                          />
                          <button
                            onClick={() => toggleShowConnection(index)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey"
                          >
                            {showConnections[index] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(env.connection_url, `conn-${index}`)}
                        >
                          {copiedKey === `conn-${index}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Additional graph-specific fields */}
                    {(env.database || env.graphName || env.region) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                        {env.database && (
                          <div className="p-3 rounded-lg bg-grey-50 border border-grey-200">
                            <p className="text-xs text-grey-500 mb-1">Database</p>
                            <p className="text-sm font-medium text-grey">{env.database}</p>
                          </div>
                        )}
                        {env.graphName && (
                          <div className="p-3 rounded-lg bg-grey-50 border border-grey-200">
                            <p className="text-xs text-grey-500 mb-1">Graph Name</p>
                            <p className="text-sm font-medium text-grey">{env.graphName}</p>
                          </div>
                        )}
                        {env.region && (
                          <div className="p-3 rounded-lg bg-grey-50 border border-grey-200">
                            <p className="text-xs text-grey-500 mb-1">Region</p>
                            <p className="text-sm font-medium text-grey">{env.region}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Parse connection string info */}
                {env.connection_url && (
                  <div className="mt-4 p-3 rounded-lg bg-grey-50 border border-grey-400">
                    <p className="text-xs text-grey-600">
                      <span className="font-semibold">Note:</span> This connection string contains sensitive credentials. Keep it secure and never commit it to version control.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {(!displayData.envs || displayData.envs.length === 0) && (
          <div className="bg-white rounded-lg border border-grey-400 p-12 shadow-sm text-center">
            <Share2 className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-grey mb-2">No Environments Configured</h3>
            <p className="text-sm text-grey-600">
              This graph database doesn't have any environment connections configured yet.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-purple-900 mb-2">About Graph Databases</h3>
          <p className="text-xs text-purple-800">
            Graph databases store data as nodes and relationships, making them ideal for connected data like social networks, recommendation engines, and knowledge graphs.
            Supported types include Neo4j, AWS Neptune, ArangoDB, and Memgraph.
          </p>
        </div>
      </div>
    </div>
  );
}
