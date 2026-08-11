export interface AgentToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export type AgentContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string | AgentContentBlock[];
}

export type AgentStopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'error';

export type AgentStreamEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; id: string; name: string; input: any }
  | { type: 'done'; stopReason: AgentStopReason; errorMessage?: string };

export interface StreamAgentParams {
  apiKey: string;
  model: string;
  system: string;
  messages: AgentMessage[];
  tools: AgentToolDefinition[];
  onEvent: (event: AgentStreamEvent) => void;
  signal?: AbortSignal;
}
