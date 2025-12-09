# Migration Guide: Using ClobTradingService

This guide shows how to migrate from the old trading pattern to the new `ClobTradingService` singleton.

## Overview

The new architecture provides:
- ✅ Singleton service pattern for better state management
- ✅ Centralized Builder configuration with `BuilderConfigManager`
- ✅ Advanced order types (GTC, FOK, IOC, GTD)
- ✅ Order management (update, detailed info, grouping)
- ✅ Trade estimation with order book depth analysis
- ✅ Position balance queries
- ✅ Read-only mode (market data access without trading credentials)
- ✅ Better error handling and validation

## Quick Start

### 1. Initialize the Service

```typescript
import { getClobTradingService } from '@/lib/polymarket';
import { useEthersWallet } from '@/lib/polymarket/ethersWallet';

// Get wallet
const { wallet, address } = useEthersWallet();

// Get service instance
const tradingService = getClobTradingService();

// Initialize with signer (will auto-derive Trading API credentials)
const success = await tradingService.initializeWithSigner(
  wallet,
  address,
  safeAddress // Optional: for Safe wallet trading
);

if (success) {
  console.log('Trading service ready!');
  console.log('Status:', tradingService.getStatus());
}
```

### 2. Place Orders

#### Basic Order (GTC)
```typescript
const result = await tradingService.createOrder({
  tokenId: 'token_id_here',
  side: 'buy', // or 'sell'
  price: 0.65,
  size: 10, // USDC amount
});

if (result.success) {
  console.log('Order placed:', result.orderId);
} else {
  console.error('Order failed:', result.error);
}
```

#### Advanced Order Types
```typescript
// Fill-Or-Kill (must fill immediately or cancel)
await tradingService.createFOKOrder(tokenId, 'buy', 0.65, 10);

// Good-Til-Date (expires at specific time)
const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
await tradingService.createGTDOrder(tokenId, 'buy', 0.65, 10, expirationDate);
```

### 3. Manage Orders

```typescript
// Get open orders
const orders = await tradingService.getOpenOrders();
const marketOrders = await tradingService.getOpenOrders('market_id');

// Get order details
const orderInfo = await tradingService.getOrderDetails(orderId);

// Update order (cancel + recreate with new params)
const updated = await tradingService.updateOrder(orderId, {
  price: 0.70,
  size: 15
});

// Cancel orders
await tradingService.cancelOrder(orderId);
await tradingService.cancelAllOrders(); // Cancel all
await tradingService.cancelAllOrders(marketId); // Cancel for specific market

// Get orders grouped by market
const ordersByMarket = await tradingService.getOrdersByMarket();
```

### 4. Market Data & Estimation

```typescript
// Get order book
const orderBook = await tradingService.getOrderBook(tokenId);

// Get current market price
const price = await tradingService.getMarketPrice(tokenId);
console.log('Best bid:', price.bestBid);
console.log('Best ask:', price.bestAsk);
console.log('Mid price:', price.midPrice);
console.log('Spread:', price.spread);

// Simple estimation
const buyEstimate = tradingService.estimateBuyOrder(0.65, 10);
console.log('Shares:', buyEstimate.shares);
console.log('Potential profit:', buyEstimate.potentialProfit);

// Advanced estimation with order book (includes slippage)
const estimate = await tradingService.estimateWithOrderBook(
  tokenId,
  'buy',
  10 // USDC amount
);
console.log('Average price:', estimate.avgPrice);
console.log('Slippage:', estimate.slippage, '%');
```

### 5. Balance & Positions

```typescript
// Get USDC balance
const balance = await tradingService.getBalanceAllowance();
console.log('Balance:', balance.balance);
console.log('Has allowance:', balance.hasAllowance);

// Get position balance for specific token
const position = await tradingService.getPositionBalance(tokenId);
console.log('Position balance:', position.balance);

// Refresh balance after deposit/trade
await tradingService.refreshBalance();
```

### 6. Service Status

```typescript
const status = tradingService.getStatus();

console.log('Is ready:', status.isReady);
console.log('Can trade:', status.canTrade);
console.log('Can read market data:', status.canReadMarketData);
console.log('Read-only mode:', status.readOnlyMode);
console.log('Builder mode:', status.builderMode);
console.log('Wallet address:', status.walletAddress);
```

## Migration Examples

