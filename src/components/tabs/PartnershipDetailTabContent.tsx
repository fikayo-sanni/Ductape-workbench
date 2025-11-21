import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { IPartnership, PartnershipStatus } from '@/types/partnership';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import partnershipServices from '@/services/partnershipServices';
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
} from '@/components/ui/dialog';

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

// Dummy issues for testing
const getDummyIssues = (): Issue[] => [
  {
    _id: 'issue_001',
    title: 'API rate limiting not working as expected',
    description: 'We\'re experiencing issues with the API rate limiting. Requests are being throttled even when we\'re well below our quota. This is affecting our production environment.',
    priority: 'high',
    status: 'in_progress',
    created_at: new Date('2024-03-10T09:30:00'),
    updated_at: new Date('2024-03-11T14:20:00'),
    created_by: 'client',
    assigned_to: 'service_provider',
    category: 'Performance',
  },
  {
    _id: 'issue_002',
    title: 'Documentation missing for webhook configuration',
    description: 'The webhook documentation doesn\'t include examples for handling retry logic. Could you add some code samples?',
    priority: 'low',
    status: 'resolved',
    created_at: new Date('2024-03-08T11:15:00'),
    updated_at: new Date('2024-03-09T16:45:00'),
    created_by: 'client',
    assigned_to: 'service_provider',
    category: 'Documentation',
  },
  {
    _id: 'issue_003',
    title: 'CDN cache invalidation delay',
    description: 'Cache invalidation is taking longer than the documented 60 seconds. We\'re seeing delays of up to 5 minutes in some regions.',
    priority: 'critical',
    status: 'open',
    created_at: new Date('2024-03-12T08:00:00'),
    updated_at: new Date('2024-03-12T08:00:00'),
    created_by: 'client',
    category: 'Bug',
  },
  {
    _id: 'issue_004',
    title: 'Feature request: Batch upload support',
    description: 'Would love to see support for batch uploads via the API. Currently having to upload files one at a time which is inefficient for our use case.',
    priority: 'medium',
    status: 'open',
    created_at: new Date('2024-03-11T15:30:00'),
    updated_at: new Date('2024-03-11T15:30:00'),
    created_by: 'client',
    category: 'Feature Request',
  },
  {
    _id: 'issue_005',
    title: 'Billing discrepancy for February',
    description: 'We noticed our February invoice includes charges for bandwidth we didn\'t use. Can you review the billing for account #12345?',
    priority: 'medium',
    status: 'resolved',
    created_at: new Date('2024-03-05T10:00:00'),
    updated_at: new Date('2024-03-07T09:30:00'),
    created_by: 'client',
    assigned_to: 'service_provider',
    category: 'Billing',
  },
];

interface PartnershipDetailTabContentProps {
  tab: {
    id: string;
    itemId?: string;
    data?: IPartnership & { relationship_type: 'client' | 'service_provider' };
  };
}

