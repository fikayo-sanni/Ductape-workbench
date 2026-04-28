import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Building2,
  Mail,
  Globe,
  User,
  MessageSquare,
  Handshake,
  CheckCircle2,
} from 'lucide-react';
import { IProductBrief, SenderType } from '@/types/partnership';
import toast from 'react-hot-toast';
import { MarkdownViewer } from '@/components/ui/markdown-editor';
import { markdownToPlainText } from '@/lib/markdownPlainText';
import { useAuth } from '@/store/useAuth';
import partnershipServices, { getPartnershipsApiError } from '@/services/partnershipServices';

/** Normalize Mongo / API id values to a 24-char hex string when possible. */
function idToHexString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t || t === 'undefined' || t === 'null') return '';
    return t;
  }
  if (typeof value === 'object' && value !== null && '$oid' in (value as Record<string, unknown>)) {
    return String((value as { $oid: string }).$oid);
  }
  const s = String(value);
  if (s === 'undefined' || s === '[object Object]') return '';
  return s;
}

interface ProductBriefDetailDialogProps {
  brief: IProductBrief;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductBriefDetailDialog({
  brief,
  open,
  onOpenChange,
}: ProductBriefDetailDialogProps) {
  const queryClient = useQueryClient();
  const { user, currentWorkspaceId } = useAuth();
  const [step, setStep] = useState<'details' | 'initiate'>('details');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Published-briefs API historically omitted workspace_id; nested workspace._id is always present after lookup.
  const providerWorkspaceId =
    idToHexString(brief.workspace_id) || idToHexString(brief.workspace?._id);
  const briefId = idToHexString(brief._id);

  useEffect(() => {
    if (!open) {
      setStep('details');
      setMessage('');
      setIsSubmitting(false);
    }
  }, [open]);

  const handlePartnerUp = () => {
    // Pre-populate message
    setMessage(
      `Hi ${brief.workspace?.name}, I'm interested in partnering with you regarding your ${brief.product?.app_name}. Let's discuss further.`
    );
    setStep('initiate');
  };

  const handleSendRequest = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!currentWorkspaceId || !user?._id || !user?.public_key) {
      toast.error('Select a workspace and sign in to send a request.');
      return;
    }

    if (!providerWorkspaceId || !briefId) {
      toast.error('This brief is missing workspace or id; cannot start a partnership.');
      return;
    }

    if (providerWorkspaceId === currentWorkspaceId) {
      toast.error('You cannot send a partnership request to your own workspace.');
      return;
    }

    setIsSubmitting(true);
    try {
      await partnershipServices.createPartnership({
        workspace_id: currentWorkspaceId,
        user_id: user._id,
        public_key: user.public_key,
        payload: {
          service_provider_id: providerWorkspaceId,
          client_id: currentWorkspaceId,
          product_brief_id: briefId,
          messages: [
            {
              sender_type: SenderType.CLIENT,
              content: message.trim(),
            },
          ],
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['workspace-partnerships', currentWorkspaceId] });

      toast.success('Partnership request sent successfully!');
      setMessage('');
      setStep('details');
      onOpenChange(false);
    } catch (e) {
      toast.error(getPartnershipsApiError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep('details');
    setMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {step === 'details' ? (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">
                {markdownToPlainText(brief.title) || 'Product brief'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {markdownToPlainText(brief.description) || 'Product brief details'}
              </DialogDescription>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 rounded-lg">
                  <AvatarImage src={brief.product?.logo} alt={brief.product?.app_name} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xl">
                    {brief.product?.app_name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <MarkdownViewer
                    content={brief.title}
                    className="!my-0 text-grey [&_h1]:!text-2xl [&_h1]:!font-bold [&_h1]:!my-1 [&_h2]:!text-xl [&_h2]:!font-semibold [&_p]:!text-2xl [&_p]:!font-bold [&_p]:!my-0"
                  />
                  <MarkdownViewer
                    content={brief.description}
                    className="text-base text-grey-600 mt-2 !my-0 [&_p]:!text-base [&_li]:!text-base"
                  />
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Provider Info */}
              <div className="bg-grey-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-grey text-sm uppercase tracking-wide">
                  Service Provider
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-grey-600" />
                    <span className="font-medium text-grey">{brief.workspace?.name}</span>
                  </div>
                  {brief.workspace?.email && (
                    <div className="flex items-center gap-2 text-sm text-grey-600">
                      <Mail className="h-4 w-4" />
                      <span>{brief.workspace.email}</span>
                    </div>
                  )}
                  {brief.workspace?.url && (
                    <div className="flex items-center gap-2 text-sm text-grey-600">
                      <Globe className="h-4 w-4" />
                      <a
                        href={brief.workspace.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        {brief.workspace.url}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-grey-600">
                    <User className="h-4 w-4" />
                    <span>
                      {brief.workspaceOwner?.firstname} {brief.workspaceOwner?.lastname}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div>
                <h3 className="font-semibold text-grey mb-3">What the Product Does</h3>
                <MarkdownViewer content={brief.product_details} className="text-grey-600" />
              </div>

              {/* Usage Instructions */}
              {brief.usage_instructions && (
                <div>
                  <h3 className="font-semibold text-grey mb-3">How to Use the Product</h3>
                  <MarkdownViewer content={brief.usage_instructions} className="text-grey-600" />
                </div>
              )}

              {/* Onboarding Steps */}
              {brief.onboarding_steps && brief.onboarding_steps.length > 0 && (
                <div>
                  <h3 className="font-semibold text-grey mb-3">Onboarding Steps</h3>
                  <div className="space-y-3">
                    {brief.onboarding_steps.map((step, index) => (
                      <div key={index} className="p-4 bg-grey-100 rounded-lg">
                        <h4 className="font-semibold text-grey mb-2">
                          Step {index + 1}: {step.name}
                        </h4>
                        <MarkdownViewer content={step.description} className="text-sm text-grey-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Tag */}
              <div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {brief.product?.tag}
                </Badge>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={handlePartnerUp}
                className="gap-2"
                disabled={
                  !currentWorkspaceId ||
                  !user?._id ||
                  !user?.public_key ||
                  (providerWorkspaceId !== '' && providerWorkspaceId === currentWorkspaceId)
                }
              >
                <Handshake className="h-4 w-4" />
                Partner Up
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-grey">Initiate Partnership</DialogTitle>
              <DialogDescription>
                Send a message to {brief.workspace?.name} to start the partnership process
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Service Provider Info */}
              <div className="flex items-center gap-3 p-3 bg-grey-50 rounded-lg">
                <Avatar className="h-10 w-10 rounded-lg">
                  <AvatarImage src={brief.product?.logo} alt={brief.product?.app_name} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                    {brief.product?.app_name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-grey">{brief.workspace?.name}</p>
                  <p className="text-xs text-grey-600">{brief.product?.app_name}</p>
                </div>
              </div>

              {/* Message Input */}
              <div>
                <label className="text-sm font-medium text-grey mb-2 block">
                  Your Message
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Introduce yourself and explain why you're interested in partnering..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-grey-600 mt-2">
                  This message will be sent to the service provider to initiate the partnership
                </p>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <MessageSquare className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">What happens next?</p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• The service provider will be notified of your interest</li>
                    <li>• A communication channel will be opened for discussion</li>
                    <li>• You'll be guided through their onboarding process</li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                Back
              </Button>
              <Button
                onClick={handleSendRequest}
                disabled={isSubmitting || !message.trim()}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>Sending...</>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Send Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
