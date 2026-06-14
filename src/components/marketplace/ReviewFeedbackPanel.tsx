import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Eye, MessageSquare, RefreshCw, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  REVIEW_FEEDBACK_TOPICS,
  resourceSelectLabel,
  topicLabel,
  type ReviewFeedbackMessage,
  type ReviewFeedbackPostPayload,
  type ReviewFeedbackResourcesByTopic,
  type ReviewFeedbackTopic,
} from '@/lib/reviewFeedback';

const NO_RESOURCE = '__none__';

interface ReviewFeedbackPanelProps {
  appId: string;
  canPost?: boolean;
  viewerRole: 'admin' | 'workspace';
  queryKey: string[];
  resourceOptions?: ReviewFeedbackResourcesByTopic;
  onViewApp?: () => void;
  fetchMessages: () => Promise<ReviewFeedbackMessage[]>;
  postMessage: (payload: ReviewFeedbackPostPayload) => Promise<void>;
}

function formatTime(value?: string) {
  if (!value) return '';
  try {
    return format(new Date(value), 'MMM d, yyyy h:mm a');
  } catch {
    return '';
  }
}

export default function ReviewFeedbackPanel({
  appId,
  canPost = true,
  viewerRole,
  queryKey,
  resourceOptions,
  onViewApp,
  fetchMessages,
  postMessage,
}: ReviewFeedbackPanelProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [topic, setTopic] = useState<ReviewFeedbackTopic>('general');
  const [resourceId, setResourceId] = useState(NO_RESOURCE);

  const availableResources = useMemo(
    () => resourceOptions?.[topic] ?? [],
    [resourceOptions, topic],
  );

  const { data: messages = [], isLoading, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: fetchMessages,
    enabled: !!appId,
  });

  const sendMutation = useMutation({
    mutationFn: () => {
      const selected = availableResources.find((item) => item.id === resourceId);
      return postMessage({
        message: message.trim(),
        topic,
        resource_id: resourceId !== NO_RESOURCE ? resourceId : undefined,
        resource_label: selected?.label,
      });
    },
    onSuccess: async () => {
      setMessage('');
      setResourceId(NO_RESOURCE);
      await queryClient.invalidateQueries({ queryKey });
      toast.success('Reply sent');
    },
    onError: () => toast.error('Could not send reply'),
  });

  const handleTopicChange = (value: ReviewFeedbackTopic) => {
    setTopic(value);
    setResourceId(NO_RESOURCE);
  };

  return (
    <div className="rounded-xl border border-grey-400/30 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-grey-400/30 bg-grey-100/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-grey">Review feedback</h3>
        </div>
        <div className="flex items-center gap-2">
          {onViewApp && (
            <Button type="button" variant="outline" size="sm" onClick={onViewApp} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              View app
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs text-grey-600 mb-4">
          Chat with the review team about your submission. Tag a specific action or resource when
          replying. Use refresh to load new messages.
        </p>

        <div className="max-h-80 overflow-y-auto space-y-3 mb-4 pr-1">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-grey-400/50 bg-grey-100/40 px-4 py-8 text-center text-sm text-grey-600">
              No feedback yet. {canPost ? 'You can reply once the reviewer comments.' : 'Waiting for reviewer feedback.'}
            </div>
          ) : (
            messages.map((item) => {
              const isOwnSide =
                viewerRole === 'admin' ? item.author_type === 'admin' : item.author_type === 'workspace';

              return (
                <div key={item._id} className={cn('flex', isOwnSide ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-xl px-3 py-2.5 border',
                      isOwnSide ? 'bg-primary/10 border-primary/20' : 'bg-grey-100/50 border-grey-400/30',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-grey">{item.author_name}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white text-grey-600 border border-grey-400/30">
                        {topicLabel(item.topic)}
                      </span>
                      {item.resource_label && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {item.resource_label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-grey whitespace-pre-wrap">{item.message}</p>
                    <p className="text-[10px] text-grey-600 mt-1.5">{formatTime(item.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {canPost && (
          <div className="space-y-3 border-t border-grey-400/30 pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={topic} onValueChange={(v) => handleTopicChange(v as ReviewFeedbackTopic)}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Topic" />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_FEEDBACK_TOPICS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {availableResources.length > 0 && (
                <Select value={resourceId} onValueChange={setResourceId}>
                  <SelectTrigger className="w-full sm:flex-1">
                    <SelectValue placeholder={resourceSelectLabel(topic)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_RESOURCE}>All {topicLabel(topic).toLowerCase()}</SelectItem>
                    {availableResources.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Reply to the review team..."
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={!message.trim() || sendMutation.isPending}
                className="gap-1.5"
              >
                <Send className="h-4 w-4" />
                Send reply
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
