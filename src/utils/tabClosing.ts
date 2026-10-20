/** Which tabs a "close" command from the tab menu applies to. Pure, so the rules can be tested. */

export type CloseScope = 'active' | 'others' | 'right' | 'all';

interface TabLike {
  id: string;
  isDirty?: boolean;
}

/** The ids to close for a scope, relative to the tab the command was run from. */
export function tabsToClose(tabs: TabLike[], fromId: string | null, scope: CloseScope): string[] {
  const index = tabs.findIndex(tab => tab.id === fromId);
  switch (scope) {
    case 'all':
      return tabs.map(tab => tab.id);
    case 'active':
      return index >= 0 ? [tabs[index].id] : [];
    case 'others':
      return index >= 0 ? tabs.filter(tab => tab.id !== fromId).map(tab => tab.id) : [];
    case 'right':
      return index >= 0 ? tabs.slice(index + 1).map(tab => tab.id) : [];
  }
}

/** How many of these tabs have unsaved changes, so the menu can ask before throwing them away. */
export function unsavedCount(tabs: TabLike[], ids: string[]): number {
  const closing = new Set(ids);
  return tabs.filter(tab => closing.has(tab.id) && tab.isDirty).length;
}
