import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Bot,
  User,
  Loader2,
  Copy,
  Check,
  X,
  Minimize2,
  Maximize2,
  Settings,
  Wrench,
  AlertTriangle,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useAgentChat, type ChatUiMessage } from '@/hooks/useAgentChat';
import AgentSettingsDialog from '@/components/chatbot/AgentSettingsDialog';

interface ChatbotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  'List my products',
  'What apps are connected?',
  'Show recent errors in logs',
  'What environments does my product have?',
];

const WIDTH_STORAGE_KEY = 'ductape.chatbot.sidebarWidth.v1';
const DEFAULT_WIDTH = 384;
const MIN_WIDTH = 320;
const MAX_WIDTH = 720;

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

function getInitialWidth(): number {
  const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? clampWidth(stored) : DEFAULT_WIDTH;
}

function ToolActivityRow({
  tool,
  onRespond,
}: {
  tool: ChatUiMessage['toolActivity'][number];
  onRespond: (callId: string, approved: boolean) => void;
}) {
  if (tool.status === 'pending_confirmation') {
    const { module, method, product, params } = (tool.input ?? {}) as {
      module?: string;
      method?: string;
      product?: string;
      params?: unknown;
    };
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>
            Wants to run <span className="font-mono">{module}.{method}</span>
            {product && <> on <span className="font-mono">{product}</span></>}
          </span>
        </div>
        {params !== undefined && (
          <pre className="bg-black/5 dark:bg-white/5 rounded p-1.5 overflow-x-auto max-h-24 font-mono">
            {JSON.stringify(params, null, 2)}
          </pre>
        )}
        <div className="flex items-center gap-2 pt-0.5">
          <Button size="sm" className="h-6 text-xs px-2" onClick={() => onRespond(tool.id, true)}>
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs px-2"
            onClick={() => onRespond(tool.id, false)}
          >
            Deny
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-grey-600 dark:text-grey-700">
      {tool.status === 'running' && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
      {tool.status === 'done' && <Wrench className="h-3 w-3 shrink-0" />}
      {tool.status === 'denied' && <X className="h-3 w-3 shrink-0" />}
      {tool.status === 'error' && <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />}
      <span className="font-mono truncate">{tool.name}</span>
      {tool.status === 'denied' && <span className="truncate">(declined)</span>}
      {tool.status === 'error' && tool.errorMessage && (
        <span className="text-red-500 truncate">({tool.errorMessage})</span>
      )}
    </div>
  );
}

export default function ChatbotSidebar({ isOpen, onClose }: ChatbotSidebarProps) {
  const { messages, isLoading, error, hasKey, refreshKeyStatus, sendMessage, stop, respondToConfirmation } =
    useAgentChat();
  const [input, setInput] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [width, setWidth] = useState(getInitialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    setWidth((current) => {
      localStorage.setItem(WIDTH_STORAGE_KEY, String(current));
      return current;
    });
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    // The panel is docked to the right edge, so its width is the distance
    // from the cursor to the viewport's right edge, not e.clientX itself.
    setWidth(clampWidth(window.innerWidth - e.clientX));
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resize, stopResizing]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;
    if (!hasKey) {
      setSettingsOpen(true);
      return;
    }
    sendMessage(text);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed right-0 top-0 h-full bg-white border-l border-grey-400 shadow-lg z-50 flex flex-col dark:bg-background-secondary"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={startResizing}
        className={cn(
          'absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-10 -translate-x-1/2',
          isResizing && 'bg-primary/50',
        )}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-grey-400 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-grey">AI Assistant</h3>
            <p className="text-xs text-grey-600">Workspace Helper</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} className="h-6 w-6 p-0">
            <Settings className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsMinimized(!isMinimized)} className="h-6 w-6 p-0">
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-grey-600 dark:text-grey-700 space-y-3">
                <p>
                  Hi, I&apos;m Jean. Ask me about your products, apps, environments, databases, or logs, or ask
                  me to change something. I&apos;ll always show you exactly what I&apos;m about to run and wait
                  for your approval before anything writes to your workspace.
                </p>
                {!hasKey && (
                  <p className="text-xs">
                    Add your own Anthropic or OpenAI API key in{' '}
                    <button className="underline" onClick={() => setSettingsOpen(true)}>
                      settings
                    </button>{' '}
                    to get started.
                  </p>
                )}
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex gap-2', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-grey-100 text-grey dark:bg-grey-400 dark:text-grey',
                  )}
                >
                  {message.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </div>

                <div className="flex-1 space-y-1 min-w-0">
                  {message.toolActivity.length > 0 && (
                    <div className="space-y-0.5 mb-1">
                      {message.toolActivity.map((tool) => (
                        <ToolActivityRow key={tool.id} tool={tool} onRespond={respondToConfirmation} />
                      ))}
                    </div>
                  )}

                  {(message.text || message.isStreaming) && (
                    <div
                      className={cn(
                        'inline-block px-3 py-2 rounded-lg max-w-full break-words text-sm',
                        message.role === 'user'
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-grey-100 text-grey rounded-bl-sm dark:bg-grey-400 dark:text-grey',
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <div className="[&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_code]:bg-black/10 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-black/10 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-xs">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-white">{message.text}</div>
                      )}
                      {message.isStreaming && !message.text && (
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Thinking...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {message.role === 'assistant' && message.text && !message.isStreaming && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.text, message.id)}
                        className="h-4 w-4 p-0"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="h-2 w-2 text-green-600" />
                        ) : (
                          <Copy className="h-2 w-2" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 rounded-md p-2">
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-grey-400 p-3 bg-white dark:bg-background-secondary">
            <div className="flex gap-2 items-end mb-2">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustTextareaHeight();
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder={hasKey ? 'Ask about your workspace...' : 'Add an API key in settings to start...'}
                  className="min-h-[36px] max-h-[100px] resize-none border-grey-400 focus:border-primary focus:ring-primary text-sm"
                />
              </div>
              {isLoading ? (
                <Button onClick={stop} className="h-9 w-9 p-0" variant="outline">
                  <Square className="h-3 w-3" />
                </Button>
              ) : (
                <Button onClick={() => handleSend(input)} disabled={!input.trim()} className="h-9 w-9 p-0">
                  <Send className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Suggested Prompts */}
            <div className="flex flex-wrap gap-1">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                  className="text-xs h-6 px-2"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}

      <AgentSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} onSaved={refreshKeyStatus} />
    </div>
  );
}
