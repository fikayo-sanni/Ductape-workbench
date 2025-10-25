import apiClient from '@/config/axiosinstance';

interface UpdateEnvironmentResponse {
  data: any;
  message: string;
  status: boolean;
}

interface UpdateEnvironmentData {
  workspace_id: string;
  user_id: string;
  public_key: string;
  app_id: string;
  environment_slug: string;
  base_url: string;
}

const updateEnvironmentBaseUrl = async (data: UpdateEnvironmentData): Promise<UpdateEnvironmentResponse> => {
  const { workspace_id, user_id, public_key, app_id, environment_slug, base_url } = data;
  
  try {
    const response = await apiClient.put<UpdateEnvironmentResponse>(
      `/apps/v1/environments/${app_id}/${environment_slug}/base-url`,
      {
        base_url,
        workspace_id,
        user_id,
        public_key
      }
    );
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to update environment base URL:', error);
    throw error;
  }
};

const connectAppToProduct = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
  app_id: string;
  product_id: string;
  environment_mappings: Array<{
    app_env_slug: string;
    product_env_slug: string;
  }>;
}): Promise<UpdateEnvironmentResponse> => {
  const { workspace_id, user_id, public_key, app_id, product_id, environment_mappings } = data;
  
  try {
    const response = await apiClient.post<UpdateEnvironmentResponse>(
      `/apps/v1/connect-to-product`,
      {
        app_id,
        product_id,
        environment_mappings,
        workspace_id,
        user_id,
        public_key
      }
    );
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to connect app to product:', error);
    throw error;
  }
};

const environmentServices = {
  updateEnvironmentBaseUrl,
  connectAppToProduct,
};

export default environmentServices;
