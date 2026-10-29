import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { resolveApiBaseUrl } from '@/config/apiBaseUrl';
import { parseSse, reconnectDelay } from '@/utils/workStream';
import type { IWorkAuth } from '@/services/workServices';

export type StreamState = 'connecting' | 'live' | 'offline';

/**
 * Follows the work tracker's live stream for one product and refreshes the Work area's data when work changes.
 * While the stream is down the Work area falls back to polling; it reconnects on its own, waiting longer each time.
 */
export function useWorkStream(auth: IWorkAuth | undefined, product: string | undefined): StreamState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<StreamState>('connecting');
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!auth || !product) return;
    let stopped = false;
    let attempt = 0;
    let controller: AbortController | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    // Several changes in a burst (a plan published, an agent finishing) cause one refresh.
    const refresh = () => {
      if (refreshTimer.current) return;
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        queryClient.invalidateQueries({ queryKey: ['work'] });
      }, 250);
    };

    const connect = async () => {
      if (stopped) return;
      setState('connecting');
      controller = new AbortController();
      const query = new URLSearchParams({ workspace_id: auth.workspaceId, user_id: auth.userId, public_key: auth.publicKey, product });
      const token = (localStorage.getItem('token') ?? '').replace(/"/g, '');
      try {
        const res = await fetch(`${resolveApiBaseUrl()}/tickets/v1/work/stream?${query}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`stream answered ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          const { events, rest } = parseSse(buffer + decoder.decode(value, { stream: true }));
          buffer = rest;
          for (const e of events) {
            if (e.event === 'ready') {
              attempt = 0;
              setState('live');
              refresh();
            } else if (e.event === 'work') {
              refresh();
            }
          }
        }
        throw new Error('stream ended');
      } catch {
        if (stopped) return;
        setState('offline');
        retryTimer = setTimeout(connect, reconnectDelay(attempt++));
      }
    };
    connect();

    return () => {
      stopped = true;
      controller?.abort();
      if (retryTimer) clearTimeout(retryTimer);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    };
  }, [auth?.workspaceId, auth?.userId, auth?.publicKey, product, queryClient]);

  return auth && product ? state : 'offline';
}
