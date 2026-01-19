/**
 * Broker Messages Service
 * Provides SDK proxy-based calls for broker message tracking operations
 * Uses the SDK proxy for secure communication and message decryption
 * Used by the MessageBrokerEventsTabContent for fetching messages, producers, consumers, dead letters, and dashboard data
 */

import { SDKProxyService, SDKProxyConfig } from './sdkProxy';
import apiClient from '@/config/axiosinstance';

// ==================== BROKER MESSAGE TYPES ====================

export type BrokerMessageStatus = 'pending' | 'success' | 'failed' | 'partial';

export interface IBrokerMessageConsumerDelivery {
  consumer_tag: string;
  status: BrokerMessageStatus;
  consumed_at?: Date;
  error?: string;
  retry_count?: number;
  response_data?: string;
}

export interface IBrokerMessage {
  _id?: string;
  message_id: string;
  idempotency_key?: string;
  workspace_id: string;
  product_id: string;
  product_tag: string;
  env: string;
  broker_tag: string;
  topic_tag: string;
  event: string;
  producer_tag: string;
  message_encrypted: string;
  message_decrypted?: Record<string, unknown>;
  status: BrokerMessageStatus;
  produced_at: Date;
  consumer_deliveries: IBrokerMessageConsumerDelivery[];
  process_id?: string;
  session_tag?: string;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
}

export interface IBrokerProducer {
  tag: string;
  name?: string;
  description?: string;
  topic: string;
  broker_tag: string;
  message_count: number;
  success_count: number;
  failed_count: number;
  pending_count: number;
  last_activity?: Date;
  status: 'active' | 'inactive' | 'error';
  created_at?: Date;
}

export interface IBrokerConsumer {
  tag: string;
  name?: string;
  description?: string;
  topic: string;
  broker_tag: string;
  message_count: number;
  success_count: number;
  failed_count: number;
  pending_count: number;
  avg_processing_time?: number;
  last_activity?: Date;
  status: 'active' | 'inactive' | 'error';
  created_at?: Date;
}

export interface IBrokerDeadLetter {
  message_id: string;
  original_message: IBrokerMessage;
  error: string;
  failed_at: Date;
  retry_count: number;
  consumer_tag: string;
  can_retry: boolean;
}

export interface IBrokerMessageStats {
  total: number;
  pending: number;
  success: number;
  failed: number;
  partial: number;
  producer_count: number;
  consumer_count: number;
  dead_letter_count: number;
  messages_by_topic: Record<string, number>;
  messages_by_producer: Record<string, number>;
  avg_processing_time?: number;
}

export interface IBrokerOverviewDashboard {
  stats: IBrokerMessageStats;
  recent_messages: IBrokerMessage[];
  top_producers: IBrokerProducer[];
  top_consumers: IBrokerConsumer[];
  daily_activity: Array<{
    date: string;
    published: number;
    consumed: number;
    failed: number;
  }>;
  hourly_distribution: Array<{
    hour: number;
    count: number;
  }>;
}

// ==================== QUERY OPTIONS ====================

