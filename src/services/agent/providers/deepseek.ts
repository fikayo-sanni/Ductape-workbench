import type { StreamAgentParams } from '../types';
import { streamOpenAICompatible } from './openaiCompatible';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export function streamDeepSeek(params: StreamAgentParams): Promise<void> {
  return streamOpenAICompatible(DEEPSEEK_API_URL, params, 'DeepSeek');
}
