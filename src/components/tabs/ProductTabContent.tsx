import { useState } from 'react';
import { IProduct } from '@/types/product';
import { Database, HardDrive, Activity, MessageSquare, Settings2, Zap, Box, Plus, ExternalLink, Loader2, Edit2, Grid3x3, Filter, Workflow, Shield, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import productServices from '@/services/productServices';
import AddAppModal from '@/components/modals/AddAppModal';
import CreateEnvironmentModal from '@/components/modals/CreateEnvironmentModal';

interface ProductTabContentProps {
  product: IProduct;
}

export default function ProductTabContent({ product }: ProductTabContentProps) {
  const { openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [showCreateEnvModal, setShowCreateEnvModal] = useState(false);

  // Content filter state
  const [activeFilter, setActiveFilter] = useState<string>('overview');

  // Fetch connected apps
  const { data: productAppsRes, status: productAppsStatus } = useQuery({
    queryKey: ['product-apps', product._id],
    queryFn: () =>
      productServices.fetchProductApps({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
        product_id: product._id,
      }),
    enabled: !!user?._id && !!user?.public_key && !!currentWorkspaceId && !!product._id,
  });

  const connectedApps = productAppsRes?.data || [];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleOpenComponent = (component: any, type: string) => {
    openTab({
      id: `${type}-${component._id}-${Date.now()}`,
      type: type as any,
      title: component.name || component.tag || `${type}`,
      itemId: component._id,
      data: { ...component, componentType: type, productName: product.name },
    });
  };

  const handleAddComponent = (type: string) => {
    // Show modal for environment creation instead of opening a tab
    if (type === 'environment') {
      setShowCreateEnvModal(true);
      return;
    }

    // Open a new tab for creating other components
    openTab({
      id: `new-${type}-${Date.now()}`,
      type: type as any,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      data: {
        componentType: type,
        productName: product.name,
        productId: product._id,
        productTag: product.tag,
        productLogo: product.logo,
        productEnvs: product.envs || [],
        workspaceId: currentWorkspaceId,
        // Additional data for jobs (parent/event selection)
        productApps: connectedApps || [],
        productDatabases: product.databases || [],
        productMessageBroker: product.messageBroker || [],
        productNotifications: product.notifications || [],
        productStorage: product.storage || [],
        isNew: true
      },
      isDirty: true, // Mark as dirty to trigger new component forms
    });
  };

  return (
    <div className="bg-grey-100">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Product Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
              {product.logo ? (
                <img
                  src={product.logo}
                  alt={product.name}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                getInitials(product.name)
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-grey">{product.name}</h1>
                <span className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium',
                  product.status === 'active' ? 'bg-green/10 text-green' : 'bg-grey-400 text-grey-600'
                )}>
                  {product.status}
                </span>
              </div>
              <p className="text-sm text-grey-600 mb-3">{product.tag}</p>
              {product.description && (
                <p className="text-grey-600">{product.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content Filter Navigation */}
        <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-grey-600" />
            <span className="text-sm font-medium text-grey-600">Quick Access:</span>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={activeFilter === 'overview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('overview')}
                className="gap-2"
              >
                <Grid3x3 className="h-4 w-4" />
                Overview
              </Button>
              <Button
                variant={activeFilter === 'apps' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('apps')}
                className="gap-2"
              >
                <Grid3x3 className="h-4 w-4" />
                Apps ({connectedApps.length})
              </Button>
              <Button
                variant={activeFilter === 'environments' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('environments')}
                className="gap-2"
              >
                <Settings2 className="h-4 w-4" />
                Environments ({product.envs?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'databases' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('databases')}
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                Databases ({product.databases?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'storage' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('storage')}
                className="gap-2"
              >
                <HardDrive className="h-4 w-4" />
                Storage ({product.storage?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'caches' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('caches')}
                className="gap-2"
              >
                <Activity className="h-4 w-4" />
                Caches ({product.caches?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'messageBrokers' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('messageBrokers')}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Message Brokers ({product.messageBroker?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'jobs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('jobs')}
                className="gap-2"
              >
                <Box className="h-4 w-4" />
                Jobs ({product.jobs?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'features' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('features')}
                className="gap-2"
              >
                <Workflow className="h-4 w-4" />
                Features ({product.features?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'fallbacks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('fallbacks')}
                className="gap-2"
              >
                <Shield className="h-4 w-4" />
                Fallbacks ({product.fallback?.length || 0})
              </Button>
              <Button
                variant={activeFilter === 'quotas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('quotas')}
                className="gap-2"
              >
                <Timer className="h-4 w-4" />
                Quotas ({product.quota?.length || 0})
              </Button>
            </div>
          </div>
        </div>

        {/* Product Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{product.envs?.length || 0}</p>
                <p className="text-sm text-grey-600">Environments</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                <Grid3x3 className="h-5 w-5 text-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{connectedApps.length}</p>
                <p className="text-sm text-grey-600">Connected Apps</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">
                  {(product.databases?.length || 0) +
                   (product.storage?.length || 0) +
                   (product.caches?.length || 0) +
                   (product.features?.length || 0)}
                </p>
                <p className="text-sm text-grey-600">Total Features</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections with Filtering */}
        {activeFilter === 'overview' && (
          <div className="space-y-6">
            {/* Show all sections in overview mode */}
            {renderConnectedAppsCard()}
            {renderEnvironmentsCard()}
            {renderDatabasesCard()}
            {renderStorageCard()}
            {renderCachesCard()}
            {renderMessageBrokersCard()}
            {renderJobsCard()}
            {renderFeaturesCard()}
            {renderFallbacksCard()}
            {renderQuotasCard()}
          </div>
        )}

        {activeFilter === 'apps' && renderConnectedAppsCard()}
        {activeFilter === 'environments' && renderEnvironmentsCard()}
        {activeFilter === 'databases' && renderDatabasesCard()}
        {activeFilter === 'storage' && renderStorageCard()}
        {activeFilter === 'caches' && renderCachesCard()}
        {activeFilter === 'messageBrokers' && renderMessageBrokersCard()}
        {activeFilter === 'jobs' && renderJobsCard()}
        {activeFilter === 'features' && renderFeaturesCard()}
        {activeFilter === 'fallbacks' && renderFallbacksCard()}
        {activeFilter === 'quotas' && renderQuotasCard()}
      </div>

      {/* Add App Modal */}
      <AddAppModal
        open={showAddAppModal}
        onOpenChange={setShowAddAppModal}
        product={product}
      />

      {/* Create Environment Modal */}
      <CreateEnvironmentModal
        open={showCreateEnvModal}
        onOpenChange={setShowCreateEnvModal}
        productTag={product.tag}
        productId={product._id}
      />
    </div>
  );

  // Render functions for each section
  function renderConnectedAppsCard() {
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5 text-grey-600" />
            <h2 className="text-lg font-semibold text-grey">Connected Apps</h2>
            <span className="text-sm text-grey-600">({connectedApps.length})</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddAppModal(true)}
            className="h-8 gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
          
          {productAppsStatus === 'pending' ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-grey-600">Loading apps...</span>
            </div>
          ) : connectedApps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedApps.map((app: any) => (
                <div
                  key={app._id}
                  className="p-4 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* App Logo */}
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {app.logo ? (
                        <img
                          src={app.logo}
                          alt={app.app_name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold text-sm">
                          {app.app_name?.[0]?.toUpperCase() || 'A'}
                        </span>
                      )}
                    </div>
                    
                    {/* App Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-grey truncate">
                        {app.app_name || app.name}
                      </h3>
                      <p className="text-xs text-grey-600 truncate">
                        {app.tag || app.app_tag}
                      </p>
                      {app.description && (
                        <p className="text-xs text-grey-500 mt-1 line-clamp-2">
                          {app.description}
                        </p>
                      )}
                      
                      {/* App Status */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          app.status === 'active' ? 'bg-green/10 text-green' : 'bg-grey-400 text-grey-600'
                        )}>
                          {app.status || 'Unknown'}
                        </span>
                        {app.access_tag && (
                          <span className="text-xs text-grey-500">
                            Access: {app.access_tag.split(':')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* External Link Icon */}
                    <ExternalLink className="h-4 w-4 text-grey-400 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Grid3x3 className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No apps connected yet</p>
              <p className="text-xs text-grey-500">
                Connect apps and start building integrations
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderEnvironmentsCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Environments</h2>
              <span className="text-sm text-grey-600">({product.envs?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('environment')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          
          {product.envs && product.envs.length > 0 ? (
            <div className="space-y-3">
              {product.envs.map((env) => (
                <div
                  key={env._id}
                  className="flex items-center justify-between p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-grey">{env.env_name}</h3>
                    <p className="text-xs text-grey-600">{env.slug}</p>
                    {env.description && (
                      <p className="text-xs text-grey-500 mt-1">{env.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      env.active ? 'bg-green/10 text-green' : 'bg-grey-400 text-grey-600'
                    )}>
                      {env.active ? 'Active' : 'Inactive'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenComponent(env, 'environment')}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Settings2 className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No environments configured yet</p>
              <p className="text-xs text-grey-500">
                Add environments to organize your product's different deployment stages
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderDatabasesCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Databases</h2>
              <span className="text-sm text-grey-600">({product.databases?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('database')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product.databases && product.databases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.databases.map((db: any) => (
                <button
                  key={db._id}
                  onClick={() => handleOpenComponent(db, 'database')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {db.name || db.tag}
                    </p>
                  </div>
                  {db.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {db.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No databases added yet</p>
              <p className="text-xs text-grey-500">
                Add databases to store your product's data
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderStorageCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Storage</h2>
              <span className="text-sm text-grey-600">({product.storage?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('storage')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product.storage && product.storage.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.storage.map((storage: any) => (
                <button
                  key={storage._id}
                  onClick={() => handleOpenComponent(storage, 'storage')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {storage.name || storage.tag}
                    </p>
                  </div>
                  {storage.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {storage.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <HardDrive className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No storage added yet</p>
              <p className="text-xs text-grey-500">
                Add storage solutions for your product's files and assets
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderCachesCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Caches</h2>
              <span className="text-sm text-grey-600">({product.caches?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('cache')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product.caches && product.caches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.caches.map((cache: any) => (
                <button
                  key={cache._id}
                  onClick={() => handleOpenComponent(cache, 'cache')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {cache.name || cache.tag}
                    </p>
                  </div>
                  <p className="text-xs text-grey-600 mt-1">
                    Expires in {cache.expiry} {cache.period}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No caches added yet</p>
              <p className="text-xs text-grey-500">
                Add caches to improve your product's performance
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderMessageBrokersCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Message Brokers</h2>
              <span className="text-sm text-grey-600">({product.messageBroker?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('message-broker')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product.messageBroker && product.messageBroker.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.messageBroker.map((broker: any) => (
                <button
                  key={broker._id}
                  onClick={() => handleOpenComponent(broker, 'message-broker')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {broker.name || broker.tag}
                    </p>
                  </div>
                  {broker.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {broker.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No message brokers added yet</p>
              <p className="text-xs text-grey-500">
                Add message brokers for asynchronous communication
              </p>
            </div>
          )}
      </div>
    );
  }

  function renderJobsCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Box className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Jobs</h2>
              <span className="text-sm text-grey-600">({product.jobs?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('job')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product.jobs && product.jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.jobs.map((job: any) => (
                <button
                  key={job._id}
                  onClick={() => handleOpenComponent(job, 'job')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {job.name || job.tag}
                    </p>
                  </div>
                  {job.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {job.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Box className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No jobs added yet</p>
              <p className="text-xs text-grey-500">
                Add background jobs for your product's processing tasks
              </p>
            </div>
          )}
        </div>
    );
  }

  function renderFeaturesCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Features</h2>
              <span className="text-sm text-grey-600">({product.features?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('feature')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product.features && product.features.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.features.map((feature: any) => (
                <button
                  key={feature._id}
                  onClick={() => handleOpenComponent(feature, 'feature')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {feature.name || feature.tag}
                    </p>
                  </div>
                  {feature.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {feature.description}
                    </p>
                  )}
                  {feature.sequence && (
                    <p className="text-xs text-grey-500 mt-1">
                      {feature.sequence.reduce((acc: number, seq: any) => acc + seq.events.length, 0)} Events
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Workflow className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No features added yet</p>
              <p className="text-xs text-grey-500">
                Create workflows combining multiple actions and services
              </p>
            </div>
          )}
        </div>
    );
  }

  function renderFallbacksCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Fallbacks</h2>
              <span className="text-sm text-grey-600">({product.fallback?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('fallback')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product.fallback && product.fallback.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.fallback.map((fallback: any) => (
                <button
                  key={fallback._id}
                  onClick={() => handleOpenComponent(fallback, 'fallback')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {fallback.name || fallback.tag}
                    </p>
                  </div>
                  {fallback.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {fallback.description}
                    </p>
                  )}
                  {fallback.options && (
                    <p className="text-xs text-grey-500 mt-1">
                      {fallback.options.length} Provider{fallback.options.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No fallbacks added yet</p>
              <p className="text-xs text-grey-500">
                Define fallback providers for redundancy and reliability
              </p>
            </div>
          )}
        </div>
    );
  }

  function renderQuotasCard() {
    return (
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey">Quotas</h2>
              <span className="text-sm text-grey-600">({product.quota?.length || 0})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddComponent('quota')}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {product.quota && product.quota.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.quota.map((quota: any) => (
                <button
                  key={quota._id}
                  onClick={() => handleOpenComponent(quota, 'quota')}
                  className="p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium text-grey truncate">
                      {quota.name || quota.tag}
                    </p>
                  </div>
                  {quota.description && (
                    <p className="text-xs text-grey-600 mt-1 line-clamp-2">
                      {quota.description}
                    </p>
                  )}
                  {quota.total_quota && (
                    <p className="text-xs text-grey-500 mt-1">
                      Limit: {quota.total_quota}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Timer className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-2">No quotas added yet</p>
              <p className="text-xs text-grey-500">
                Set usage limits and quota management for API calls
              </p>
            </div>
          )}
        </div>
    );
  }
}
