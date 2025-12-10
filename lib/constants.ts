/**
 * Application-wide Constants
 * 
 * Centralized configuration for cache times, UI defaults, and limits
 * Makes it easy to adjust values without searching through codebase
 */

// ============= React Query Cache Times =============

export const CACHE_TIMES = {
  /** Order book updates frequently (real-time trading) */
  ORDER_BOOK: 5 * 1000, // 5 seconds

  /** Market prices change constantly */
  MARKET_PRICES: 5 * 1000, // 5 seconds

  /** Price history is relatively stable */
  PRICE_HISTORY: 30 * 1000, // 30 seconds

  /** User positions update with trades */
  POSITIONS: 15 * 1000, // 15 seconds

  /** Recent trades update frequently */
  TRADES: 10 * 1000, // 10 seconds

  /** Open orders update when user places/cancels */
  ORDERS: 10 * 1000, // 10 seconds

  /** User balance updates after deposits/withdrawals/trades */
  BALANCE: 20 * 1000, // 20 seconds

  /** Markets list changes slowly */
  MARKETS: 60 * 1000, // 60 seconds

  /** Market details are static */
  MARKET_DETAIL: 5 * 60 * 1000, // 5 minutes

  /** Tags/categories don't change often */
  TAGS: 30 * 60 * 1000, // 30 minutes
} as const;

// ============= Garbage Collection Times =============

export const CACHE_GARBAGE_COLLECTION_TIMES = {
  ORDER_BOOK: 1 * 60 * 1000, // 1 minute
  MARKET_PRICES: 1 * 60 * 1000, // 1 minute
  PRICE_HISTORY: 5 * 60 * 1000, // 5 minutes
  POSITIONS: 2 * 60 * 1000, // 2 minutes
  TRADES: 2 * 60 * 1000, // 2 minutes
  ORDERS: 2 * 60 * 1000, // 2 minutes
  BALANCE: 2 * 60 * 1000, // 2 minutes
  MARKETS: 10 * 60 * 1000, // 10 minutes
  MARKET_DETAIL: 15 * 60 * 1000, // 15 minutes
  TAGS: 60 * 60 * 1000, // 60 minutes
} as const;

// ============= Auto-Refetch Intervals =============

export const REFETCH_INTERVALS = {
  /** Real-time order book updates */
  ORDER_BOOK: 10 * 1000, // 10 seconds

  /** Real-time trade updates */
  TRADES: 15 * 1000, // 15 seconds

  /** Real-time market prices */
  MARKET_PRICES: 10 * 1000, // 10 seconds

  /** User positions updates */
  POSITIONS: 20 * 1000, // 20 seconds

  /** User balance updates */
  BALANCE: 20 * 1000, // 20 seconds
} as const;

// ============= UI Defaults =============

export const UI_DEFAULTS = {
  /** Default order book depth levels to display */
  ORDER_BOOK_LEVELS: 10,

  /** Default number of trades to show */
  TRADES_LIMIT: 20,

  /** Default number of positions to show */
  POSITIONS_LIMIT: 50,

  /** Default number of orders to show */
  ORDERS_LIMIT: 20,

  /** Markets per page in infinite scroll */
  MARKETS_PAGE_SIZE: 20,

  /** Default price decimal places */
  PRICE_DECIMALS: 3,

  /** Default size decimal places */
  SIZE_DECIMALS: 2,

  /** Default percentage decimal places */
  PERCENT_DECIMALS: 2,
} as const;

// ============= API Limits =============

export const API_LIMITS = {
  /** Maximum markets to fetch per request */
  MAX_MARKETS_LIMIT: 100,

  /** Maximum positions to fetch per request */
  MAX_POSITIONS_LIMIT: 100,

  /** Maximum trades to fetch per request */
  MAX_TRADES_LIMIT: 100,

  /** Maximum order book depth */
  MAX_ORDERBOOK_LEVELS: 50,

  /** Minimum order size in USDC */
  MIN_ORDER_SIZE: 0.01,

  /** Maximum order size in USDC */
  MAX_ORDER_SIZE: 100000,
} as const;

// ============= Timeouts =============

export const TIMEOUTS = {
  /** Default API request timeout */
  API_REQUEST: 30 * 1000, // 30 seconds

  /** WebSocket connection timeout */
  WEBSOCKET: 10 * 1000, // 10 seconds

  /** Wallet connection timeout */
  WALLET_CONNECT: 15 * 1000, // 15 seconds

  /** Trading session initialization timeout */
  TRADING_SESSION: 30 * 1000, // 30 seconds

  /** Safe wallet deployment timeout */
  SAFE_DEPLOYMENT: 120 * 1000, // 2 minutes
} as const;

// ============= Price Formatting =============

export const PRICE_FORMAT = {
  /** Display prices as cents (0-100) */
  CENTS: 100,

  /** Price display precision */
  PRECISION: 2,
} as const;

// ============= Error Messages =============

export const ERROR_MESSAGES = {
  NETWORK: "Network error. Please check your connection.",
  TIMEOUT: "Request timeout. Please try again.",
  WALLET_NOT_CONNECTED: "Please connect your wallet first.",
  INSUFFICIENT_BALANCE: "Insufficient balance for this trade.",
  INVALID_ORDER: "Invalid order parameters.",
  ORDER_NOT_FOUND: "Order not found.",
  MARKET_NOT_FOUND: "Market not found.",
  SIGN_MESSAGE_FAILED: "Failed to sign message. Please try again.",
  DEPLOYMENT_FAILED: "Safe wallet deployment failed.",
  ORDER_CREATION_FAILED: "Failed to create order.",
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
} as const;

// ============= Success Messages =============

export const SUCCESS_MESSAGES = {
  ORDER_CREATED: "Order created successfully!",
  ORDER_CANCELLED: "Order cancelled successfully!",
  TRADING_SESSION_INITIALIZED: "Trading session initialized!",
  WALLET_DEPLOYED: "Safe wallet deployed successfully!",
  WALLET_CONNECTED: "Wallet connected successfully!",
} as const;

// ============= Validation Constraints =============

export const VALIDATION = {
  /** Valid price range */
  PRICE_MIN: 0.01,
  PRICE_MAX: 0.99,

  /** Valid order size range */
  SIZE_MIN: 0.01,
  SIZE_MAX: 1000000,

  /** Maximum search query length */
  SEARCH_MAX_LENGTH: 100,

  /** Maximum market results to display */
  SEARCH_MAX_RESULTS: 1000,
} as const;

export default {
  CACHE_TIMES,
  CACHE_GARBAGE_COLLECTION_TIMES,
  REFETCH_INTERVALS,
  UI_DEFAULTS,
  API_LIMITS,
  TIMEOUTS,
  PRICE_FORMAT,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION,
} as const;

// ============= Formatting Constants =============

export const FORMAT = {
  /** Address display format */
  ADDRESS_START_CHARS: 6,
  ADDRESS_END_CHARS: 4,

  /** Clipboard feedback timeout */
  CLIPBOARD_TIMEOUT: 2000, // 2 seconds
} as const;

// ============= WebSocket Constants =============

export const WEBSOCKET = {
  /** Reconnection delay */
  RECONNECT_DELAY: 5000, // 5 seconds

  /** Maximum number of recent trades to keep */
  MAX_RECENT_TRADES: 100,

  /** Order book depth levels */
  ORDER_BOOK_LEVELS: 10,
} as const;
