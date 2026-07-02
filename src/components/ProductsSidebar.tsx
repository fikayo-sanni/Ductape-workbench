import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Input } from './ui/input';
import { Search, Loader2, Database, HardDrive, MessageSquare, Box, Shield, Timer, Workflow, Bell, Heart, Settings2, Layers, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IProduct } from '@/types/product';
import productServicesReal from '@/services/productServicesReal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

type ViewMode = 'products' | 'components';

export default function ProductsSidebar() {
  const { user, currentWorkspaceId } = useAuth();
  const { openTab } = useWorkbenchStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('products');

  const handleProductClick = (product: IProduct) => {
    setSelectedProductId(product._id);
    openTab({
      id: `product-${product._id}`,
      type: 'product',
      title: product.name,
      itemId: product._id,
      data: product,
    });
  };

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', currentWorkspaceId],
    queryFn: () =>
      productServicesReal.fetchProducts({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  const products = productsData?.data || [];

  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    return (
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      public: 'bg-green text-white',
      private: 'bg-yellow text-white',
      draft: 'bg-grey-400 text-grey',
    };
    return colors[status.toLowerCase()] || 'bg-grey-400 text-grey';
  };

  // Get all components from all products
  const getAllComponents = () => {
    const components: Array<{ type: string; name: string; productName: string; data: any }> = [];

    products.forEach((product: IProduct) => {
      // Databases
      product.databases?.forEach((db: any) => {
        components.push({ type: 'database', name: db.name || db.tag, productName: product.name, data: { ...db, name: db.name, tag: db.tag, componentType: 'database', productName: product.name, productTag: product.tag, productLogo: product.logo } });
      });
      // Storage
      product.storage?.forEach((storage: any) => {
        components.push({ type: 'storage', name: storage.name || storage.tag, productName: product.name, data: { ...storage, name: storage.name, tag: storage.tag, componentType: 'storage', productName: product.name, productTag: product.tag, productLogo: product.logo } });
      });
      // Caches
      product.caches?.forEach((cache: any) => {
        components.push({ type: 'cache', name: cache.name || cache.tag, productName: product.name, data: { ...cache, name: cache.name, tag: cache.tag, componentType: 'cache', productName: product.name, productTag: product.tag, productLogo: product.logo } });
      });
      // Message Brokers
      product.messageBrokers?.forEach((broker: any) => {
        components.push({ type: 'message-broker', name: broker.name || broker.tag, productName: product.name, data: { ...broker, name: broker.name, tag: broker.tag, componentType: 'message-broker', productName: product.name, productTag: product.tag, productLogo: product.logo } });
      });
      // Jobs
      product.jobs?.forEach((job: any) => {
        components.push({ type: 'job', name: job.name || job.tag, productName: product.name, data: { ...job, name: job.name, tag: job.tag, componentType: 'job', productName: product.name, productTag: product.tag, productLogo: product.logo } });
      });
      // Notifications
      product.notifications?.forEach((notification: any) => {
        components.push({ type: 'notification', name: notification.name || notification.tag, productName: product.name, data: { ...notification, name: notification.name, tag: notification.tag, componentType: 'notification', productName: product.name, productTag: product.tag, productLogo: product.logo } });
      });
      // Fallbacks
      product.fallback?.forEach((fallback: any) => {
        components.push({ type: 'fallback', name: fallback.name || fallback.tag, productName: product.name, data: { ...fallback, name: fallback.name, tag: fallback.tag, componentType: 'fallback', productName: product.name, productTag: product.tag, productLogo: product.logo } });
      });
      // Quotas
      product.quota?.forEach((quota: any) => {
        components.push({ type: 'quota', name: quota.name || quota.tag, productName: product.name, data: { ...quota, name: quota.name, tag: quota.tag, componentType: 'quota', productName: product.name, productTag: product.tag, productLogo: product.logo } });
      });
      // Healthchecks
      product.healthchecks?.forEach((healthcheck: any) => {
        components.push({ type: 'healthcheck', name: healthcheck.name || healthcheck.tag, productName: product.name, data: { ...healthcheck, name: healthcheck.name, tag: healthcheck.tag, componentType: 'healthcheck', productName: product.name, productTag: product.tag, productLogo: product.logo } });
      });
      // Sessions
      product.sessions?.forEach((session: any) => {
        components.push({ type: 'session', name: session.name || session.tag, productName: product.name, data: { ...session, name: session.name, tag: session.tag, componentType: 'session', productName: product.name, productTag: product.tag, productLogo: product.logo, productId: product._id } });
      });
    });

    return components.filter(comp => {
      if (!searchQuery) return true;
      return (
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  };

  const handleComponentClick = (component: any) => {
    openTab({
      id: `${component.type}-${component.data._id}-${Date.now()}`,
      type: component.type as any,
      title: component.name,
      itemId: component.data._id,
      data: component.data,
    });
  };

  const getComponentIcon = (type: string) => {
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

  return (
    <div className="h-full flex flex-col bg-white border-r border-grey-400" data-intro="products-view">
      {/* Header */}
      <div className="p-4 border-b border-grey-400">
        <h2 className="text-lg font-semibold text-grey mb-3">Products</h2>

        {/* View Mode Toggle */}
        <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="products">View Products</SelectItem>
            <SelectItem value="components">View Assets</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-grey-400">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
          <Input
            placeholder={viewMode === 'products' ? 'Search products...' : 'Search assets...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : viewMode === 'products' ? (
          // Products View
          filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-grey-600 text-sm">
              {searchQuery ? 'No matching products' : 'No products yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredProducts.map((product: IProduct) => (
                <div
                  key={product._id}
                  className={cn(
                    'group p-2 rounded-md border border-grey-400 hover:border-primary hover:bg-grey-100 transition-colors flex items-center gap-2 dark:hover:bg-grey-400/30',
                    selectedProductId === product._id && 'border-primary bg-blue-400 dark:bg-primary/20'
                  )}
                >
                  {/* Logo or Initials */}
                  <div
                    onClick={() => handleProductClick(product)}
                    className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 cursor-pointer"
                  >
                    {product.logo ? (
                      <img
                        src={product.logo}
                        alt={product.name}
                        className="w-full h-full rounded-md object-cover"
                      />
                    ) : (
                      getInitials(product.name)
                    )}
                  </div>

                  {/* Product Info */}
                  <div
                    onClick={() => handleProductClick(product)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-grey truncate">
                        {product.name}
                      </h3>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0',
                          getStatusColor(product.status)
                        )}
                      >
                        {product.status}
                      </span>
                    </div>
                    <p className="text-xs text-grey-600 truncate">{product.tag}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Components View
          (() => {
            const allComponents = getAllComponents();
            return allComponents.length === 0 ? (
              <div className="text-center py-8 text-grey-600 text-sm">
                {searchQuery ? 'No matching components' : 'No components yet'}
              </div>
            ) : (
              <div className="space-y-1">
                {allComponents.map((component, index) => {
                  const Icon = getComponentIcon(component.type);
                  return (
                    <div
                      key={`${component.type}-${component.data._id}-${index}`}
                      onClick={() => handleComponentClick(component)}
                      className="p-2 rounded-md border border-grey-400 hover:border-primary hover:bg-grey-100 transition-colors flex items-center gap-2 cursor-pointer dark:hover:bg-grey-400/30"
                    >
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>

                      {/* Component Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-grey truncate">
                          {component.name}
                        </h3>
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-grey-600 truncate">{component.productName}</p>
                          <span className="text-xs text-grey-400">•</span>
                          <p className="text-xs text-grey-600 capitalize">{component.type.replace('-', ' ')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
