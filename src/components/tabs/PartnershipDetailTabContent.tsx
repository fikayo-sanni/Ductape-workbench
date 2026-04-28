import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Send,
  Paperclip,
  CheckCircle2,
  Circle,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  X,
  Copy,
  Check,
  Clock,
  Key,
  FileText,
  AlertCircle,
  Plus,
  Eye,
  Shield,
  Save,
  Loader2,
  Ticket,
} from 'lucide-react';
import { IPartnership, PartnershipStatus } from '@/types/partnership';
import { cn } from '@/lib/utils';
import { getPartnershipFunnelSteps } from '@/lib/partnershipFunnel';
import toast from 'react-hot-toast';
import partnershipServices, {
  getPartnershipsApiError,
  type PartnershipResponse,
} from '@/services/partnershipServices';

function partnershipIdStr(id: unknown): string {
  if (id == null) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && id !== null && '$oid' in (id as Record<string, unknown>)) {
    return String((id as { $oid: string }).$oid);
  }
  return String(id);
}
import { useAuth } from '@/store/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { connectDuctapeWorkspace, SDKProxyService } from '@/helpers/ductape';
import { useTabState, getInitialTabState } from '@/hooks/useTabState';

// Issue types
type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type IssueFilterStatus = 'all' | IssueStatus;

interface Issue {
  _id: string;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  created_at: Date;
  updated_at: Date;
  created_by: 'service_provider' | 'client';
  assigned_to?: 'service_provider' | 'client';
  category?: string;
}

/** Former UI seed data; strip if still present in persisted tab state. */
const LEGACY_DUMMY_ISSUE_IDS = new Set([
  'issue_001',
  'issue_002',
  'issue_003',
  'issue_004',
  'issue_005',
]);

interface PartnershipDetailTabContentProps {
  tab: {
    id: string;
    itemId?: string;
    data?: IPartnership & { relationship_type: 'client' | 'service_provider' };
  };
}

