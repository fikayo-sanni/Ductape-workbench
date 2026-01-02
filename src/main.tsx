import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Buffer } from 'buffer';

// Polyfills for Node.js globals required by @ductape/sdk
(globalThis as any).Buffer = Buffer;
window.Buffer = Buffer;
(globalThis as any).global = globalThis;
(window as any).global = window;

(globalThis as any).process = (window as any).process = {
  env: {},
  browser: true,
  version: 'v18.0.0', // Mock Node.js version
  versions: {
    node: '18.0.0',
  },
  nextTick: (fn: Function) => setTimeout(fn, 0),
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