### Old Pattern (tradingClient.ts)
```typescript
// OLD - Don't use this anymore
import { createTradingClient, deriveOrCreateApiKey } from '@/lib/polymarket/tradingClient';

const creds = await deriveOrCreateApiKey(wallet);
const client = createTradingClient(wallet, creds, safeAddress);
```

### New Pattern (clobTradingService.ts)
```typescript
// NEW - Use this
import { getClobTradingService } from '@/lib/polymarket';

const service = getClobTradingService();
await service.initializeWithSigner(wallet, address, safeAddress);
// Service handles credential derivation internally
```

## Safe Wallet Support

The service automatically detects and handles Safe (Proxy) wallets:

```typescript
// Regular EOA wallet
await service.initializeWithSigner(wallet, address);
// Uses SignatureType.EOA

// Safe wallet (proxy)
await service.initializeWithSigner(wallet, eoaAddress, safeAddress);
// Uses SignatureType.POLY_PROXY

// Update Safe address later (after deployment)
await service.updateFunderAddress(safeAddress);
// Switches to POLY_PROXY signature type
```

## Error Handling

```typescript
// Check if trading is available
if (!tradingService.hasTradingCapability()) {
  console.error('Trading not available');
  console.log('User needs to create Polymarket account first');
  
  // Try to retry credential derivation (after Safe deployment)
  const success = await tradingService.retryApiKeyDerivation();
  if (success) {
    console.log('Trading now enabled!');
  }
}

// Order validation
const result = await tradingService.createOrder({
  tokenId,
  side: 'buy',
  price: 0.65,
  size: 0.5 // Too small!
});

if (!result.success) {
  console.error(result.error); // "Order value must be at least $1"
}
```

## Read-Only Mode

Even without Trading API credentials, you can still access market data:

```typescript
const service = getClobTradingService();
await service.initializeWithSigner(wallet, address);

const status = service.getStatus();
if (status.readOnlyMode) {
  console.log('Read-only mode - can view markets but not trade');
  
  // These work without credentials
  const orderBook = await service.getOrderBook(tokenId);
  const price = await service.getMarketPrice(tokenId);
  const estimate = await service.estimateWithOrderBook(tokenId, 'buy', 10);
  
  // These require credentials
  // const result = await service.createOrder(...); // Will fail
}
```

## Builder Configuration

The `BuilderConfigManager` handles Builder Program credentials automatically:

```typescript
import { getBuilderConfigManager } from '@/lib/polymarket';

const builderManager = getBuilderConfigManager();

console.log('Builder ready:', builderManager.isReady());
console.log('Signing mode:', builderManager.getSigningMode()); // 'remote' | 'local' | 'none'
console.log('Remote URL:', builderManager.getRemoteSigningUrl());

// Builder config is automatically injected into ClobClient
const config = builderManager.getConfig();
```

## Environment Variables

Make sure these are set in your `.env.local`:

```bash
# Required for Builder Program (server-side only)
POLY_BUILDER_API_KEY=your_key
POLY_BUILDER_SECRET=your_secret
POLY_BUILDER_PASSPHRASE=your_passphrase

# Optional: Use custom RPC
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com

# Optional: Override signing server URL (defaults to /api/builder/sign)
# NEXT_PUBLIC_POLY_SIGNING_SERVER_URL=https://your-server.com/sign
```

## Best Practices

1. **Use Singleton Pattern**: Always get instance via `getClobTradingService()`
2. **Check Status**: Verify `hasTradingCapability()` before placing orders
3. **Handle Errors**: Check `result.success` and `result.error` for all operations
4. **Validate Orders**: Minimum order value is $1 (enforced by service)
5. **Refresh Balance**: Call `refreshBalance()` after deposits/trades
6. **Use Advanced Estimation**: Call `estimateWithOrderBook()` for accurate slippage
7. **Safe Wallet**: Call `updateFunderAddress()` after Safe deployment

## Troubleshooting

### "Trading not available" Error
- User needs to create a Polymarket account first at https://polymarket.com
- After account creation, call `retryApiKeyDerivation()`

### Orders Failing with "Invalid Signature"
- Check if Builder credentials are set correctly
- Verify `/api/builder/sign` endpoint is working
- Check if Safe address is correct (for proxy wallets)

### "Order value must be at least $1"
- Polymarket requires minimum order value of $1
- Increase size or price to meet minimum

## Support

For issues or questions:
- Check the implementation in `lib/polymarket/clobTradingService.ts`
- Review Builder docs: https://docs.polymarket.com/developers/builders
- Check CLOB docs: https://docs.polymarket.com/developers/CLOB
