import apiClient from "@/config/axiosinstance";
import { PricingApiResponse, PricingPlan, TotalExpenseRecord, TotalIncomeRecord } from "@/types/pricing";

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

const fetchTotalIncome = async (data: {
  user_id: string;
  public_key: string;
  workspace_id: string;
}): Promise<TotalIncomeRecord> => {
  const { user_id, public_key, workspace_id } = data;
  const response = await apiClient.get<TotalIncomeRecord>( 
    `/log/v1/income/stats/${workspace_id}`,
    {
      params: { public_key, user_id },
    }
  );
  return response.data;
}

const fetchTotalExpense = async (data: {
  user_id: string;
  public_key: string;
  workspace_id: string;
}): Promise<TotalExpenseRecord> => {
  const { user_id, public_key, workspace_id } = data;
  const response = await apiClient.get<TotalExpenseRecord>( 
    `/log/v1/expenses/stats/${workspace_id}`,
    {
      params: { public_key, user_id },
    }
  );
  return response.data;
}


const pricingServices = {
  createBundle,
  fetchBundles,
  fetchTotalIncome,
  fetchTotalExpense,
};

export default pricingServices;