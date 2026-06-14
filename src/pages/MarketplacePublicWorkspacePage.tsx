import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Filter, Grid3x3, List, Store, Globe } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/store/useAuth';
import { fetchWorkspacePublicByTag } from '@/services/publicWorkspaceServices';
import marketplaceServices from '@/services/marketplaceServices';
import AppCard from '@/components/marketplace/AppCard';
import AppIntegrationModal from '@/components/marketplace/AppIntegrationModal';
import { IntegrationProvider } from '@/context/integration-context';

export default function MarketplacePublicWorkspacePage() {
  const { workspaceTag } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <Link to="/marketplace" className="inline-flex items-center text-sm font-bold text-grey-600 hover:text-primary transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-white border border-grey-400 flex items-center justify-center mr-3 group-hover:border-primary/50 transition-colors">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              </div>
              Back to Marketplace
            </Link>

            {!user && (
              <Button
                className="rounded-md px-6 bg-primary hover:bg-primary/90 text-white font-bold transition-all h-9 text-xs"
                onClick={() => navigate('/login')}
              >
                Sign in to integrate
              </Button>
            )}
          </div>

          <div className="bg-white rounded-lg border border-grey-400 overflow-hidden shadow-sm">
            {/* Workspace Header */}
            <div className="p-6 md:p-8 border-b border-grey-400 bg-white">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                <div className="w-20 h-20 rounded-lg bg-primary flex items-center justify-center shadow-md flex-shrink-0">
                  <Store className="h-10 w-10 text-white" />
                </div>

                <div className="flex-1 text-center md:text-left">
                  {wsStatus === 'pending' ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : !ws ? (
                    <h1 className="text-xl font-bold text-grey">Workspace not found</h1>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-grey mb-1">
                        {ws.name}
                      </h1>
                      <p className="text-sm text-grey-600 font-medium leading-relaxed max-w-2xl mb-4">
                        {ws.description || 'Verified workspace profile on the Ductape Platform.'}
                      </p>
                      <div className="flex items-center justify-center md:justify-start gap-3">
                        <div className="flex items-center px-3 py-1 bg-grey-100 rounded-lg border border-grey-400 text-[10px] font-bold text-grey-600">
                          <Globe className="h-3 w-3 mr-2 text-primary" />
                          /marketplace/workspace/{workspaceTag}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex bg-grey-100 p-0.5 rounded-lg border border-grey-400 h-fit">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-md transition-all",
                      viewMode === 'grid' ? "bg-white shadow-sm text-primary" : "text-grey-600 hover:text-grey"
                    )}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-md transition-all",
                      viewMode === 'list' ? "bg-white shadow-sm text-primary" : "text-grey-600 hover:text-grey"
                    )}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <h2 className="text-lg font-bold text-grey mb-6">Published Applications</h2>

              {appsStatus === 'pending' ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-lg" />
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
                        if (!user) return navigate('/login');
                        setSelectedApp(app);
                        setIntegrationModalOpen(true);
                      }}
                    />
                  ))}

                  {apps.length === 0 && (
                    <div className="text-center py-12 col-span-full border-2 border-dashed border-grey-400 rounded-lg bg-grey-100/30">
                      <div className="w-12 h-12 bg-grey-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Store className="h-6 w-6 text-grey-600" />
                      </div>
                      <h3 className="text-sm font-bold text-grey">No public apps yet</h3>
                      <p className="text-grey-600 text-[11px] mt-1 font-medium">This workspace hasn't published any applications yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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

