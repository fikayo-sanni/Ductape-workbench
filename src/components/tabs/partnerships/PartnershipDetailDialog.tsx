import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Package,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { IPartnership, PartnershipStatus } from '@/types/partnership';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PartnershipDetailDialogProps {
  partnership: IPartnership;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isServiceProvider: boolean; // Whether current user is the service provider
}

export default function PartnershipDetailDialog({
  partnership,
  open,
  onOpenChange,
  isServiceProvider,
}: PartnershipDetailDialogProps) {
  const [newMessage, setNewMessage] = useState('');
  const [newDeliverable, setNewDeliverable] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('Message sent successfully');
    setNewMessage('');
    setIsSending(false);
  };

  const handleAddDeliverable = async () => {
    if (!newDeliverable.trim()) return;

    setIsSending(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('Deliverable added successfully');
    setNewDeliverable('');
    setIsSending(false);
  };

  const handleMoveToStep = async (stepIndex: number) => {
    toast.success(`Moved client to step ${stepIndex + 1}`);
  };

  const handleConfirmPartnership = async () => {
    toast.success('Partnership confirmed!');
  };

  const partnerInfo = isServiceProvider ? partnership.client : partnership.serviceProvider;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 rounded-lg">
                <AvatarImage src={partnerInfo?.logo} alt={partnerInfo?.name} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-lg">
                  {partnerInfo?.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-grey text-xl mb-1">
                  {partnerInfo?.name}
                </DialogTitle>
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
                    {partnership.status}
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
        </DialogHeader>

        <Tabs defaultValue="messages" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages ({partnership.messages.length})
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-2" disabled={!partnership.salesFunnel}>
              <TrendingUp className="h-4 w-4" />
              Sales Funnel
            </TabsTrigger>
            <TabsTrigger value="deliverables" className="gap-2">
              <Package className="h-4 w-4" />
              Deliverables ({partnership.deliverables.length})
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex-1 overflow-y-auto pr-4">
              <div className="space-y-4">
                {partnership.messages.map((message) => {
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

            {/* Message Input */}
            <div className="mt-4 flex gap-2">
              <Textarea
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
              <Button
                onClick={handleSendMessage}
                disabled={isSending || !newMessage.trim()}
                className="gap-2 self-end"
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </TabsContent>

          {/* Sales Funnel Tab */}
          <TabsContent value="funnel" className="flex-1 mt-4">
            {partnership.salesFunnel && (
              <div className="space-y-4">
                {partnership.salesFunnel.steps.map((step, index) => {
                  const isCurrent = index === partnership.current_funnel_step;
                  const isCompleted = index < partnership.current_funnel_step;

                  return (
                    <div
                      key={index}
                      className={cn(
                        'border rounded-lg p-4',
                        isCurrent && 'border-primary bg-primary/5',
                        isCompleted && 'border-green bg-green/5'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green" />
                          ) : isCurrent ? (
                            <Circle className="h-5 w-5 text-primary fill-primary" />
                          ) : (
                            <Circle className="h-5 w-5 text-grey-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-grey">
                              Step {index + 1}: {step.name}
                            </h4>
                            {isServiceProvider && isCurrent && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMoveToStep(index + 1)}
                                disabled={index >= (partnership.salesFunnel?.steps.length || 0) - 1}
                                className="gap-2"
                              >
                                Move to Next Step
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-grey-600 mb-2">{step.description}</p>
                          {step.message_template && (
                            <div className="bg-grey-50 rounded p-3 text-sm text-grey-700 italic">
                              "{step.message_template}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Deliverables Tab */}
          <TabsContent value="deliverables" className="flex-1 mt-4">
            <div className="space-y-4">
              {partnership.deliverables.length > 0 ? (
                <div className="space-y-2">
                  {partnership.deliverables.map((deliverable, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-grey-50 rounded-lg"
                    >
                      <Package className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1 font-mono text-sm text-grey">{deliverable}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-grey-600">
                  <Package className="h-12 w-12 mx-auto mb-3 text-grey-400" />
                  <p>No deliverables yet</p>
                </div>
              )}

              {isServiceProvider && partnership.status === PartnershipStatus.ACTIVE && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-grey mb-3">Add New Deliverable</h4>
                  <div className="flex gap-2">
                    <Input
                      value={newDeliverable}
                      onChange={(e) => setNewDeliverable(e.target.value)}
                      placeholder="e.g., API_KEY: sk_live_abc123xyz789"
                    />
                    <Button
                      onClick={handleAddDeliverable}
                      disabled={isSending || !newDeliverable.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
