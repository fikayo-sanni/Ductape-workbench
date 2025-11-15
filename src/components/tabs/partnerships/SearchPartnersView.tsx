import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDummyPublishedBriefs } from '@/data/partnerships.dummy';
import { IProductBrief } from '@/types/partnership';
import ProductBriefDetailDialog from './ProductBriefDetailDialog';

export default function SearchPartnersView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrief, setSelectedBrief] = useState<IProductBrief | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Get published briefs with search
  const { data } = getDummyPublishedBriefs(1, 20, searchQuery);
  const briefs = data.briefs;

  const handleViewBrief = (brief: IProductBrief) => {
    setSelectedBrief(brief);
    setShowDetailDialog(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-grey-400 p-6">
        <h1 className="text-2xl font-semibold text-grey mb-4">Find Partners</h1>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
          <Input
            placeholder="Search by product or workspace name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-6">
        {briefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Search className="h-12 w-12 text-grey-400 mb-4" />
            <h3 className="text-lg font-medium text-grey mb-2">
              {searchQuery ? 'No partners found' : 'Search for partners'}
            </h3>
            <p className="text-sm text-grey-600 max-w-sm">
              {searchQuery
                ? 'Try a different search term'
                : 'Enter a product or workspace name to find service providers'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl">
            {briefs.map((brief) => (
              <div
                key={brief._id}
                className="bg-white rounded-lg border border-grey-400 p-4 hover:border-primary hover:shadow-sm transition-all cursor-pointer"
                onClick={() => handleViewBrief(brief)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src={brief.product?.logo} alt={brief.product?.app_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(brief.product?.app_name || 'NA')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-grey mb-1">{brief.title}</h3>
                    <p className="text-sm text-grey-600 mb-2 line-clamp-2">
                      {brief.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-grey-600">
                      <span>{brief.workspace?.name}</span>
                      {brief.product?.tag && (
                        <>
                          <span>•</span>
                          <span>{brief.product.tag}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Brief Detail Dialog */}
      {selectedBrief && (
        <ProductBriefDetailDialog
          brief={selectedBrief}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
        />
      )}
    </div>
  );
}
