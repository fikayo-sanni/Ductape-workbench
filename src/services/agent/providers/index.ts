import type { AgentProvider } from '../keyStorage';
import type { StreamAgentParams } from '../types';
import { streamAnthropic } from './anthropic';
import { streamOpenAI } from './openai';
import { streamDeepSeek } from './deepseek';

export function streamAgent(provider: AgentProvider, params: StreamAgentParams): Promise<void> {
  switch (provider) {
    case 'anthropic':
      return streamAnthropic(params);
    case 'openai':
      return streamOpenAI(params);
    case 'deepseek':
      return streamDeepSeek(params);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
