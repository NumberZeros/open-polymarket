/**
 * Polymarket Signing Utilities
 * 
 * Handles EIP-712 signing for CLOB API authentication
 * Based on: https://github.com/Polymarket/clob-client
 * 
 * Note: HMAC signature generation should only be done server-side (API routes)
 * Client-side code should call the /api/sign endpoint for HMAC signatures
 */

// ============= Constants =============

export const CLOB_DOMAIN_NAME = "ClobAuthDomain";
export const CLOB_VERSION = "1";
export const MSG_TO_SIGN = "This message attests that I control the given wallet";

// Polygon mainnet chain ID
export const POLYGON_CHAIN_ID = 137;

// ============= EIP-712 Types =============

/**
 * Domain for EIP-712 CLOB authentication
 */
export const CLOB_AUTH_DOMAIN = {
  name: CLOB_DOMAIN_NAME,
  version: CLOB_VERSION,
  chainId: POLYGON_CHAIN_ID,
};

/**
 * Types for EIP-712 CLOB authentication
 */
export const CLOB_AUTH_TYPES = {
  ClobAuth: [
    { name: "address", type: "address" },
    { name: "timestamp", type: "string" },
    { name: "nonce", type: "uint256" },
    { name: "message", type: "string" },
  ],
};

// ============= L1 Authentication (EIP-712) =============

/**
 * Build L1 authentication headers (EIP-712 signature based)
 * Used for API key creation/derivation
 */
export interface L1AuthHeaders {
  POLY_ADDRESS: string;
  POLY_SIGNATURE: string;
  POLY_TIMESTAMP: string;
  POLY_NONCE: string;
}

export function buildL1AuthMessage(address: string, timestamp: number, nonce: number) {
  return {
    address,
    timestamp: timestamp.toString(),
    nonce: BigInt(nonce),
    message: MSG_TO_SIGN,
  };
}

// ============= L2 Authentication (HMAC) =============

/**
 * Build L2 authentication headers (HMAC based)
 * Used for authenticated API requests after API key is obtained
 * 
 * Note: The HMAC signature should be generated server-side via /api/sign
 */
export interface L2AuthHeaders {
  POLY_ADDRESS: string;
  POLY_SIGNATURE: string;
  POLY_TIMESTAMP: string;
  POLY_API_KEY: string;
  POLY_PASSPHRASE: string;
}

export interface ApiKeyCreds {
  key: string;
  secret: string;
  passphrase: string;
}

/**
 * Build L2 auth headers for authenticated requests
 * Use this after getting the signature from /api/sign
 */
export function buildL2Headers(
  address: string,
  creds: ApiKeyCreds,
  signature: string,
  timestamp: number
): L2AuthHeaders {
  return {
    POLY_ADDRESS: address,
    POLY_SIGNATURE: signature,
    POLY_TIMESTAMP: timestamp.toString(),
    POLY_API_KEY: creds.key,
    POLY_PASSPHRASE: creds.passphrase,
  };
}

// ============= Signature Type =============

export enum SignatureType {
  EOA = 0,
  POLY_PROXY = 1,
  POLY_GNOSIS_SAFE = 2,
}

// ============= Helper Functions =============

/**
 * Get current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Generate random nonce
 */
export function generateNonce(): number {
  return Math.floor(Math.random() * 1000000);
}
