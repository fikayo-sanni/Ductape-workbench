/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from "@/config/axiosinstance";
import { IProduct } from "@/types/product";

export interface ProductsResponse {
  data: IProduct[];
}

export interface ProductResponse {
  data: IProduct;
}

const fetchProducts = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
  status: string;
}): Promise<ProductsResponse> => {
  const { workspace_id, user_id, status, public_key } = data;
  const response = await apiClient.get<ProductsResponse>(
    `/integrations/v1/workspace/${workspace_id}/${status}`,
    { params: { public_key, user_id } }
  );
  return response.data;
};

const fetchProduct = async (data: {
  product_id: string;
  user_id: string;
  public_key: string;
  workspace_id: string;
}): Promise<ProductResponse> => {
  const { workspace_id, product_id, user_id, public_key } = data;
  const response = await apiClient.get<ProductResponse>(
    `/integrations/v1/${product_id}`,
    {
      params: { public_key, user_id, workspace_id },
    }
  );
  return response.data;
};

const productServices = {
  fetchProducts,
  fetchProduct,
};

export default productServices;
