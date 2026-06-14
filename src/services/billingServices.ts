import apiClient from "@/config/axiosinstance";

export interface BillingInfo {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince: string;
  postalZipCode: string;
  country: string;
}

export interface SavedCard {
  authorization?: {
    last4?: string;
    card_type?: string;
    exp_month?: string;
    exp_year?: string;
    bank?: string;
  };
}

interface ApiResponse<T> {
  status: boolean;
  data: T;
}

interface SaveBillingInfoParams {
  userId: string;
  publicKey: string;
  token: string;
}

interface FetchBillingInfoParams {
  userId: string;
  publicKey: string;
}

interface InitializeTransactionParams {
  userId: string;
  publicKey: string;
  authToken: string; // The JWT token from your headers
}

interface InitializeTransactionPayload {
  email: string;
  amount: number;
  callback_url: string;
  currency?: string;
}

interface TransactionResponse {
    status: boolean;
    message: string;
    data: {
      authorization_url: string;
      access_code: string;
      reference: string;
    }
}

/** Fetch saved billing address for the current user. Returns empty-style object if none. */
export const fetchBillingInfo = async (params: FetchBillingInfoParams): Promise<BillingInfo> => {
  const response = await apiClient.get<ApiResponse<BillingInfo>>(`/users/v1/billing/info/?user_id=${params.userId}&public_key=${params.publicKey}`);
  const data = response.data?.data;
  if (!data) {
    return {
      firstName: "",
      lastName: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      stateProvince: "",
      postalZipCode: "",
      country: "",
    }
  }
  return {
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    addressLine1: data.addressLine1 ?? "",
    addressLine2: data.addressLine2 ?? "",
    city: data.city ?? "",
    stateProvince: data.stateProvince ?? "",
    postalZipCode: data.postalZipCode ?? "",
    country: data.country ?? "",
  };
};

/** Save billing address for the current user. */
export const saveBillingInfo = async (
  payload: BillingInfo,
  params: SaveBillingInfoParams
): Promise<BillingInfo> => {
  const response = await apiClient.post<ApiResponse<BillingInfo>>(
    `/users/v1/billing/info/?user_id=${params.userId}&public_key=${params.publicKey}`,
    {
      firstName: payload.firstName,
      lastName: payload.lastName,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2 ?? "",
      city: payload.city,
      stateProvince: payload.stateProvince,
      postalZipCode: payload.postalZipCode,
      country: payload.country,
    },
    {
      headers: {
        'Authorization': `Bearer ${params.token}`, // or whatever token format they expect
        'Content-Type': 'application/json',
      }
    }
  );
  return response.data?.data ?? payload;
};

/** Get saved card (if any) for the current user. Used to show "Pay with saved card •••• 1234". */
export const getSavedCard = async (): Promise<SavedCard | null> => {
  try {
    const response = await apiClient.get<ApiResponse<SavedCard>>("/users/v1/card/");
    const data = response.data?.data;
    if (data?.authorization?.last4) return data;
    return null;
  } catch {
    return null;
  }
};

/** Paystack tokenize payload: card is validated by Paystack before we save. */
export interface ValidateAndSaveCardPayload {
  email: string;
  card: {
    number: string;
    cvv: string;
    expiry_month: number;
    expiry_year: number;
    type: "Visa" | "Mastercard" | "Verve" | "AmericanExpress";
  };
}

interface ValidateAndSaveCardParams {
  userId: string;
  publicKey: string;
  authToken: string;
}

/**
 * Validate the card with Paystack (tokenize) and save it only if validation succeeds.
 * Card is never stored without successful Paystack validation.
 */
export const validateAndSaveCard = async (
  payload: ValidateAndSaveCardPayload,
  params: ValidateAndSaveCardParams,
): Promise<{ message: string; last4?: string; card_type?: string }> => {
  const response = await apiClient.post<ApiResponse<{ message: string; last4?: string; card_type?: string }>>(
    "/pricing/v1/validate-and-save-card/",
    payload,
    {
      params: {
        user_id: params.userId,
        public_key: params.publicKey,
      },
      headers: {
        Authorization: `Bearer ${params.authToken}`,
        "Content-Type": "application/json",
      },
    },
  );
  const data = response.data?.data;
  if (!data) throw new Error("Invalid response");
  return data;
};

export const initializeTransaction = async (
  payload: InitializeTransactionPayload,
  params: InitializeTransactionParams
): Promise<TransactionResponse> => {
  const response = await apiClient.post<ApiResponse<TransactionResponse>>(
    `/pricing/v1/initialize-transaction/`,
    {
      email: payload.email,
      amount: payload.amount,
      callback_url: payload.callback_url,
      currency: payload.currency ?? 'USD',
    },
    {
      params: {
        user_id: params.userId,
        public_key: params.publicKey
      },
      headers: {
        'Authorization': `Bearer ${params.authToken}`,
        'Content-Type': 'application/json',
      }
    }
  );

  return response.data?.data;
};

export interface UsdNgnExchangeRate {
  rate: number;
  source: string;
  fetched_at: string;
}

/** Live USD→NGN quote (cached ~15 min on the pricing service). */
export const fetchUsdNgnExchangeRate = async (): Promise<UsdNgnExchangeRate> => {
  const response = await apiClient.get<ApiResponse<UsdNgnExchangeRate>>(
    '/pricing/v1/exchange-rate/usd-ngn',
  );
  const data = response.data?.data;
  if (!data?.rate) throw new Error('Exchange rate unavailable');
  return data;
};
