import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer", // 👈 add this line
      ioredis: path.resolve(__dirname, "./empty-module-file.js"), // 👈 alias for ioredis
      bullmq: path.resolve(__dirname, "./empty-module-file.js"), // 👈 alias for bullmq
      "ajv/dist/core": path.resolve(__dirname, "./empty-module-file.js"), // 👈 suppress ajv
      "ajv-draft-04": path.resolve(__dirname, "./empty-module-file.js"), // 👈 suppress ajv-draft-04
      "mysql2/promise": path.resolve(__dirname, "./empty-module-file.js"), // 👈 suppress mysql2
      mysql2: path.resolve(__dirname, "./empty-module-file.js"), // 👈 suppress mysql2
      pg: path.resolve(__dirname, "./empty-module-file.js"), // 👈 suppress pg (PostgreSQL)
      mongodb: path.resolve(__dirname, "./empty-module-file.js"), // 👈 suppress mongodb
      "cassandra-driver": path.resolve(__dirname, "./empty-module-file.js"), // 👈 suppress cassandra
      "@aws-sdk/client-dynamodb": path.resolve(__dirname, "./empty-module-file.js"), // 👈 suppress dynamodb
      "@aws-sdk/lib-dynamodb": path.resolve(__dirname, "./empty-module-file.js"), // 👈 suppress dynamodb
    },
  },
  define: {
    global: "globalThis", // 👈 this helps some node packages expecting a global
  },
  optimizeDeps: {
    include: ["buffer"], // 👈 ensures Vite optimizes it properly
    exclude: ['bullmq', 'ajv', 'ajv-draft-04', 'mysql2', 'pg', 'mongodb', 'cassandra-driver', '@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb'],
  },
  ssr: {
    external: ['bullmq'],
    noExternal: ['@ductape/sdk'],
  },
});