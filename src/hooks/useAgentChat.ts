import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@/store/useAuth';
import { streamAgent } from '@/services/agent/providers';
import { AGENT_TOOLS, WorkspaceDataTools, requiresConfirmation } from '@/services/agent/tools';
import { buildSystemPrompt } from '@/services/agent/systemPrompt';
import { loadAgentKeyConfig } from '@/services/agent/keyStorage';
import type { AgentContentBlock, AgentMessage, AgentStopReason } from '@/services/agent/types';

export interface ToolActivityEntry {
  id: string;
  name: string;
  input: any;
  status: 'running' | 'pending_confirmation' | 'done' | 'denied' | 'error';
  errorMessage?: string;
}

export interface ChatUiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  toolActivity: ToolActivityEntry[];
  isStreaming?: boolean;
}

const MAX_TOOL_ITERATIONS = 8;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAgentChat() {
  const { user, currentWorkspaceId } = useAuth();
  const [uiMessages, setUiMessages] = useState<ChatUiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(() => !!loadAgentKeyConfig());

  const conversationRef = useRef<AgentMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const confirmationResolvers = useRef<Map<string, (approved: boolean) => void>>(new Map());

  const refreshKeyStatus = useCallback(() => {
    setHasKey(!!loadAgentKeyConfig());
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    // Unblocks any in-progress tool-call loop waiting on a confirmation click,
    // so it falls through to the (already-aborted) next model call and exits cleanly.
    confirmationResolvers.current.forEach((resolve) => resolve(false));
    confirmationResolvers.current.clear();
  }, []);

  const respondToConfirmation = useCallback((callId: string, approved: boolean) => {
    const resolve = confirmationResolvers.current.get(callId);
    if (!resolve) return;
    confirmationResolvers.current.delete(callId);
    resolve(approved);
  }, []);

  const clearChat = useCallback(() => {
    conversationRef.current = [];
    setUiMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isLoading) return;

      const keyConfig = loadAgentKeyConfig();
      if (!keyConfig) {
        setError('Add your provider API key in chat settings before sending a message.');
        return;
      }
      if (!user || !currentWorkspaceId) {
        setError('Sign in to a workspace to use the assistant.');
        return;
      }

      setError(null);
      setIsLoading(true);

      setUiMessages((prev) => [...prev, { id: newId(), role: 'user', text: trimmed, toolActivity: [] }]);
      conversationRef.current = [...conversationRef.current, { role: 'user', content: trimmed }];

      const tools = new WorkspaceDataTools({ user, workspaceId: currentWorkspaceId });
      const controller = new AbortController();
      abortRef.current = controller;
      const system = buildSystemPrompt({ userName: user.firstname });

      try {
        for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
          const assistantUiId = newId();
          let assistantText = '';
          const pendingToolCalls: Array<{ id: string; name: string; input: any }> = [];
          // Held in an object (not a bare `let`) so TS doesn't narrow it to the
          // initializer's literal type across the awaited streamAgent() call below.
          const streamResult: { stopReason: AgentStopReason; errorMessage?: string } = { stopReason: 'end_turn' };

          setUiMessages((prev) => [
            ...prev,
            { id: assistantUiId, role: 'assistant', text: '', toolActivity: [], isStreaming: true },
          ]);

          await streamAgent(keyConfig.provider, {
            apiKey: keyConfig.apiKey,
            model: keyConfig.model,
            system,
            messages: conversationRef.current,
            tools: AGENT_TOOLS,
            signal: controller.signal,
            onEvent: (event) => {
              if (event.type === 'text-delta') {
                assistantText += event.text;
                setUiMessages((prev) => prev.map((m) => (m.id === assistantUiId ? { ...m, text: assistantText } : m)));
              } else if (event.type === 'tool-call') {
                pendingToolCalls.push({ id: event.id, name: event.name, input: event.input });
                const initialStatus: ToolActivityEntry['status'] = requiresConfirmation(event.name)
                  ? 'pending_confirmation'
                  : 'running';
                setUiMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantUiId
                      ? {
                          ...m,
                          toolActivity: [
                            ...m.toolActivity,
                            { id: event.id, name: event.name, input: event.input, status: initialStatus },
                          ],
                        }
                      : m,
                  ),
                );
              } else if (event.type === 'done') {
                streamResult.stopReason = event.stopReason;
                streamResult.errorMessage = event.errorMessage;
              }
            },
          });

          setUiMessages((prev) => prev.map((m) => (m.id === assistantUiId ? { ...m, isStreaming: false } : m)));

          if (streamResult.stopReason === 'error') {
            setError(streamResult.errorMessage ?? 'The model provider returned an error.');
            break;
          }

          const assistantContent: AgentContentBlock[] = [];
          if (assistantText) assistantContent.push({ type: 'text', text: assistantText });
          for (const call of pendingToolCalls) {
            assistantContent.push({ type: 'tool_use', id: call.id, name: call.name, input: call.input });
          }
          conversationRef.current = [...conversationRef.current, { role: 'assistant', content: assistantContent }];

          if (streamResult.stopReason !== 'tool_use' || pendingToolCalls.length === 0) {
            break;
          }

          const toolResults: AgentContentBlock[] = [];
          for (const call of pendingToolCalls) {
            if (requiresConfirmation(call.name)) {
              const approved = await new Promise<boolean>((resolve) => {
                confirmationResolvers.current.set(call.id, resolve);
              });

              if (!approved) {
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: call.id,
                  content: 'The user declined to approve this action. Do not retry it unless they explicitly ask again.',
                });
                setUiMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantUiId
                      ? { ...m, toolActivity: m.toolActivity.map((t) => (t.id === call.id ? { ...t, status: 'denied' } : t)) }
                      : m,
                  ),
                );
                continue;
              }

              setUiMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantUiId
                    ? { ...m, toolActivity: m.toolActivity.map((t) => (t.id === call.id ? { ...t, status: 'running' } : t)) }
                    : m,
                ),
              );
            }

            try {
              const result = await tools.execute(call.name, call.input);
              toolResults.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(result ?? null) });
              setUiMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantUiId
                    ? { ...m, toolActivity: m.toolActivity.map((t) => (t.id === call.id ? { ...t, status: 'done' } : t)) }
                    : m,
                ),
              );
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              toolResults.push({ type: 'tool_result', tool_use_id: call.id, content: message, is_error: true });
              setUiMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantUiId
                    ? {
                        ...m,
                        toolActivity: m.toolActivity.map((t) =>
                          t.id === call.id ? { ...t, status: 'error', errorMessage: message } : t,
                        ),
                      }
                    : m,
                ),
              );
            }
          }
          conversationRef.current = [...conversationRef.current, { role: 'user', content: toolResults }];
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Something went wrong talking to the model.');
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [user, currentWorkspaceId, isLoading],
  );

  return {
    messages: uiMessages,
    isLoading,
    error,
    hasKey,
    refreshKeyStatus,
    sendMessage,
    stop,
    clearChat,
    respondToConfirmation,
  };
}
