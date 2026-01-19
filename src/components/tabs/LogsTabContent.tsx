import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@wojtekmaj/react-hooks';
import {
  ChevronDown,
  ChevronUp,
  Loader,
} from 'lucide-react';
import { format } from 'date-fns';
import logsServices from '@/services/logsServices';
import { useAuth } from '@/store/useAuth';
import { Input } from '../ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ILog } from '@/types/logs';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import appServicesReal from '@/services/appServicesReal';
import productServicesReal from '@/services/productServicesReal';

const responseStatuses = [
  { id: 'fail', name: 'Fail' },
  { id: 'processing', name: 'Processing' },
  { id: 'success', name: 'Success' },
];

const componentTypes = [
  { id: 'app', name: 'App' },
  { id: 'product', name: 'Product' },
  { id: 'database', name: 'Database' },
  { id: 'storage', name: 'Storage' },
  { id: 'cache', name: 'Cache' },
  { id: 'broker', name: 'Messaging' },
  { id: 'job', name: 'Job' },
  { id: 'session', name: 'Session' },
];

const timeRangeOptions = [
  { id: '30s', name: 'Last 30 seconds', minutes: 0.5 },
  { id: '1m', name: 'Last 1 minute', minutes: 1 },
  { id: '5m', name: 'Last 5 minutes', minutes: 5 },
  { id: '15m', name: 'Last 15 minutes', minutes: 15 },
  { id: '30m', name: 'Last 30 minutes', minutes: 30 },
  { id: '1h', name: 'Last 1 hour', minutes: 60 },
  { id: '5h', name: 'Last 5 hours', minutes: 300 },
  { id: '24h', name: 'Last 24 hours', minutes: 1440 },
  { id: '1w', name: 'Last 1 week', minutes: 10080 },
  { id: '1mo', name: 'Last 1 month', minutes: 43200 },
  { id: '3mo', name: 'Last 3 months', minutes: 129600 },
  { id: '6mo', name: 'Last 6 months', minutes: 259200 },
  { id: '1y', name: 'Last 1 year', minutes: 525600 },
];

type ProcessLog = ILog['logs']['data'][number];