export default function PartnershipDetailTabContent({ tab }: PartnershipDetailTabContentProps) {
  const queryClient = useQueryClient();
  const { user, currentWorkspaceId } = useAuth();
  const tabId = tab.id;

  // Restore saved state
  const savedTabState = getInitialTabState(tabId, null as any);

  // Fetch partnership data from API
  const { data: partnershipResponse, isLoading } = useQuery({
    queryKey: ['partnership', tab.itemId, currentWorkspaceId],
    queryFn: () =>
      partnershipServices.fetchPartnershipById({
        partnership_id: tab.itemId || '',
        workspace_id: currentWorkspaceId || undefined,
        user_id: user?._id || '',
        public_key: user?.public_key || '',
      }),
    enabled: !!tab.itemId && !!user && !!currentWorkspaceId,
    initialData: tab.data ? { data: tab.data } : undefined,
  });

  const partnership = partnershipResponse?.data;

  // Active tab state (messages, funnel, issues, deliverables, brief)
  const [activeInnerTab, setActiveInnerTab] = useState<string>(savedTabState?.activeInnerTab || 'messages');

  const [newMessage, setNewMessage] = useState(savedTabState?.newMessage || '');
  const [deliverableKey, setDeliverableKey] = useState(savedTabState?.deliverableKey || '');
  const [deliverableValue, setDeliverableValue] = useState(savedTabState?.deliverableValue || '');
  const [isSending, setIsSending] = useState(false);
  const [isMovingFunnel, setIsMovingFunnel] = useState(false);
  const [isConfirmingPartnership, setIsConfirmingPartnership] = useState(false);
  const [attachments, setAttachments] = useState<string[]>(savedTabState?.attachments || []);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Issues state
  const [issues, setIssues] = useState<Issue[]>(() => {
    const raw = savedTabState?.issues ?? [];
    return raw.filter((i) => !LEGACY_DUMMY_ISSUE_IDS.has(i._id));
  });
  const [issueTitle, setIssueTitle] = useState(savedTabState?.issueTitle || '');
  const [issueDescription, setIssueDescription] = useState(savedTabState?.issueDescription || '');
  const [issuePriority, setIssuePriority] = useState<IssuePriority>(savedTabState?.issuePriority || 'medium');
  const [issueCategory, setIssueCategory] = useState(savedTabState?.issueCategory || '');
  const [statusFilter, setStatusFilter] = useState<IssueFilterStatus>(savedTabState?.statusFilter || 'all');
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(savedTabState?.expandedIssueId || null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // OTP state for deliverables
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [selectedDeliverableIndex, setSelectedDeliverableIndex] = useState<number | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [verifiedDeliverables, setVerifiedDeliverables] = useState<Set<number>>(
    savedTabState?.verifiedDeliverables ? new Set(savedTabState.verifiedDeliverables) : new Set()
  );
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Save token state
  const [saveTokenDialogOpen, setSaveTokenDialogOpen] = useState(false);
  const [saveTokenKey, setSaveTokenKey] = useState('');
  const [saveTokenValue, setSaveTokenValue] = useState('');
  const [saveTokenDeliverableIndex, setSaveTokenDeliverableIndex] = useState<number | null>(null);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [savedDeliverables, setSavedDeliverables] = useState<Set<number>>(
    savedTabState?.savedDeliverables ? new Set(savedTabState.savedDeliverables) : new Set()
  );
  const [saveTokenScope, setSaveTokenScope] = useState<string[]>(['read']);
  const [saveTokenEnvs, setSaveTokenEnvs] = useState<string[]>([]);
  const [saveTokenExpiryDuration, setSaveTokenExpiryDuration] = useState('');
  const [saveTokenExpiryPeriod, setSaveTokenExpiryPeriod] = useState<'hours' | 'days' | 'weeks' | 'months' | 'years'>('days');

  // Persist tab state automatically
  useTabState(
    tabId,
    'partnership-detail',
    partnership?.client?.name || partnership?.serviceProvider?.name || 'Partnership',
    {},
    {
      activeInnerTab,
      newMessage,
      deliverableKey,
      deliverableValue,
      attachments,
      issues,
      issueTitle,
      issueDescription,
      issuePriority,
      issueCategory,
      statusFilter,
      expandedIssueId,
      verifiedDeliverables: Array.from(verifiedDeliverables),
      savedDeliverables: Array.from(savedDeliverables),
    },
    tab.itemId
  );

  // Initialize Ductape SDK for saving tokens
  const ductape = useMemo<SDKProxyService | null>(() => {
    if (!currentWorkspaceId || !user?._id || !user?.public_key || !user?.auth_token) {
      return null;
    }
    try {
      return connectDuctapeWorkspace({
        workspace_id: currentWorkspaceId,
        user_id: user._id,
        token: user.auth_token,
        public_key: user.public_key,
      });
    } catch (error) {
      console.error('Failed to initialize Ductape SDK:', error);
      return null;
    }
  }, [currentWorkspaceId, user?._id, user?.public_key, user?.auth_token]);

  // Show loading state if partnership data is not available yet
  if (isLoading || !partnership) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-grey-600">
          <p className="text-lg mb-2">Loading partnership details...</p>
        </div>
      </div>
    );
  }

  // Auto-focus on message input when component mounts or partnership changes
  useEffect(() => {
    // Small delay to ensure the component is fully rendered
    const timer = setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, [partnership._id]); // Re-run when partnership changes

  // Safety check - if partnership data is not loaded, show loading state
  if (!partnership) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-grey-600">No partnership data available</p>
      </div>
    );
  }

  /** Misnamed legacy flag: true when the current workspace is the *client* in the partnership. */
  const isServiceProvider = partnership.relationship_type === 'client';
  /** Service-provider workspace can advance or rewind the partnership funnel; clients cannot. */
  const viewerCanManageFunnel = partnership.relationship_type === 'service_provider';
  const messages = partnership.messages || [];
  const deliverables = partnership.deliverables || [];
  const funnelSteps = getPartnershipFunnelSteps(partnership);
  const funnelStepCount = funnelSteps.length;
  // Backend tracks funnel step as an index of the current step.
  // At step 0, no steps are completed yet (0% progress).
  const completedFunnelSteps = Math.max(
    0,
    Math.min(partnership.current_funnel_step ?? 0, Math.max(0, funnelStepCount - 1))
  );
  const isOnboardingFlowCompleted =
    funnelStepCount > 0 && completedFunnelSteps >= funnelStepCount - 1;

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    if (!tab.itemId || !currentWorkspaceId || !user?._id || !user?.public_key) {
      toast.error('Missing partnership, workspace, or sign-in; cannot send message.');
      return;
    }

    // API validates attachments as URIs; local file names from the picker cannot be sent yet.
    const uriAttachments = attachments.filter((a) => {
      try {
        // eslint-disable-next-line no-new
        new URL(a);
        return true;
      } catch {
        return false;
      }
    });
    const skippedLocalFiles = attachments.length > uriAttachments.length;

    setIsSending(true);
    try {
      await partnershipServices.addMessage({
        partnership_id: tab.itemId,
        workspace_id: currentWorkspaceId,
        user_id: user._id,
        public_key: user.public_key,
        content: newMessage.trim(),
        attachments: uriAttachments.length > 0 ? uriAttachments : undefined,
      });

      await queryClient.invalidateQueries({
        queryKey: ['partnership', tab.itemId, currentWorkspaceId],
      });

      if (skippedLocalFiles) {
        toast.success('Message sent. Only URL attachments are supported; local files were not included.');
      } else if (uriAttachments.length > 0) {
        toast.success(`Message sent with ${uriAttachments.length} attachment(s)`);
      } else {
        toast.success('Message sent successfully');
      }
      setNewMessage('');
      setAttachments([]);
    } catch (e) {
      toast.error(getPartnershipsApiError(e));
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileNames = Array.from(files).map(file => file.name);
      setAttachments(prev => [...prev, ...fileNames]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopyDeliverable = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleRequestOtp = (index: number) => {
    setSelectedDeliverableIndex(index);
    setOtpDialogOpen(true);
    // In real app, trigger OTP send to user's email/phone
    toast.success('OTP sent to your registered email');
  };

  const handleVerifyOtp = async () => {
    if (!otpValue.trim()) {
      toast.error('Please enter OTP');
      return;
    }

    setIsVerifyingOtp(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock OTP verification (in real app, verify with backend)
    if (otpValue === '123456') {
      const newVerified = new Set(verifiedDeliverables);
      if (selectedDeliverableIndex !== null) {
        newVerified.add(selectedDeliverableIndex);
      }
      setVerifiedDeliverables(newVerified);
      toast.success('Deliverable unlocked successfully');
      setOtpDialogOpen(false);
      setOtpValue('');
      setSelectedDeliverableIndex(null);
    } else {
      toast.error('Invalid OTP. Try 123456 for demo.');
    }

    setIsVerifyingOtp(false);
  };

  const handleAddDeliverable = async () => {
    if (!deliverableKey.trim() || !deliverableValue.trim()) {
      toast.error('Please enter both key and value');
      return;
    }

    setIsSending(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('Deliverable added successfully');
    setDeliverableKey('');
    setDeliverableValue('');
    setIsSending(false);
  };

  // Open save token dialog
  const handleOpenSaveTokenDialog = (index: number, key: string, value: string) => {
    setSaveTokenDeliverableIndex(index);
    setSaveTokenKey(key);
    setSaveTokenValue(value);
    setSaveTokenDialogOpen(true);
  };

  // Calculate expiry timestamp (Unix epoch in seconds)
  const calculateExpiryTimestamp = (duration: string, period: 'hours' | 'days' | 'weeks' | 'months' | 'years'): number | null => {
    if (!duration || duration === '') return null;

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) return null;

    const now = Math.floor(Date.now() / 1000);
    const multipliers: Record<typeof period, number> = {
      hours: 3600,
      days: 86400,
      weeks: 604800,
      months: 2592000,
      years: 31536000,
    };

    return now + (durationNum * multipliers[period]);
  };

  // Get current workspace for environments
  const currentWorkspace = user?.workspaces?.find(
    (ws: any) => ws.workspace_id === currentWorkspaceId || ws._id === currentWorkspaceId
  );

  // Save deliverable as workspace token
  const handleSaveAsWorkspaceToken = async () => {
    if (!ductape || !saveTokenKey.trim()) {
      toast.error('Please enter a token key');
      return;
    }

    // Validate token key format
    const tagPattern = /^[a-zA-Z0-9_]+$/;
    if (!tagPattern.test(saveTokenKey)) {
      toast.error('Token key must only contain letters, numbers, and underscores');
      return;
    }

    if (saveTokenScope.length === 0) {
      toast.error('Please select at least one scope');
      return;
    }

    setIsSavingToken(true);
    try {
      const expires_at = calculateExpiryTimestamp(saveTokenExpiryDuration, saveTokenExpiryPeriod);

      await (ductape as any).secrets.create({
        key: saveTokenKey,
        value: saveTokenValue,
        description: `Saved from partnership deliverable`,
        token_type: 'api',
        scope: saveTokenScope,
        envs: saveTokenEnvs,
        expires_at,
      });

      // Mark deliverable as saved
      if (saveTokenDeliverableIndex !== null) {
        const newSaved = new Set(savedDeliverables);
        newSaved.add(saveTokenDeliverableIndex);
        setSavedDeliverables(newSaved);
      }

      toast.success(`Token saved as $Secret{${saveTokenKey}}`);
      setSaveTokenDialogOpen(false);
      resetSaveTokenState();
    } catch (error: any) {
      console.error('Failed to save token:', error);
      toast.error(error?.message || 'Failed to save token');
    } finally {
      setIsSavingToken(false);
    }
  };

  // Reset save token dialog state
  const resetSaveTokenState = () => {
    setSaveTokenKey('');
    setSaveTokenValue('');
    setSaveTokenDeliverableIndex(null);
    setSaveTokenScope(['read']);
    setSaveTokenEnvs([]);
    setSaveTokenExpiryDuration('');
    setSaveTokenExpiryPeriod('days');
  };

  const handleCreateIssue = async () => {
    if (!issueTitle.trim() || !issueDescription.trim()) {
      toast.error('Please enter both title and description');
      return;
    }

    setIsSending(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newIssue: Issue = {
      _id: `issue_${Date.now()}`,
      title: issueTitle,
      description: issueDescription,
      priority: issuePriority,
      status: 'open',
      created_at: new Date(),
      updated_at: new Date(),
      created_by: isServiceProvider ? 'service_provider' : 'client',
      category: issueCategory || undefined,
    };

    setIssues([newIssue, ...issues]);
    toast.success('Support ticket created successfully');
    setIssueTitle('');
    setIssueDescription('');
    setIssuePriority('medium');
    setIssueCategory('');
    setCreateDialogOpen(false);
    setIsSending(false);
  };

  const handleUpdateIssueStatus = async (issueId: string, newStatus: IssueStatus) => {
    setIssues(issues.map(issue =>
      issue._id === issueId ? { ...issue, status: newStatus, updated_at: new Date() } : issue
    ));
    toast.success('Issue status updated');
  };

  // Get filtered issues based on status filter
  const filteredIssues = statusFilter === 'all'
    ? issues
    : issues.filter(issue => issue.status === statusFilter);

  // Get issue counts by status
  const issueStats = {
    all: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    in_progress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    closed: issues.filter(i => i.status === 'closed').length,
  };

  const handleMoveToStep = async (targetStepIndex: number) => {
    if (!viewerCanManageFunnel) {
      toast.error('Only the service provider can update the funnel.');
      return;
    }
    if (!tab.itemId || !currentWorkspaceId || !user?._id || !user?.public_key) {
      toast.error('Missing partnership, workspace, or sign-in.');
      return;
    }
    const serviceProviderId = partnershipIdStr(partnership.service_provider_id);
    if (!serviceProviderId) {
      toast.error('Missing service provider on this partnership.');
      return;
    }

    setIsMovingFunnel(true);
    try {
      const res = await partnershipServices.movePartnershipFunnelStep({
        partnership_id: tab.itemId,
        workspace_id: currentWorkspaceId,
        user_id: user._id,
        public_key: user.public_key,
        service_provider_id: serviceProviderId,
        step: targetStepIndex,
      });
      const detailKey: [string, string | undefined, string | undefined | null] = [
        'partnership',
        tab.itemId,
        currentWorkspaceId,
      ];
      queryClient.setQueryData<PartnershipResponse>(detailKey, res);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey }),
        queryClient.invalidateQueries({ queryKey: ['workspace-partnerships', currentWorkspaceId] }),
      ]);
      toast.success('Funnel step updated');
    } catch (e) {
      toast.error(getPartnershipsApiError(e));
    } finally {
      setIsMovingFunnel(false);
    }
  };

  const handleConfirmPartnership = async () => {
    if (!tab.itemId || !currentWorkspaceId || !user?._id || !user?.public_key) {
      toast.error('Missing partnership, workspace, or sign-in.');
      return;
    }

    setIsConfirmingPartnership(true);
    try {
      const res = await partnershipServices.confirmPartnership({
        partnership_id: tab.itemId,
        workspace_id: currentWorkspaceId,
        user_id: user._id,
        public_key: user.public_key,
        is_service_provider: partnership.relationship_type === 'service_provider',
      });
      const detailKey: [string, string | undefined, string | undefined | null] = [
        'partnership',
        tab.itemId,
        currentWorkspaceId,
      ];
      queryClient.setQueryData<PartnershipResponse>(detailKey, res);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey }),
        queryClient.invalidateQueries({ queryKey: ['workspace-partnerships', currentWorkspaceId] }),
      ]);
      toast.success('Partnership confirmed!');
    } catch (e) {
      toast.error(getPartnershipsApiError(e));
    } finally {
      setIsConfirmingPartnership(false);
    }
  };

  const getPriorityColor = (priority: IssuePriority) => {
    switch (priority) {
      case 'low':
        return 'bg-grey-100 text-grey-600';
      case 'medium':
        return 'bg-blue-500/10 text-blue-600';
      case 'high':
        return 'bg-orange-500/10 text-orange-600';
      case 'critical':
        return 'bg-red-500/10 text-red-600';
      default:
        return 'bg-grey-100 text-grey-600';
    }
  };

  const getStatusColor = (status: IssueStatus) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/10 text-blue-600';
      case 'in_progress':
        return 'bg-yellow/10 text-yellow';
      case 'resolved':
        return 'bg-green/10 text-green';
      case 'closed':
        return 'bg-grey-400/10 text-grey-600';
      default:
        return 'bg-grey-100 text-grey-600';
    }
  };

  const partnerInfo = isServiceProvider ? partnership.client : partnership.serviceProvider;

  return (
    <div className="flex flex-1 flex-col min-h-0 w-full h-full bg-white overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 border-b border-grey-400 p-6 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 rounded-lg">
              <AvatarImage src={partnerInfo?.logo} alt={partnerInfo?.name} />
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-lg">
                {partnerInfo?.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-grey text-xl mb-1 font-semibold">
                {partnerInfo?.name}
              </h1>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    partnership.status === PartnershipStatus.ACTIVE &&
                      'bg-green/10 text-green',
                    partnership.status === PartnershipStatus.PROSPECTIVE &&
                      'bg-blue-500/10 text-blue-600'
                  )}
                >
                  {partnership.status === PartnershipStatus.PROSPECTIVE ? 'Prospect' : partnership.status}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn(
                    isServiceProvider
                      ? 'bg-blue-500/10 text-blue-600'
                      : 'bg-purple-500/10 text-purple-600'
                  )}
                >
                  {isServiceProvider ? 'Client' : 'Provider'}
                </Badge>
                <span className="text-sm text-grey-600">
                  {partnership.productBrief?.product?.app_name}
                </span>
              </div>
            </div>
          </div>

          {isServiceProvider && partnership.status === PartnershipStatus.PROSPECTIVE && (
            <Button
              size="sm"
              onClick={handleConfirmPartnership}
              disabled={!isOnboardingFlowCompleted || isConfirmingPartnership}
              title={
                isOnboardingFlowCompleted
                  ? undefined
                  : 'Complete all onboarding steps before confirming partnership'
              }
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isConfirmingPartnership ? 'Confirming…' : 'Confirm Partnership'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs key={partnership._id} value={activeInnerTab} onValueChange={setActiveInnerTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Tabs Header - Fixed */}
        <div className="flex-shrink-0 border-b border-grey-400 px-6 bg-white">
          <TabsList className="bg-transparent h-12">
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages ({messages.length})
            </TabsTrigger>
            {/* Show Sales Funnel for prospective partnerships, Issues for active partnerships */}
            {partnership.status === PartnershipStatus.PROSPECTIVE ? (
              <TabsTrigger value="funnel" className="gap-2" disabled={funnelStepCount === 0}>
                <TrendingUp className="h-4 w-4" />
                Sales Funnel{' '}
                {funnelStepCount > 0
                  ? `(${completedFunnelSteps}/${funnelStepCount})`
                  : ''}
              </TabsTrigger>
            ) : (
              <TabsTrigger value="issues" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Issues ({issues.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="deliverables" className="gap-2">
              <Key className="h-4 w-4" />
              Deliverables ({deliverables.length})
            </TabsTrigger>
            <TabsTrigger value="brief" className="gap-2" disabled={!partnership.productBrief}>
              <FileText className="h-4 w-4" />
              Product Brief
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Messages Tab */}
        <TabsContent value="messages" className="data-[state=inactive]:hidden !mt-0 p-0 flex-1 min-h-0 flex flex-col">
          {/* Messages List - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwn = isServiceProvider
                  ? message.sender_type === 'service_provider'
                  : message.sender_type === 'client';

                return (
                  <div
                    key={message._id}
                    className={cn('flex gap-3', isOwn && 'flex-row-reverse')}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {message.sender?.firstname?.substring(0, 1)}
                        {message.sender?.lastname?.substring(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn('flex-1 max-w-[70%]', isOwn && 'items-end')}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-medium text-grey">
                          {message.sender?.firstname} {message.sender?.lastname}
                        </span>
                        <span className="text-xs text-grey-500">
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'rounded-lg p-3 text-sm',
                          isOwn
                            ? 'bg-primary text-white'
                            : 'bg-grey-100 text-grey'
                        )}
                      >
                        {message.content}
                      </div>
                      {(message.attachments?.length ?? 0) > 0 && (
                        <div className="mt-2 space-y-1">
                          {(message.attachments ?? []).map((attachment, idx) => (
                            <div
                              key={idx}
                              className="text-xs text-primary flex items-center gap-1 cursor-pointer hover:underline"
                            >
                              <Paperclip className="h-3 w-3" />
                              {attachment}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Message Input - Fixed at Bottom */}
          <div className="flex-shrink-0 border-t border-grey-400 px-6 py-4 bg-white">
            <div className="space-y-3">
              {/* Attachments Display */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 bg-grey-100 rounded-md text-sm text-grey-700"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span className="max-w-[200px] truncate">{attachment}</span>
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="text-grey-500 hover:text-red-500 transition-colors"
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Input and Buttons */}
              <div className="flex gap-2">
                <Textarea
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={2}
                  className="resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {/* Attachment Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  {/* Send Button */}
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !newMessage.trim()}
                    className="gap-2 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Sales Funnel Tab */}
        <TabsContent value="funnel" className="flex-1 overflow-y-auto px-6 py-4">
          {funnelStepCount > 0 ? (
            <div className="space-y-4">
              {/* Progress Overview */}
              <div className="bg-white rounded-lg p-6 border border-grey-400 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-grey">Sales Funnel Progress</h3>
                    <p className="text-sm text-grey-600 mt-1">
                      Completed {completedFunnelSteps} of {funnelStepCount} steps
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(
                        (completedFunnelSteps / funnelStepCount) * 100
                      )}
                      %
                    </div>
                    <p className="text-xs text-grey-600 mt-1">Complete</p>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-grey-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (completedFunnelSteps / funnelStepCount) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-3">
                {funnelSteps.map((step, index) => {
                  const currentStep = completedFunnelSteps;
                  const isCompleted = index < completedFunnelSteps;
                  const isCurrent = index === currentStep;
                  const isPending = !isCompleted && !isCurrent;
                  const isLastStep = index === funnelStepCount - 1;

                  return (
                    <div key={index} className="bg-white rounded-lg border border-grey-400 p-5 shadow-sm">
                      {/* Step Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-grey-600">Step {index + 1}</span>
                              {isCompleted && <CheckCircle2 className="h-5 w-5 text-green" />}
                              {isCurrent && <Clock className="h-5 w-5 text-primary" />}
                              {isPending && <Circle className="h-5 w-5 text-grey-400" />}
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-xs',
                                isCompleted && 'bg-green/10 text-green',
                                isCurrent && 'bg-primary/10 text-primary',
                                isPending && 'bg-grey-100 text-grey-600'
                              )}
                            >
                              {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-grey text-base mb-1">{step.name}</h4>
                          <p className="text-sm text-grey-600">{step.description}</p>
                        </div>
                        {viewerCanManageFunnel && isCurrent && (
                          <div className="flex flex-col gap-2 ml-4 sm:flex-row sm:items-center">
                            {currentStep > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMoveToStep(currentStep - 1)}
                                disabled={isMovingFunnel}
                                className="gap-2"
                              >
                                <ChevronLeft className="h-4 w-4" />
                                Move back
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() =>
                                isLastStep
                                  ? handleConfirmPartnership()
                                  : handleMoveToStep(index + 1)
                              }
                              disabled={isMovingFunnel || isConfirmingPartnership}
                              className="gap-2"
                            >
                              {(isMovingFunnel || isConfirmingPartnership)
                                ? 'Updating…'
                                : isLastStep
                                  ? 'Complete onboarding'
                                  : 'Move forward'}
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-grey-600 py-4">
              No sales funnel steps are available for this partnership yet.
            </p>
          )}
        </TabsContent>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables" className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Add New Deliverable - Shown for service providers (clients) */}
            {isServiceProvider && (
              <div className="bg-white rounded-lg p-5 border border-grey-400 shadow-sm">
                <div className="mb-4">
                  <h3 className="font-semibold text-grey mb-1">Add New Deliverable</h3>
                  <p className="text-sm text-grey-600">Share credentials, keys, or important information with your client</p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={deliverableKey}
                    onChange={(e) => setDeliverableKey(e.target.value)}
                    placeholder="Key (e.g., API_KEY)"
                    className="flex-1"
                  />
                  <Input
                    value={deliverableValue}
                    onChange={(e) => setDeliverableValue(e.target.value)}
                    placeholder="Value (e.g., sk_live_abc123xyz789)"
                    className="flex-[2] font-mono text-sm"
                  />
                  <Button
                    onClick={handleAddDeliverable}
                    disabled={isSending || !deliverableKey.trim() || !deliverableValue.trim()}
                    className="gap-2"
                  >
                    <Key className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            )}

            {/* Deliverables List */}
            {deliverables.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-grey-600">
                    Shared Deliverables ({deliverables.length})
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-grey-600">
                    <Shield className="h-3 w-3" />
                    <span>Protected by OTP</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {deliverables.map((deliverable, index) => {
                    const [key, ...valueParts] = deliverable.split(':');
                    const value = valueParts.join(':').trim();
                    const hasKeyValue = valueParts.length > 0;
                    const isVerified = verifiedDeliverables.has(index);

                    return (
                      <div
                        key={index}
                        className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {hasKeyValue ? (
                              <>
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-grey text-sm">{key}</h4>
                                  <Badge variant="secondary" className="text-xs bg-grey-100 text-grey-600">
                                    Credential
                                  </Badge>
                                  {!isVerified && (
                                    <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-600">
                                      <Shield className="h-3 w-3 mr-1" />
                                      Locked
                                    </Badge>
                                  )}
                                </div>
                                <div className="bg-grey-50 rounded-md p-3 border border-grey-200">
                                  <code className="text-sm text-grey-700 font-mono break-all">
                                    {isVerified ? value : '••••••••••••••••'}
                                  </code>
                                </div>
                              </>
                            ) : (
                              <div className="bg-grey-50 rounded-md p-3 border border-grey-200">
                                <code className="text-sm text-grey-700 font-mono break-all">
                                  {isVerified ? deliverable : '••••••••••••••••'}
                                </code>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex-shrink-0 flex gap-2">
                            {!isVerified ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRequestOtp(index)}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCopyDeliverable(hasKeyValue ? value : deliverable, index)}
                                  className="gap-2"
                                >
                                  {copiedIndex === index ? (
                                    <>
                                      <Check className="h-4 w-4 text-green" />
                                      <span className="text-green">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-4 w-4" />
                                      Copy
                                    </>
                                  )}
                                </Button>
                                {/* Save Token Button */}
                                {savedDeliverables.has(index) ? (
                                  <Badge variant="secondary" className="text-xs bg-green/10 text-green h-8 px-3 flex items-center gap-1.5">
                                    <Check className="h-3 w-3" />
                                    Saved
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenSaveTokenDialog(index, hasKeyValue ? key : `token_${index}`, hasKeyValue ? value : deliverable)}
                                    className="gap-2"
                                  >
                                    <Save className="h-4 w-4" />
                                    Save Token
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-grey-400 shadow-sm p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-grey-100 flex items-center justify-center mb-4 mx-auto">
                  <Key className="h-8 w-8 text-grey-400" />
                </div>
                <h3 className="text-base font-semibold text-grey mb-2">No Deliverables Yet</h3>
                <p className="text-sm text-grey-600 max-w-md mx-auto">
                  {isServiceProvider
                    ? 'Add credentials, API keys, or other important information to share with your client.'
                    : 'Your service provider will share deliverables here once they are ready.'}
                </p>
              </div>
            )}
          </div>

          {/* OTP Verification Dialog */}
          <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Verify Your Identity
                </DialogTitle>
                <DialogDescription>
                  Enter the OTP sent to your registered email to view this deliverable.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Security Notice</p>
                      <p className="text-xs text-blue-700 mt-1">
                        For demo purposes, use OTP: <code className="font-mono bg-white px-2 py-0.5 rounded">123456</code>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-grey">One-Time Password</label>
                  <Input
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="text-center text-lg tracking-widest font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleVerifyOtp();
                      }
                    }}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOtpDialogOpen(false);
                      setOtpValue('');
                      setSelectedDeliverableIndex(null);
                    }}
                    disabled={isVerifyingOtp}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp || !otpValue.trim()}
                    className="gap-2"
                  >
                    {isVerifyingOtp ? 'Verifying...' : 'Verify & Unlock'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Save Token Dialog */}
          <Dialog open={saveTokenDialogOpen} onOpenChange={(open) => {
            if (!isSavingToken) {
              setSaveTokenDialogOpen(open);
              if (!open) {
                resetSaveTokenState();
              }
            }
          }}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-grey">
                  <Key className="h-5 w-5 text-primary" />
                  Save as Workspace Token
                </DialogTitle>
                <DialogDescription>
                  Save this deliverable as a workspace token so you can reference it in your integrations using the <code className="bg-grey-100 px-1.5 py-0.5 rounded text-xs font-mono">$Secret{'{key}'}</code> syntax.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Secure Storage</p>
                      <p className="text-xs text-blue-700 mt-1">
                        The token will be securely encrypted and stored in your workspace. You can manage it from the Tokens tab.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Token Key Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-grey">Token Key *</Label>
                  <Input
                    value={saveTokenKey}
                    onChange={(e) => {
                      // Allow only alphanumeric and underscores
                      const value = e.target.value
                        .replace(/[^a-zA-Z0-9_\s]+/g, '')
                        .replace(/\s+/g, '_')
                        .replace(/_+/g, '_')
                        .replace(/^_+/, '');
                      setSaveTokenKey(value);
                    }}
                    placeholder="e.g., stripe_api_key"
                    className="font-mono"
                    disabled={isSavingToken}
                  />
                  <p className="text-xs text-grey-600">
                    Only letters, numbers, and underscores allowed. This will be used as <code className="bg-grey-100 px-1 rounded">$Secret{'{' + (saveTokenKey || 'key') + '}'}</code>
                  </p>
                </div>

                {/* Token Value Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-grey">Token Value (Preview)</Label>
                  <div className="bg-grey-100 rounded-lg p-3 border border-grey-400">
                    <code className="text-sm text-grey-700 font-mono break-all">
                      {saveTokenValue.length > 50 ? saveTokenValue.substring(0, 50) + '...' : saveTokenValue}
                    </code>
                  </div>
                </div>

                {/* Expires In */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-grey">Expires In (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Duration"
                      value={saveTokenExpiryDuration}
                      onChange={(e) => setSaveTokenExpiryDuration(e.target.value)}
                      className="w-24"
                      min="1"
                      disabled={isSavingToken}
                    />
                    <Select
                      value={saveTokenExpiryPeriod}
                      onValueChange={(value) => setSaveTokenExpiryPeriod(value as typeof saveTokenExpiryPeriod)}
                      disabled={isSavingToken}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-grey-600">
                    Leave empty for no expiration
                  </p>
                </div>

                {/* Scope */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-grey">Scope *</Label>
                  <div className="flex gap-2 flex-wrap">
                    {['read', 'write', 'delete', 'admin'].map((scope) => (
                      <Badge
                        key={scope}
                        variant="secondary"
                        className={cn(
                          'cursor-pointer transition-colors px-3 py-1.5',
                          saveTokenScope.includes(scope)
                            ? 'bg-primary text-white hover:bg-primary/90'
                            : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                        )}
                        onClick={() => {
                          if (isSavingToken) return;
                          const newScope = saveTokenScope.includes(scope)
                            ? saveTokenScope.filter((s) => s !== scope)
                            : [...saveTokenScope, scope];
                          setSaveTokenScope(newScope);
                        }}
                      >
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Environments */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-grey">Environments</Label>
                  <p className="text-xs text-grey-600">
                    Select which environments this token can access
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {currentWorkspace?.defaultEnvs?.map((env: any) => (
                      <Badge
                        key={env.slug}
                        variant="secondary"
                        className={cn(
                          'cursor-pointer transition-colors px-3 py-1.5',
                          saveTokenEnvs.includes(env.slug)
                            ? 'bg-primary text-white hover:bg-primary/90'
                            : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                        )}
                        onClick={() => {
                          if (isSavingToken) return;
                          const newEnvs = saveTokenEnvs.includes(env.slug)
                            ? saveTokenEnvs.filter((e) => e !== env.slug)
                            : [...saveTokenEnvs, env.slug];
                          setSaveTokenEnvs(newEnvs);
                        }}
                      >
                        {env.env_name}
                      </Badge>
                    )) || (
                      <p className="text-sm text-grey-600">
                        No environments configured
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSaveTokenDialogOpen(false);
                    resetSaveTokenState();
                  }}
                  disabled={isSavingToken}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAsWorkspaceToken}
                  disabled={!saveTokenKey.trim() || saveTokenScope.length === 0 || isSavingToken}
                  className="gap-2"
                >
                  {isSavingToken ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Token
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Product Brief Tab */}
        <TabsContent value="brief" className="flex-1 overflow-y-auto px-6 py-4">
          {partnership.productBrief && (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-white rounded-lg p-6 border border-grey-400 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-grey mb-1">{partnership.productBrief.title}</h2>
                    <p className="text-sm text-grey-600">{partnership.productBrief.description}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-sm',
                      partnership.productBrief.status === 'published' && 'bg-green/10 text-green',
                      partnership.productBrief.status === 'draft' && 'bg-yellow/10 text-yellow'
                    )}
                  >
                    {partnership.productBrief.status}
                  </Badge>
                </div>
              </div>

              {/* Product Info */}
              <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                <h3 className="font-semibold text-grey mb-3">Product</h3>
                <div className="p-4 bg-grey-50 rounded-lg">
                  <p className="text-sm text-grey-600">
                    {partnership.productBrief.product?.app_name || 'Unknown Product'}
                  </p>
                </div>
              </div>

              {/* Product Details */}
              <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                <h3 className="font-semibold text-grey mb-3">What the Product Does</h3>
                <p className="text-grey-600 whitespace-pre-wrap">{partnership.productBrief.product_details}</p>
              </div>

              {/* Usage Instructions */}
              {partnership.productBrief.usage_instructions && (
                <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                  <h3 className="font-semibold text-grey mb-3">How to Use the Product</h3>
                  <p className="text-grey-600 whitespace-pre-wrap">{partnership.productBrief.usage_instructions}</p>
                </div>
              )}

              {/* Onboarding Steps */}
              {partnership.productBrief.onboarding_steps && partnership.productBrief.onboarding_steps.length > 0 && (
                <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                  <h3 className="font-semibold text-grey mb-4">Onboarding Steps</h3>
                  <div className="space-y-3">
                    {partnership.productBrief.onboarding_steps.map((step, index) => (
                      <div key={index} className="p-4 bg-grey-100 rounded-lg">
                        <h4 className="font-semibold text-grey mb-2">Step {index + 1}: {step.name}</h4>
                        <p className="text-sm text-grey-600">{step.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Issues Tab — layout aligned with AppTabContent (grey-50 body, white sticky header, border-grey-400 cards) */}
        <TabsContent
          value="issues"
          className="data-[state=inactive]:hidden !mt-0 flex flex-1 min-h-0 flex-col p-0"
        >
          <div className="h-full min-h-0 overflow-auto bg-grey-50">
            <div className="sticky top-0 z-10 border-b border-grey-300 bg-white">
              <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
                    <Ticket className="h-6 w-6 text-primary" aria-hidden />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-grey">Issues &amp; support</h1>
                    <p className="text-sm text-grey-500">
                      {issueStats.all}{' '}
                      {issueStats.all === 1 ? 'ticket' : 'tickets'} · filter by status below
                    </p>
                  </div>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full shrink-0 gap-2 shadow-sm sm:w-auto">
                      <Plus className="h-4 w-4" />
                      New ticket
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                      <DialogTitle className="text-grey">Create support ticket</DialogTitle>
                      <DialogDescription className="text-grey-600">
                        Describe what you need. Include steps to reproduce for bugs where possible.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="issue-title">Title</Label>
                        <Input
                          id="issue-title"
                          value={issueTitle}
                          onChange={(e) => setIssueTitle(e.target.value)}
                          placeholder="Brief summary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="issue-desc">Description</Label>
                        <Textarea
                          id="issue-desc"
                          value={issueDescription}
                          onChange={(e) => setIssueDescription(e.target.value)}
                          placeholder="Details, expected vs actual, IDs or timestamps…"
                          rows={5}
                          className="min-h-[120px] resize-y"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Priority</Label>
                          <Select value={issuePriority} onValueChange={(value) => setIssuePriority(value as IssuePriority)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="issue-cat">Category</Label>
                          <Input
                            id="issue-cat"
                            value={issueCategory}
                            onChange={(e) => setIssueCategory(e.target.value)}
                            placeholder="Bug, billing, docs…"
                          />
                        </div>
                      </div>

                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isSending}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateIssue}
                          disabled={isSending || !issueTitle.trim() || !issueDescription.trim()}
                          className="gap-2 shadow-sm"
                        >
                          {isSending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Creating…
                            </>
                          ) : (
                            'Create ticket'
                          )}
                        </Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="mx-auto max-w-6xl space-y-5 px-6 py-6">
              <div
                role="toolbar"
                aria-label="Filter tickets by status"
                className="flex flex-wrap gap-1 rounded-lg border border-grey-400 bg-white p-2 shadow-sm"
              >
                {(
                  [
                    { key: 'all' as const, label: 'All', count: issueStats.all },
                    { key: 'open' as IssueStatus, label: 'Open', count: issueStats.open },
                    { key: 'in_progress' as IssueStatus, label: 'In progress', count: issueStats.in_progress },
                    { key: 'resolved' as IssueStatus, label: 'Resolved', count: issueStats.resolved },
                    { key: 'closed' as IssueStatus, label: 'Closed', count: issueStats.closed },
                  ] as const
                ).map((f) => {
                  const active = statusFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setStatusFilter(f.key)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-grey hover:bg-grey-100',
                      )}
                    >
                      <span>{f.label}</span>
                      <span
                        className={cn(
                          'min-w-[20px] rounded px-1.5 py-0.5 text-center text-xs',
                          active ? 'bg-primary/20 text-primary' : 'bg-grey-100 text-grey-600',
                        )}
                      >
                        {f.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {filteredIssues.length > 0 ? (
                <>
                  <p className="text-sm text-grey-500">
                    Showing{' '}
                    <span className="font-medium text-grey">{filteredIssues.length}</span>{' '}
                    {filteredIssues.length === 1 ? 'ticket' : 'tickets'}
                    {statusFilter !== 'all' && (
                      <>
                        {' '}
                        · status:{' '}
                        <span className="font-medium text-grey">{statusFilter.replace('_', ' ')}</span>
                      </>
                    )}
                  </p>

                  <ul className="space-y-3">
                    {filteredIssues.map((issue) => {
                      const isExpanded = expandedIssueId === issue._id;
                      const created = new Date(issue.created_at);
                      const updated = new Date(issue.updated_at);
                      const diffMs = Date.now() - updated.getTime();
                      const diffMins = Math.floor(diffMs / (1000 * 60));
                      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      let updatedLabel = '';
                      if (diffMins < 1) updatedLabel = 'Just now';
                      else if (diffMins < 60) updatedLabel = `${diffMins}m ago`;
                      else if (diffHrs < 24) updatedLabel = `${diffHrs}h ago`;
                      else updatedLabel = `${diffDays}d ago`;

                      return (
                        <li key={issue._id}>
                          <div className="overflow-hidden rounded-lg border border-grey-400 bg-white transition-all hover:border-primary hover:shadow-md">
                            <button
                              type="button"
                              className="flex w-full items-start gap-3 p-4 text-left"
                              onClick={() => setExpandedIssueId(isExpanded ? null : issue._id)}
                              aria-expanded={isExpanded}
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Ticket className="h-5 w-5 text-primary" aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1 space-y-2">
                                <span className="text-sm font-medium text-grey">{issue.title}</span>

                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant="secondary"
                                    className={cn('text-[10px] font-medium', getPriorityColor(issue.priority))}
                                  >
                                    {issue.priority}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className={cn('text-[10px] capitalize', getStatusColor(issue.status))}
                                  >
                                    {issue.status.replace('_', ' ')}
                                  </Badge>
                                  {issue.category ? (
                                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-grey-100 text-grey-600">
                                      {issue.category}
                                    </span>
                                  ) : null}
                                </div>

                                <p
                                  className={cn(
                                    'text-xs text-grey-600',
                                    !isExpanded && 'line-clamp-2',
                                  )}
                                >
                                  {issue.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-grey-500">
                                  <span>{created.toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                  <span>·</span>
                                  <span>
                                    {issue.created_by === 'service_provider' ? 'Provider' : 'Client'}
                                  </span>
                                  <span>·</span>
                                  <span>Updated {updatedLabel}</span>
                                </div>
                              </div>

                              <ChevronRight
                                className={cn(
                                  'mt-1 h-5 w-5 shrink-0 text-grey-400 transition-transform',
                                  isExpanded && 'rotate-90',
                                )}
                                aria-hidden
                              />
                            </button>

                            {isExpanded ? (
                              <div className="border-t border-grey-300 bg-grey-50 px-4 py-4">
                                <p className="mb-4 whitespace-pre-wrap text-sm text-grey-700">{issue.description}</p>

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <span className="text-sm font-medium text-grey">Status</span>
                                  <Select
                                    value={issue.status}
                                    onValueChange={(value) =>
                                      handleUpdateIssueStatus(issue._id, value as IssueStatus)
                                    }
                                  >
                                    <SelectTrigger className="h-9 w-full border-grey-400 bg-white sm:w-[200px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="open">Open</SelectItem>
                                      <SelectItem value="in_progress">In progress</SelectItem>
                                      <SelectItem value="resolved">Resolved</SelectItem>
                                      <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <div className="rounded-lg border border-grey-400 bg-white p-12 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-grey-100">
                    <AlertCircle className="h-7 w-7 text-grey-400" aria-hidden />
                  </div>
                  <h3 className="text-xl font-semibold text-grey">
                    {statusFilter === 'all' ? 'No tickets yet' : `No ${statusFilter.replace('_', ' ')} tickets`}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-grey-500">
                    {statusFilter === 'all'
                      ? 'Create a ticket to track bugs, requests, or questions for this partnership.'
                      : 'Nothing matches this filter. Try another status or view all tickets.'}
                  </p>
                  {statusFilter === 'all' ? (
                    <Button className="mt-6 gap-2 shadow-sm" onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Create ticket
                    </Button>
                  ) : (
                    <Button variant="outline" className="mt-6 border-grey-400" onClick={() => setStatusFilter('all')}>
                      Show all tickets
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
