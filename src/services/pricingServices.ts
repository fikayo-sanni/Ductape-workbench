import apiClient from "@/config/axiosinstance";
import { PricingApiResponse, ChangePlanRequest, ChangePlanResponse, PricingPlan, TotalExpenseRecord, TotalIncomeRecord, DeletePricingResponse, BillingResponse, BillingApiResponse, SubscriptionResponse } from "@/types/pricing";
import toast from "react-hot-toast";



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
  start_date?: string;
  end_date?: string;
}): Promise<TotalExpenseRecord> => {
  const { user_id, public_key, workspace_id, start_date, end_date } = data;
  const params: Record<string, string> = { public_key, user_id };
  if (start_date) params.start_date = start_date;
  if (end_date) params.end_date = end_date;
  const response = await apiClient.get<TotalExpenseRecord>(
    `/pricing/v1/expenses/stats/${workspace_id}`,
    { params }
  );
  return response.data;
}

const deleteBundle = async (data: {
  _id: string;
  user_id: string;
  public_key: string;
  workspace_id?: string;
}): Promise<DeletePricingResponse | null> => {
  const { user_id, public_key, _id, workspace_id } = data;
  try {
    const response = await apiClient.delete<DeletePricingResponse>(
      `/pricing/v1/delete/${_id}`,
      {
        params: {
          user_id,
          public_key,
          workspace_id,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error deleting bundle:", error);
    return null;
  }
};

const editBundles = async (data: {
  _id: string;
  user_id: string;
  public_key: string;
  workspace_id?: string;
  payload: PricingPlan;
}): Promise<PricingPlan> => {
  const { user_id, public_key, payload, _id, workspace_id } = data;

  try {
    const response = await apiClient.put<PricingPlan>(
      `/pricing/v1/update/${_id}`,
      payload,
      {
        params: {
          user_id,
          public_key,
          workspace_id
        },
      }
    );

    if (!response.data) {
      toast.error('Something went wrong');
      throw new Error("Failed to edit bundle");
    }

    return response.data;
  } catch (error) {
    console.error("Error editing bundle:", error);
    toast.error('This bundle cannot be edited');
    throw error;
  }
};

// Billing Report
const fetchBillingReport = async (data: {
  user_id: string;
  public_key: string;
  workspace_id: string;
}): Promise<BillingResponse> => {
  const { user_id, public_key, workspace_id } = data;
  const response = await apiClient.get<BillingResponse>(
    `/workspaces/v1/billing/report/${workspace_id}`,
    {
      params: { user_id, public_key },
    }
  );
  return response.data;
};

const fetchBillingData = async (data: {
  user_id: string;
  public_key: string;
}): Promise<BillingApiResponse> => {
  const { user_id, public_key } = data;
  const response = await apiClient.get<BillingApiResponse>(
    `/pricing/v1/subscription`,
    {
      params: { user_id, public_key },
    }
  );
  return response.data;
};

const changeSubscription = async (
  params: { user_id: string; public_key: string },
  data: ChangePlanRequest,
  authToken: string
): Promise<ChangePlanResponse> => {
  const response = await apiClient.put<ChangePlanResponse>(
    `/workspaces/v1/subscribe`,
    data,
    {
      params: params,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',

      }
    }
  );
  return response.data;
};

const createSubscription = async (data: {
  user_id: string;
  public_key: string;
  payload: {
    plan_id: string;
    workspace_id: string;
  };
}): Promise<SubscriptionResponse> => {

  const { user_id, public_key, payload } = data;

  try {
    const response = await apiClient.post<SubscriptionResponse>(
      `/workspaces/v1/subscribe`,
      payload,
      {
        params: {
          user_id,
          public_key,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to create subscription:', error);
    throw error;
  }
};

const pricingServices = {
  createBundle,
  fetchBundles,
  fetchTotalIncome,
  fetchTotalExpense,
  deleteBundle,
  editBundles,
  fetchBillingReport,
  fetchBillingData,
  changeSubscription,
  createSubscription,
};

export default pricingServices;