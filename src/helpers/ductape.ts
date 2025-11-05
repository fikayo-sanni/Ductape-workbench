import Ductape from "@ductape/sdk";
import { IBuilderInit } from "@ductape/sdk/dist/types";

interface DuctapeInit extends IBuilderInit {
  type: 'product' | 'app';
}

export const connectDuctape = ({
  workspace_id,
  user_id,
  token,
  public_key,
  env_type,
  type
}: DuctapeInit) => {
  if (!workspace_id || !user_id || !token || !public_key) {
    throw new Error('Missing required configuration for Ductape initialization');
  }

  console.log(env_type);
  const ductape = new Ductape({ workspace_id, user_id });
  ductape.setPublicKey(public_key);
  ductape.setToken(token);

  // Initialize based on type
  if (type === 'product') {
    return ductape.product;
  } else {
    return ductape.app;
  }
};
