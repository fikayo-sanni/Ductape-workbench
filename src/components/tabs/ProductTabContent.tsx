import { IProduct } from '@/types/product';
import { Package, Database, HardDrive, Activity, MessageSquare, Settings2, Zap, Box, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Button } from '@/components/ui/button';

interface ProductTabContentProps {
  product: IProduct;
}

export default function ProductTabContent({ product }: ProductTabContentProps) {
  const { openTab } = useWorkbenchStore();

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
    // Open a new tab for creating a component
    openTab({
      id: `new-${type}-${Date.now()}`,
      type: type as any,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      data: {
        componentType: type,
        productName: product.name,
        productId: product._id,
        productEnvs: product.envs || [], // Pass product environments for storage/database
        isNew: true
      },
      isDirty: true, // Mark as dirty to trigger new component forms
    });
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
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
                <Package className="h-5 w-5 text-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-grey">{product.apps?.length || 0}</p>
                <p className="text-sm text-grey-600">Apps</p>
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

        {/* Environments */}
        {product.envs && product.envs.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Environments</h2>
            <div className="space-y-3">
              {product.envs.map((env) => (
                <div
                  key={env._id}
                  className="flex items-center justify-between p-3 rounded-lg border border-grey-400"
                >
                  <div>
                    <h3 className="text-sm font-medium text-grey">{env.env_name}</h3>
                    <p className="text-xs text-grey-600">{env.slug}</p>
                  </div>
                  <span className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    env.active ? 'bg-green/10 text-green' : 'bg-grey-400 text-grey-600'
                  )}>
                    {env.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Databases */}
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
            <p className="text-sm text-grey-600 text-center py-4">No databases added yet</p>
          )}
        </div>

        {/* Storage */}
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
            <p className="text-sm text-grey-600 text-center py-4">No storage added yet</p>
          )}
        </div>

        {/* Caches */}
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
            <p className="text-sm text-grey-600 text-center py-4">No caches added yet</p>
          )}
        </div>

        {/* Message Brokers */}
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
            <p className="text-sm text-grey-600 text-center py-4">No message brokers added yet</p>
          )}
        </div>

        {/* Jobs */}
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
            <p className="text-sm text-grey-600 text-center py-4">No jobs added yet</p>
          )}
        </div>

      </div>
    </div>
  );
}
