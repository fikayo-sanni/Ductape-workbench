import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Filter, Grid3x3, List, Store } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/store/useAuth';
import { useLoginModalStore } from '@/stores/login-modal-store';
import { fetchWorkspacePublicByTag } from '@/services/publicWorkspaceServices';
import marketplaceServices from '@/services/marketplaceServices';
import AppCard from '@/components/marketplace/AppCard';
import AppIntegrationModal from '@/components/marketplace/AppIntegrationModal';
import { IntegrationProvider } from '@/context/integration-context';

export default function MarketplacePublicWorkspacePage() {
  const { workspaceTag } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginModal } = useLoginModalStore();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const { data: ws, status: wsStatus } = useQuery({
    queryKey: ['marketplace-workspace-public', workspaceTag],
    queryFn: () => fetchWorkspacePublicByTag(String(workspaceTag)),
    enabled: !!workspaceTag,
  });

  const { data: appsRes, status: appsStatus } = useQuery({
    queryKey: ['marketplace-workspace-public-apps', ws?._id],
    queryFn: () => marketplaceServices.fetchPublicAppsByWorkspace(String(ws?._id)),
    enabled: !!ws?._id,
  });

  const apps = appsRes?.data ?? [];

  return (
    <IntegrationProvider>
      <div className="bg-white rounded-lg border border-grey-400 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-grey-400">
          <div className="flex items-center justify-between gap-4">
            <Link to="/marketplace" className="inline-flex items-center text-sm text-grey-600 hover:text-grey">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketplace
            </Link>

            <div className="flex items-center gap-2">
              <div className="flex border border-grey-400 rounded-md overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              {!user && (
                <Button size="sm" onClick={openLoginModal}>
                  Sign in to integrate
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              {wsStatus === 'pending' ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : !ws ? (
                <div className="text-grey-600">Workspace not found.</div>
              ) : (
                <>
                  <h1 className="text-lg md:text-xl font-semibold text-grey">
                    {ws.name}
                  </h1>
                  <p className="text-sm text-grey-600 mt-1">
                    {ws.description || 'Shared workspace profile.'}
                  </p>
                  <div className="text-xs text-grey-600 mt-2">
                    Share link: <span className="text-grey font-medium">/marketplace/workspace/{workspaceTag}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {appsStatus === 'pending' ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {apps.map((app: any) => (
                <AppCard
                  key={app._id}
                  app={app}
                  domains={[]}
                  viewMode={viewMode}
                  onClick={() => {
                    const tag = app.tag || app.domain_name;
                    if (tag) navigate(`/marketplace/app/${encodeURIComponent(tag)}`);
                  }}
                  onIntegrate={() => {
                    if (!user) return openLoginModal();
                    setSelectedApp(app);
                    setIntegrationModalOpen(true);
                  }}
                />
              ))}

              {apps.length === 0 && (
                <div className="text-center text-grey-600 py-10 col-span-full">
                  This workspace has no public apps yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedApp && (
        <AppIntegrationModal
          app={selectedApp}
          open={integrationModalOpen}
          onOpenChange={(open) => {
            setIntegrationModalOpen(open);
            if (!open) setSelectedApp(null);
          }}
        />
      )}
    </IntegrationProvider>
  );
}

