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

/**
 * Initialize Ductape SDK for workspace-level operations (secrets, etc.)
 * Returns the full Ductape instance instead of product/app builders
 */
interface DuctapeWorkspaceInit extends Omit<IBuilderInit, 'env_type'> {
  env_type?: IBuilderInit['env_type'];
}

export const connectDuctapeWorkspace = ({
  workspace_id,
  user_id,
  token,
  public_key,
}: DuctapeWorkspaceInit): Ductape => {
  if (!workspace_id || !user_id || !token || !public_key) {
    throw new Error('Missing required configuration for Ductape initialization');
  }

  const ductape = new Ductape({ workspace_id, user_id });
  ductape.setPublicKey(public_key);
  ductape.setToken(token);

  return ductape;
};
