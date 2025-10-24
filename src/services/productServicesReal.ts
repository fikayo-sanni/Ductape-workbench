import productServices from './productServices';

interface FetchProductsParams {
  workspace_id: string;
  user_id: string;
  public_key: string;
  status: string;
}

const productServicesReal = {
  fetchProducts: async (params: FetchProductsParams) => {
    return await productServices.fetchProducts(params);
  },
};

export default productServicesReal;

