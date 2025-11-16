import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Copy, Check, X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatbotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatbotSidebar({ isOpen, onClose }: ChatbotSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm Jean, your AI assistant for Ductape.\n\nThe chatbot feature is currently under construction. We're working hard to bring you an intelligent assistant that can help you build integrations, understand your workspace data, and answer questions about your products, apps, and environments.\n\nStay tuned for updates! 🚀",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { openTab } = useWorkbenchStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about "${userMessage.content}". This is a placeholder response. In the actual implementation, I would analyze your workspace data and provide specific guidance based on your products, apps, and environments. I could also help you create new integrations, open specific tabs, or fill out forms.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
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

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create-product':
        openTab({
          id: `new-product-${Date.now()}`,
          type: 'product',
          title: 'New Product',
        });
        toast.success('Opening new product tab');
        break;
      case 'create-app':
        openTab({
          id: `new-app-${Date.now()}`,
          type: 'app',
          title: 'New App',
        });
        toast.success('Opening new app tab');
        break;
      case 'view-logs':
        openTab({
          id: `logs-${Date.now()}`,
          type: 'logs',
          title: 'Workspace Logs',
        });
        toast.success('Opening logs tab');
        break;
      default:
        setInput(action);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-grey-400 shadow-lg z-50 flex flex-col dark:bg-background-secondary">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0"
          >
            {isMinimized ? (
              <Maximize2 className="h-3 w-3" />
            ) : (
              <Minimize2 className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-grey-100 text-grey dark:bg-grey-400 dark:text-grey'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <Bot className="h-3 w-3" />
                  )}
                </div>

                {/* Message Content */}
                <div className="flex-1 space-y-1">
                  <div
                    className={cn(
                      'inline-block px-3 py-2 rounded-lg max-w-full break-words text-sm',
                      message.role === 'user'
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-grey-100 text-grey rounded-bl-sm dark:bg-grey-400 dark:text-grey'
                    )}
                  >
                    <div className={cn(
                      'whitespace-pre-wrap',
                      message.role === 'user' ? 'text-white' : 'text-grey dark:text-grey'
                    )}>{message.content}</div>
                  </div>

                  {/* Message Actions */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-grey-500 dark:text-grey-700">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.role === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="h-2 w-2 text-green-600" />
                        ) : (
                          <Copy className="h-2 w-2" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-grey-100 text-grey-600 flex items-center justify-center flex-shrink-0 dark:bg-grey-400 dark:text-grey">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="flex-1">
                  <div className="inline-block px-3 py-2 rounded-lg bg-grey-100 text-grey rounded-bl-sm dark:bg-grey-400 dark:text-grey">
                    <div className="flex items-center gap-2 text-sm text-grey dark:text-grey">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
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
              placeholder="Feature coming soon..."
              className="min-h-[36px] max-h-[100px] resize-none border-grey-400 focus:border-primary focus:ring-primary text-sm"
              disabled={true}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={true}
            className="h-9 w-9 p-0 bg-grey-300 cursor-not-allowed"
          >
            <Send className="h-3 w-3" />
          </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'New Product', action: 'create-product' },
                { label: 'New App', action: 'create-app' },
                { label: 'View Logs', action: 'view-logs' },
                { label: 'Help', action: 'How do I create an integration?' },
              ].map((suggestion) => (
                <Button
                  key={suggestion.action}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(suggestion.action)}
                  className="text-xs h-6 px-2"
                  disabled={true}
                >
                  {suggestion.label}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
