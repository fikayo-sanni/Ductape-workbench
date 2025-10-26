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
      bullmq: path.resolve(__dirname, "./empty-module-file.js"), // 👈 alias for ioredis
    },
    dedupe: ['axios'], // Ensure single version of axios across @ductape/sdk and workbench
  },
  define: {
    global: "window", // 👈 this helps some node packages expecting a global
  },
  optimizeDeps: {
    include: ["buffer", "axios"], // 👈 ensures Vite optimizes it properly
    exclude: ['bullmq'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  ssr: {
    external: ['bullmq'],
    noExternal: ['@ductape/sdk'],
  },
});