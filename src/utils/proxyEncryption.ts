/**
 * Proxy Encryption Utility
 * Encrypts proxy request payloads using the product's public_key
 * Uses AES encryption compatible with the backend decryption
 */

import CryptoJS from 'crypto-js';

/**
 * Encrypt data for proxy transmission
 * Uses AES encryption with SHA-256 key derivation
 * Format: IV:EncryptedData (colon-separated)
 *
 * @param data - The data object to encrypt
 * @param publicKey - The product's public_key used as encryption key
 * @returns Encrypted string in format "iv:encryptedData"
 */
export function encryptProxyPayload(data: object, publicKey: string): string {
  const jsonString = JSON.stringify(data);
  const iv = CryptoJS.lib.WordArray.random(16);
  const hashedKey = CryptoJS.SHA256(publicKey);
  const encrypted = CryptoJS.AES.encrypt(jsonString, hashedKey, { iv });
  return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
}

/**
 * Create an encrypted proxy request body
 * Wraps the sensitive payload in an encrypted envelope
 *
 * @param payload - The full request payload containing method, params, etc.
 * @param publicKey - The product's public_key
 * @returns Object with encrypted payload and metadata for decryption
 */
export function createEncryptedProxyRequest(
  payload: {
    workspace_id: string;
    user_id: string;
    public_key: string;
    method: string;
    params: any[];
  },
  publicKey: string
): {
  encrypted_payload: string;
  workspace_id: string;
  public_key: string;
} {
  // Encrypt the sensitive parts (method, params, user_id)
  const sensitiveData = {
    method: payload.method,
    params: payload.params,
    user_id: payload.user_id,
  };

  const encryptedPayload = encryptProxyPayload(sensitiveData, publicKey);

  // Return with unencrypted identifiers needed for routing/auth
  return {
    encrypted_payload: encryptedPayload,
    workspace_id: payload.workspace_id,
    public_key: payload.public_key,
  };
}

export default {
  encryptProxyPayload,
  createEncryptedProxyRequest,
};