export interface IFetchBrokerMessagesOptions {
  product_tag: string;
  env: string;
  broker_tag: string;
  topic_tag?: string;
  producer_tag?: string;
  consumer_tag?: string;
  status?: BrokerMessageStatus;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface IFetchBrokerProducersOptions {
  product_tag: string;
  env: string;
  broker_tag: string;
  topic_tag?: string;
  page?: number;
  limit?: number;
}

export interface IFetchBrokerConsumersOptions {
  product_tag: string;
  env: string;
  broker_tag: string;
  topic_tag?: string;
  page?: number;
  limit?: number;
}

export interface IFetchBrokerDeadLettersOptions {
  product_tag: string;
  env: string;
  broker_tag: string;
  topic_tag?: string;
  consumer_tag?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface IFetchBrokerDashboardOptions {
  product_tag: string;
  env: string;
  broker_tag: string;
}

// ==================== RESPONSE TYPES ====================

export interface IFetchBrokerMessagesResult {
  messages: IBrokerMessage[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IFetchBrokerProducersResult {
  producers: IBrokerProducer[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IFetchBrokerConsumersResult {
  consumers: IBrokerConsumer[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IFetchBrokerDeadLettersResult {
  deadLetters: IBrokerDeadLetter[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ==================== API RESPONSE WRAPPER ====================

interface ApiResponse<T> {
  status: boolean;
  data: T;
  message?: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get SDK proxy configuration from auth data
 */
const getProxyConfig = (
  workspace_id: string,
  user_id: string,
  public_key: string
): SDKProxyConfig => {
  const token = localStorage.getItem('token')?.replace(/"/g, '') || '';
  return {
    workspace_id,
    user_id,
    public_key,
    token,
  };
};

/**
 * Get auth headers for direct API requests (retry/fail operations)
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')?.replace(/"/g, '') || '';
  return {
    'x-access-token': token,
  };
};

// ==================== SERVICE FUNCTIONS (SDK PROXY) ====================

/**
 * Fetch broker messages with pagination using SDK proxy
 * Messages are decrypted on the SDK side before returning
 */
export const fetchBrokerMessages = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  options: IFetchBrokerMessagesOptions
): Promise<IFetchBrokerMessagesResult> => {
  try {
    const config = getProxyConfig(workspace_id, user_id, public_key);
    const sdkProxy = new SDKProxyService(config);

    const result = await sdkProxy.messageBrokers.messages.query<IFetchBrokerMessagesResult>({
      product: options.product_tag,
      env: options.env,
      brokerTag: options.broker_tag,
      topicTag: options.topic_tag,
      producerTag: options.producer_tag,
      consumerTag: options.consumer_tag,
      status: options.status,
      startDate: options.start_date,
      endDate: options.end_date,
      page: options.page,
      limit: options.limit,
    });

    return result;
  } catch (e) {
    console.error('[fetchBrokerMessages] Error:', e);
    return { messages: [], total: 0, page: options.page || 1, limit: options.limit || 20, hasMore: false };
  }
};

/**
 * Fetch broker producers with pagination using SDK proxy
 */
export const fetchBrokerProducers = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  options: IFetchBrokerProducersOptions
): Promise<IFetchBrokerProducersResult> => {
  try {
    const config = getProxyConfig(workspace_id, user_id, public_key);
    const sdkProxy = new SDKProxyService(config);

    const result = await sdkProxy.messageBrokers.messages.getProducers<IFetchBrokerProducersResult>({
      product: options.product_tag,
      env: options.env,
      brokerTag: options.broker_tag,
      topicTag: options.topic_tag,
      page: options.page,
      limit: options.limit,
    });

    return result;
  } catch (e) {
    console.error('[fetchBrokerProducers] Error:', e);
    return { producers: [], total: 0, page: options.page || 1, limit: options.limit || 20, hasMore: false };
  }
};

/**
 * Fetch broker consumers with pagination using SDK proxy
 */
export const fetchBrokerConsumers = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  options: IFetchBrokerConsumersOptions
): Promise<IFetchBrokerConsumersResult> => {
  try {
    const config = getProxyConfig(workspace_id, user_id, public_key);
    const sdkProxy = new SDKProxyService(config);

    const result = await sdkProxy.messageBrokers.messages.getConsumers<IFetchBrokerConsumersResult>({
      product: options.product_tag,
      env: options.env,
      brokerTag: options.broker_tag,
      topicTag: options.topic_tag,
      page: options.page,
      limit: options.limit,
    });

    return result;
  } catch (e) {
    console.error('[fetchBrokerConsumers] Error:', e);
    return { consumers: [], total: 0, page: options.page || 1, limit: options.limit || 20, hasMore: false };
  }
};

/**
 * Fetch broker dead letters with pagination using SDK proxy
 * Messages are decrypted on the SDK side before returning
 */
export const fetchBrokerDeadLetters = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  options: IFetchBrokerDeadLettersOptions
): Promise<IFetchBrokerDeadLettersResult> => {
  try {
    const config = getProxyConfig(workspace_id, user_id, public_key);
    const sdkProxy = new SDKProxyService(config);

    const result = await sdkProxy.messageBrokers.messages.getDeadLetters<IFetchBrokerDeadLettersResult>({
      product: options.product_tag,
      env: options.env,
      brokerTag: options.broker_tag,
      topicTag: options.topic_tag,
      consumerTag: options.consumer_tag,
      startDate: options.start_date,
      endDate: options.end_date,
      page: options.page,
      limit: options.limit,
    });

    return result;
  } catch (e) {
    console.error('[fetchBrokerDeadLetters] Error:', e);
    return { deadLetters: [], total: 0, page: options.page || 1, limit: options.limit || 20, hasMore: false };
  }
};

/**
 * Fetch broker comprehensive stats using SDK proxy
 */
export const fetchBrokerStats = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  options: IFetchBrokerDashboardOptions
): Promise<IBrokerMessageStats> => {
  try {
    const config = getProxyConfig(workspace_id, user_id, public_key);
    const sdkProxy = new SDKProxyService(config);

    const result = await sdkProxy.messageBrokers.messages.getStats<IBrokerMessageStats>({
      product: options.product_tag,
      env: options.env,
      brokerTag: options.broker_tag,
    });

    return result;
  } catch (e) {
    console.error('[fetchBrokerStats] Error:', e);
    return {
      total: 0,
      pending: 0,
      success: 0,
      failed: 0,
      partial: 0,
      producer_count: 0,
      consumer_count: 0,
      dead_letter_count: 0,
      messages_by_topic: {},
      messages_by_producer: {},
    };
  }
};

/**
 * Fetch broker dashboard overview data using SDK proxy
 * Recent messages are decrypted on the SDK side before returning
 */
export const fetchBrokerDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  options: IFetchBrokerDashboardOptions
): Promise<IBrokerOverviewDashboard> => {
  try {
    const config = getProxyConfig(workspace_id, user_id, public_key);
    const sdkProxy = new SDKProxyService(config);

    const result = await sdkProxy.messageBrokers.messages.getDashboard<IBrokerOverviewDashboard>({
      product: options.product_tag,
      env: options.env,
      brokerTag: options.broker_tag,
    });

    return result;
  } catch (e) {
    console.error('[fetchBrokerDashboard] Error:', e);
    return {
      stats: {
        total: 0,
        pending: 0,
        success: 0,
        failed: 0,
        partial: 0,
        producer_count: 0,
        consumer_count: 0,
        dead_letter_count: 0,
        messages_by_topic: {},
        messages_by_producer: {},
      },
      recent_messages: [],
      top_producers: [],
      top_consumers: [],
      daily_activity: [],
      hourly_distribution: [],
    };
  }
};

/**
 * Retry a failed broker message
 * Uses direct API call as this is a write operation
 */
export const retryBrokerMessage = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  message_id: string,
  consumer_tag: string
): Promise<IBrokerMessage | null> => {
  try {
    const response = await apiClient.post<ApiResponse<IBrokerMessage>>(
      `/integrations/v1/broker-messages/${message_id}/retry`,
      { consumer_tag, user_id, public_key, workspace_id },
      { headers: getAuthHeaders() }
    );

    return response.data.data;
  } catch (e) {
    console.error('[retryBrokerMessage] Error:', e);
    return null;
  }
};

/**
 * Fail all pending deliveries for a message
 * Uses direct API call as this is a write operation
 */
export const failBrokerMessage = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  message_id: string,
  error: string
): Promise<IBrokerMessage | null> => {
  try {
    const response = await apiClient.post<ApiResponse<IBrokerMessage>>(
      `/integrations/v1/broker-messages/${message_id}/fail`,
      { error, user_id, public_key, workspace_id },
      { headers: getAuthHeaders() }
    );

    return response.data.data;
  } catch (e) {
    console.error('[failBrokerMessage] Error:', e);
    return null;
  }
};

const brokerMessagesService = {
  fetchBrokerMessages,
  fetchBrokerProducers,
  fetchBrokerConsumers,
  fetchBrokerDeadLetters,
  fetchBrokerStats,
  fetchBrokerDashboard,
  retryBrokerMessage,
  failBrokerMessage,
};

export default brokerMessagesService;
