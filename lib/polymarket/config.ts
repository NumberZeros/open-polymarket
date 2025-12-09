/**
 * Polymarket Configuration
 *
 * Centralized configuration for all Polymarket-related services:
 * - Contract addresses (Polygon)
 * - API endpoints
 * - Builder credentials
 * - Token information
 * - Network configuration
 */

// ============= Network Configuration =============

export const POLYGON_CHAIN_ID = 137;

export const POLYGON_RPC_URLS = {
  PRIMARY:
    process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com",
  BACKUP: "https://rpc.ankr.com/polygon",
} as const;

// ============= Contract Addresses - Polygon =============

export const POLYGON_CONTRACTS = {
  // USDC Tokens
  /** USDC.e (Bridged via PoS) - Used by Polymarket for trading */
  USDC: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
  /** Native USDC (Circle issued) - Required for CCTP bridging */
  USDC_NATIVE: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",

  // Polymarket Contracts
  /** Conditional Token Framework */
  CTF: "0x4d97dcd97ec945f40cf65f87097ace5ea0476045",
  /** CTF Exchange for regular markets */
  CTF_EXCHANGE: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
  /** Neg Risk CTF Exchange for binary markets */
  NEG_RISK_CTF_EXCHANGE: "0xc5d563a36ae78145c45a50134d48a1215220f80a",
  /** Neg Risk Adapter */
  NEG_RISK_ADAPTER: "0xd91e80cf2e7be2e162c6513ced06f1dd0da35296",
  
  // Proxy Wallet Factory
  /** Safe Proxy Factory - Used to derive Proxy Wallet addresses */
  SAFE_PROXY_FACTORY: "0xaacfeea03eb1561c4e67d661e40682bd20e3541b",
} as const;

// ============= Proxy Wallet Constants =============

/** Safe init code hash - Used to derive Proxy Wallet addresses via CREATE2 */
export const SAFE_INIT_CODE_HASH = "0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf";

// ============= Token Information =============

export const TOKEN_INFO = {
  USDC_E: {
    address: POLYGON_CONTRACTS.USDC,
    symbol: "USDC.e",
    name: "Bridged USDC (PoS)",
    decimals: 6,
    isNative: false,
  },
  USDC_NATIVE: {
    address: POLYGON_CONTRACTS.USDC_NATIVE,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    isNative: true,
  },
} as const;

// ============= API Endpoints =============

export const POLYMARKET_API = {
  // REST APIs
  CLOB: "https://clob.polymarket.com",
  GAMMA: "https://gamma-api.polymarket.com",
  DATA: "https://data-api.polymarket.com",
  RELAYER: "https://relayer-v2.polymarket.com",

  // WebSocket endpoints
  WSS_CLOB: "wss://ws-subscriptions-clob.polymarket.com/ws/",
  WSS_LIVE_DATA: "wss://ws-live-data.polymarket.com",
} as const;

// ============= Builder Credentials =============

/**
 * Builder credentials are only accessible server-side via API routes
 * See /api/sign/route.ts for implementation
 * 
 * Client code should call /api/sign to get authenticated headers
 */
export interface BuilderApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

// ============= UI Theme (Polymarket-style) =============

export const POLYMARKET_THEME = {
  colors: {
    bg: {
      primary: "#0a0a0b",
      secondary: "#121214",
      tertiary: "#1a1a1e",
      hover: "#252529",
      card: "#16161a",
    },
    text: {
      primary: "#ffffff",
      secondary: "#a1a1aa",
      muted: "#71717a",
      accent: "#8b5cf6",
    },
    border: {
      default: "#27272a",
      light: "#3f3f46",
      accent: "#8b5cf6",
    },
    status: {
      success: "#22c55e",
      error: "#ef4444",
      warning: "#f59e0b",
      info: "#3b82f6",
    },
    trading: {
      buy: "#22c55e",
      sell: "#ef4444",
    },
  },
} as const;

// ============= Helper Functions =============

/**
 * Get API URL by type with environment override support
 */
export function getApiUrl(api: keyof typeof POLYMARKET_API): string {
  return POLYMARKET_API[api];
}

/**
 * Check if Builder credentials are configured (server-side only)
 * For bethub, this checks if /api/builder/sign is available
 */
export function hasBuilderCredentials(): boolean {
  // In bethub, Builder credentials are kept server-side
  // Check if signing endpoint exists by checking if env vars are set
  if (typeof window !== 'undefined') {
    // Client-side: Assume builder endpoint exists if we have the app running
    return true;
  }
  
  // Server-side: Check if credentials exist
  return !!(
    process.env.POLY_BUILDER_API_KEY &&
    process.env.POLY_BUILDER_SECRET &&
    process.env.POLY_BUILDER_PASSPHRASE
  );
}

/**
 * Validate Builder credentials format (server-side only)
 */
export function validateBuilderCredentials(): { valid: boolean; errors: string[] } {
  if (typeof window !== 'undefined') {
    return { valid: true, errors: [] };
  }
  
  const errors: string[] = [];
  const apiKey = process.env.POLY_BUILDER_API_KEY;
  const secret = process.env.POLY_BUILDER_SECRET;
  const passphrase = process.env.POLY_BUILDER_PASSPHRASE;
  
  if (!apiKey) errors.push('POLY_BUILDER_API_KEY is not set');
  if (!secret) errors.push('POLY_BUILDER_SECRET is not set');
  if (!passphrase) errors.push('POLY_BUILDER_PASSPHRASE is not set');
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if remote signing server is configured
 */
export function hasRemoteSigningConfig(): boolean {
  // For bethub, we always use /api/builder/sign endpoint
  // Check if it's explicitly configured or use default
  if (typeof window !== 'undefined') {
    return true; // Always true on client
  }
  
  // Check server-side env or assume /api/builder/sign exists
  return !!(
    process.env.NEXT_PUBLIC_POLY_SIGNING_SERVER_URL ||
    hasBuilderCredentials()
  );
}

/**
 * Get the builder signing endpoint URL
 */
export function getBuilderSigningUrl(): string {
  // Check for explicit override
  const envUrl = typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_POLY_SIGNING_SERVER_URL
    : process.env.NEXT_PUBLIC_POLY_SIGNING_SERVER_URL;
  
  if (envUrl) return envUrl;
  
  // Default to /api/builder/sign on current origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/builder/sign`;
  }
  
  // Server-side default
  return 'http://localhost:3000/api/builder/sign';
}

/**
 * Get polygon RPC URL with fallback
 */
export function getPolygonRpcUrl(): string {
  return POLYGON_RPC_URLS.PRIMARY;
}

// ============= Type Exports =============

export type PolygonContract = keyof typeof POLYGON_CONTRACTS;
export type PolymarketApiEndpoint = keyof typeof POLYMARKET_API;
