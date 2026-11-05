import MarketplaceCard from './MarketplaceCard';
import type { Domain, MarketplaceApp } from '@/services/marketplaceServices';

interface AppCardProps {
  app: MarketplaceApp;
  onClick: () => void;
  onIntegrate: () => void;
  domains: Domain[];
  viewMode?: 'grid' | 'list';
}

export default function AppCard({ app, onClick, onIntegrate, domains, viewMode }: AppCardProps) {
  const categories = (app.domains ?? []).map(id => domains.find(domain => domain._id === id)?.domain_name ?? id).map(name => name.replace(/-/g, ' '));
  const tag = app.tag || app.domain_name;
  return <MarketplaceCard name={app.app_name} description={app.description} logo={app.logo} publisher={app.author}
    categories={categories} version={app.latest_version} viewMode={viewMode} onInspect={onClick}
    onAction={onIntegrate} actionLabel="Integrate" externalHref={tag ? `/marketplace/app/${encodeURIComponent(tag)}` : undefined} />;
}
