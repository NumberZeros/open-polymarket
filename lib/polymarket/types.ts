/**
 * Polymarket Type Definitions
 */

// ============= Market Types =============

export interface Market {
  // IDs and identifiers (Gamma API uses camelCase)
  id: string;
  conditionId?: string;  // Gamma API format
  condition_id?: string;  // CLOB API format (backwards compat)
  slug?: string;         // URL slug for navigation
  market_slug?: string;  // Alternative slug
  
  // Market content
  question: string;
  description?: string;
  outcomes?: string[];
  
  // Dates (Gamma API uses camelCase)
  endDateIso?: string;
  end_date_iso?: string;  // Backwards compat
  startDate?: string;
  gameStartTime?: string;
  game_start_time?: string;
  secondsDelay?: number;
  seconds_delay?: number;
  
  // Pricing and tokens
  tokens?: MarketToken[] | null;  // Can be null from Gamma API
  outcomePrices?: string; // JSON string of prices
  outcomes_prices?: string;
  bestBid?: number;
  bestAsk?: number;
  lastTradePrice?: number;
  
  // Order parameters
  minimumOrderSize?: string;
  minimum_order_size?: string;
  minimumTickSize?: string;
  minimum_tick_size?: string;
  orderMinSize?: number;
  orderPriceMinTickSize?: number;
  
  // Rewards
  rewards?: MarketRewards;
  
  // Status
  active: boolean;
  closed: boolean;
  archived: boolean;
  acceptingOrders?: boolean;
  accepting_orders?: boolean;
  acceptingOrdersTimestamp?: string;
  accepting_order_timestamp?: string;
  
  // Negative risk
  negRisk?: boolean;
  neg_risk?: boolean;
  negRiskMarketId?: string;
  neg_risk_market_id?: string;
  negRiskRequestId?: string;
  neg_risk_request_id?: string;
  
  // Media
  icon?: string;
  image?: string;
  banner?: string;
  
  // Volume and liquidity
  volume?: string;
  volumeNum?: number;
  volume24hr?: string;
  volume1wk?: string;
  volume1mo?: string;
  volume1yr?: string;
  liquidity?: number | string;
  liquidityNum?: number;
  liquidityClob?: number | string;
  
  // Display
  featured?: boolean;
  competitive?: number;
  
  // From events
  eventTitle?: string;
  eventSlug?: string;
  eventId?: string;
  ticker?: string;
  clobTokenIds?: string[];
  spread?: number;
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
  code?: string;
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
  market: Market | string;
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
