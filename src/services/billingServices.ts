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

/** Fetch saved billing address for the current user. Returns empty-style object if none. */
export const fetchBillingInfo = async (): Promise<BillingInfo> => {
  const response = await apiClient.get<ApiResponse<BillingInfo>>("/users/v1/billing/info");
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
    };
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
export const saveBillingInfo = async (payload: BillingInfo): Promise<BillingInfo> => {
  const response = await apiClient.post<ApiResponse<BillingInfo>>("/users/v1/billing/info", {
    firstName: payload.firstName,
    lastName: payload.lastName,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2 ?? "",
    city: payload.city,
    stateProvince: payload.stateProvince,
    postalZipCode: payload.postalZipCode,
    country: payload.country,
  });
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

/**
 * Validate the card with Paystack (tokenize) and save it only if validation succeeds.
 * Card is never stored without successful Paystack validation.
 */
export const validateAndSaveCard = async (
  payload: ValidateAndSaveCardPayload
): Promise<{ message: string; last4?: string; card_type?: string }> => {
  const response = await apiClient.post<ApiResponse<{ message: string; last4?: string; card_type?: string }>>(
    "/pricing/v1/validate-and-save-card/",
    payload
  );
  const data = response.data?.data;
  if (!data) throw new Error("Invalid response");
  return data;
};
