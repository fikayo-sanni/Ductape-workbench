import type { StreamAgentParams } from '../types';
import { streamOpenAICompatible } from './openaiCompatible';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export function streamOpenAI(params: StreamAgentParams): Promise<void> {
  return streamOpenAICompatible(OPENAI_API_URL, params, 'OpenAI');
}
