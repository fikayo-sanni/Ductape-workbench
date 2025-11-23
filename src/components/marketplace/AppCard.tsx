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
  app: MarketplaceApp;
  domains: Domain[];
  onClick: () => void;
  onIntegrate: () => void;
  viewMode: 'grid' | 'list';
}

export default function AppCard({ app, onClick, onIntegrate, viewMode }: AppCardProps) {

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (viewMode === 'list') {
    return (
      <div
        className="bg-white rounded-lg border border-grey-400 p-4 hover:shadow-md transition-all cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            {app.logo ? (
              <img
                src={app.logo}
                alt={app.app_name}
                className="w-8 h-8 rounded object-cover"
              />
            ) : (
              <span className="text-primary font-semibold text-sm">
                {getInitials(app.app_name)}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-grey truncate">{app.app_name}</h3>
            </div>
            <p className="text-sm text-grey-600 mb-2 line-clamp-2">
              {app.description || 'No description available'}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="text-xs font-semibold bg-green/10 text-green border-green/20 hover:bg-green/10">
                {app?.latest_version || 'v1.0.0'}
              </Badge>
              {app?.domains && app.domains.length > 0 ? (
                <>
                  {app.domains.slice(0, 3).map((domain, index) => (
                    <Badge key={index}  variant="outline" className="text-xs text-grey">
                      <Globe className="h-3 w-3 mr-1" />
                      {domain}
                    </Badge>
                  ))}
                  {app.domains.length > 3 && (
                    <span className="text-xs text-grey-600">+{app.domains.length - 3} more</span>
                  )}
                </>
              ) : (
                <></>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onIntegrate();
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Integrate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-lg border border-grey-400 p-6 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          {app.logo ? (
            <img
              src={app.logo}
              alt={app.app_name}
              className="w-8 h-8 rounded object-cover"
            />
          ) : (
            <span className="text-primary font-semibold text-sm">
              {getInitials(app.app_name)}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="font-semibold text-grey mb-2 line-clamp-1">
          {app.app_name}
        </h3>
        <p className="text-sm text-grey-600 mb-3 line-clamp-3">
          {app.description || 'No description available'}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="text-xs font-semibold bg-green/10 text-green border-green/20 hover:bg-green/10">
            {app?.latest_version || 'v1.0.0'}
          </Badge>
          {app?.domains && app.domains.length > 0 ? (
            <>
              {app.domains.slice(0, 3).map((domain, index) => (
                <Badge key={index} variant="outline" className="text-xs text-grey">
                  <Globe className="h-3 w-3 mr-1" />
                  {domain}
                </Badge>
              ))}
              {app.domains.length > 3 && (
                <span className="text-xs text-grey-600">+{app.domains.length - 3} more</span>
              )}
            </>
          ) : (
            <></>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onIntegrate();
          }}
        >
          <Download className="h-4 w-4 mr-1" />
          Integrate
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
