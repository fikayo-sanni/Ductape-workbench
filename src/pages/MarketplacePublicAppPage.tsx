import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import marketplaceServices from '@/services/marketplaceServices';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download, Globe } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { useLoginModalStore } from '@/stores/login-modal-store';
import AppIntegrationModal from '@/components/marketplace/AppIntegrationModal';
import { IntegrationProvider } from '@/context/integration-context';
import { useState } from 'react';

export default function MarketplacePublicAppPage() {
  const { appTag } = useParams();
  const { user } = useAuth();
  const { openLoginModal } = useLoginModalStore();
  const [openIntegrate, setOpenIntegrate] = useState(false);

  const { data, status } = useQuery({
    queryKey: ['marketplace-app-public', appTag],
    queryFn: () => marketplaceServices.fetchAppPublicByTag(String(appTag)),
    enabled: !!appTag,
  });

  const app: any = data?.data;

  return (
    <IntegrationProvider>
      <div className="bg-white rounded-lg border border-grey-400 p-4 md:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link to="/marketplace" className="inline-flex items-center text-sm text-grey-600 hover:text-grey">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!user) return openLoginModal();
              setOpenIntegrate(true);
            }}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Integrate
          </Button>
        </div>

        {status === 'pending' ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : !app ? (
          <div className="text-grey-600">App not found.</div>
        ) : (
          <div>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                {app.logo ? (
                  <img src={app.logo} alt={app.app_name} className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="text-primary font-semibold">
                    {(app.app_name || '?')
                      .split(' ')
                      .map((w: string) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-grey">{app.app_name}</h1>
                <p className="text-sm text-grey-600 mt-1">
                  {app.description || 'No description available.'}
                </p>

                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {app.latest_version && (
                    <Badge className="text-xs font-semibold bg-green/10 text-green border-green/20 hover:bg-green/10">
                      {app.latest_version}
                    </Badge>
                  )}
                  {Array.isArray(app.domains) && app.domains.length > 0 && app.domains.slice(0, 6).map((d: string) => (
                    <Badge key={d} variant="outline" className="text-xs text-grey">
                      <Globe className="h-3 w-3 mr-1" />
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-grey-400 pt-4">
              <div className="text-sm text-grey-600">
                Share this app: <span className="text-grey font-medium">/marketplace/app/{app.tag || appTag}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {app && (
        <AppIntegrationModal
          app={app}
          open={openIntegrate}
          onOpenChange={setOpenIntegrate}
        />
      )}
    </IntegrationProvider>
  );
}

