import { useState, useEffect } from 'react';
import { MessageSquare, Search, ChevronDown, ChevronRight, Activity, Users, Send, Trash2, AlertCircle, CheckCircle2, Tag, Code2, Shield, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MessageBrokerEvent {
  id: string;
  event_type: string; // e.g., "message.published", "message.consumed", "message.failed"
  category: 'consumer' | 'producer' | 'dead-letter' | 'message' | 'error';
  topic: string;
  message: string;
  timestamp: Date;
  status: 'success' | 'failed' | 'pending' | 'duplicate';
  idempotent?: boolean; // Whether this operation was idempotent
  request_data?: any; // Request payload
  response_data?: any; // Response data
  metadata?: {
    consumer_id?: string;
    producer_id?: string;
    error_message?: string;
    retry_count?: number;
    message_id?: string;
    idempotency_key?: string;
  };
}

interface MessageBrokerEventsTabContentProps {
  broker: any;
}

// Dummy data
const DUMMY_BROKER_EVENTS: MessageBrokerEvent[] = [
  {
    id: '1',
    event_type: 'message.consumed',
    category: 'consumer',
    topic: 'user-registration',
    message: 'Consumer "email-service" processed message successfully',
    timestamp: new Date(Date.now() - 30000),
    status: 'success',
    idempotent: false,
    request_data: {
      userId: 'user-12345',
      email: 'john@example.com',
      name: 'John Doe',
      registeredAt: '2024-01-15T10:30:00Z'
    },
    response_data: {
      emailSent: true,
      messageId: 'email-msg-789',
      deliveryStatus: 'delivered'
    },
    metadata: {
      consumer_id: 'email-service-001',
      message_id: 'msg-123456',
    },
  },
  {
    id: '2',
    event_type: 'message.published',
    category: 'producer',
    topic: 'order-created',
    message: 'Producer "order-service" published message',
    timestamp: new Date(Date.now() - 120000),
    status: 'success',
    idempotent: true,
    request_data: {
      orderId: 'order-987654',
      customerId: 'cust-456',
      items: [
        { productId: 'prod-123', quantity: 2, price: 49.99 },
        { productId: 'prod-456', quantity: 1, price: 29.99 }
      ],
      totalAmount: 129.97
    },
    response_data: {
      published: true,
      messageId: 'msg-234567',
      partition: 2
    },
    metadata: {
      producer_id: 'order-service-002',
      message_id: 'msg-234567',
      idempotency_key: 'order-unique-123',
    },
  },
  {
    id: '3',
    event_type: 'consumer.failed',
    category: 'error',
    topic: 'payment-processing',
    message: 'Failed to process payment notification',
    timestamp: new Date(Date.now() - 300000),
    status: 'failed',
    idempotent: false,
    metadata: {
      consumer_id: 'payment-service-003',
      error_message: 'Connection timeout after 30s',
      retry_count: 3,
    },
  },
  {
    id: '4',
    event_type: 'message.deadlettered',
    category: 'dead-letter',
    topic: 'notification-failed',
    message: 'Message moved to dead letter queue after max retries',
    timestamp: new Date(Date.now() - 600000),
    status: 'failed',
    idempotent: false,
    request_data: {
      userId: 'user-789',
      notificationType: 'email',
      template: 'welcome-email',
      recipient: 'user@example.com',
      data: { name: 'John Doe', action: 'signup' }
    },
    metadata: {
      consumer_id: 'notification-service-004',
      error_message: 'Max retry attempts exceeded',
      retry_count: 5,
      message_id: 'msg-345678',
    },
  },
  {
    id: '5',
    event_type: 'message.queued',
    category: 'message',
    topic: 'inventory-update',
    message: 'Message queued for processing',
    timestamp: new Date(Date.now() - 15000),
    status: 'pending',
    idempotent: false,
    metadata: {
      message_id: 'msg-456789',
    },
  },
  {
    id: '6',
    event_type: 'duplicate.detected',
    category: 'message',
    topic: 'order-created',
    message: 'Duplicate message detected and ignored via idempotency check',
    timestamp: new Date(Date.now() - 45000),
    status: 'duplicate',
    idempotent: true,
    metadata: {
      idempotency_key: 'order-abc123-retry',
      message_id: 'msg-567890',
      producer_id: 'order-service-002',
    },
  },
  {
    id: '7',
    event_type: 'message.consumed',
    category: 'consumer',
    topic: 'user-login',
    message: 'Consumer "analytics-service" processed message',
    timestamp: new Date(Date.now() - 90000),
    status: 'success',
    idempotent: true,
    metadata: {
      consumer_id: 'analytics-service-005',
      message_id: 'msg-678901',
      idempotency_key: 'login-track-xyz',
    },
  },
  {
    id: '8',
    event_type: 'message.published',
    category: 'producer',
    topic: 'inventory-update',
    message: 'Producer "inventory-service" published message',
    timestamp: new Date(Date.now() - 180000),
    status: 'success',
    idempotent: false,
    metadata: {
      producer_id: 'inventory-service-006',
      message_id: 'msg-789012',
    },
  },
  {
    id: '9',
    event_type: 'producer.failed',
    category: 'error',
    topic: 'email-send',
    message: 'Failed to send email notification',
    timestamp: new Date(Date.now() - 420000),
    status: 'failed',
    idempotent: false,
    metadata: {
      consumer_id: 'email-service-001',
      error_message: 'SMTP server unavailable',
      retry_count: 2,
    },
  },
  {
    id: '10',
    event_type: 'message.consumed',
    category: 'consumer',
    topic: 'payment-processing',
    message: 'Payment processed successfully with idempotency guarantee',
    timestamp: new Date(Date.now() - 240000),
    status: 'success',
    idempotent: true,
    metadata: {
      idempotency_key: 'payment-xyz789-unique',
      message_id: 'msg-890123',
      consumer_id: 'payment-service-003',
    },
  },
];

export default function MessageBrokerEventsTabContent({ broker }: MessageBrokerEventsTabContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Show error if broker data is incomplete
  if (!broker?.name && !broker?.brokerTag) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete message broker data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the message broker from your product to reload it.
          </p>
        </div>
      </div>
    );
  }

  const brokerEvents = DUMMY_BROKER_EVENTS;

  // Get unique categories and statuses
  const uniqueCategories = Array.from(new Set(brokerEvents.map(item => item.category)));
  const uniqueStatuses = Array.from(new Set(brokerEvents.map(item => item.status)));

  // Combined filtering
  const filteredEvents = brokerEvents.filter(item => {
    const matchesSearch = !searchQuery ||
      item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.event_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const toggleRow = (eventId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedRows(newExpanded);
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((currentTime - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      success: 'bg-green text-white',
      failed: 'bg-red text-white',
      pending: 'bg-orange-500 text-white',
      duplicate: 'bg-grey-500 text-white',
    };
    return (
      <Badge className={`text-xs ${config[status] || 'bg-grey-500 text-white'}`}>
        {status}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      consumer: Users,
      producer: Send,
      'dead-letter': Trash2,
      message: MessageSquare,
      error: AlertCircle,
    };
    return icons[category] || Activity;
  };

  // Calculate stats
  const totalEvents = brokerEvents.length;
  const successCount = brokerEvents.filter(e => e.status === 'success').length;
  const failedCount = brokerEvents.filter(e => e.status === 'failed').length;
  const idempotentCount = brokerEvents.filter(e => e.idempotent).length;

  // Extract product info for header
  const product = broker?.productName && broker?.productTag ? {
    name: broker.productName,
    tag: broker.productTag,
    logo: broker.productLogo,
  } : null;

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Product Context Header */}
        {product && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {product.logo ? (
                  <img
                    src={product.logo}
                    alt={product.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  product.name?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-grey">Events for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  Monitor real-time events from your message broker: {broker.name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Activity className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey mb-2">{broker.name} - Events</h1>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-grey-600 flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    <span className="font-mono">{broker.brokerTag || broker.tag}</span>
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-grey">Total Events</h3>
            </div>
            <p className="text-2xl font-bold text-grey">{totalEvents}</p>
            <p className="text-xs text-grey-600 mt-1">All broker events</p>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green" />
              <h3 className="text-sm font-semibold text-grey">Successful</h3>
            </div>
            <p className="text-2xl font-bold text-green">{successCount}</p>
            <p className="text-xs text-grey-600 mt-1">Processed successfully</p>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-red" />
              <h3 className="text-sm font-semibold text-grey">Failed</h3>
            </div>
            <p className="text-2xl font-bold text-red">{failedCount}</p>
            <p className="text-xs text-grey-600 mt-1">Errors and dead letters</p>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-grey">Idempotent</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600">{idempotentCount}</p>
            <p className="text-xs text-grey-600 mt-1">With idempotency guarantee</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(category => {
                    const Icon = getCategoryIcon(category);
                    return (
                      <SelectItem key={category} value={category}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {category.replace('-', ' ')}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2 capitalize">
                        {status}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-white rounded-lg border border-grey-400 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-grey-600">
                    No events found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => {
                  const isExpanded = expandedRows.has(event.id);
                  const Icon = getCategoryIcon(event.category);

                  return (
                    <>
                      <TableRow
                        key={event.id}
                        className="cursor-pointer"
                        onClick={() => toggleRow(event.id)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-grey-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-grey-600" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-grey">{event.event_type}</span>
                            {event.idempotent && (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">
                                <Shield className="h-3 w-3 mr-1" />
                                idempotent
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-medium text-grey">
                            <Icon className="h-3 w-3 mr-1" />
                            {event.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-grey">{event.topic}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(event.status)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-grey-600">{getTimeAgo(event.timestamp)}</span>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${event.id}-expanded`}>
                          <TableCell colSpan={6} className="p-0">
                            <div className="p-6 space-y-4">
                              {/* Event ID and Time */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Code2 className="h-4 w-4 text-grey-600" />
                                  <span className="text-xs font-semibold text-grey uppercase tracking-wide">Event Details</span>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-grey-300">
                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                      <span className="text-grey-600">Event ID:</span>
                                      <span className="ml-2 font-mono text-grey">{event.id}</span>
                                    </div>
                                    <div>
                                      <span className="text-grey-600">Timestamp:</span>
                                      <span className="ml-2 text-grey">{event.timestamp.toLocaleString()}</span>
                                    </div>
                                    {event.idempotent && (
                                      <div className="col-span-2">
                                        <span className="text-grey-600">Idempotency:</span>
                                        <span className="ml-2 text-blue-600 font-medium">Guaranteed - operation is safe to retry</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Metadata Grid */}
                              {(event.metadata?.consumer_id || event.metadata?.producer_id || event.metadata?.message_id || event.metadata?.idempotency_key || event.metadata?.retry_count !== undefined) && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {event.metadata?.message_id && (
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <div className="text-xs font-semibold mb-1">Message ID</div>
                                      <span className="text-xs font-mono text-grey">{event.metadata.message_id}</span>
                                    </div>
                                  )}
                                  {event.metadata?.consumer_id && (
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <div className="text-xs font-semibold mb-1">Consumer ID</div>
                                      <span className="text-xs font-mono text-grey">{event.metadata.consumer_id}</span>
                                    </div>
                                  )}
                                  {event.metadata?.producer_id && (
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <div className="text-xs font-semibold mb-1">Producer ID</div>
                                      <span className="text-xs font-mono text-grey">{event.metadata.producer_id}</span>
                                    </div>
                                  )}
                                  {event.metadata?.idempotency_key && (
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <div className="text-xs font-semibold mb-1">Idempotency Key</div>
                                      <span className="text-xs font-mono text-grey">{event.metadata.idempotency_key}</span>
                                    </div>
                                  )}
                                  {event.metadata?.retry_count !== undefined && (
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <div className="text-xs font-semibold mb-1">Retry Count</div>
                                      <span className="text-xs text-grey">{event.metadata.retry_count}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Error Message */}
                              {event.metadata?.error_message && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <AlertCircle className="h-4 w-4 text-red" />
                                      <span className="text-xs font-semibold text-grey uppercase tracking-wide">Error Details</span>
                                    </div>
                                    {event.category === 'dead-letter' && (
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Handle reprocess logic here
                                          alert(`Reprocessing message ${event.metadata?.message_id}`);
                                        }}
                                        size="sm"
                                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
                                      >
                                        <Activity className="h-3.5 w-3.5" />
                                        Reprocess DLQ
                                      </Button>
                                    )}
                                  </div>
                                  <div className="bg-red/5 rounded-lg p-3 border border-red/20">
                                    <span className="text-xs text-red">{event.metadata.error_message}</span>
                                  </div>
                                </div>
                              )}

                              {/* Request Data */}
                              {event.request_data && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Send className="h-4 w-4 text-grey-600" />
                                    <span className="text-xs font-semibold text-grey uppercase tracking-wide">Request Data</span>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 border border-grey-300">
                                    <pre className="text-xs font-mono text-grey overflow-x-auto whitespace-pre-wrap break-all max-h-80 overflow-y-auto">
{JSON.stringify(event.request_data, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {/* Response Data */}
                              {event.response_data && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 className="h-4 w-4 text-grey-600" />
                                    <span className="text-xs font-semibold text-grey uppercase tracking-wide">Response Data</span>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 border border-grey-300">
                                    <pre className="text-xs font-mono text-grey overflow-x-auto whitespace-pre-wrap break-all max-h-80 overflow-y-auto">
{JSON.stringify(event.response_data, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ About Message Broker Events</h3>
          <p className="text-xs text-blue-800">
            This view shows real-time events from your message broker. <strong>Consumers</strong> process messages, <strong>Producers</strong> publish messages, and <strong>Dead Letters</strong> are failed messages after max retries. Events marked with the <strong>idempotent</strong> badge can be safely retried without side effects, ensuring exactly-once processing semantics. Click on any event to view request/response data and use the <strong>Reprocess DLQ</strong> button to retry failed messages from the dead letter queue.
          </p>
        </div>
      </div>
    </div>
  );
}
