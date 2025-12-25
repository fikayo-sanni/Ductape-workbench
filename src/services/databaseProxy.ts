/**
 * Database Proxy Service
 * Frontend service that proxies database operations through the secure backend endpoint
 *
 * This provides the same interface as the SDK's ductape.databases object
 * but executes operations through the backend where native database drivers can run
 *
 * All requests are encrypted using the product's public_key before transmission
 */

import apiClient from '@/config/axiosinstance';
import { encryptProxyPayload } from '@/utils/proxyEncryption';

/**
 * Configuration for the Database Proxy Service
 */
export interface DatabaseProxyConfig {
  workspace_id: string;
  user_id: string;
  public_key: string;
  token: string;
}

/**
 * Response from the database proxy endpoint
 */
interface DBProxyResponse<T = any> {
  status: boolean;
  meta?: Record<string, any>;
  data?: {
    data: T;
    execution_time_ms: number;
    query_id: string;
  };
  message?: string;
  code?: string;
}

/**
 * Database Proxy Service
 * Provides the same interface as SDK's ductape.databases but executes via backend
 */
export class DatabaseProxyService {
  private config: DatabaseProxyConfig;

  constructor(config: DatabaseProxyConfig) {
    this.config = config;
  }

  /**
   * Execute a database method through the proxy
   * Encrypts the sensitive payload before transmission
   */
  private async execute<T = any>(method: string, ...params: any[]): Promise<T> {

    // Encrypt sensitive data (method, params, user_id) using public_key
    const sensitiveData = {
      method,
      params,
      user_id: this.config.user_id,
    };

    console.log('[DB-Proxy] Executing method:', method);
    console.log('[DB-Proxy] Params:', JSON.stringify(params, null, 2));
    console.log('[DB-Proxy] Sensitive data before encryption:', JSON.stringify(sensitiveData, null, 2));

    const encryptedPayload = encryptProxyPayload(sensitiveData, this.config.public_key);

    console.log('[DB-Proxy] Encrypted payload length:', encryptedPayload.length);
    console.log('[DB-Proxy] Request body:', {
      encrypted_payload: encryptedPayload.substring(0, 50) + '...',
      workspace_id: this.config.workspace_id,
      user_id: this.config.user_id,
      public_key: this.config.public_key,
    });

    const response = await apiClient.post<DBProxyResponse<T>>(
      '/proxy/v1/db-proxy/execute',
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

    console.log('[DB-Proxy] Response status:', response.data.status);
    console.log('[DB-Proxy] Response:', JSON.stringify(response.data, null, 2));

    if (!response.data.status) {
      throw new Error(response.data.message || 'Database operation failed');
    }

    return response.data.data?.data as T;
  }

  /**
   * Database operations interface
   * Mirrors the SDK's ductape.databases object
   */
  databases = {
    // ==================== CONNECTION MANAGEMENT ====================
    connect: <T = any>(config: any) => this.execute<T>('connect', config),
    testConnection: <T = any>(config: any) => this.execute<T>('testConnection', config),
    disconnect: () => this.execute('disconnect'),
    closeAll: () => this.execute('closeAll'),
    getCurrentContext: <T = any>() => this.execute<T>('getCurrentContext'),
    connection: <T = any>(database: string, env: string) =>
      this.execute<T>('connection', database, env),

    // ==================== DATABASE CRUD ====================
    create: <T = any>(config: any) => this.execute<T>('create', config),
    register: <T = any>(product: string, data: any) =>
      this.execute<T>('register', product, data),
    list: <T = any>(product: string) => this.execute<T>('list', product),
    fetch: <T = any>(product: string, database: string) =>
      this.execute<T>('fetch', product, database),
    // For updating database configuration: (product, database, data)
    // Note: For updating records in a table, use updateRecords() method
    update: <T = any>(product: string, database: string, data: any) =>
      this.execute<T>('update', product, database, data),
    updateLocalConfig: <T = any>(tag: string, updates: any) =>
      this.execute<T>('updateLocalConfig', tag, updates),

    // ==================== QUERY OPERATIONS ====================
    query: <T = any>(options: any) => this.execute<T>('query', options),
    insert: <T = any>(options: any) => this.execute<T>('insert', options),
    updateRecords: <T = any>(options: any) => this.execute<T>('updateRecords', options),
    delete: <T = any>(options: any) => this.execute<T>('delete', options),
    upsert: <T = any>(options: any) => this.execute<T>('upsert', options),

    // ==================== AGGREGATION OPERATIONS ====================
    count: (options: any) => this.execute<number>('count', options),
    sum: (options: any) => this.execute<number>('sum', options),
    avg: (options: any) => this.execute<number>('avg', options),
    min: <T = any>(options: any) => this.execute<T>('min', options),
    max: <T = any>(options: any) => this.execute<T>('max', options),
    aggregate: <T = any>(options: any) => this.execute<T>('aggregate', options),

    // ==================== TRANSACTION OPERATIONS ====================
    beginTransaction: <T = any>(options: any) => this.execute<T>('beginTransaction', options),

    // ==================== SCHEMA OPERATIONS ====================
    schema: {
      create: <T = any>(name: string, definition: any, options?: any) =>
        this.execute<T>('schema.create', name, definition, options),
      drop: <T = any>(name: string, options?: any) =>
        this.execute<T>('schema.drop', name, options),
      addField: <T = any>(collection: string, fieldName: string, definition: any) =>
        this.execute<T>('schema.addField', collection, fieldName, definition),
      dropField: <T = any>(collection: string, fieldName: string) =>
        this.execute<T>('schema.dropField', collection, fieldName),
      renameField: <T = any>(collection: string, oldName: string, newName: string) =>
        this.execute<T>('schema.renameField', collection, oldName, newName),
      modifyField: <T = any>(collection: string, fieldName: string, changes: any) =>
        this.execute<T>('schema.modifyField', collection, fieldName, changes),
      createIndex: <T = any>(collection: string, fields: any, options?: any) =>
        this.execute<T>('schema.createIndex', collection, fields, options),
      dropIndex: <T = any>(collection: string, indexName: string) =>
        this.execute<T>('schema.dropIndex', collection, indexName),
      addConstraint: <T = any>(collection: string, constraint: any) =>
        this.execute<T>('schema.addConstraint', collection, constraint),
      dropConstraint: <T = any>(collection: string, constraintName: string) =>
        this.execute<T>('schema.dropConstraint', collection, constraintName),
      rename: <T = any>(oldName: string, newName: string) =>
        this.execute<T>('schema.rename', oldName, newName),
      exists: (name: string) => this.execute<boolean>('schema.exists', name),
      list: (schemaName?: string) => this.execute<string[]>('schema.list', schemaName),
      describe: <T = any>(name: string) => this.execute<T>('schema.describe', name),
      indexes: <T = any>(collection: string) => this.execute<T>('schema.indexes', collection),
    },

    // ==================== MIGRATION OPERATIONS ====================
    migration: {
      create: <T = any>(options: any) => this.execute<T>('migration.create', options),
      update: <T = any>(options: any) => this.execute<T>('migration.update', options),
      fetch: <T = any>(options: any) => this.execute<T>('migration.fetch', options),
      list: <T = any>(options: any) => this.execute<T>('migration.list', options),
      delete: <T = any>(options: any) => this.execute<T>('migration.delete', options),
      run: <T = any>(migrations: any, options?: any) =>
        this.execute<T>('migration.run', migrations, options),
      rollback: <T = any>(migrations: any, count?: number) =>
        this.execute<T>('migration.rollback', migrations, count),
      history: <T = any>() => this.execute<T>('migration.history'),
      status: <T = any>(migrations: any) => this.execute<T>('migration.status', migrations),
    },

    // ==================== ACTION OPERATIONS ====================
    action: {
      create: <T = any>(options: any) => this.execute<T>('action.create', options),
      update: <T = any>(options: any) => this.execute<T>('action.update', options),
      fetch: <T = any>(tag: string) => this.execute<T>('action.fetch', tag),
      list: <T = any>(databaseTag: string) => this.execute<T>('action.list', databaseTag),
      delete: <T = any>(tag: string) => this.execute<T>('action.delete', tag),
      dispatch: <T = any>(data: any) => this.execute<T>('action.dispatch', data),
    },

    // ==================== TABLE OPERATIONS (matching SDK signatures) ====================
    listTables: <T = any>(connectionConfig?: any) => this.execute<T>('listTables', connectionConfig),
    createTable: <T = any>(connectionConfig: any, tableDefinition?: any, options?: any) =>
      this.execute<T>('createTable', connectionConfig, tableDefinition, options),
    dropTable: <T = any>(connectionConfig: any, tableName?: string) =>
      this.execute<T>('dropTable', connectionConfig, tableName),
    alterTable: <T = any>(connectionConfig: any, tableName?: string | any[], alterations?: any[]) =>
      this.execute<T>('alterTable', connectionConfig, tableName, alterations),

    // ==================== INDEX OPERATIONS (matching SDK signatures) ====================
    listIndexes: <T = any>(options: any) =>
      this.execute<T>('listIndexes', options),
    createIndex: <T = any>(options: any) =>
      this.execute<T>('createIndex', options),
    dropIndex: <T = any>(options: any) =>
      this.execute<T>('dropIndex', options),

    // ==================== MIGRATION HISTORY (aliases for migration methods) ====================
    getMigrationHistory: <T = any>(options?: any) =>
      this.execute<T>('migration.history', options),
    runMigration: <T = any>(migrations: any, options?: any) =>
      this.execute<T>('migration.run', migrations, options),
    rollbackMigration: <T = any>(migrations: any, options?: any) =>
      this.execute<T>('migration.rollback', migrations, options),

    // ==================== EXECUTION ====================
    execute: <T = any>(options: any) =>
      this.execute<T>('query', options),

    // ==================== UTILITY OPERATIONS ====================
    dispatch: <T = any>(data: any) => this.execute<T>('dispatch', data),
    getAdapter: <T = any>(options?: any) => this.execute<T>('getAdapter', options),
  };
}

/**
 * Create a new DatabaseProxyService instance
 */
export function createDatabaseProxy(config: DatabaseProxyConfig): DatabaseProxyService {
  return new DatabaseProxyService(config);
}

/**
 * Hook-friendly factory for React components
 */
export function useDatabaseProxy(config: DatabaseProxyConfig | null): DatabaseProxyService | null {
  if (!config || !config.workspace_id || !config.user_id || !config.token || !config.public_key) {
    return null;
  }
  return new DatabaseProxyService(config);
}

export default DatabaseProxyService;
