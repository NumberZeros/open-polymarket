/**
 * Polymarket Type Definitions
 */

// ============= Market Types =============

export interface Market {
  id: string;
  condition_id: string;
  question_id: string;
  question: string;
  description?: string;
  market_slug?: string;
  end_date_iso?: string;
  game_start_time?: string;
  seconds_delay?: number;
  minimum_order_size: string;
  minimum_tick_size: string;
  tokens: MarketToken[];
  rewards?: MarketRewards;
  active: boolean;
  closed: boolean;
  archived: boolean;
  accepting_orders: boolean;
  accepting_order_timestamp?: string;
  neg_risk: boolean;
  neg_risk_market_id?: string;
  neg_risk_request_id?: string;
  icon?: string;
  image?: string;
  // Price info
  outcomePrices?: string; // JSON string of prices
  volume?: string;
  volume24hr?: string;
}

export interface MarketToken {
  token_id: string;
  outcome: string;
  price?: number;
  winner?: boolean;
}

export interface MarketRewards {
  rates: RewardRate[];
  min_size: string;
  max_spread: string;
}

export interface RewardRate {
  asset_address: string;
  rewards_daily_rate: string;
}

// ============= Event Types =============

export interface Event {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  creation_date?: string;
  resolution_date?: string;
  markets: Market[];
  tags?: string[];
  featured?: boolean;
  banner?: string;
  icon?: string;
}

// ============= Order Types =============

export type Side = "BUY" | "SELL";
export type OrderType = "GTC" | "GTD" | "FOK" | "IOC";

export interface OrderParams {
  tokenId: string;
  side: Side;
  price: number; // 0.01 to 0.99
  size: number; // in USDC
  orderType?: OrderType;
  expiration?: number; // Unix timestamp for GTD orders
}

export interface Order {
  id: string;
  owner: string;
  market: string;
  asset_id: string;
  side: Side;
  original_size: string;
  size_matched: string;
  price: string;
  type: OrderType;
  timestamp: string;
  outcome?: string;
  status?: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  status?: string;
  error?: string;
  orderDetails?: {
    side: string;
    price: number;
    size: number;
    tokenId: string;
  };
}

// ============= Order Book Types =============

export interface OrderBookLevel {
  price: string;
  size: string;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  market: string;
  asset_id: string;
  timestamp: string;
  hash?: string;
}

export interface MarketPrice {
  tokenId: string;
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spread: number;
}

// ============= Trade Types =============

export interface Trade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: Side;
  size: string;
  fee_rate_bps: string;
  price: string;
  status: string;
  match_time: string;
  last_update: string;
  outcome?: string;
  maker_address?: string;
  trader_side?: Side;
  transaction_hash?: string;
  bucket_index?: string;
  type?: string;
}

// ============= Position Types =============

export interface Position {
  asset: string;
  condition_id: string;
  market: Market;
  outcome: string;
  price: number;
  size: number;
  value: number;
  avgPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
}

// ============= Balance Types =============

export interface Balance {
  usdc: number;
  positions: Position[];
}

// ============= Trading Estimate Types =============

export interface TradeEstimate {
  cost: number;
  shares: number;
  avgPrice: number;
  slippage: number;
  potentialReturn: number;
  potentialProfit: number;
}

// ============= API Response Types =============

export interface PaginatedResponse<T> {
  data: T[];
  next_cursor?: string;
  limit?: number;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
}

// ============= Trading Status =============

export interface TradingStatus {
  isReady: boolean;
  hasWallet: boolean;
  hasCreds: boolean;
  canTrade: boolean;
  canReadMarketData: boolean;
  isBuilder: boolean;
  builderMode: string;
  walletAddress?: string;
  safeAddress?: string;
  readOnlyMode?: boolean;
}

// ============= Signing Types =============

export interface SigningRequest {
  method: string;
  path: string;
  body?: string;
  timestamp?: number;
}

export interface SigningResponse {
  signature: string;
  timestamp: number;
}
