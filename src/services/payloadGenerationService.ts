import apiClient from '@/config/axiosinstance';

export interface IGeneratePayloadRequest {
  workspace_id: string;
  user_id: string;
  public_key: string;
  product_tag: string;
  env_slug: string;
  operation_family: string;
  method: string;
  targets?: Record<string, unknown>;
  include_session?: boolean;
  include_cache?: boolean;
  schema_mode?: 'strict' | 'best_effort';
  input_hint?: Record<string, unknown>;
}

export interface IGeneratePayloadResponse {
  payload: Record<string, unknown>;
  meta: Record<string, unknown>;
}

export const generateExecutablePayload = async (
  req: IGeneratePayloadRequest,
): Promise<IGeneratePayloadResponse> => {
  const response = await apiClient.post('/integrations/v1/payloads/generate', req, {
    headers: {
      'x-access-key': req.public_key,
    },
  });
  return response?.data?.data as IGeneratePayloadResponse;
};

const payloadGenerationService = {
  generateExecutablePayload,
};

export default payloadGenerationService;
