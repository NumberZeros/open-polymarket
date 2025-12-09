# Migration Guide - Old to New Architecture

## Summary of Changes

This refactor follows Polymarket's official Builder Order Attribution documentation, simplifying the codebase and removing server-side complexity.

## What Changed

### 1. Removed Files

```
app/api/auth/
├── derive-api-key/route.ts          ❌ Removed (SDK handles this)
└── credentials-status/route.ts      ❌ Removed (not needed)

app/api/trading/
├── create-order/route.ts            ❌ Removed (client-side now)
├── cancel-order/route.ts            ❌ Removed (SDK handles this)
└── cancel-orders/route.ts           ❌ Removed (SDK handles this)

app/api/sign/route.ts                 ❌ Removed (replaced by builder/sign)

lib/polymarket/tradingApi.ts          ❌ Removed (replaced by tradingClient.ts)
lib/server/credentialsStore.ts        ❌ Removed (no server storage needed)
```

### 2. New Files

```
app/api/builder/
└── sign/route.ts                     ✅ Builder signing endpoint (remote signing)

lib/polymarket/
└── tradingClient.ts                  ✅ Clean SDK wrapper

stores/
└── polymarketStore.ts                ✅ Simplified state management

docs/
└── POLYMARKET_CLEAN_ARCHITECTURE.md  ✅ Architecture documentation
```

### 3. Modified Files

```
package.json                          ✅ Added @polymarket/builder-signing-sdk
app/trading-setup/page.tsx           ✅ Centralized setup flow
```

## Key Architectural Changes

### Before: Server-Side Order Signing (Wrong ❌)

```
Client → Server → Sign Order → CLOB
         ↑
         User's Private Key (DANGEROUS!)
```

**Problems:**
- Server needed user's private key or credentials
- Complex credential storage on server
- Security risk (server compromise = user funds at risk)
- Not following Polymarket's patterns

### After: Client-Side Signing with Builder Attribution (Correct ✅)

```
Client → User Signs Order → SDK adds headers → CLOB
                              ↑
                              Builder Server (attribution only)
```

**Benefits:**
- User's keys never leave client
- Server only signs attribution headers (not orders)
- Follows Polymarket's official flow
- SDK handles all complexity
- Simpler codebase

## API Changes

### Old API (Removed)

```typescript
// ❌ POST /api/auth/derive-api-key
// Body: { address, signature, timestamp, nonce }
// Response: { success, hasCredentials }

// ❌ GET /api/auth/credentials-status?address=0x...
// Response: { hasCredentials, expiresAt }

// ❌ POST /api/trading/create-order
// Body: { address, order, signature }
// Response: { orderId }
```

### New API (Simplified)

```typescript
// ✅ POST /api/builder/sign
// Body: { method, path, body }
// Response: { POLY_BUILDER_API_KEY, POLY_BUILDER_TIMESTAMP, POLY_BUILDER_PASSPHRASE, POLY_BUILDER_SIGNATURE }

// That's it! Just one endpoint.
```

## Store Changes

### Old Store API

```typescript
// ❌ Complex server interaction
store.deriveCredentials(ethersWallet)
  → POST /api/auth/derive-api-key
  → Server stores credentials
  → Client gets confirmation

// ❌ Server-side order placement
store.placeOrder(params)
  → POST /api/trading/create-order
  → Server signs order
  → Server posts to CLOB
```

### New Store API

```typescript
// ✅ Simple SDK usage
store.setupTrading(signer)
  → ClobClient.createOrDeriveApiKey()
  → Credentials stored in localStorage (SDK handles encryption)

// ✅ Client-side order placement
store.createOrder(params)
  → ClobClient.createAndPostOrder()
  → SDK signs order with user's wallet
  → SDK calls /api/builder/sign for attribution
  → SDK posts to CLOB
```

## Usage Changes

### Before: Multiple Setup Locations

```typescript
// ❌ Approvals in one page
// ❌ Credentials in another page  
// ❌ Scattered setup logic
```

