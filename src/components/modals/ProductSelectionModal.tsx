import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Search, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IProduct } from '@/types/product';
import productServicesReal from '@/services/productServicesReal';

interface ProductSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (productId: string) => void;
  onCreateNew?: () => void;
  title?: string;
  description?: string;
}

export default function ProductSelectionModal({
  open,
  onClose,
  onSelect,
  onCreateNew,
  title = 'Select Product',
  description = 'Choose a product to continue',
}: ProductSelectionModalProps) {
  const { user, currentWorkspaceId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', currentWorkspaceId, open],
    queryFn: () =>
      productServicesReal.fetchProducts({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    // Always enabled when modal is open
    enabled: open,
  });

  const products = productsData?.data || [];

  const filteredProducts = products.filter((product: IProduct) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="px-6 pt-6 pb-4 border-b border-grey-400">
          <DialogHeader>
            <DialogTitle className='text-grey'>{title}</DialogTitle>
            {description && (
              <p className="text-sm text-grey-600 mt-1">{description}</p>
            )}
          </DialogHeader>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Create New Product Button */}
          {onCreateNew && (
            <Button
              onClick={onCreateNew}
              className="w-full bg-primary text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Product
            </Button>
          )}

          {onCreateNew && (
            <div className="relative flex items-center gap-4">
              <div className="flex-1 h-px bg-grey-400" />
              <span className="text-xs text-grey-600">OR SELECT EXISTING</span>
              <div className="flex-1 h-px bg-grey-400" />
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-grey-600" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Products List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-grey-600">
                <Package className="h-12 w-12 mx-auto mb-2 text-grey-400" />
                <p>No products found</p>
              </div>
            ) : (
              filteredProducts.map((product: IProduct) => (
                <div
                  key={product._id}
                  onClick={() => onSelect(product._id)}
                  className={cn(
                    'p-4 rounded-lg border border-grey-400 cursor-pointer hover:border-primary hover:shadow-md transition-all',
                    'flex items-start gap-3'
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-grey mb-1">
                      {product.name}
                    </h4>
                    <p className="text-xs text-grey-600 line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions - Fixed Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-grey-400 bg-grey-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
