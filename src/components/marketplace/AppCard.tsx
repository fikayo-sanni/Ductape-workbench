import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink,
  Download,
  Globe,
} from 'lucide-react';

interface Domain {
  _id: string;
  domain_name: string;
  parent_domain_id: string | null;
  parents: string[];
}

interface MarketplaceApp {
  domains?: string[];
  _id: string;
  app_name: string;
  description?: string;
  logo?: string;
  latest_version: string;
  versions?: Array<{
    _id: string;
    version: string;
    latest: boolean;
    created_at: string;
    domains?: string[];
  }>;
  created_at: string;
  updated_at: string;
}

interface AppCardProps {
  app: any;
  onClick: () => void;
  onIntegrate: () => void;
  domains: any[];
  viewMode?: 'grid' | 'list';
}

export default function AppCard({ app, onClick, onIntegrate, viewMode }: AppCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(app.app_name);

  if (viewMode === 'list') {
    return (
      <div
        className="group relative flex items-center gap-4 p-4 bg-white rounded-lg border border-grey-400 hover:border-primary/50 transition-all cursor-pointer shadow-sm"
        onClick={onClick}
      >
        <div className="w-14 h-14 rounded-lg bg-grey-100 flex items-center justify-center border border-grey-400 p-2 flex-shrink-0 group-hover:border-primary/30 transition-colors">
          {app.logo ? (
            <img src={app.logo} alt={app.app_name} className="w-10 h-10 object-cover rounded-sm" />
          ) : (
            <div className="text-primary font-bold text-lg">
              {initials}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-grey truncate">{app.app_name}</h3>
            {app.latest_version && (
              <Badge className="bg-green/10 text-green border-green/20 text-[10px] font-bold px-1.5 h-4">
                v{app.latest_version}
              </Badge>
            )}
          </div>
          <p className="text-xs text-grey-600 font-medium line-clamp-1">
            {app.description || 'No description available.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="rounded-md h-8 px-4 bg-primary hover:bg-primary/90 text-white text-xs font-bold"
            onClick={(e) => {
              e.stopPropagation();
              onIntegrate();
            }}
          >
            Integrate
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-grey-600 hover:text-primary hover:bg-primary/5"
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <a href={`/marketplace/app/${app.tag || app.domain_name}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative flex flex-col p-5 bg-white rounded-lg border border-grey-400 hover:border-primary/50 transition-all cursor-pointer shadow-sm h-full"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-lg bg-grey-100 flex items-center justify-center border border-grey-400 p-2 group-hover:border-primary/30 transition-colors">
          {app.logo ? (
            <img src={app.logo} alt={app.app_name} className="w-10 h-10 object-cover rounded-sm" />
          ) : (
            <div className="text-primary font-bold text-xl">
              {initials}
            </div>
          )}
        </div>

        {app.latest_version && (
          <Badge className="bg-green/10 text-green border-green/20 text-[10px] font-bold px-2 h-5">
            v{app.latest_version}
          </Badge>
        )}
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-bold text-grey mb-1 group-hover:text-primary transition-colors">
          {app.app_name}
        </h3>
        <p className="text-xs text-grey-600 font-medium leading-relaxed line-clamp-3 mb-4">
          {app.description || 'No description available for this application yet.'}
        </p>
      </div>

      {Array.isArray(app.domains) && app.domains.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {app.domains.slice(0, 2).map((d: string) => (
            <Badge key={d} variant="outline" className="text-[10px] font-bold text-grey-600 border-grey-400 py-0 px-2 h-4 rounded-full">
              {d}
            </Badge>
          ))}
          {app.domains.length > 2 && (
            <span className="text-[10px] font-bold text-grey-600">+{app.domains.length - 2}</span>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-grey-400 mt-auto flex items-center justify-between gap-2">
        <Button
          size="sm"
          className="flex-1 rounded-md h-8 bg-primary hover:bg-primary/90 text-white text-xs font-bold"
          onClick={(e) => {
            e.stopPropagation();
            onIntegrate();
          }}
        >
          Integrate
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md text-grey-600 hover:text-primary hover:bg-primary/5"
          asChild
          onClick={(e) => e.stopPropagation()}
        >
          <a href={`/marketplace/app/${app.tag || app.domain_name}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