// Dummy logs data for when there's no real data
const DUMMY_LOGS: ProcessLog[] = [
  {
    _id: 'log_1',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    process_id: 'proc_abc123def456',
    app_env: 'production',
    env: 'production',
    name: 'user-authentication',
    type: 'session',
    message: 'User session created successfully',
    parent_tag: 'auth',
    child_tag: 'login',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'session-auth',
    response: { status: 200, token: 'tok_***' },
    request: { method: 'POST', endpoint: '/auth/login' },
    data: JSON.stringify({ user_id: 'usr_1a2b3c4d', email: 'user@example.com', session_token: 'tok_***', ip_address: '192.168.1.100' }),
    __v: 0,
  },
  {
    _id: 'log_2',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12 minutes ago
    process_id: 'proc_def789ghi012',
    app_env: 'production',
    env: 'production',
    name: 'database-query',
    type: 'database',
    message: 'Database query executed',
    parent_tag: 'users-db',
    child_tag: 'read',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'database-query',
    response: { status: 200, rows: 1 },
    request: { query: 'SELECT * FROM users WHERE id = ?' },
    data: JSON.stringify({ query: 'SELECT * FROM users WHERE id = ?', duration_ms: 45, rows_returned: 1 }),
    __v: 0,
  },
  {
    _id: 'log_3',
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(), // 18 minutes ago
    process_id: 'proc_jkl345mno678',
    app_env: 'production',
    env: 'production',
    name: 'cache-operation',
    type: 'cache',
    message: 'Cache hit - data retrieved',
    parent_tag: 'user-cache',
    child_tag: 'get',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'cache-get',
    response: { hit: true, value: 'cached_data' },
    request: { key: 'user:profile:12345' },
    data: JSON.stringify({ key: 'user:profile:12345', ttl: 3600, hit: true }),
    __v: 0,
  },
  {
    _id: 'log_4',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 minutes ago
    process_id: 'proc_pqr901stu234',
    app_env: 'staging',
    env: 'staging',
    name: 'api-request',
    type: 'app',
    message: 'API request failed - validation error',
    parent_tag: 'api',
    child_tag: 'validate',
    status: 'fail',
    successful_execution: false,
    failed_execution: true,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'api-validation',
    response: { status: 400, error: 'Email already exists' },
    request: { method: 'POST', endpoint: '/api/users/create' },
    data: JSON.stringify({ endpoint: '/api/users/create', error: 'Email already exists', validation_errors: ['email'] }),
    __v: 0,
  },
  {
    _id: 'log_5',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(), // 32 minutes ago
    process_id: 'proc_vwx567yza890',
    app_env: 'production',
    env: 'production',
    name: 'file-upload',
    type: 'storage',
    message: 'File uploaded to storage',
    parent_tag: 'document-storage',
    child_tag: 'upload',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'storage-upload',
    response: { status: 200, file_id: 'file_123' },
    request: { file_name: 'report_2024.pdf', bucket: 'documents' },
    data: JSON.stringify({ file_name: 'report_2024.pdf', size_bytes: 2458624, bucket: 'documents' }),
    __v: 0,
  },
  {
    _id: 'log_6',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
    process_id: 'proc_bcd123efg456',
    app_env: 'production',
    env: 'production',
    name: 'message-broker',
    type: 'broker',
    message: 'Message published to queue',
    parent_tag: 'notifications',
    child_tag: 'publish',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'broker-publish',
    response: { status: 200, message_id: 'msg_789' },
    request: { queue: 'email-notifications', priority: 'high' },
    data: JSON.stringify({ queue: 'email-notifications', message_id: 'msg_789', priority: 'high' }),
    __v: 0,
  },
  {
    _id: 'log_7',
    timestamp: new Date(Date.now() - 52 * 60 * 1000).toISOString(), // 52 minutes ago
    process_id: 'proc_hij789klm012',
    app_env: 'development',
    env: 'development',
    name: 'job-execution',
    type: 'job',
    message: 'Scheduled job completed',
    parent_tag: 'data-cleanup',
    child_tag: 'execute',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'job-cleanup',
    response: { status: 200, records_deleted: 1247 },
    request: { job_name: 'cleanup-old-sessions' },
    data: JSON.stringify({ job_name: 'cleanup-old-sessions', records_deleted: 1247, duration_s: 12.5 }),
    __v: 0,
  },
  {
    _id: 'log_8',
    timestamp: new Date(Date.now() - 68 * 60 * 1000).toISOString(), // 68 minutes ago
    process_id: 'proc_nop345qrs678',
    app_env: 'production',
    env: 'production',
    name: 'payment-processing',
    type: 'app',
    message: 'Payment transaction processed',
    parent_tag: 'payments',
    child_tag: 'charge',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'payment-charge',
    response: { status: 200, transaction_id: 'txn_abc123' },
    request: { amount: 49.99, currency: 'USD', payment_method: 'credit_card' },
    data: JSON.stringify({ amount: 49.99, currency: 'USD', transaction_id: 'txn_abc123', payment_method: 'credit_card' }),
    __v: 0,
  },
  {
    _id: 'log_9',
    timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(), // 75 minutes ago
    process_id: 'proc_tuv901wxy234',
    app_env: 'staging',
    env: 'staging',
    name: 'email-delivery',
    type: 'app',
    message: 'Email delivery failed - invalid recipient',
    parent_tag: 'email',
    child_tag: 'send',
    status: 'fail',
    successful_execution: false,
    failed_execution: true,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'email-send',
    response: { status: 400, error: 'Invalid email format' },
    request: { to: 'invalid@example', subject: 'Welcome' },
    data: JSON.stringify({ to: 'invalid@example', subject: 'Welcome', error: 'Invalid email format' }),
    __v: 0,
  },
  {
    _id: 'log_10',
    timestamp: new Date(Date.now() - 88 * 60 * 1000).toISOString(), // 88 minutes ago
    process_id: 'proc_zab567cde890',
    app_env: 'production',
    env: 'production',
    name: 'webhook-trigger',
    type: 'app',
    message: 'Webhook triggered successfully',
    parent_tag: 'webhooks',
    child_tag: 'trigger',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'webhook-trigger',
    response: { status: 200, response_code: 200 },
    request: { webhook_url: 'https://api.example.com/webhook', event: 'user.created' },
    data: JSON.stringify({ webhook_url: 'https://api.example.com/webhook', event: 'user.created', response_code: 200 }),
    __v: 0,
  },
  {
    _id: 'log_11',
    timestamp: new Date(Date.now() - 95 * 60 * 1000).toISOString(), // 95 minutes ago
    process_id: 'proc_fgh123ijk456',
    app_env: 'production',
    env: 'production',
    name: 'data-export',
    type: 'app',
    message: 'Data export completed',
    parent_tag: 'exports',
    child_tag: 'csv',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'export-csv',
    response: { status: 200, file_size_mb: 12.8, download_url: 'https://storage/exports/data.csv' },
    request: { format: 'csv' },
    data: JSON.stringify({ format: 'csv', records: 5432, file_size_mb: 12.8, download_url: 'https://storage/exports/data.csv' }),
    __v: 0,
  },
  {
    _id: 'log_12',
    timestamp: new Date(Date.now() - 102 * 60 * 1000).toISOString(), // 102 minutes ago
    process_id: 'proc_lmn789opq012',
    app_env: 'production',
    env: 'production',
    name: 'cache-invalidation',
    type: 'cache',
    message: 'Cache invalidated',
    parent_tag: 'product-cache',
    child_tag: 'delete',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'cache-invalidate',
    response: { status: 200, keys_deleted: 245 },
    request: { pattern: 'product:*' },
    data: JSON.stringify({ pattern: 'product:*', keys_deleted: 245 }),
    __v: 0,
  },
  {
    _id: 'log_13',
    timestamp: new Date(Date.now() - 115 * 60 * 1000).toISOString(), // 115 minutes ago
    process_id: 'proc_rst345uvw678',
    app_env: 'development',
    env: 'development',
    name: 'test-execution',
    type: 'app',
    message: 'Integration tests passed',
    parent_tag: 'testing',
    child_tag: 'integration',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'test-integration',
    response: { status: 200, passed: 127, failed: 0 },
    request: { test_type: 'integration' },
    data: JSON.stringify({ total_tests: 127, passed: 127, failed: 0, duration_s: 45.2 }),
    __v: 0,
  },
  {
    _id: 'log_14',
    timestamp: new Date(Date.now() - 128 * 60 * 1000).toISOString(), // 128 minutes ago
    process_id: 'proc_xyz901abc234',
    app_env: 'production',
    env: 'production',
    name: 'notification-sent',
    type: 'app',
    message: 'Push notification sent',
    parent_tag: 'notifications',
    child_tag: 'push',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'notification-push',
    response: { status: 200, delivery_status: 'delivered' },
    request: { title: 'New Message' },
    data: JSON.stringify({ recipient: 'device_token_***', title: 'New Message', delivery_status: 'delivered' }),
    __v: 0,
  },
  {
    _id: 'log_15',
    timestamp: new Date(Date.now() - 142 * 60 * 1000).toISOString(), // 142 minutes ago
    process_id: 'proc_def567ghi890',
    app_env: 'staging',
    env: 'staging',
    name: 'data-sync',
    type: 'database',
    message: 'Data synchronization completed',
    parent_tag: 'sync',
    child_tag: 'replicate',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'sync-replicate',
    response: { status: 200, records_synced: 8934 },
    request: { source: 'primary_db', target: 'replica_db' },
    data: JSON.stringify({ source: 'primary_db', target: 'replica_db', records_synced: 8934, duration_s: 28.7 }),
    __v: 0,
  },
  {
    _id: 'log_16',
    timestamp: new Date(Date.now() - 155 * 60 * 1000).toISOString(),
    process_id: 'proc_hij123klm456',
    app_env: 'production',
    env: 'production',
    name: 'user-logout',
    type: 'session',
    message: 'User session terminated',
    parent_tag: 'auth',
    child_tag: 'logout',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'session-logout',
    response: { status: 200, session_duration_s: 3245 },
    request: { logout_type: 'manual' },
    data: JSON.stringify({ user_id: 'usr_9a8b7c6d', session_duration_s: 3245, logout_type: 'manual' }),
    __v: 0,
  },
  {
    _id: 'log_17',
    timestamp: new Date(Date.now() - 168 * 60 * 1000).toISOString(),
    process_id: 'proc_nop789qrs012',
    app_env: 'production',
    env: 'production',
    name: 'image-processing',
    type: 'storage',
    message: 'Image thumbnail generated',
    parent_tag: 'media',
    child_tag: 'thumbnail',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'media-thumbnail',
    response: { status: 200, thumbnail_size: '128KB', format: 'webp' },
    request: { original_size: '4.2MB', dimensions: '300x300' },
    data: JSON.stringify({ original_size: '4.2MB', thumbnail_size: '128KB', format: 'webp', dimensions: '300x300' }),
    __v: 0,
  },
  {
    _id: 'log_18',
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    process_id: 'proc_tuv345wxy678',
    app_env: 'development',
    env: 'development',
    name: 'database-migration',
    type: 'database',
    message: 'Database migration applied',
    parent_tag: 'migrations',
    child_tag: 'up',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'migration-up',
    response: { status: 200, tables_affected: 1 },
    request: { migration_name: 'add_user_preferences_table', version: '20240123_001' },
    data: JSON.stringify({ migration_name: 'add_user_preferences_table', version: '20240123_001', tables_affected: 1 }),
    __v: 0,
  },
  {
    _id: 'log_19',
    timestamp: new Date(Date.now() - 195 * 60 * 1000).toISOString(),
    process_id: 'proc_zab901cde234',
    app_env: 'staging',
    env: 'staging',
    name: 'api-rate-limit',
    type: 'app',
    message: 'API rate limit exceeded',
    parent_tag: 'api',
    child_tag: 'rate-limit',
    status: 'fail',
    successful_execution: false,
    failed_execution: true,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'api-rate-limit',
    response: { status: 429, error: 'Rate limit exceeded' },
    request: { endpoint: '/api/search', client_ip: '203.0.113.42' },
    data: JSON.stringify({ client_ip: '203.0.113.42', endpoint: '/api/search', limit: 100, actual: 156 }),
    __v: 0,
  },
  {
    _id: 'log_20',
    timestamp: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
    process_id: 'proc_fgh567ijk890',
    app_env: 'production',
    env: 'production',
    name: 'backup-creation',
    type: 'job',
    message: 'Database backup created',
    parent_tag: 'backup',
    child_tag: 'create',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'backup-create',
    response: { status: 200, backup_size_gb: 45.2, backup_type: 'full' },
    request: { location: 's3://backups/db-2024-01-23.sql.gz' },
    data: JSON.stringify({ backup_size_gb: 45.2, backup_type: 'full', location: 's3://backups/db-2024-01-23.sql.gz' }),
    __v: 0,
  },
  {
    _id: 'log_21',
    timestamp: new Date(Date.now() - 225 * 60 * 1000).toISOString(),
    process_id: 'proc_lmn123opq456',
    app_env: 'production',
    env: 'production',
    name: 'search-query',
    type: 'app',
    message: 'Search query executed',
    parent_tag: 'search',
    child_tag: 'query',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'search-query',
    response: { status: 200, results: 234, response_time_ms: 87 },
    request: { query: 'analytics dashboard' },
    data: JSON.stringify({ query: 'analytics dashboard', results: 234, response_time_ms: 87 }),
    __v: 0,
  },
  {
    _id: 'log_22',
    timestamp: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    process_id: 'proc_rst789uvw012',
    app_env: 'staging',
    env: 'staging',
    name: 'queue-processing',
    type: 'broker',
    message: 'Message consumed from queue',
    parent_tag: 'processing',
    child_tag: 'consume',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'broker-consume',
    response: { status: 200, processing_time_ms: 1240 },
    request: { queue: 'background-tasks', message_id: 'msg_456' },
    data: JSON.stringify({ queue: 'background-tasks', message_id: 'msg_456', processing_time_ms: 1240 }),
    __v: 0,
  },
  {
    _id: 'log_23',
    timestamp: new Date(Date.now() - 255 * 60 * 1000).toISOString(),
    process_id: 'proc_xyz345abc678',
    app_env: 'production',
    env: 'production',
    name: 'user-registration',
    type: 'session',
    message: 'New user registered',
    parent_tag: 'auth',
    child_tag: 'register',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'auth-register',
    response: { status: 200, user_id: 'usr_new_123' },
    request: { email: 'newuser@example.com' },
    data: JSON.stringify({ user_id: 'usr_new_123', email: 'newuser@example.com', verification_sent: true }),
    __v: 0,
  },
  {
    _id: 'log_24',
    timestamp: new Date(Date.now() - 270 * 60 * 1000).toISOString(),
    process_id: 'proc_def901ghi234',
    app_env: 'development',
    env: 'development',
    name: 'code-deployment',
    type: 'app',
    message: 'Code deployed to environment',
    parent_tag: 'deployment',
    child_tag: 'deploy',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'deployment-deploy',
    response: { status: 200, environment: 'dev' },
    request: { commit_hash: 'a1b2c3d', branch: 'feature/new-dashboard' },
    data: JSON.stringify({ commit_hash: 'a1b2c3d', branch: 'feature/new-dashboard', environment: 'dev' }),
    __v: 0,
  },
  {
    _id: 'log_25',
    timestamp: new Date(Date.now() - 285 * 60 * 1000).toISOString(),
    process_id: 'proc_jkl567mno890',
    app_env: 'production',
    env: 'production',
    name: 'report-generation',
    type: 'job',
    message: 'Monthly report generated',
    parent_tag: 'reports',
    child_tag: 'generate',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'report-generate',
    response: { status: 200, pages: 47, format: 'pdf' },
    request: { report_type: 'monthly_analytics', period: '2024-01' },
    data: JSON.stringify({ report_type: 'monthly_analytics', period: '2024-01', pages: 47, format: 'pdf' }),
    __v: 0,
  },
  {
    _id: 'log_26',
    timestamp: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
    process_id: 'proc_pqr123stu456',
    app_env: 'staging',
    env: 'staging',
    name: 'api-timeout',
    type: 'app',
    message: 'API request timeout',
    parent_tag: 'api',
    child_tag: 'timeout',
    status: 'fail',
    successful_execution: false,
    failed_execution: true,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'api-timeout',
    response: { status: 504, error: 'Gateway Timeout' },
    request: { endpoint: '/api/analytics/report', timeout_ms: 30000 },
    data: JSON.stringify({ endpoint: '/api/analytics/report', timeout_ms: 30000, elapsed_ms: 30042 }),
    __v: 0,
  },
  {
    _id: 'log_27',
    timestamp: new Date(Date.now() - 315 * 60 * 1000).toISOString(),
    process_id: 'proc_vwx789yza012',
    app_env: 'production',
    env: 'production',
    name: 'cache-warming',
    type: 'cache',
    message: 'Cache warmed successfully',
    parent_tag: 'cache',
    child_tag: 'warm',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'cache-warm',
    response: { status: 200, keys_loaded: 1542, cache_type: 'redis' },
    request: { duration_s: 8.3 },
    data: JSON.stringify({ keys_loaded: 1542, duration_s: 8.3, cache_type: 'redis' }),
    __v: 0,
  },
  {
    _id: 'log_28',
    timestamp: new Date(Date.now() - 330 * 60 * 1000).toISOString(),
    process_id: 'proc_bcd345efg678',
    app_env: 'production',
    env: 'production',
    name: 'subscription-renewal',
    type: 'app',
    message: 'Subscription renewed',
    parent_tag: 'billing',
    child_tag: 'renew',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'billing-renew',
    response: { status: 200, subscription_id: 'sub_789', plan: 'pro' },
    request: { amount: 99.99, next_billing: '2024-02-23' },
    data: JSON.stringify({ subscription_id: 'sub_789', plan: 'pro', amount: 99.99, next_billing: '2024-02-23' }),
    __v: 0,
  },
  {
    _id: 'log_29',
    timestamp: new Date(Date.now() - 345 * 60 * 1000).toISOString(),
    process_id: 'proc_hij901klm234',
    app_env: 'development',
    env: 'development',
    name: 'unit-tests',
    type: 'app',
    message: 'Unit tests completed',
    parent_tag: 'testing',
    child_tag: 'unit',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'test-unit',
    response: { status: 200, passed: 854, failed: 2 },
    request: { test_type: 'unit' },
    data: JSON.stringify({ total: 856, passed: 854, failed: 2, skipped: 0, duration_s: 24.5 }),
    __v: 0,
  },
  {
    _id: 'log_30',
    timestamp: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    process_id: 'proc_nop567qrs890',
    app_env: 'production',
    env: 'production',
    name: 'security-scan',
    type: 'app',
    message: 'Security vulnerability scan completed',
    parent_tag: 'security',
    child_tag: 'scan',
    status: 'success',
    successful_execution: true,
    failed_execution: false,
    product_tag: 'demo-product',
    workspace_id: 'ws_demo123',
    feature_tag: 'security-scan',
    response: { status: 200, vulnerabilities_found: 3 },
    request: { severity_levels: { high: 0, medium: 1, low: 2 } },
    data: JSON.stringify({ vulnerabilities_found: 3, severity_levels: { high: 0, medium: 1, low: 2 } }),
    __v: 0,
  },
];

