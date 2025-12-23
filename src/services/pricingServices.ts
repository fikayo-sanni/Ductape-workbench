import apiClient from "@/config/axiosinstance";
import { PricingPlan } from "@/types/pricing";

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

const pricingServices = {
  createBundle,
};

export default pricingServices;