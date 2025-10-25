import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  X,
  Globe,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface Domain {
  _id: string;
  domain_name: string;
  parent_domain_id: string | null;
  parents: string[];
}

interface MarketplaceSidebarProps {
  domains: Domain[];
  selectedDomain: string;
  onDomainSelect: (domainId: string) => void;
  isMobileOpen: boolean;
  onMobileToggle: () => void;
}

export default function MarketplaceSidebar({
  domains,
  selectedDomain,
  onDomainSelect,
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
            'w-full flex items-center gap-2 px-3 py-2 text-left rounded-md transition-colors',
            isSelected
              ? 'bg-primary text-white'
              : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            )
          ) : (
            <Globe className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="truncate">
            {getDomainDisplayName(domain.domain_name)}
          </span>
        </button>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'w-64 bg-white border-r border-grey-400 flex flex-col transition-transform duration-200 z-50',
          'md:translate-x-0 md:static md:z-auto',
          isMobileOpen ? 'translate-x-0 fixed inset-y-0 left-0' : '-translate-x-full fixed inset-y-0 left-0'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-grey-400">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-grey">Categories</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMobileToggle}
              className="md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-1">
            {/* All Applications */}
            <button
              onClick={() => onDomainSelect('all')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left rounded-md transition-colors',
                selectedDomain === 'all'
                  ? 'bg-primary text-white'
                  : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
              )}
            >
              <Globe className="h-4 w-4 flex-shrink-0" />
              <span>All Applications</span>
            </button>

            {/* Domain Categories */}
            {rootDomains.map(domain => renderDomainItem(domain))}
          </div>
        </div>
      </div>
    </>
  );
}
