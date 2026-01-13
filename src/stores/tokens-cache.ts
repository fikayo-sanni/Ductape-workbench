/**
 * Simple in-memory cache for tokens data
 * This persists across tab switches without needing to refetch
 */

interface Token {
  name: string;
  token?: string;
  encrypted_token?: string;
  token_type: string;
  scope: string[];
  expires_in?: number | null;
  envs: string[];
  created_at: Date | string;
  last_used?: Date | string | null;
  is_active: boolean;
  description?: string;
}

interface TokensCache {
  tokens: Token[];
  lastFetched: number | null;
  workspaceId: string | null;
}

// Cache with 5 minute TTL
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: TokensCache = {
  tokens: [],
  lastFetched: null,
  workspaceId: null,
};

/**
 * Get cached tokens if valid
 */
export function getCachedTokens(workspaceId: string): Token[] | null {
  // Check if cache is valid for this workspace
  if (
    cache.workspaceId === workspaceId &&
    cache.lastFetched &&
    Date.now() - cache.lastFetched < CACHE_TTL_MS
  ) {
    return cache.tokens;
  }
  return null;
}

/**
 * Set tokens in cache
 */
export function setCachedTokens(workspaceId: string, tokens: Token[]): void {
  cache = {
    tokens,
    lastFetched: Date.now(),
    workspaceId,
  };
}

/**
 * Update a single token in cache
 */
export function updateCachedToken(tokenName: string, updates: Partial<Token>): void {
  cache.tokens = cache.tokens.map((t) =>
    t.name === tokenName ? { ...t, ...updates } : t
  );
}

/**
 * Remove a token from cache
 */
export function removeCachedToken(tokenName: string): void {
  cache.tokens = cache.tokens.filter((t) => t.name !== tokenName);
}

/**
 * Add a token to cache
 */
export function addCachedToken(token: Token): void {
  cache.tokens = [token, ...cache.tokens];
}

/**
 * Invalidate the cache (force refetch on next load)
 */
export function invalidateTokensCache(): void {
  cache = {
    tokens: [],
    lastFetched: null,
    workspaceId: null,
  };
}

/**
 * Check if cache needs refresh
 */
export function needsRefresh(workspaceId: string): boolean {
  return getCachedTokens(workspaceId) === null;
}
