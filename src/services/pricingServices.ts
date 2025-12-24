import apiClient from "@/config/axiosinstance";
import { PricingApiResponse, PricingPlan } from "@/types/pricing";

const createBundle = async (data: {
  user_id: string;
  public_key: string;
  workspace_id: string;
  payload: PricingPlan;
}): Promise<PricingPlan> => {
  const { user_id, public_key, workspace_id, payload } = data;
  const response = await apiClient.post<PricingPlan>(
    '/pricing/v1/create',
    payload,
    {
      params: { user_id, public_key, workspace_id },
    }
  );
  return response.data;
};


const fetchBundles = async (data: {
  user_id: string;
  public_key: string;
  workspace_id: string;
}): Promise<PricingApiResponse> => {
  const { user_id, public_key, workspace_id } = data;
  const response = await apiClient.get<PricingApiResponse>( 
    '/pricing/v1/workspace',
    {
      params: { user_id, public_key, workspace_id },
    }
  );
  return response.data;
}

const pricingServices = {
  createBundle,
  fetchBundles,
};

export default pricingServices;