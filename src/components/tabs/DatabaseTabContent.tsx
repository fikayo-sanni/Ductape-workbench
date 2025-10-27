import { Database, Server, Link, Copy, Check, Eye, EyeOff, Table, GitBranch, Zap, Loader2, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';

interface DatabaseTabContentProps {
  database: any;
}

export default function DatabaseTabContent({ database }: DatabaseTabContentProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState<Record<number, boolean>>({});
  
  const { user, currentWorkspaceId } = useAuth();
  const productTag = database?.productTag;
  
  // Initialize SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  });

  // Fetch database details from SDK
  const { data: databaseData, isLoading } = useQuery({
    queryKey: ['database', productTag, database?.tag],
    queryFn: async () => {
      if (!ductape || !productTag || !database?.tag) return database;
      const productBuilder = ductape as any;
      await productBuilder.init(productTag);
      return await productBuilder.databases.fetch(database.tag);
    },
    enabled: !!ductape && !!productTag && !!database?.tag,
  });

  const displayData = databaseData || database;
  
  // Extract product info for header
  const product = database?.productName && database?.productTag ? {
    name: database.productName,
    tag: database.productTag,
    logo: database.productLogo,
  } : null;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading database details...</p>
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

  const getDatabaseTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'postgresql':
      case 'postgres':
        return 'bg-blue/10 text-blue';
      case 'mongodb':
      case 'mongo':
        return 'bg-green/10 text-green';
      case 'mysql':
        return 'bg-orange-500/10 text-orange-500';
      case 'redis':
        return 'bg-red/10 text-red';
      default:
        return 'bg-grey-400 text-grey';
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
                  <h2 className="text-xl font-bold text-grey">Database for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This database is connected to your product and configured for its environments
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
            <div className="w-12 h-12 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
              <Database className="h-6 w-6 text-blue" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{displayData.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Tag: <span className="font-mono">{displayData.tag}</span></span>
                {displayData.type && (
                  <span className={cn('px-3 py-1 rounded text-xs font-medium uppercase', getDatabaseTypeColor(displayData.type))}>
                    {displayData.type}
                  </span>
                )}
              </div>
              {displayData.description && (
                <p className="text-sm text-grey-600">{displayData.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Database Environments */}
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
                </div>

                {env.description && (
                  <p className="text-sm text-grey-600 mb-3">{env.description}</p>
                )}

                {/* Connection URL */}
                {env.connection_url && (
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

        {/* Database Tables */}
        {displayData.tables && displayData.tables.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Table className="h-5 w-5 text-blue" />
              <h2 className="text-lg font-semibold text-grey">Tables</h2>
            </div>
            <div className="space-y-2">
              {displayData.tables.map((table: any, index: number) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-grey-400 hover:border-blue hover:bg-blue/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Table className="h-4 w-4 text-blue" />
                      <p className="text-sm font-medium text-grey">{table.name || table.tag}</p>
                    </div>
                  </div>
                  {table.description && (
                    <p className="text-xs text-grey-600 mt-2">{table.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Actions */}
        {displayData.actions && displayData.actions.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-yellow" />
              <h2 className="text-lg font-semibold text-grey">Actions</h2>
            </div>
            <div className="space-y-2">
              {displayData.actions.map((action: any, index: number) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-grey">{action.name || action.tag}</p>
                      {action.tableName && (
                        <p className="text-xs text-grey-600">Table: {action.tableName}</p>
                      )}
                    </div>
                    {action.type && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary uppercase">
                        {action.type}
                      </span>
                    )}
                  </div>
                  {action.description && (
                    <p className="text-xs text-grey-600 mt-2">{action.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Migrations */}
        {displayData.migrations && displayData.migrations.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="h-5 w-5 text-green" />
              <h2 className="text-lg font-semibold text-grey">Migrations</h2>
            </div>
            <div className="space-y-2">
              {displayData.migrations.map((migration: any, index: number) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-grey-400 hover:border-green hover:bg-green/5 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-green" />
                      <p className="text-sm font-medium text-grey">{migration.name}</p>
                    </div>
                    <span className="text-xs font-mono text-grey-600">{migration.tag}</span>
                  </div>
                  {migration.description && (
                    <p className="text-xs text-grey-600 mb-2">{migration.description}</p>
                  )}
                  {migration.value && (
                    <div className="mt-2 space-y-1">
                      {migration.value.up && migration.value.up.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium text-green">↑ Up:</span>
                          <span className="text-grey-600 ml-1">{migration.value.up.length} statement(s)</span>
                        </div>
                      )}
                      {migration.value.down && migration.value.down.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium text-red">↓ Down:</span>
                          <span className="text-grey-600 ml-1">{migration.value.down.length} statement(s)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!displayData.envs || displayData.envs.length === 0) && (
          <div className="bg-white rounded-lg border border-grey-400 p-12 shadow-sm text-center">
            <Database className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-grey mb-2">No Environments Configured</h3>
            <p className="text-sm text-grey-600">
              This database doesn't have any environment connections configured yet.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ About Databases</h3>
          <p className="text-xs text-blue-800">
            Database components provide connection management for various database types (PostgreSQL, MongoDB, MySQL, etc.). Each environment maintains its own connection string for isolation.
          </p>
        </div>
      </div>
    </div>
  );
}