export default function PartnershipDetailTabContent({ tab }: PartnershipDetailTabContentProps) {
  const { user } = useAuth();

  // Fetch partnership data from API
  const { data: partnershipResponse, isLoading } = useQuery({
    queryKey: ['partnership', tab.itemId],
    queryFn: () => partnershipServices.fetchPartnershipById({
      partnership_id: tab.itemId || '',
      user_id: user?._id || '',
      public_key: user?.public_key || '',
    }),
    enabled: !!tab.itemId && !!user,
    initialData: tab.data ? { data: tab.data } : undefined,
  });

  const partnership = partnershipResponse?.data;

  const [newMessage, setNewMessage] = useState('');
  const [deliverableKey, setDeliverableKey] = useState('');
  const [deliverableValue, setDeliverableValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Issues state
  const [issues, setIssues] = useState<Issue[]>(getDummyIssues());
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePriority, setIssuePriority] = useState<IssuePriority>('medium');
  const [issueCategory, setIssueCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueFilterStatus>('all');
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // OTP state for deliverables
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [selectedDeliverableIndex, setSelectedDeliverableIndex] = useState<number | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [verifiedDeliverables, setVerifiedDeliverables] = useState<Set<number>>(new Set());
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

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

  const isServiceProvider = partnership.relationship_type === 'client';
  const messages = partnership.messages || [];
  const deliverables = partnership.deliverables || [];

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (attachments.length > 0) {
      toast.success(`Message sent with ${attachments.length} attachment(s)`);
    } else {
      toast.success('Message sent successfully');
    }

    setNewMessage('');
    setAttachments([]);
    setIsSending(false);
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

  const handleMoveToStep = async (stepIndex: number) => {
    toast.success(`Moved client to step ${stepIndex + 1}`);
  };

  const handleConfirmPartnership = async () => {
    toast.success('Partnership confirmed!');
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
    <div className="h-screen flex flex-col bg-white overflow-hidden">
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
            <Button size="sm" onClick={handleConfirmPartnership} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Confirm Partnership
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs key={partnership._id} defaultValue="messages" className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Tabs Header - Fixed */}
        <div className="flex-shrink-0 border-b border-grey-400 px-6 bg-white">
          <TabsList className="bg-transparent h-12">
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages ({messages.length})
            </TabsTrigger>
            {/* Show Sales Funnel for prospective partnerships, Issues for active partnerships */}
            {partnership.status === PartnershipStatus.PROSPECTIVE ? (
              <TabsTrigger value="funnel" className="gap-2" disabled={!partnership.salesFunnel}>
                <TrendingUp className="h-4 w-4" />
                Sales Funnel {partnership.salesFunnel && `(${partnership.current_funnel_step + 1}/${partnership.salesFunnel.steps.length})`}
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
                      {message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment, idx) => (
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
          {partnership.salesFunnel && (
            <div className="space-y-4">
              {/* Progress Overview */}
              <div className="bg-white rounded-lg p-6 border border-grey-400 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-grey">Sales Funnel Progress</h3>
                    <p className="text-sm text-grey-600 mt-1">
                      Step {partnership.current_funnel_step + 1} of {partnership.salesFunnel.steps.length}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(((partnership.current_funnel_step + 1) / partnership.salesFunnel.steps.length) * 100)}%
                    </div>
                    <p className="text-xs text-grey-600 mt-1">Complete</p>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-grey-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${((partnership.current_funnel_step + 1) / partnership.salesFunnel.steps.length) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-3">
                {partnership.salesFunnel.steps.map((step, index) => {
                  const isCurrent = index === partnership.current_funnel_step;
                  const isCompleted = index < partnership.current_funnel_step;
                  const isPending = index > partnership.current_funnel_step;

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
                        {isServiceProvider && isCurrent && (
                          <Button
                            size="sm"
                            onClick={() => handleMoveToStep(index + 1)}
                            disabled={index >= partnership.salesFunnel!.steps.length - 1}
                            className="gap-2 ml-4"
                          >
                            Move Forward
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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

        {/* Issues Tab */}
        <TabsContent value="issues" className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-grey">Support Tickets</h3>
                <p className="text-sm text-grey-600 mt-1">Track and manage partnership issues</p>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle className='text-grey'>Create Support Ticket</DialogTitle>
                    <DialogDescription>
                      Report an issue or request assistance. We'll get back to you as soon as possible.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-grey">Title *</label>
                      <Input
                        value={issueTitle}
                        onChange={(e) => setIssueTitle(e.target.value)}
                        placeholder="Brief description of the issue"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-grey">Description *</label>
                      <Textarea
                        value={issueDescription}
                        onChange={(e) => setIssueDescription(e.target.value)}
                        placeholder="Provide detailed information about the issue..."
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-grey">Priority *</label>
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
                        <label className="text-sm font-medium text-grey">Category</label>
                        <Input
                          value={issueCategory}
                          onChange={(e) => setIssueCategory(e.target.value)}
                          placeholder="e.g., Bug, Feature"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        disabled={isSending}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateIssue}
                        disabled={isSending || !issueTitle.trim() || !issueDescription.trim()}
                        className="gap-2"
                      >
                        {isSending ? 'Creating...' : 'Create Ticket'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-5 gap-3">
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'bg-white rounded-lg border p-4 text-left transition-all hover:shadow-md',
                  statusFilter === 'all' ? 'border-primary ring-2 ring-primary/20' : 'border-grey-400'
                )}
              >
                <div className="text-2xl font-bold text-grey">{issueStats.all}</div>
                <div className="text-xs text-grey-600 mt-1">All Tickets</div>
              </button>

              <button
                onClick={() => setStatusFilter('open')}
                className={cn(
                  'bg-white rounded-lg border p-4 text-left transition-all hover:shadow-md',
                  statusFilter === 'open' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-grey-400'
                )}
              >
                <div className="text-2xl font-bold text-blue-600">{issueStats.open}</div>
                <div className="text-xs text-grey-600 mt-1">Open</div>
              </button>

              <button
                onClick={() => setStatusFilter('in_progress')}
                className={cn(
                  'bg-white rounded-lg border p-4 text-left transition-all hover:shadow-md',
                  statusFilter === 'in_progress' ? 'border-yellow ring-2 ring-yellow/20' : 'border-grey-400'
                )}
              >
                <div className="text-2xl font-bold text-yellow">{issueStats.in_progress}</div>
                <div className="text-xs text-grey-600 mt-1">In Progress</div>
              </button>

              <button
                onClick={() => setStatusFilter('resolved')}
                className={cn(
                  'bg-white rounded-lg border p-4 text-left transition-all hover:shadow-md',
                  statusFilter === 'resolved' ? 'border-green ring-2 ring-green/20' : 'border-grey-400'
                )}
              >
                <div className="text-2xl font-bold text-green">{issueStats.resolved}</div>
                <div className="text-xs text-grey-600 mt-1">Resolved</div>
              </button>

              <button
                onClick={() => setStatusFilter('closed')}
                className={cn(
                  'bg-white rounded-lg border p-4 text-left transition-all hover:shadow-md',
                  statusFilter === 'closed' ? 'border-grey-500 ring-2 ring-grey-500/20' : 'border-grey-400'
                )}
              >
                <div className="text-2xl font-bold text-grey-600">{issueStats.closed}</div>
                <div className="text-xs text-grey-600 mt-1">Closed</div>
              </button>
            </div>

            {/* Issues List */}
            {filteredIssues.length > 0 ? (
              <div className="space-y-3">
                {filteredIssues.map((issue) => {
                  const isExpanded = expandedIssueId === issue._id;
                  const timeSinceUpdate = Math.floor((Date.now() - new Date(issue.updated_at).getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <div
                      key={issue._id}
                      className="bg-white rounded-lg border border-grey-400 overflow-hidden transition-all hover:shadow-md"
                    >
                      {/* Issue Header - Always Visible */}
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedIssueId(isExpanded ? null : issue._id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-grey truncate">{issue.title}</h4>
                              <Badge
                                variant="secondary"
                                className={cn('text-xs flex-shrink-0', getPriorityColor(issue.priority))}
                              >
                                {issue.priority}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className={cn('text-xs flex-shrink-0', getStatusColor(issue.status))}
                              >
                                {issue.status.replace('_', ' ')}
                              </Badge>
                              {issue.category && (
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {issue.category}
                                </Badge>
                              )}
                            </div>

                            <p className={cn(
                              'text-sm text-grey-600',
                              !isExpanded && 'line-clamp-1'
                            )}>
                              {issue.description}
                            </p>

                            <div className="flex items-center gap-3 mt-2 text-xs text-grey-500">
                              <span>Created {new Date(issue.created_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>by {issue.created_by === 'service_provider' ? 'Provider' : 'Client'}</span>
                              {timeSinceUpdate > 0 && (
                                <>
                                  <span>•</span>
                                  <span>Updated {timeSinceUpdate}d ago</span>
                                </>
                              )}
                            </div>
                          </div>

                          <ChevronRight
                            className={cn(
                              'h-5 w-5 text-grey-400 transition-transform flex-shrink-0',
                              isExpanded && 'rotate-90'
                            )}
                          />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t border-grey-200 bg-grey-50 p-4">
                          <div className="space-y-4">
                            {/* Full Description */}
                            <div>
                              <h5 className="text-sm font-semibold text-grey mb-2">Description</h5>
                              <p className="text-sm text-grey-600 whitespace-pre-wrap">{issue.description}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-4 pt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-grey">Status:</span>
                                <Select
                                  value={issue.status}
                                  onValueChange={(value) => handleUpdateIssueStatus(issue._id, value as IssueStatus)}
                                >
                                  <SelectTrigger className="w-[150px] h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-grey-400 shadow-sm p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-grey-100 flex items-center justify-center mb-4 mx-auto">
                  <AlertCircle className="h-8 w-8 text-grey-400" />
                </div>
                <h3 className="text-base font-semibold text-grey mb-2">
                  {statusFilter === 'all' ? 'No Support Tickets Yet' : `No ${statusFilter.replace('_', ' ')} tickets`}
                </h3>
                <p className="text-sm text-grey-600 max-w-md mx-auto">
                  {statusFilter === 'all'
                    ? 'Create a support ticket to report issues or request assistance with this partnership.'
                    : `There are no tickets with status "${statusFilter.replace('_', ' ')}".`}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
