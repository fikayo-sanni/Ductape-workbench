import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: [
        '@ductape/sdk',
        'worker_threads',
        'child_process',
        'fs',
        'path',
        'os',
        'crypto',
        'stream',
        'net',
        'tls',
        'dns',
        'http',
        'https',
        'assert',
        'util',
        'events',
        'timers',
        'zlib',
        'node:stream',
        'node:util',
        'node:events',
        'node:process'
      ]
    }
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@ductape/sdk']
  }
});
