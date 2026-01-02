// Empty module for Vite alias workaround
// Used to replace Node.js-only packages that aren't needed in browser

// Base class that can be extended (prevents "superclass is not a constructor" error)
// This class also acts as a mock for Redis clients (ioredis) and other Node.js classes
class MockClass {
  constructor(...args) {
    // Accept any constructor arguments
  }

  // Redis/ioredis mock methods
  on(event, callback) { return this; }
  once(event, callback) { return this; }
  emit(event, ...args) { return this; }
  connect() { return Promise.resolve(); }
  disconnect() { return Promise.resolve(); }
  quit() { return Promise.resolve(); }
  get(key) { return Promise.resolve(null); }
  set(key, value) { return Promise.resolve('OK'); }
  del(key) { return Promise.resolve(1); }
  publish(channel, message) { return Promise.resolve(0); }
  subscribe(channel) { return Promise.resolve(); }

  // BullMQ mock methods
  add(name, data, opts) { return Promise.resolve({ id: 'mock-job-id' }); }
  process(callback) { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

// Export common patterns used by database drivers and other Node.js packages
export const Worker = MockClass;
export const Queue = MockClass;
export const QueueScheduler = MockClass;
export const fork = () => {};
export const createServer = () => ({});
export const EventEmitter = MockClass;
export const createHash = () => ({ update: () => ({ digest: () => '' }) });
export const statSync = () => ({});

// Database client mocks
export const Client = MockClass;
export const Pool = MockClass;
export const Connection = MockClass;
export const MongoClient = MockClass;
export const DynamoDBClient = MockClass;
export const DynamoDBDocumentClient = { from: () => ({}) };
export const ObjectId = class ObjectId {
  constructor(id) { this.id = id || 'mock-object-id'; }
  toString() { return this.id; }
  toHexString() { return this.id; }
};

// Redis mock (for 'redis' package)
export const createClient = () => new MockClass();

// Common named exports
export const connect = async () => ({});
export const createConnection = async () => ({});
export const createPool = () => ({});

// Default export - MockClass that can be instantiated (for ioredis default import)
export default MockClass;
