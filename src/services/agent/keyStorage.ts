/**
 * Bring-your-own-key storage for the workbench chatbot.
 *
 * The provider API key never touches the Ductape backend — it is read here,
 * used to call the provider (Anthropic/OpenAI/DeepSeek) directly from the
 * browser, and persisted only in this browser profile's localStorage.
 */

import CryptoJS from 'crypto-js';

export type AgentProvider = 'anthropic' | 'openai' | 'deepseek';

export interface AgentKeyConfig {
  provider: AgentProvider;
  apiKey: string;
  model: string;
}

const STORAGE_KEY = 'ductape.chatbot.agentKey.v1';
const PASSPHRASE_KEY = 'ductape.chatbot.agentKeyPassphrase.v1';

export const DEFAULT_MODEL: Record<AgentProvider, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o',
  deepseek: 'deepseek-chat',
};

/**
 * Curated, not exhaustive — provider lineups change faster than this file
 * gets updated. The settings dialog always pairs this with a "Custom" entry
 * that accepts any model id directly.
 *
 * DeepSeek's API is priced per token (not free), but is inexpensive and
 * speaks the same OpenAI-compatible chat-completions wire format, so it
 * reuses that provider adapter with a different endpoint/key.
 * deepseek-reasoner (R1) supports tool calling but reasons more slowly than
 * deepseek-chat (V3) — pick deepseek-chat first for the workspace-data tools.
 */
export const MODEL_OPTIONS: Record<AgentProvider, string[]> = {
  anthropic: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5-20251001', 'claude-fable-5'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o3', 'o4-mini'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
};

/**
 * The passphrase lives in the same localStorage as the ciphertext, so this
 * is at-rest obfuscation, not a defense against XSS (any script running on
 * the page could read both). It keeps the raw key out of plaintext in
 * devtools/localStorage dumps and browser-profile backups.
 */
function getOrCreatePassphrase(): string {
  let passphrase = localStorage.getItem(PASSPHRASE_KEY);
  if (!passphrase) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    passphrase = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(PASSPHRASE_KEY, passphrase);
  }
  return passphrase;
}

export function saveAgentKeyConfig(config: AgentKeyConfig): void {
  const passphrase = getOrCreatePassphrase();
  const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(config), passphrase).toString();
  localStorage.setItem(STORAGE_KEY, ciphertext);
}

export function loadAgentKeyConfig(): AgentKeyConfig | null {
  const ciphertext = localStorage.getItem(STORAGE_KEY);
  if (!ciphertext) return null;
  try {
    const passphrase = getOrCreatePassphrase();
    const plaintext = CryptoJS.AES.decrypt(ciphertext, passphrase).toString(CryptoJS.enc.Utf8);
    if (!plaintext) return null;
    const parsed = JSON.parse(plaintext) as AgentKeyConfig;
    if (!parsed.provider || !parsed.apiKey || !parsed.model) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAgentKeyConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PASSPHRASE_KEY);
}
