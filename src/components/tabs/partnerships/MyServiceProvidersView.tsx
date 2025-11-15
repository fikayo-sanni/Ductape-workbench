import { useState } from 'react';
import { Building2, MessageSquare, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDummyWorkspacePartnerships } from '@/data/partnerships.dummy';
import { IPartnership, PartnershipStatus } from '@/types/partnership';
import { cn } from '@/lib/utils';
import PartnershipDetailDialog from './PartnershipDetailDialog';

export default function MyServiceProvidersView() {
  const [selectedPartnership, setSelectedPartnership] = useState<IPartnership | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Mock workspace ID - in real app, get from auth context
  const currentWorkspaceId = 'ws_001';

  // Get partnerships where current workspace is the client
  const { data } = getDummyWorkspacePartnerships(currentWorkspaceId);
  const partnerships = data.myServiceProviders;

  const activePartnerships = partnerships.filter(
    (p) => p.status === PartnershipStatus.ACTIVE
  );
  const prospectivePartnerships = partnerships.filter(
    (p) => p.status === PartnershipStatus.PROSPECTIVE
  );

  const handleViewPartnership = (partnership: IPartnership) => {
    setSelectedPartnership(partnership);
    setShowDetailDialog(true);
  };

  const PartnershipCard = ({ partnership }: { partnership: IPartnership }) => {
    const unreadCount = partnership.messages.filter((m) => !m.read && m.sender_type !== 'client').length;

    return (
      <div
        className="bg-white rounded-lg border border-grey-400 p-6 hover:border-primary transition-colors cursor-pointer"
        onClick={() => handleViewPartnership(partnership)}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-12 w-12 rounded-lg">
            <AvatarImage
              src={partnership.serviceProvider?.logo}
              alt={partnership.serviceProvider?.name}
            />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
              {partnership.serviceProvider?.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-grey">{partnership.serviceProvider?.name}</h3>
              <Badge
                variant="secondary"
                className={cn(
                  partnership.status === PartnershipStatus.ACTIVE &&
                    'bg-green/10 text-green',
                  partnership.status === PartnershipStatus.PROSPECTIVE &&
                    'bg-blue-500/10 text-blue-600'
                )}
              >
                {partnership.status}
              </Badge>
            </div>
            <p className="text-sm text-grey-600">
              {partnership.productBrief?.product?.app_name}
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-white">{unreadCount} new</Badge>
          )}
        </div>

        {/* Product Brief Title */}
        <p className="text-sm text-grey-700 mb-4 line-clamp-2">
          {partnership.productBrief?.title}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-grey-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{partnership.messages.length} messages</span>
            </div>
            {partnership.status === PartnershipStatus.PROSPECTIVE && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  Step {partnership.current_funnel_step + 1}/
                  {partnership.salesFunnel?.steps.length || 1}
                </span>
              </div>
            )}
            {partnership.status === PartnershipStatus.ACTIVE && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{partnership.deliverables.length} deliverables</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Started {new Date(partnership.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-grey mb-2">My Service Providers</h2>
          <p className="text-sm text-grey-600">
            Companies and workspaces that are onboarding you or providing services to you
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-grey-400 p-4">
          <p className="text-2xl font-bold text-green">{activePartnerships.length}</p>
          <p className="text-sm text-grey-600">Active Partnerships</p>
        </div>
        <div className="bg-white rounded-lg border border-grey-400 p-4">
          <p className="text-2xl font-bold text-blue-600">{prospectivePartnerships.length}</p>
          <p className="text-sm text-grey-600">Prospective Partnerships</p>
        </div>
      </div>

      {/* Partnerships List */}
      {partnerships.length === 0 ? (
        <div className="bg-white rounded-lg border border-grey-400 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-grey-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-grey-400" />
          </div>
          <h3 className="text-lg font-semibold text-grey mb-2">No service providers yet</h3>
          <p className="text-grey-600 max-w-md mx-auto">
            When you partner with service providers, they will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Partnerships */}
          {activePartnerships.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-grey mb-3 uppercase tracking-wide">
                Active ({activePartnerships.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activePartnerships.map((partnership) => (
                  <PartnershipCard key={partnership._id} partnership={partnership} />
                ))}
              </div>
            </div>
          )}

          {/* Prospective Partnerships */}
          {prospectivePartnerships.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-grey mb-3 uppercase tracking-wide">
                Prospective ({prospectivePartnerships.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {prospectivePartnerships.map((partnership) => (
                  <PartnershipCard key={partnership._id} partnership={partnership} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Partnership Detail Dialog */}
      {selectedPartnership && (
        <PartnershipDetailDialog
          partnership={selectedPartnership}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          isServiceProvider={false}
        />
      )}
    </div>
  );
}
