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
    },
  },
  define: {
    global: "window", // 👈 this helps some node packages expecting a global
  },
  optimizeDeps: {
    include: ["buffer"], // 👈 ensures Vite optimizes it properly
    exclude: ['bullmq'],
  },
  ssr: {
    external: ['bullmq'],
    noExternal: ['@ductape/sdk'],
  },
});