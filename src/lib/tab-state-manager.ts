/* eslint-disable @typescript-eslint/no-explicit-any */
import { compress, decompress } from 'lz-string';

/**
 * Tab State Manager
 *
 * Manages tab state persistence in localStorage with compression to handle size limits.
 * Stores lightweight metadata for large resources (apps, products) and full state for forms.
 */

const TAB_STATE_PREFIX = 'tab_state_';
const TAB_METADATA_KEY = 'tab_metadata_index';

export interface TabStateMetadata {
  tabId: string;
  type: string;
  title: string;
  itemId?: string;
  lastAccessed: number;
  isLargeResource: boolean; // true for app/product tabs that need refresh
}

export interface TabState {
  tabId: string;
  type: string;
  data: any;
  formState?: any;
  scrollPosition?: number;
  lastAccessed: number;
}

/**
 * Get the storage key for a specific tab
 */
function getTabStateKey(tabId: string): string {
  return `${TAB_STATE_PREFIX}${tabId}`;
}

/**
 * Compress and store data in localStorage
 */
function compressAndStore(key: string, data: any): boolean {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = compress(jsonString);
    localStorage.setItem(key, compressed);
    return true;
  } catch (error) {
    console.error('Failed to compress and store data:', error);
    return false;
  }
}

/**
 * Retrieve and decompress data from localStorage
 */
function retrieveAndDecompress(key: string): any | null {
  try {
    const compressed = localStorage.getItem(key);
    if (!compressed) return null;

    const decompressed = decompress(compressed);
    if (!decompressed) return null;

    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Failed to retrieve and decompress data:', error);
    return null;
  }
}

/**
 * Get all tab metadata
 */
export function getTabMetadataIndex(): TabStateMetadata[] {
  try {
    const metadataJson = localStorage.getItem(TAB_METADATA_KEY);
    return metadataJson ? JSON.parse(metadataJson) : [];
  } catch (error) {
    console.error('Failed to get tab metadata index:', error);
    return [];
  }
}

/**
 * Update tab metadata index
 */
function updateTabMetadataIndex(metadata: TabStateMetadata[]): void {
  try {
    localStorage.setItem(TAB_METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Failed to update tab metadata index:', error);
  }
}

/**
 * Determine if a tab type should be treated as a large resource
 */
function isLargeResourceTab(type: string): boolean {
  return ['app', 'product'].includes(type);
}

/**
 * Extract minimal data for large resources (app/product tabs)
 */
function extractMinimalResourceData(type: string, data: any): any {
  if (type === 'app') {
    return {
      _id: data?._id,
      app_name: data?.app_name,
      tag: data?.tag,
      logo: data?.logo,
      isMarketplaceApp: data?.isMarketplaceApp,
    };
  }

  if (type === 'product') {
    return {
      _id: data?._id,
      name: data?.name,
      tag: data?.tag,
      logo: data?.logo,
    };
  }

  return data;
}

/**
 * Save tab state to localStorage
 */
export function saveTabState(
  tabId: string,
  type: string,
  title: string,
  data: any,
  formState?: any,
  itemId?: string,
  scrollPosition?: number
): void {
  const isLargeResource = isLargeResourceTab(type);

  // For large resources, only store minimal data
  const dataToStore = isLargeResource ? extractMinimalResourceData(type, data) : data;

  const tabState: TabState = {
    tabId,
    type,
    data: dataToStore,
    formState,
    scrollPosition,
    lastAccessed: Date.now(),
  };

  // Store the tab state
  const success = compressAndStore(getTabStateKey(tabId), tabState);

  if (success) {
    // Update metadata index
    const metadata = getTabMetadataIndex();
    const existingIndex = metadata.findIndex(m => m.tabId === tabId);

    const tabMetadata: TabStateMetadata = {
      tabId,
      type,
      title,
      itemId,
      lastAccessed: Date.now(),
      isLargeResource,
    };

    if (existingIndex >= 0) {
      metadata[existingIndex] = tabMetadata;
    } else {
      metadata.push(tabMetadata);
    }

    updateTabMetadataIndex(metadata);
  }
}

/**
 * Get tab state from localStorage
 */
export function getTabState(tabId: string): TabState | null {
  const state = retrieveAndDecompress(getTabStateKey(tabId));

  if (state) {
    // Update last accessed time
    const metadata = getTabMetadataIndex();
    const metadataIndex = metadata.findIndex(m => m.tabId === tabId);
    if (metadataIndex >= 0) {
      metadata[metadataIndex].lastAccessed = Date.now();
      updateTabMetadataIndex(metadata);
    }
  }

  return state;
}

/**
 * Delete tab state from localStorage
 */
export function deleteTabState(tabId: string): void {
  try {
    // Remove the tab state
    localStorage.removeItem(getTabStateKey(tabId));

    // Update metadata index
    const metadata = getTabMetadataIndex();
    const filteredMetadata = metadata.filter(m => m.tabId !== tabId);
    updateTabMetadataIndex(filteredMetadata);
  } catch (error) {
    console.error('Failed to delete tab state:', error);
  }
}

/**
 * Clean up old tab states (older than 7 days)
 */
export function cleanupOldTabStates(): void {
  const metadata = getTabMetadataIndex();
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  const staleTabIds = metadata
    .filter(m => m.lastAccessed < sevenDaysAgo)
    .map(m => m.tabId);

  staleTabIds.forEach(tabId => {
    localStorage.removeItem(getTabStateKey(tabId));
  });

  if (staleTabIds.length > 0) {
    const freshMetadata = metadata.filter(m => m.lastAccessed >= sevenDaysAgo);
    updateTabMetadataIndex(freshMetadata);
    console.log(`Cleaned up ${staleTabIds.length} stale tab states`);
  }
}

/**
 * Get storage usage stats
 */
export function getTabStorageStats(): {
  totalTabs: number;
  totalSize: number;
  oldestAccess: number | null;
  newestAccess: number | null;
} {
  const metadata = getTabMetadataIndex();
  let totalSize = 0;

  metadata.forEach(m => {
    const key = getTabStateKey(m.tabId);
    const data = localStorage.getItem(key);
    if (data) {
      totalSize += data.length;
    }
  });

  const accessTimes = metadata.map(m => m.lastAccessed);

  return {
    totalTabs: metadata.length,
    totalSize,
    oldestAccess: accessTimes.length > 0 ? Math.min(...accessTimes) : null,
    newestAccess: accessTimes.length > 0 ? Math.max(...accessTimes) : null,
  };
}
