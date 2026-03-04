import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import marketplaceServices from '@/services/marketplaceServices';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe } from 'lucide-react';
import AppTabContent from '@/components/tabs/AppTabContent';
import { IApp } from '@/types/app';

export default function MarketplacePublicAppPage() {
  const { appTag } = useParams();

  const { data, status } = useQuery({
    queryKey: ['marketplace-app-public', appTag],
    queryFn: () => marketplaceServices.fetchAppPublicByTag(String(appTag)),
    enabled: !!appTag,
  });

  const app = data?.data as unknown as IApp;

  if (status === 'pending') {
    return (
      <div className="flex h-[calc(100vh-60px)] bg-grey-100 overflow-hidden border-t border-grey-400">
        <div className="w-64 bg-white border-r border-grey-400 p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="flex-1 p-8 space-y-6 bg-white">
          <div className="flex items-center gap-6">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)]">
        <div className="w-16 h-16 bg-grey-100 rounded-lg flex items-center justify-center mb-6">
          <Globe className="h-8 w-8 text-grey-400" />
        </div>
        <h2 className="text-xl font-bold text-grey">Application not found</h2>
        <p className="text-grey-600 text-sm mt-1">The app you're looking for doesn't exist.</p>
        <Link to="/marketplace" className="mt-6">
          <Button variant="outline">Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-60px)] overflow-hidden border-t border-grey-400">
      <AppTabContent
        app={app}
        isMarketplace={true}
      />
    </div>
  );
}
