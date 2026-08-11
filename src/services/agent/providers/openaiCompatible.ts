import type { AgentContentBlock, AgentMessage, AgentStopReason, StreamAgentParams } from '../types';
import { readSSE } from './sse';

/**
 * The chat loop keeps messages in Anthropic's shape (tool_use/tool_result
 * content blocks) since that's the richer of the two formats. The OpenAI
 * chat-completions wire format needs tool results as separate role:"tool"
 * messages, so translate here rather than forcing the loop itself to branch
 * per provider.
 */
function toOpenAIMessages(system: string, messages: AgentMessage[]): any[] {
  const out: any[] = [{ role: 'system', content: system }];

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      out.push({ role: msg.role, content: msg.content });
      continue;
    }

    const blocks = msg.content as AgentContentBlock[];
    const toolResults = blocks.filter((b) => b.type === 'tool_result');
    if (toolResults.length) {
      for (const tr of toolResults) {
        if (tr.type === 'tool_result') {
          out.push({ role: 'tool', tool_call_id: tr.tool_use_id, content: tr.content });
        }
      }
      continue;
    }

    const text = blocks
      .filter((b): b is Extract<AgentContentBlock, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const toolUses = blocks.filter((b): b is Extract<AgentContentBlock, { type: 'tool_use' }> => b.type === 'tool_use');

    if (msg.role === 'assistant' && toolUses.length) {
      out.push({
        role: 'assistant',
        content: text || null,
        tool_calls: toolUses.map((tu) => ({
          id: tu.id,
          type: 'function',
          function: { name: tu.name, arguments: JSON.stringify(tu.input ?? {}) },
        })),
      });
      continue;
    }

    out.push({ role: msg.role, content: text });
  }

  return out;
}

async function extractErrorMessage(response: Response, providerLabel: string): Promise<string> {
  const bodyText = await response.text().catch(() => '');
  try {
    const parsed = JSON.parse(bodyText);
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    // fall through to raw body below
  }
  return bodyText ? bodyText.slice(0, 300) : `${providerLabel} request failed: ${response.status}`;
}

/**
 * Shared streaming client for any provider that speaks the OpenAI
 * chat-completions wire format (OpenAI itself, DeepSeek, and most other
 * "OpenAI-compatible" APIs) — only the endpoint URL and auth key differ.
 */
export async function streamOpenAICompatible(
  endpointUrl: string,
  params: StreamAgentParams,
  providerLabel = 'Provider',
): Promise<void> {
  const { apiKey, model, system, messages, tools, onEvent, signal } = params;

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: toOpenAIMessages(system, messages),
      tools: tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.input_schema },
      })),
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    onEvent({ type: 'done', stopReason: 'error', errorMessage: await extractErrorMessage(response, providerLabel) });
    return;
  }

  const toolCallBuffers = new Map<number, { id: string; name: string; args: string }>();
  let finishReason: string | null = null;

  await readSSE(
    response,
    (_eventName, data) => {
      if (data === '[DONE]') return;
      let payload: any;
      try {
        payload = JSON.parse(data);
      } catch {
        return;
      }
      const choice = payload.choices?.[0];
      if (!choice) return;
      const delta = choice.delta ?? {};

      if (delta.content) {
        onEvent({ type: 'text-delta', text: delta.content });
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const call of delta.tool_calls) {
          const idx = call.index ?? 0;
          const existing = toolCallBuffers.get(idx) ?? { id: call.id ?? '', name: call.function?.name ?? '', args: '' };
          if (call.id) existing.id = call.id;
          if (call.function?.name) existing.name = call.function.name;
          if (call.function?.arguments) existing.args += call.function.arguments;
          toolCallBuffers.set(idx, existing);
        }
      }

      if (choice.finish_reason) finishReason = choice.finish_reason;
    },
    signal,
  );

  if (finishReason === 'tool_calls') {
    for (const buf of toolCallBuffers.values()) {
      let input: any = {};
      try {
        input = buf.args ? JSON.parse(buf.args) : {};
      } catch {
        input = {};
      }
      onEvent({ type: 'tool-call', id: buf.id, name: buf.name, input });
    }
  }

  const mappedStopReason: AgentStopReason =
    finishReason === 'tool_calls' ? 'tool_use' : finishReason === 'length' ? 'max_tokens' : 'end_turn';
  onEvent({ type: 'done', stopReason: mappedStopReason });
}
