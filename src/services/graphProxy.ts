/**
 * Graph Proxy Service
 * Frontend service that proxies graph operations through the secure backend endpoint
 *
 * This provides the same interface as the SDK's ductape.graph object
 * but executes operations through the backend where native graph drivers can run
 *
 * All requests are encrypted using the product's public_key before transmission
 */

import apiClient from '@/config/axiosinstance';
import { encryptProxyPayload } from '@/utils/proxyEncryption';

/**
 * Configuration for the Graph Proxy Service
 */
export interface GraphProxyConfig {
  workspace_id: string;
  user_id: string;
  public_key: string;
  token: string;
}

/**
 * Response from the graph proxy endpoint
 */
interface GraphProxyResponse<T = any> {
  success: boolean;
  data?: {
    data: T;
    execution_time_ms: number;
    query_id: string;
  };
  message?: string;
  code?: string;
}

/**
 * Graph Proxy Service
 * Provides the same interface as SDK's ductape.graph but executes via backend
 */
export class GraphProxyService {
  private config: GraphProxyConfig;

  constructor(config: GraphProxyConfig) {
    this.config = config;
  }

  /**
   * Execute a graph method through the proxy
   * Encrypts the sensitive payload before transmission
   */
  private async execute<T = any>(method: string, ...params: any[]): Promise<T> {
    // Encrypt sensitive data (method, params, user_id) using public_key
    const sensitiveData = {
      method,
      params,
      user_id: this.config.user_id,
    };
    const encryptedPayload = encryptProxyPayload(sensitiveData, this.config.public_key);

    const response = await apiClient.post<GraphProxyResponse<T>>(
      '/proxy/v1/graph-proxy/execute',
      {
        encrypted_payload: encryptedPayload,
        workspace_id: this.config.workspace_id,
        user_id: this.config.user_id,
        public_key: this.config.public_key,
      },
      {
        headers: {
          'x-access-token': this.config.token,
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Graph operation failed');
    }

    return response.data.data?.data as T;
  }

  /**
   * Graph operations interface
   * Mirrors the SDK's ductape.graph object
   */
  graph = {
    // ==================== CONNECTION MANAGEMENT ====================
    connect: <T = any>(config: any) => this.execute<T>('connect', config),
    testConnection: <T = any>(config: any) => this.execute<T>('testConnection', config),
    disconnect: () => this.execute('disconnect'),
    disconnectAll: () => this.execute('disconnectAll'),
    getCurrentContext: <T = any>() => this.execute<T>('getCurrentContext'),

    // ==================== GRAPH CRUD ====================
    create: <T = any>(config: any) => this.execute<T>('create', config),
    fetchAll: <T = any>(product: string) => this.execute<T>('fetchAll', product),
    fetch: <T = any>(product: string, graphTag: string) =>
      this.execute<T>('fetch', product, graphTag),
    update: <T = any>(product: string, graphTag: string, data: any) =>
      this.execute<T>('update', product, graphTag, data),
    delete: <T = any>(product: string, graphTag: string) =>
      this.execute<T>('delete', product, graphTag),

    // ==================== NODE OPERATIONS ====================
    createNode: <T = any>(options: any) => this.execute<T>('createNode', options),
    findNodes: <T = any>(options: any) => this.execute<T>('findNodes', options),
    findNodeById: <T = any>(options: any) => this.execute<T>('findNodeById', options),
    updateNode: <T = any>(options: any) => this.execute<T>('updateNode', options),
    deleteNode: <T = any>(options: any) => this.execute<T>('deleteNode', options),
    mergeNode: <T = any>(options: any) => this.execute<T>('mergeNode', options),
    addLabels: <T = any>(options: any) => this.execute<T>('addLabels', options),
    removeLabels: <T = any>(options: any) => this.execute<T>('removeLabels', options),
    setLabels: <T = any>(options: any) => this.execute<T>('setLabels', options),

    // ==================== RELATIONSHIP OPERATIONS ====================
    createRelationship: <T = any>(options: any) => this.execute<T>('createRelationship', options),
    findRelationships: <T = any>(options: any) => this.execute<T>('findRelationships', options),
    findRelationshipById: <T = any>(options: any) => this.execute<T>('findRelationshipById', options),
    updateRelationship: <T = any>(options: any) => this.execute<T>('updateRelationship', options),
    deleteRelationship: <T = any>(options: any) => this.execute<T>('deleteRelationship', options),
    mergeRelationship: <T = any>(options: any) => this.execute<T>('mergeRelationship', options),

    // ==================== TRAVERSAL OPERATIONS ====================
    traverse: <T = any>(options: any) => this.execute<T>('traverse', options),
    shortestPath: <T = any>(options: any) => this.execute<T>('shortestPath', options),
    allPaths: <T = any>(options: any) => this.execute<T>('allPaths', options),
    getNeighborhood: <T = any>(options: any) => this.execute<T>('getNeighborhood', options),
    findConnectedComponents: <T = any>(options: any) =>
      this.execute<T>('findConnectedComponents', options),

    // ==================== AGGREGATION OPERATIONS ====================
    countNodes: (options: any) => this.execute<number>('countNodes', options),
    countRelationships: (options: any) => this.execute<number>('countRelationships', options),
    getStatistics: <T = any>(options: any) => this.execute<T>('getStatistics', options),

    // ==================== SEARCH OPERATIONS ====================
    fullTextSearch: <T = any>(options: any) => this.execute<T>('fullTextSearch', options),
    vectorSearch: <T = any>(options: any) => this.execute<T>('vectorSearch', options),
    query: <T = any>(options: any) => this.execute<T>('query', options),

    // ==================== SCHEMA OPERATIONS ====================
    schema: {
      createNodeIndex: <T = any>(options: any) =>
        this.execute<T>('schema.createNodeIndex', options),
      createNodeConstraint: <T = any>(options: any) =>
        this.execute<T>('schema.createNodeConstraint', options),
      createRelationshipIndex: <T = any>(options: any) =>
        this.execute<T>('schema.createRelationshipIndex', options),
      listIndexes: <T = any>(options?: any) => this.execute<T>('schema.listIndexes', options),
      listConstraints: <T = any>(options?: any) =>
        this.execute<T>('schema.listConstraints', options),
      dropIndex: <T = any>(indexName: string, options?: any) =>
        this.execute<T>('schema.dropIndex', indexName, options),
      dropConstraint: <T = any>(constraintName: string, options?: any) =>
        this.execute<T>('schema.dropConstraint', constraintName, options),
      listLabels: <T = any>(options?: any) => this.execute<T>('schema.listLabels', options),
      listRelationshipTypes: <T = any>(options?: any) =>
        this.execute<T>('schema.listRelationshipTypes', options),
    },

    // ==================== ACTION OPERATIONS ====================
    action: {
      create: <T = any>(options: any) => this.execute<T>('action.create', options),
      list: <T = any>(graphTag: string) => this.execute<T>('action.list', graphTag),
      fetch: <T = any>(actionTag: string) => this.execute<T>('action.fetch', actionTag),
      update: <T = any>(actionTag: string, data: any) =>
        this.execute<T>('action.update', actionTag, data),
      delete: <T = any>(actionTag: string) => this.execute<T>('action.delete', actionTag),
      dispatch: <T = any>(data: any) => this.execute<T>('action.dispatch', data),
    },

    // ==================== TRANSACTION OPERATIONS ====================
    executeTransaction: <T = any>(operations: any[], options?: any) =>
      this.execute<T>('executeTransaction', operations, options),
    beginTransaction: <T = any>(options?: any) => this.execute<T>('beginTransaction', options),
    commitTransaction: <T = any>(transactionId: string) =>
      this.execute<T>('commitTransaction', transactionId),
    rollbackTransaction: <T = any>(transactionId: string) =>
      this.execute<T>('rollbackTransaction', transactionId),

    // ==================== UTILITY OPERATIONS ====================
    dispatch: <T = any>(data: any) => this.execute<T>('dispatch', data),
    execute: <T = any>(data: any) => this.execute<T>('execute', data),
  };
}

/**
 * Create a new GraphProxyService instance
 */
export function createGraphProxy(config: GraphProxyConfig): GraphProxyService {
  return new GraphProxyService(config);
}

/**
 * Hook-friendly factory for React components
 */
export function useGraphProxy(config: GraphProxyConfig | null): GraphProxyService | null {
  if (!config || !config.workspace_id || !config.user_id || !config.token || !config.public_key) {
    return null;
  }
  return new GraphProxyService(config);
}

export default GraphProxyService;
