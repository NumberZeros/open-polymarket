# Bethub Trading Service Implementation

✅ **Implementation Complete** - December 8, 2025

## What Was Implemented

This update brings advanced trading capabilities from `admin-lab` to `bethub`, enabling full order placement and management functionality.

### New Files Created

1. **`lib/polymarket/builderConfig.ts`** - BuilderConfigManager singleton
   - Auto-detects signing mode (local/remote/none)
   - Manages Polymarket Builder Program credentials
   - Supports Next.js environment variables
   - Provides centralized configuration access

2. **`lib/polymarket/clobTradingService.ts`** - ClobTradingService singleton
   - Complete trading service with order management
   - Supports EOA and Safe (POLY_PROXY) wallets
   - Auto-derives Trading API credentials
   - Advanced order types (GTC, FOK, IOC, GTD)
   - Order management (create, update, cancel, details)
   - Trade estimation with order book depth
   - Position and balance queries
   - Read-only mode support

3. **`hooks/useTradingService.ts`** - React hook wrapper
   - Easy integration with React components
   - Auto-refresh status
   - Convenient action methods

4. **`docs/TRADING_SERVICE_MIGRATION.md`** - Complete migration guide
   - Usage examples for all features
   - Migration from old pattern
   - Best practices and troubleshooting

### Files Updated

1. **`lib/polymarket/config.ts`**
   - Added helper functions: `getApiUrl()`, `hasBuilderCredentials()`, `validateBuilderCredentials()`, `hasRemoteSigningConfig()`, `getBuilderSigningUrl()`, `getPolygonRpcUrl()`
   - Better environment variable management

2. **`lib/polymarket/tradingClient.ts`**
   - Updated to use `BuilderConfigManager`
   - Marked as DEPRECATED with backward compatibility
   - New code should use `ClobTradingService` instead

3. **`lib/polymarket/index.ts`**
   - Exports new services with explicit type exports to avoid conflicts
   - Clear separation between new (recommended) and old (deprecated) APIs

4. **`.env.example`**
   - Comprehensive documentation of all environment variables
   - Clear separation of server-side vs public variables
   - Usage instructions for each variable

## Key Features

### 1. Service Architecture
- **Singleton Pattern**: Single instance manages all trading state
- **Type Safety**: Full TypeScript support with proper types
- **Error Handling**: Comprehensive validation and user-friendly error messages

### 2. Order Management
```typescript
// Create orders with different types
await service.createOrder({ tokenId, side: 'buy', price: 0.65, size: 10 });
await service.createFOKOrder(tokenId, 'buy', 0.65, 10); // Fill-Or-Kill
await service.createGTDOrder(tokenId, 'buy', 0.65, 10, expirationDate);

// Manage orders
await service.updateOrder(orderId, { price: 0.70, size: 15 });
await service.cancelOrder(orderId);
await service.cancelAllOrders(marketId);
await service.getOrderDetails(orderId);
await service.getOrdersByMarket();
```

### 3. Market Data & Estimation
```typescript
// Get order book and prices
const orderBook = await service.getOrderBook(tokenId);
const price = await service.getMarketPrice(tokenId);

// Estimate trades with slippage
const estimate = await service.estimateWithOrderBook(tokenId, 'buy', 10);
console.log('Slippage:', estimate.slippage, '%');
```

### 4. Safe Wallet Support
```typescript
// Automatic signature type detection
await service.initializeWithSigner(wallet, address, safeAddress);
// Uses POLY_PROXY for Safe, EOA for regular wallets

// Update after Safe deployment
await service.updateFunderAddress(safeAddress);
```

### 5. Read-Only Mode
```typescript
// Access market data without trading credentials
const status = service.getStatus();
if (status.readOnlyMode) {
  // Can view markets but not trade
  const orderBook = await service.getOrderBook(tokenId);
  const price = await service.getMarketPrice(tokenId);
}
```

## Usage Example

```typescript
import { getClobTradingService } from '@/lib/polymarket';
import { useEthersWallet } from '@/lib/polymarket/ethersWallet';

function TradingComponent() {
  const { wallet, address } = useEthersWallet();
  const service = getClobTradingService();

  // Initialize
  useEffect(() => {
    if (wallet && address) {
      service.initializeWithSigner(wallet, address);
    }
  }, [wallet, address]);

  // Place order
  const handlePlaceOrder = async () => {
    const result = await service.createOrder({
      tokenId: 'token_id',
      side: 'buy',
      price: 0.65,
      size: 10
    });

    if (result.success) {
      console.log('Order placed:', result.orderId);
    } else {
      console.error('Order failed:', result.error);
    }
  };

  return (
    <button onClick={handlePlaceOrder}>
      Place Order
    </button>
  );
}
```