// Helper function for environment badge colors
const getEnvBadgeColor = (env: string) => {
  switch (env) {
    case 'production':
    case 'prd':
      return 'bg-green/10 text-green border-green/20';
    case 'staging':
    case 'stg':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'development':
    case 'dev':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    default:
      return 'bg-grey-100 text-grey-600 border-grey-300';
  }
};

function LogsCards({ processes }: { processes: ProcessLog[] }) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-2">
      {processes.map((log) => (
        <div key={log._id} className="bg-white rounded-lg border border-grey-400 overflow-hidden hover:border-primary/50 transition-colors">
          {/* Log Header */}
          <div
            className="p-3 cursor-pointer"
            onClick={() => toggleRow(log._id)}
          >
            <div className="flex items-start gap-3">
              {/* Status Indicator */}
              <div className="flex-shrink-0 mt-1">
                {log.successful_execution || log.status === 'success' ? (
                  <div className="w-2 h-2 rounded-full bg-green" />
                ) : log.status === 'fail' ? (
                  <div className="w-2 h-2 rounded-full bg-red" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                {/* Top Row: Timestamp & Expand */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-grey">
                    {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                  <button className="flex-shrink-0 text-grey-600 hover:text-grey">
                    {expandedRows[log._id] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Details Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Process ID */}
                  <span className="text-xs font-mono text-grey-600 bg-grey-100 px-2 py-0.5 rounded">
                    {log.process_id}
                  </span>

                  {/* Environment */}
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium border',
                    getEnvBadgeColor(log.app_env || log.env)
                  )}>
                    {log.app_env || log.env}
                  </span>

                  {/* Operation */}
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {log.child_tag
                      ? `${log.parent_tag ? `${log.parent_tag}:` : ''}${log.child_tag}`
                      : log.feature_tag || log.parent_tag}
                  </span>

                  {/* Name */}
                  <span className="text-xs text-grey-600">
                    {log.name}
                  </span>

                  {/* Type */}
                  <span className="text-xs text-grey-600">
                    • {log.type}
                  </span>
                </div>

                {/* Message */}
                <p className="text-sm text-grey-600">{log.message}</p>
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {expandedRows[log._id] && (
            <div className="border-t border-grey-400 bg-grey-50 p-4">
              <p className="text-xs text-grey-600 mb-2 font-medium">Request Data</p>
              <pre className="bg-white border border-grey-400 rounded-md p-3 overflow-x-auto">
                <code className="text-xs font-mono text-grey">
                  {JSON.stringify(JSON.parse(log.data), null, 2)}
                </code>
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LogsTabContent() {
  const { user, currentWorkspaceId } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    component: 'all',
    app: 'all',
    product: 'all',
    status: 'all',
    timeRange: '24h',
  });

  const debouncedSearch = useDebouncedValue(searchTerm, 500);

  // Calculate date range based on selected time range
  const getDateRange = (timeRange: string) => {
    const option = timeRangeOptions.find(opt => opt.id === timeRange);
    if (!option) return { start_date: undefined, end_date: undefined };
    
    const now = new Date();
    const startDate = new Date(now.getTime() - (option.minutes * 60 * 1000));
    
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    };
  };

  // Fetch products for filtering
  const { data: productsData } = useQuery({
    queryKey: ['products', currentWorkspaceId],
    queryFn: () =>
      productServicesReal.fetchProducts({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    enabled: !!currentWorkspaceId,
  });

  // Fetch apps for filtering
  const { data: appsData } = useQuery({
    queryKey: ['apps', currentWorkspaceId],
    queryFn: () =>
      appServicesReal.fetchApps({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    enabled: !!currentWorkspaceId,
  });

  const products = productsData?.data || [];
  const apps = appsData?.data || [];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status: logsStatus,
  } = useInfiniteQuery({
    queryKey: ['workspace-logs', currentWorkspaceId, filters, debouncedSearch],
    queryFn: ({ pageParam = 1 }) => {
      const dateRange = getDateRange(filters.timeRange);
      return logsServices.fetchLogs(
        {
          user_id: user?._id ?? '',
          public_key: user?.public_key ?? '',
          workspace_id: currentWorkspaceId ?? '',
        },
        {
          component: filters.component === 'all' ? undefined : filters.component,
          app_id: filters.app === 'all' ? undefined : filters.app,
          product_id: filters.product === 'all' ? undefined : filters.product,
          status: filters.status === 'all' ? undefined : filters.status,
          process_id: debouncedSearch || undefined,
          page: pageParam,
          limit: 20,
          ...dateRange,
        }
      );
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.logs.metadata;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!currentWorkspaceId,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allLogs = useMemo(() => {
    // If no workspace ID, always show dummy data
    if (!currentWorkspaceId) {
      return DUMMY_LOGS;
    }

    const realLogs = data?.pages.flatMap((page) => page.data?.logs?.data ?? []) ?? [];
    // Use dummy data if no real logs exist
    return realLogs.length > 0 ? realLogs : DUMMY_LOGS;
  }, [data, currentWorkspaceId]);

  const clearFilters = () => {
    setFilters({
      component: 'all',
      app: 'all',
      product: 'all',
      status: 'all',
      timeRange: '24h',
    });
    setSearchTerm('');
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Show dummy data if query hasn't loaded yet or if there are no real logs
  const showDummyData = !currentWorkspaceId || (logsStatus === 'success' && allLogs.length === 30);

  return (
    <div className="h-full overflow-auto bg-grey-100">
      <div className="bg-white px-6 py-4 border-b border-grey-400">
        <h1 className="text-grey text-xl font-bold">Workspace Logs</h1>
      </div>

      {logsStatus === 'pending' && currentWorkspaceId ? (
        <div className="flex items-center justify-center pt-20">
          <Loader className="animate-spin" />
        </div>
      ) : (
        <div className="px-6 mt-6">
          <div className="flex flex-col gap-4">
            {/* Search and Filters */}
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="w-full">
                <Input
                  type="text"
                  placeholder="Search by process ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                  disabled={showDummyData}
                />
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                <Select
                  value={filters.component}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, component: value }))
                  }
                  disabled={showDummyData}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select component type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All components</SelectItem>
                    {componentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.product}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, product: value }))
                  }
                  disabled={showDummyData}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.app}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, app: value }))
                  }
                  disabled={showDummyData}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select app" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All apps</SelectItem>
                    {apps.map((app) => (
                      <SelectItem key={app._id} value={app._id}>
                        {app.app_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value }))
                  }
                  disabled={showDummyData}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {responseStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.timeRange}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, timeRange: value }))
                  }
                  disabled={showDummyData}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRangeOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(filters.component !== 'all' ||
                  filters.app !== 'all' ||
                  filters.product !== 'all' ||
                  filters.status !== 'all' ||
                  filters.timeRange !== '24h' ||
                  searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-grey-600 hover:text-grey flex items-center gap-2 px-3 py-2 rounded-md hover:bg-grey-100"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Active Filters Display */}
              {(filters.component !== 'all' ||
                filters.app !== 'all' ||
                filters.product !== 'all' ||
                filters.status !== 'all' ||
                filters.timeRange !== '24h') && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-sm text-grey-600">Filtered by:</span>
                  {filters.component !== 'all' && (
                    <Badge variant="outline" className="text-grey">
                      Component:{' '}
                      {componentTypes.find((c) => c.id === filters.component)?.name}
                    </Badge>
                  )}
                  {filters.product !== 'all' && (
                    <Badge variant="outline" className="text-grey">
                      Product:{' '}
                      {products?.find((p) => p._id === filters.product)?.name ?? 'Unknown'}
                    </Badge>
                  )}
                  {filters.app !== 'all' && (
                    <Badge variant="outline" className="text-grey">
                      App: {apps?.find((a) => a._id === filters.app)?.app_name ?? 'Unknown'}
                    </Badge>
                  )}
                  {filters.status !== 'all' && (
                    <Badge variant="outline" className="text-grey">
                      Status: {capitalizeFirst(filters.status)}
                    </Badge>
                  )}
                  {filters.timeRange !== '24h' && (
                    <Badge variant="outline" className="text-grey">
                      Time: {timeRangeOptions.find((t) => t.id === filters.timeRange)?.name}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Logs Cards Component */}
            <LogsCards processes={allLogs} />

            {/* Load More - only show for real data */}
            {!showDummyData && (data?.pages[0]?.data?.logs?.data?.length ?? 0) > 0 && (
              <div ref={loadMoreRef}>
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4">
                    <Loader className="animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* No More Logs - only show for real data */}
            {!showDummyData && (data?.pages[0]?.data?.logs?.data?.length ?? 0) > 0 && !hasNextPage && (
              <div className="flex items-center justify-center py-4">
                <p className="text-grey text-sm font-semibold">No more logs</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
