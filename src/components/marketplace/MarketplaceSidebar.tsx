import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  X,
  Globe,
  ChevronRight,
  ChevronDown,
  Layout,
  ClipboardList,
} from 'lucide-react';

export type MarketplaceViewMode = 'browse' | 'submissions';

interface Domain {
  _id: string;
  domain_name: string;
  parent_domain_id: string | null;
  parents: string[];
}

interface MarketplaceSidebarProps {
  domains: any[];
  selectedDomain: string | null;
  onDomainSelect: (id: string | null) => void;
  viewMode?: MarketplaceViewMode;
  onViewModeChange?: (mode: MarketplaceViewMode) => void;
  isMobileOpen: boolean;
  onMobileToggle: () => void;
}

export default function MarketplaceSidebar({
  domains,
  selectedDomain,
  onDomainSelect,
  viewMode = 'browse',
  onViewModeChange,
  isMobileOpen,
  onMobileToggle,
}: MarketplaceSidebarProps) {
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  const toggleDomain = (domainId: string) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(domainId)) {
      newExpanded.delete(domainId);
    } else {
      newExpanded.add(domainId);
    }
    setExpandedDomains(newExpanded);
  };


  const getDomainDisplayName = (domainName: string) => {
    return domainName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Group domains by parent
  const rootDomains = domains.filter(d => !d.parent_domain_id);
  const childDomains = domains.filter(d => d.parent_domain_id);

  const getChildDomains = (parentId: string) => {
    return childDomains.filter(d => d.parent_domain_id === parentId);
  };

  const renderDomainItem = (domain: Domain, level: number = 0) => {
    const isSelected = selectedDomain === domain._id;
    const isExpanded = expandedDomains.has(domain._id);
    const hasChildren = getChildDomains(domain._id).length > 0;

    return (
      <div key={domain._id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleDomain(domain._id);
            } else {
              onDomainSelect(domain._id);
            }
          }}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all duration-200 group',
            isSelected
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-grey-600 hover:bg-grey-100/50 hover:text-primary font-medium'
          )}
          style={{ paddingLeft: `${16 + level * 16}px` }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className={cn("h-4 w-4 flex-shrink-0 transition-transform", isSelected ? "text-white" : "text-grey-400 group-hover:text-primary")} />
            ) : (
              <ChevronRight className={cn("h-4 w-4 flex-shrink-0 transition-transform", isSelected ? "text-white" : "text-grey-400 group-hover:text-primary")} />
            )
          ) : (
            <Globe className={cn("h-4 w-4 flex-shrink-0 transition-transform", isSelected ? "text-white" : "text-grey-400 group-hover:text-primary")} />
          )}
          <span className="truncate text-sm tracking-tight">
            {getDomainDisplayName(domain.domain_name)}
          </span>
        </button>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-1">
            {getChildDomains(domain._id).map(child =>
              renderDomainItem(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-all"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'w-72 bg-white border-r border-grey-400/30 flex flex-col transition-all duration-300 z-50',
          'md:translate-x-0 md:static md:z-auto',
          isMobileOpen ? 'translate-x-0 fixed inset-y-0 left-0 shadow-2xl' : '-translate-x-full fixed inset-y-0 left-0'
        )}
      >
        {/* Mobile close button */}
        <div className="p-4 border-b border-grey-400/30 md:hidden flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileToggle}
            className="h-8 w-8 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {onViewModeChange && (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-grey-700 uppercase tracking-widest mb-4 px-2">
              Marketplace
            </h3>

            <button
              onClick={() => onViewModeChange?.('browse')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all mb-1",
                viewMode === 'browse'
                  ? "bg-primary text-white shadow-sm"
                  : "text-grey-600 hover:bg-grey-100 hover:text-grey"
              )}
            >
              <Layout className="h-4 w-4" />
              Browse apps
            </button>

            <button
              onClick={() => onViewModeChange?.('submissions')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all mb-1",
                viewMode === 'submissions'
                  ? "bg-primary text-white shadow-sm"
                  : "text-grey-600 hover:bg-grey-100 hover:text-grey"
              )}
            >
              <ClipboardList className="h-4 w-4" />
              My submissions
            </button>
          </div>
          )}

          {viewMode === 'browse' && (
          <>
          <div className="mb-8">
            <h3 className="text-[10px] font-bold text-grey-700 uppercase tracking-widest mb-4 px-2">
              Browse Categories
            </h3>

            <button
              onClick={() => onDomainSelect(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all mb-1",
                !selectedDomain
                  ? "bg-primary text-white shadow-sm"
                  : "text-grey-600 hover:bg-grey-100 hover:text-grey"
              )}
            >
              <Layout className="h-4 w-4" />
              All Applications
            </button>
          </div>

          <div className="space-y-1">
            <div className="h-[1px] bg-grey-400 mx-2 mb-4 opacity-50" />

            {domains.map((domain: any) => (
              <button
                key={domain._id}
                onClick={() => onDomainSelect(domain._id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all group",
                  selectedDomain === domain._id
                    ? "bg-primary text-white shadow-sm"
                    : "text-grey-600 hover:bg-grey-100 hover:text-grey"
                )}
              >
                <div className="flex items-center gap-3">
                  <Globe className={cn(
                    "h-4 w-4 transition-colors",
                    selectedDomain === domain._id ? "text-white/80" : "text-grey-600 group-hover:text-primary"
                  )} />
                  <span className="truncate">{domain.domain_name}</span>
                </div>
                {selectedDomain === domain._id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            ))}
          </div>
          </>
          )}
        </div>
      </div>
    </>
  );
}
