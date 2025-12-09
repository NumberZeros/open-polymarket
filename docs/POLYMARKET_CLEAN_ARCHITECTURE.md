# Polymarket Integration - Clean Architecture

## Overview

This implementation follows Polymarket's official documentation for Builder Order Attribution with remote signing.

**Documentation Reference:**
- [Order Attribution](https://docs.polymarket.com/developers/builders/order-attribution)
- [Builder Signing Server](https://docs.polymarket.com/developers/builders/builder-signing-server)

## Architecture

### 1. Server-Side (NextJS API Routes)

**`/app/api/builder/sign/route.ts`**
- Implements remote signing endpoint for Builder Attribution
- Uses `@polymarket/builder-signing-sdk` to sign requests
- Builder API credentials stay secure on server (never sent to client)
- Returns `BuilderHeaderPayload` with HMAC signature

**Environment Variables Required:**
```env
POLY_BUILDER_API_KEY=your_builder_key
POLY_BUILDER_SECRET=your_builder_secret
POLY_BUILDER_PASSPHRASE=your_builder_passphrase
```

### 2. Client-Side Trading

**`/lib/polymarket/tradingClient.ts`**
- Wraps `@polymarket/clob-client` with Builder configuration
- Uses `BuilderConfig` with `remoteBuilderConfig` pointing to `/api/builder/sign`
- All order signing happens automatically via SDK:
  1. User signs order with wallet (EIP-712)
  2. ClobClient adds L2 auth headers (user's API credentials)
  3. SDK calls `/api/builder/sign` to add Builder attribution headers
  4. Complete order posted to CLOB

**Key Functions:**
- `deriveOrCreateApiKey(signer)` - One-time credential setup
- `createTradingClient(signer, credentials, safeAddress)` - Initialize client
- `placeOrder(client, params)` - Place order with automatic signing
- `getOpenOrders(client)` - Fetch user's orders
- `getPositions(client)` - Fetch user's positions
- `cancelOrder(client, orderId)` - Cancel order

### 3. State Management

**`/stores/polymarketStore.ts`**
- Clean Zustand store following Polymarket flow
- Persists: address, safeAddress, approvals, credentials
- Does NOT persist: tradingClient (recreated on page load)

**Store Actions:**
- `connect(address)` - Connect wallet
- `deploySafeWallet(signer, signTypedData)` - Deploy Proxy Wallet
- `setupTrading(signer)` - Derive API credentials (one-time)
- `initializeTradingClient(signer)` - Create ClobClient instance
- `createOrder(params)` - Place order
- `cancelUserOrder(orderId)` - Cancel order
- `refreshData()` - Refresh balances/positions/orders

### 4. Trading Setup Page

**`/app/trading-setup/page.tsx`**
- Centralized one-time setup flow
- Three steps:
  1. **Deploy Safe** - Create Proxy Wallet
  2. **Approve Tokens** - USDC + CTF approvals
  3. **Create Credentials** - Derive API keys

After setup, user can trade on `/markets` page.

## Trading Flow

### One-Time Setup
1. User connects wallet
2. Deploys Safe (Proxy Wallet) if needed
3. Approves USDC + CTF tokens for trading contracts
4. Derives API credentials (stored locally)

### Placing Orders
1. User selects market and enters order details
2. Client calls `store.createOrder(params)`
3. Store uses `tradingClient.createAndPostOrder()`
4. ClobClient SDK handles:
   - Order validation
   - EIP-712 signing with user's wallet
   - L2 auth headers (HMAC with user's API secret)
   - Calls `/api/builder/sign` for Builder headers
   - Posts complete order to CLOB
5. Order appears in user's open orders

## Security Model

### User Credentials (API Key/Secret)
- Derived once per wallet using `ClobClient.createOrDeriveApiKey()`
- Stored in browser localStorage (encrypted by SDK)
- Never sent to our server
- Used client-side for L2 authentication (HMAC signing)

### Builder Credentials
- Stored in server environment variables
- Never exposed to client
- Used only by `/api/builder/sign` endpoint
- Added to orders via remote signing

### Separation of Concerns
- **User signs orders** - User's wallet signs the actual order (EIP-712)
- **User authenticates** - User's API credentials prove ownership
- **Builder attributes** - Our builder credentials track orders to our platform

## Key Differences from Previous Implementation

### Before (Broken)
- ❌ Manual signature generation
- ❌ Server-side order signing with user's private key
- ❌ Complex credential storage on server
- ❌ Multiple redundant API routes
- ❌ Duplicate logic across pages

### After (Clean)
- ✅ SDK handles all signing automatically
- ✅ User signs their own orders (client-side)
- ✅ Builder attribution via remote signing
- ✅ Single centralized setup page
- ✅ Minimal API surface (1 endpoint)
- ✅ Follows Polymarket's official patterns

## Files Removed

The following old files can be safely deleted:
- `/app/api/auth/derive-api-key/route.ts` (not needed - SDK handles this)
- `/app/api/auth/credentials-status/route.ts` (credentials stored client-side)
- `/app/api/trading/create-order/route.ts` (orders signed client-side)
- `/app/api/trading/cancel-order/route.ts` (SDK handles cancellation)
- `/app/api/trading/cancel-orders/route.ts` (SDK handles cancellation)
- `/app/api/sign/route.ts` (replaced by `/app/api/builder/sign/route.ts`)
- `/lib/polymarket/tradingApi.ts` (replaced by `tradingClient.ts`)
- `/lib/server/credentialsStore.ts` (no longer needed)

## Testing

1. **Setup Flow:**
   ```bash
   # Go to /trading-setup
   # Complete all 3 steps
   # Should redirect to /markets when done
   ```

2. **Order Placement:**
   ```bash
   # Go to /markets
   # Select a market
   # Place an order
   # Check browser console for "[Trading Client]" logs
   ```

3. **Builder Attribution:**
   ```bash
   # Check server logs for "[Builder Sign]" messages
   # Verify orders appear with your builder ID on Polymarket
   ```

## Environment Setup

Add to `.env.local`:
```env
# Builder API Credentials (from Polymarket)
POLY_BUILDER_API_KEY=your_key_here
POLY_BUILDER_SECRET=your_secret_here
POLY_BUILDER_PASSPHRASE=your_passphrase_here
```

## Dependencies

```json
{
  "@polymarket/builder-signing-sdk": "^0.0.8",
  "@polymarket/clob-client": "^4.22.8",
  "@polymarket/order-utils": "^3.0.1"
}
```

## References

- [Polymarket CLOB Client](https://github.com/Polymarket/clob-client)
- [Builder Signing SDK](https://github.com/Polymarket/builder-signing-sdk)
- [Builder Signing Server](https://github.com/Polymarket/builder-signing-server)
- [Order Attribution Docs](https://docs.polymarket.com/developers/builders/order-attribution)
