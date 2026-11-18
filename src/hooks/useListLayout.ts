import { useCallback, useState } from 'react';

export type ListLayout = 'grid' | 'list';

const PREFIX = 'workbench:layout:';

function read(key: string): ListLayout {
  try {
    const value = window.localStorage.getItem(PREFIX + key);
    return value === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

/**
 * Grid or list layout for a card collection, remembered per section in this browser.
 */
export function useListLayout(key: string): [ListLayout, (next: ListLayout) => void] {
  const [state, setState] = useState<{ key: string; layout: ListLayout }>(() => ({ key, layout: read(key) }));
  const layout = state.key === key ? state.layout : read(key);

  const setLayout = useCallback(
    (next: ListLayout) => {
      setState({ key, layout: next });
      try {
        window.localStorage.setItem(PREFIX + key, next);
      } catch {
        // Storage can be unavailable (private mode, quota); the choice still applies for this session.
      }
    },
    [key],
  );

  return [layout, setLayout];
}