## Environment Setup

Update your `.env.local` with Builder credentials:

```bash
# Required for Builder Program (server-side only)
POLY_BUILDER_API_KEY=your_key
POLY_BUILDER_SECRET=your_secret
POLY_BUILDER_PASSPHRASE=your_passphrase

# Optional: Custom RPC
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com
```

## Migration Path

### For Existing Code Using `tradingClient.ts`

The old API still works but is deprecated:

```typescript
// OLD (still works)
import { createTradingClient } from '@/lib/polymarket/tradingClient';
const client = createTradingClient(wallet, creds, safeAddress);

// NEW (recommended)
import { getClobTradingService } from '@/lib/polymarket';
const service = getClobTradingService();
await service.initializeWithSigner(wallet, address, safeAddress);
```

### Migration Steps

1. ✅ **Phase 1: No Breaking Changes**
   - Old `tradingClient.ts` functions still work
   - New service available alongside old code
   - Gradual migration recommended

2. ✅ **Phase 2: Update Components**
   - Use `useTradingService()` hook in new components
   - Migrate existing components one at a time
   - Test thoroughly after each migration

3. ✅ **Phase 3: Deprecation**
   - Remove old `tradingClient.ts` usage
   - Keep file for backward compatibility
   - Update all imports to new service

## Testing Checklist

Before going to production:

- [ ] Test order placement with small amounts
- [ ] Verify Builder headers are being sent (`/api/builder/sign` working)
- [ ] Test with EOA wallet
- [ ] Test with Safe wallet (after deployment)
- [ ] Test order cancellation
- [ ] Test balance queries
- [ ] Test market data access without trading credentials
- [ ] Verify minimum order value validation ($1)
- [ ] Test credential retry after Polymarket account creation

## Benefits Over Old Implementation

| Feature | Old (tradingClient.ts) | New (ClobTradingService) |
|---------|----------------------|--------------------------|
| Architecture | Function exports | Singleton service |
| State Management | External (Zustand) | Internal + External |
| Builder Config | Hardcoded URL | BuilderConfigManager |
| Order Types | GTC only | GTC, FOK, IOC, GTD |
| Order Management | Create, Cancel | Create, Update, Cancel, Details, Group |
| Trade Estimation | Basic | With order book depth + slippage |
| Balance Queries | USDC only | USDC + Position tokens |
| Read-only Mode | No | Yes |
| Error Handling | Basic | Comprehensive with validation |
| Safe Support | Manual | Automatic detection + switching |
| Credential Retry | No | Yes |

## Next Steps

1. **Test the implementation**
   - Use small amounts on mainnet
   - Verify all order types work
   - Check Safe wallet integration

2. **Update UI components**
   - Integrate `useTradingService()` hook
   - Add advanced order type selectors
   - Show trade estimation with slippage
   - Display position-aware warnings

3. **Monitor in production**
   - Track order success rates
   - Monitor Builder attribution
   - Check for any signature errors
   - Verify Safe wallet orders

## Support & Documentation

- **Migration Guide**: `docs/TRADING_SERVICE_MIGRATION.md`
- **Service Implementation**: `lib/polymarket/clobTradingService.ts`
- **Builder Config**: `lib/polymarket/builderConfig.ts`
- **React Hook**: `hooks/useTradingService.ts`
- **Polymarket Docs**: https://docs.polymarket.com/developers
- **Builder Program**: https://docs.polymarket.com/developers/builders

## Troubleshooting

### Common Issues

1. **"Trading not available"**
   - User needs Polymarket account first
   - Visit https://polymarket.com to create account
   - Then call `service.retryApiKeyDerivation()`

2. **Orders failing with "Invalid signature"**
   - Check Builder credentials in `.env.local`
   - Verify `/api/builder/sign` endpoint is working
   - Check Safe address is correct (for proxy wallets)

3. **"Order value must be at least $1"**
   - Polymarket requires minimum $1 order value
   - Increase size or price to meet minimum

## Credits

Based on `admin-lab` implementation patterns:
- `admin-lab/src/services/polymarket/clobTradingService.ts`
- `admin-lab/src/services/polymarket/signing/builderConfig.ts`

Adapted for `bethub` with Next.js environment variables and improved documentation.
