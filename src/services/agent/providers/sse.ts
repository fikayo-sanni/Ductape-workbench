/** Minimal Server-Sent-Events line reader shared by the provider adapters. */
export async function readSSE(
  response: Response,
  onEvent: (eventName: string | undefined, data: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!response.body) throw new Error('Response has no body to stream');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const rawEvent of events) {
        let eventName: string | undefined;
        const dataLines: string[] = [];
        for (const line of rawEvent.split('\n')) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        }
        if (dataLines.length) onEvent(eventName, dataLines.join('\n'));
      }
    }
  } finally {
    reader.releaseLock();
  }
}
