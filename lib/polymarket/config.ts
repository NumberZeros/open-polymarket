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
  USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  /** Native USDC (Circle issued) - Required for CCTP bridging */
  USDC_NATIVE: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",

  // Polymarket Contracts
  /** Conditional Token Framework */
  CTF: "0x4d97dcd97ec945f40cf65f87097ace5ea0476045",
  /** CTF Exchange for regular markets */
  CTF_EXCHANGE: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
  /** Neg Risk CTF Exchange for binary markets */
  NEG_RISK_CTF_EXCHANGE: "0xC5d563A36AE78145C45a50134d48A1215220f80a",
  /** Neg Risk Adapter */
  NEG_RISK_ADAPTER: "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
  
  // Proxy Wallet Factory
  /** Safe Proxy Factory - Used to derive Proxy Wallet addresses */
  SAFE_PROXY_FACTORY: "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b",
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

// ============= Type Exports =============

export type PolygonContract = keyof typeof POLYGON_CONTRACTS;
export type PolymarketApiEndpoint = keyof typeof POLYMARKET_API;