### After: Centralized Setup

```typescript
// ✅ Everything in /trading-setup page
1. Deploy Safe
2. Approve Tokens
3. Create Credentials
→ Done! Go to /markets
```

## Security Improvements

### Before

| What | Where | Risk |
|------|-------|------|
| User API Key | Server memory | Medium - server breach = credential leak |
| User API Secret | Server memory | **HIGH** - can sign orders on user's behalf |
| User Passphrase | Server memory | Medium - needed for auth |
| Builder Credentials | Server ENV | Low - only for attribution |

### After

| What | Where | Risk |
|------|-------|------|
| User API Key | Client localStorage | Low - encrypted by SDK |
| User API Secret | Client localStorage | Low - encrypted by SDK, never sent to server |
| User Passphrase | Client localStorage | Low - encrypted by SDK |
| Builder Credentials | Server ENV | Low - only for attribution |

**Key Improvement:** User credentials never touch our server = zero risk of server-side compromise affecting user funds.

## Code Comparison

### Placing an Order

#### Before (Complex ❌)

```typescript
// Client generates signature
const signature = await signer.signMessage(orderData);

// Send to server
const response = await fetch('/api/trading/create-order', {
  method: 'POST',
  body: JSON.stringify({
    address,
    order,
    signature,
  }),
});

// Server-side (route.ts)
const credentials = getStoredCredentials(address);
const client = new ClobClient(..., credentials);
const hmacSig = buildHmacSignature(credentials.secret, ...);
const headers = { ...hmacHeaders };
await fetch('https://clob.polymarket.com/order', { headers, body: order });
```

#### After (Simple ✅)

```typescript
// Client has ClobClient instance
const client = store.tradingClient;

// Place order - SDK does everything
const response = await client.createAndPostOrder({
  tokenID: tokenId,
  price,
  side: Side.BUY,
  size: amount,
});

// Behind the scenes (automatic):
// 1. SDK signs order with user's wallet
// 2. SDK adds L2 auth headers (user's API creds)
// 3. SDK calls /api/builder/sign for attribution
// 4. SDK posts to CLOB
```

**Lines of code:** 50+ → 5 lines

## Migration Steps

If you're updating an existing deployment:

1. **Install new dependency:**
   ```bash
   pnpm install @polymarket/builder-signing-sdk
   ```

2. **Add environment variables:**
   ```env
   POLY_BUILDER_API_KEY=...
   POLY_BUILDER_SECRET=...
   POLY_BUILDER_PASSPHRASE=...
   ```

3. **Deploy changes:**
   ```bash
   git pull
   pnpm install
   pnpm build
   ```

4. **Users need to re-setup:**
   - Old credentials on server are discarded
   - Users visit `/trading-setup` to create new credentials
   - New credentials stored client-side (one-time setup)

5. **Clean up (optional):**
   ```bash
   # Remove old backup files
   rm stores/polymarketStore.old.ts
   rm app/trading-setup/page.old.tsx
   ```

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Security** | Medium (server stores secrets) | High (client-side only) |
| **Complexity** | High (6 API routes) | Low (1 API route) |
| **Maintainability** | Hard (custom signing logic) | Easy (SDK handles it) |
| **Correctness** | Wrong pattern | Follows official docs |
| **Code Lines** | ~1000+ lines | ~400 lines |

## Troubleshooting

### "Trading client not initialized"
→ User needs to complete `/trading-setup` flow

### "Invalid signature"  
→ Check Builder credentials in `.env.local`

### Orders not attributed to builder
→ Verify `/api/builder/sign` endpoint is working (check logs)

### Credentials expired
→ Not possible anymore - credentials valid indefinitely

## Questions?

Refer to:
- [Clean Architecture Doc](./POLYMARKET_CLEAN_ARCHITECTURE.md)
- [Polymarket Docs](https://docs.polymarket.com/developers/builders/order-attribution)
- Console logs prefixed with `[Trading Client]` or `[Builder Sign]`
