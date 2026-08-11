import type { AgentStopReason, StreamAgentParams } from '../types';
import { readSSE } from './sse';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_TOKENS = 4096;

async function extractErrorMessage(response: Response): Promise<string> {
  const bodyText = await response.text().catch(() => '');
  try {
    const parsed = JSON.parse(bodyText);
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    // fall through to raw body below
  }
  return bodyText ? bodyText.slice(0, 300) : `Anthropic request failed: ${response.status}`;
}

export async function streamAnthropic(params: StreamAgentParams): Promise<void> {
  const { apiKey, model, system, messages, tools, onEvent, signal } = params;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Required for the Anthropic SDK/API to accept a direct call from a browser origin.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      })),
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    onEvent({ type: 'done', stopReason: 'error', errorMessage: await extractErrorMessage(response) });
    return;
  }

  const toolInputBuffers = new Map<number, { id: string; name: string; json: string }>();
  let stopReason: string | null = null;
  let streamErrorMessage: string | null = null;

  await readSSE(
    response,
    (eventName, data) => {
      let payload: any;
      try {
        payload = JSON.parse(data);
      } catch {
        return;
      }

      switch (eventName) {
        case 'content_block_start':
          if (payload.content_block?.type === 'tool_use') {
            toolInputBuffers.set(payload.index, {
              id: payload.content_block.id,
              name: payload.content_block.name,
              json: '',
            });
          }
          break;

        case 'content_block_delta':
          if (payload.delta?.type === 'text_delta') {
            onEvent({ type: 'text-delta', text: payload.delta.text });
          } else if (payload.delta?.type === 'input_json_delta') {
            const buf = toolInputBuffers.get(payload.index);
            if (buf) buf.json += payload.delta.partial_json ?? '';
          }
          break;

        case 'content_block_stop': {
          const buf = toolInputBuffers.get(payload.index);
          if (buf) {
            let input: any = {};
            try {
              input = buf.json ? JSON.parse(buf.json) : {};
            } catch {
              input = {};
            }
            onEvent({ type: 'tool-call', id: buf.id, name: buf.name, input });
            toolInputBuffers.delete(payload.index);
          }
          break;
        }

        case 'message_delta':
          if (payload.delta?.stop_reason) stopReason = payload.delta.stop_reason;
          break;

        case 'error':
          streamErrorMessage = payload.error?.message ?? 'Anthropic stream error';
          break;

        default:
          break;
      }
    },
    signal,
  );

  if (streamErrorMessage) {
    onEvent({ type: 'done', stopReason: 'error', errorMessage: streamErrorMessage });
    return;
  }

  const mappedStopReason: AgentStopReason =
    stopReason === 'tool_use' ? 'tool_use' : stopReason === 'max_tokens' ? 'max_tokens' : 'end_turn';
  onEvent({ type: 'done', stopReason: mappedStopReason });
}
