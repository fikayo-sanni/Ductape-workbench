import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  // Use relative paths for Electron file:// protocol, absolute for web
  base: process.env.VITE_ELECTRON === 'true' ? './' : '/',
  plugins: [
    react(),
    nodePolyfills({
      // Include all Node.js polyfills needed by @ductape/sdk
      include: [
        'buffer',
        'process',
        'path',
        'crypto',
        'stream',
        'util',
        'events',
        'string_decoder',
        'querystring',
        'url',
        'os',
        'assert',
      ],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Override protocol imports to use polyfills
      protocolImports: true,
    }),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Node.js built-ins that need to be stubbed (not polyfilled)
      fs: path.resolve(__dirname, "./empty-module-file.js"),
      net: path.resolve(__dirname, "./empty-module-file.js"),
      tls: path.resolve(__dirname, "./empty-module-file.js"),
      dns: path.resolve(__dirname, "./empty-module-file.js"),
      child_process: path.resolve(__dirname, "./empty-module-file.js"),
      cluster: path.resolve(__dirname, "./empty-module-file.js"),
      dgram: path.resolve(__dirname, "./empty-module-file.js"),
      readline: path.resolve(__dirname, "./empty-module-file.js"),
      repl: path.resolve(__dirname, "./empty-module-file.js"),
      tty: path.resolve(__dirname, "./empty-module-file.js"),
      zlib: path.resolve(__dirname, "./empty-module-file.js"),
      http2: path.resolve(__dirname, "./empty-module-file.js"),
      http: path.resolve(__dirname, "./empty-module-file.js"),
      https: path.resolve(__dirname, "./empty-module-file.js"),
      vm: path.resolve(__dirname, "./empty-module-file.js"),
      "stream/web": path.resolve(__dirname, "./empty-module-file.js"),
      // Communication libraries that use Node.js
      twilio: path.resolve(__dirname, "./empty-module-file.js"),
      nodemailer: path.resolve(__dirname, "./empty-module-file.js"),
      // Redis and queue packages
      ioredis: path.resolve(__dirname, "./empty-module-file.js"),
      bullmq: path.resolve(__dirname, "./empty-module-file.js"),
      redis: path.resolve(__dirname, "./empty-module-file.js"),
      "@redis/client": path.resolve(__dirname, "./empty-module-file.js"),
      // Message queue packages
      amqplib: path.resolve(__dirname, "./empty-module-file.js"),
      kafkajs: path.resolve(__dirname, "./empty-module-file.js"),
      nats: path.resolve(__dirname, "./empty-module-file.js"),
      // Schema validation
      "ajv/dist/core": path.resolve(__dirname, "./empty-module-file.js"),
      "ajv-draft-04": path.resolve(__dirname, "./empty-module-file.js"),
      // Database adapters
      "mysql2/promise": path.resolve(__dirname, "./empty-module-file.js"),
      mysql2: path.resolve(__dirname, "./empty-module-file.js"),
      pg: path.resolve(__dirname, "./empty-module-file.js"),
      mongodb: path.resolve(__dirname, "./empty-module-file.js"),
      "cassandra-driver": path.resolve(__dirname, "./empty-module-file.js"),
      // AWS SDK
      "@aws-sdk/client-dynamodb": path.resolve(__dirname, "./empty-module-file.js"),
      "@aws-sdk/lib-dynamodb": path.resolve(__dirname, "./empty-module-file.js"),
      // Google Cloud packages
      "@google-cloud/storage": path.resolve(__dirname, "./empty-module-file.js"),
      "@google-cloud/pubsub": path.resolve(__dirname, "./empty-module-file.js"),
      "@google-cloud/firestore": path.resolve(__dirname, "./empty-module-file.js"),
      // Firebase
      "firebase-admin": path.resolve(__dirname, "./empty-module-file.js"),
      // JWT (uses Node crypto)
      jsonwebtoken: path.resolve(__dirname, "./empty-module-file.js"),
      // Mime types (uses Node path)
      "mime-types": path.resolve(__dirname, "./empty-module-file.js"),
    },
  },
  optimizeDeps: {
    exclude: [
      'bullmq', 'ajv', 'ajv-draft-04', 'mysql2', 'pg', 'mongodb',
      '@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb', 'cassandra-driver',
      '@google-cloud/storage', '@google-cloud/pubsub', '@google-cloud/firestore',
      'firebase-admin', 'jsonwebtoken', 'amqplib', 'kafkajs', 'nats', 'redis',
      '@redis/client', 'ioredis',
    ],
  },
  build: {
    rollupOptions: {
      // Mark problematic packages as external to prevent bundling
      external: [],
    },
  },
  ssr: {
    external: ['bullmq'],
    noExternal: ['@ductape/sdk'],
  },
});