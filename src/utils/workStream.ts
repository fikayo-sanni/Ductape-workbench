/**
 * Reading the work tracker's live stream (server-sent events over fetch, because the sign-in travels in the
 * Authorization header and EventSource cannot send one). Pure parts only: framing and reconnect timing.
 */

export interface ISseEvent {
  event: string;
  data: unknown;
}

/**
 * Splits what has arrived so far into complete events. Returns them and whatever is left of an event not yet
 * finished, to prepend to the next chunk. Comments (keep-alives) are skipped; data that is not JSON is kept as text.
 */
export function parseSse(buffer: string): { events: ISseEvent[]; rest: string } {
  const events: ISseEvent[] = [];
  const normalised = buffer.replace(/\r\n/g, '\n');
  const frames = normalised.split('\n\n');
  const rest = frames.pop() ?? '';
  for (const frame of frames) {
    let event = 'message';
    const data: string[] = [];
    for (const line of frame.split('\n')) {
      if (!line || line.startsWith(':')) continue;
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    }
    if (!data.length && event === 'message') continue;
    const text = data.join('\n');
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // Kept as text.
    }
    events.push({ event, data: parsed });
  }
  return { events, rest };
}

/** Wait before reconnect attempt n (0-based): 1 s doubling to 30 s. */
export function reconnectDelay(attempt: number): number {
  return Math.min(30_000, 1000 * 2 ** Math.max(0, attempt));
}

/** How often the Work area re-reads everything: rarely while the stream is live, often while it is not. */
export function pollInterval(live: boolean): number {
  return live ? 60_000 : 5_000;
}
