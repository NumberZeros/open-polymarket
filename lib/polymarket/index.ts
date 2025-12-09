/**
 * Polymarket Library - Main Export
 */

// Config
export * from "./config";

// Types
export * from "./types";

// Market API (public data)
export * from "./marketApi";

// Trading Services (NEW - Recommended)
// Note: ClobTradingService and types.ts have some overlapping types
// We export the service class and helper functions explicitly to avoid conflicts
export { 
  ClobTradingService, 
  getClobTradingService,
  type OrderBookData,
  type MarketPrice,
  type TradeEstimate,
  type TradingStatus,
  type TradingCredentials,
  Side,
  OrderType
} from "./clobTradingService";

export {
  BuilderConfigManager,
  getBuilderConfigManager,
  isBuilderConfigured,
  getBuilderConfig,
  type BuilderCredentials,
  type RemoteSigningConfig,
  type SigningMode,
  type BuilderConfigOptions
} from "./builderConfig";

// Relayer API (Safe wallet deployment)
export * from "./relayerApi";

// Proxy Wallet (Safe) utilities & execution
export * from "./proxyWallet";

// Deposit service (approvals)
export * from "./depositService";
