import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer",
      ioredis: path.resolve(__dirname, "./empty-module-file.js"),
      redis: path.resolve(__dirname, "./empty-module-file.js"),
      bullmq: path.resolve(__dirname, "./empty-module-file.js"),
    },
  },
  build: {
    rollupOptions: {
      external: [
        // Removed @ductape/sdk - it should be bundled, not externalized
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
    global: 'window',
    'process.env': '{}',
  },
  optimizeDeps: {
    include: ["buffer"],
    // Removed exclude for @ductape/sdk - let Vite optimize it normally
  }
});
