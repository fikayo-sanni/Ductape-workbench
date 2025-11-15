import { useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, TrendingUp, MessageSquare, Plus, FileText, Eye, Edit, Trash2, UserPlus, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDummyWorkspacePartnerships, getDummyWorkspaceBriefs } from '@/data/partnerships.dummy';
import { IPartnership, IProductBrief, PartnershipStatus, BriefStatus } from '@/types/partnership';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

type MainView = 'partnerships' | 'briefs';
type PartnershipViewMode = 'all' | 'clients' | 'providers';

export default function PartnershipsSidebar() {
  const { openTab } = useWorkbenchStore();
  const [mainView, setMainView] = useState<MainView>('partnerships');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartnershipId, setSelectedPartnershipId] = useState<string | null>(null);
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [partnershipViewMode, setPartnershipViewMode] = useState<PartnershipViewMode>('all');

  // Mock workspace ID - in real app, get from auth context
  const currentWorkspaceId = 'ws_001';

  // Get partnerships where current workspace is either client or service provider
  const { data: partnershipsData } = getDummyWorkspacePartnerships(currentWorkspaceId);
  const { myClients, myServiceProviders } = partnershipsData;

  // Get briefs for current workspace
  const briefs = getDummyWorkspaceBriefs(currentWorkspaceId);

  // Combine and enrich partnerships with role information
  const allPartnerships = [
    ...myClients.map(p => ({ ...p, relationship_type: 'client' as const })),
    ...myServiceProviders.map(p => ({ ...p, relationship_type: 'service_provider' as const })),
  ];

  const handlePartnershipClick = (partnership: IPartnership & { relationship_type: 'client' | 'service_provider' }) => {
    setSelectedPartnershipId(partnership._id);

    const partnerInfo = partnership.relationship_type === 'client'
      ? partnership.client
      : partnership.serviceProvider;

    openTab({
      id: `partnership-${partnership._id}`,
      type: 'partnership',
      title: partnerInfo?.name || 'Partnership',
      itemId: partnership._id,
      data: partnership,
    });
  };

  const handleSearchPartnersClick = () => {
    openTab({
      id: 'partnership-search',
      type: 'partnership',
      title: 'Search Partners',
      itemId: undefined,
      data: null,
    });
  };

  const handleCreateBriefClick = () => {
    openTab({
      id: `brief-new-${Date.now()}`,
      type: 'brief',
      title: 'New Product Brief',
      itemId: undefined,
      data: { isNew: true },
      isDirty: true,
    });
  };

  const handleBriefClick = (brief: IProductBrief) => {
    setSelectedBriefId(brief._id);
    openTab({
      id: `brief-${brief._id}`,
      type: 'brief',
      title: brief.title,
      itemId: brief._id,
      data: brief,
    });
  };

  const handleEditBrief = (brief: IProductBrief) => {
    openTab({
      id: `brief-edit-${brief._id}`,
      type: 'brief',
      title: `Edit: ${brief.title}`,
      itemId: brief._id,
      data: { ...brief, isEdit: true },
      isDirty: true,
    });
  };

  const handleDeleteBrief = (brief: IProductBrief) => {
    toast.success(`Brief "${brief.title}" deleted successfully`);
  };

  // Filter partnerships based on view mode and search
  const filteredPartnerships = allPartnerships.filter(partnership => {
    // Filter by view mode
    if (partnershipViewMode === 'clients' && partnership.relationship_type !== 'client') return false;
    if (partnershipViewMode === 'providers' && partnership.relationship_type !== 'service_provider') return false;

    // Filter by search query
    if (!searchQuery) return true;

    const partnerInfo = partnership.relationship_type === 'client'
      ? partnership.client
      : partnership.serviceProvider;

    const productName = partnership.productBrief?.product?.app_name || '';
    const partnerName = partnerInfo?.name || '';

    return (
      partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      productName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Filter briefs based on search
  const filteredBriefs = briefs.filter(brief => {
    if (!searchQuery) return true;
    return (
      brief.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brief.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUnreadCount = (partnership: IPartnership & { relationship_type: 'client' | 'service_provider' }) => {
    const senderType = partnership.relationship_type === 'client' ? 'client' : 'service_provider';
    return partnership.messages?.filter(m => !m.read && m.sender_type !== senderType).length || 0;
  };

  const getBriefStatusColor = (status: BriefStatus) => {
    switch (status) {
      case BriefStatus.PUBLISHED:
        return 'bg-green/10 text-green';
      case BriefStatus.DRAFT:
        return 'bg-yellow/10 text-yellow';
      case BriefStatus.UNPUBLISHED:
        return 'bg-grey-400/10 text-grey-600';
      default:
        return 'bg-grey-400/10 text-grey-600';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-grey-400">
      {/* Header */}
      <div className="p-4 border-b border-grey-400">
        <h2 className="text-lg font-semibold text-grey mb-3">Partnerships</h2>

        {/* Main View Toggle - Tab Style */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMainView('partnerships')}
            className={cn(
              'px-3 py-2 rounded-md text-sm font-medium transition-colors',
              mainView === 'partnerships'
                ? 'bg-primary text-white'
                : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
            )}
          >
            Partnerships
          </button>
          <button
            onClick={() => setMainView('briefs')}
            className={cn(
              'px-3 py-2 rounded-md text-sm font-medium transition-colors',
              mainView === 'briefs'
                ? 'bg-primary text-white'
                : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
            )}
          >
            Briefs
          </button>
        </div>
      </div>

      {/* Conditional View Mode Selector */}
      {mainView === 'partnerships' && (
        <div className="p-4 border-b border-grey-400">
          <Select value={partnershipViewMode} onValueChange={(value) => setPartnershipViewMode(value as PartnershipViewMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Partnerships</SelectItem>
              <SelectItem value="clients">My Clients</SelectItem>
              <SelectItem value="providers">My Service Providers</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
          <Input
            placeholder={mainView === 'partnerships' ? 'Search partnerships...' : 'Search briefs...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="px-4 pb-4">
        {mainView === 'partnerships' ? (
          <Button onClick={handleSearchPartnersClick} className="w-full gap-2">
            <UserPlus className="h-4 w-4" />
            Find new Partners
          </Button>
        ) : (
          <Button onClick={handleCreateBriefClick} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Create New Brief
          </Button>
        )}
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {mainView === 'partnerships' ? (
          // Partnerships View
          filteredPartnerships.length === 0 ? (
            <div className="text-center py-8 text-grey-600 text-sm">
              {searchQuery ? 'No matching partnerships' : 'No partnerships yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPartnerships.map((partnership) => {
                const partnerInfo = partnership.relationship_type === 'client'
                  ? partnership.client
                  : partnership.serviceProvider;

                const unreadCount = getUnreadCount(partnership);

                return (
                  <div
                    key={partnership._id}
                    onClick={() => handlePartnershipClick(partnership)}
                    className={cn(
                      'group p-2 rounded-md border border-grey-400 hover:border-primary hover:bg-grey-100 transition-colors cursor-pointer dark:hover:bg-grey-400/30',
                      selectedPartnershipId === partnership._id && 'border-primary bg-blue-400 dark:bg-primary/20'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {/* Partner Logo or Initials */}
                      <Avatar className="h-10 w-10 rounded-md flex-shrink-0">
                        <AvatarImage src={partnerInfo?.logo} alt={partnerInfo?.name} />
                        <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs">
                          {partnerInfo?.name ? getInitials(partnerInfo.name) : 'UN'}
                        </AvatarFallback>
                      </Avatar>

                      {/* Partnership Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <h3 className="text-sm font-medium text-grey truncate">
                            {partnerInfo?.name}
                          </h3>

                          {/* Role Badge */}
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs px-1.5 py-0',
                              partnership.relationship_type === 'client'
                                ? 'bg-blue-500/10 text-blue-600'
                                : 'bg-purple-500/10 text-purple-600'
                            )}
                          >
                            {partnership.relationship_type === 'client' ? 'Client' : 'Provider'}
                          </Badge>

                          {/* Status Badge */}
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs px-1.5 py-0',
                              partnership.status === PartnershipStatus.ACTIVE
                                ? 'bg-green/10 text-green'
                                : 'bg-orange-500/10 text-orange-600'
                            )}
                          >
                            {partnership.status === PartnershipStatus.ACTIVE ? 'Active' : 'Prospect'}
                          </Badge>

                          {/* Unread Badge */}
                          {unreadCount > 0 && (
                            <div className="ml-auto flex-shrink-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white">{unreadCount}</span>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-grey-600 truncate mb-1">
                          {partnership.productBrief?.product?.app_name}
                        </p>

                        {/* Footer Icons */}
                        <div className="flex items-center gap-3 text-xs text-grey-600">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{partnership.messages?.length || 0}</span>
                          </div>
                          {partnership.status === PartnershipStatus.PROSPECTIVE && partnership.salesFunnel && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              <span>
                                {partnership.current_funnel_step + 1}/{partnership.salesFunnel.steps.length}
                              </span>
                            </div>
                          )}
                          {partnership.status === PartnershipStatus.ACTIVE && (
                            <div className="flex items-center gap-1">
                              <Key className="h-3 w-3" />
                              <span>{partnership.deliverables?.length || 0}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          // Briefs View
          filteredBriefs.length === 0 ? (
            <div className="text-center py-8 text-grey-600 text-sm">
              {searchQuery ? 'No matching briefs' : 'No briefs yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredBriefs.map((brief) => (
                <div
                  key={brief._id}
                  className={cn(
                    'group p-3 rounded-md border border-grey-400 hover:border-primary transition-colors',
                    selectedBriefId === brief._id && 'border-primary bg-blue-400 dark:bg-primary/20'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleBriefClick(brief)}>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <h3 className="text-sm font-medium text-grey truncate flex-1">
                          {brief.title}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={cn('text-xs px-1.5 py-0', getBriefStatusColor(brief.status))}
                        >
                          {brief.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-grey-600 line-clamp-2 ml-6">
                        {brief.description}
                      </p>
                    </div>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleBriefClick(brief)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditBrief(brief)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteBrief(brief)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
