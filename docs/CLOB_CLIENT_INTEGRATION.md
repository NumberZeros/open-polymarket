# Polymarket CLOB Client Integration

## Overview

Successfully integrated official `@polymarket/clob-client` package to replace custom authentication implementation. This ensures proper order signing with EIP-712 and full compatibility with Polymarket's CLOB API.

## What Changed

### 1. **Package Installation**
- ✅ Installed `@polymarket/clob-client@5.0.0`
- ✅ Installed `@polymarket/order-utils@7.8.1`

### 2. **lib/polymarket/tradingApi.ts** - Complete Refactor
**Before**: Custom L2 authentication with client-side HMAC signing
**After**: Official ClobClient for all trading operations

Key changes:
- `createClobClient()` - Factory function to create configured ClobClient instance
- `createOrder()` - Uses `client.createAndPostOrder()` with automatic EIP-712 signing
- `cancelOrder()` - Uses `client.cancelOrder()`
- `cancelAllOrders()` - Uses `client.cancelAll()`
- `getOpenOrders()` - Uses `client.getOpenOrders()`
- `getTradeHistory()` - Uses `client.getTrades()`
- `getBalance()` - Uses `client.getBalanceAllowance()`
- `getPositions()` - Uses `client.getOpenOrders()` (positions are open orders)

All functions now accept `ClobClient` instance instead of `(wallet, credentials)` parameters.

### 3. **stores/polymarketStore.ts** - Updated State Management
- Added `clobClient: ClobClient | null` to state
- Updated `deriveCredentials()` to create ClobClient after getting L2 credentials
- Updated `placeOrder()` to use `clobClient`
- Updated `cancelUserOrder()` to use `clobClient`
- Updated `refreshBalances()` to use `clobClient`

### 4. **lib/polymarket/walletAdapter.ts** - NEW Utility
Created adapter to convert Viem WalletClient to Ethers Wallet format.

**Why needed**: ClobClient requires Ethers V5 Wallet, but wagmi uses Viem WalletClient.

**Solution**: `viemToEthersWallet()` creates Ethers-compatible wrapper implementing:
- `address`
- `_signTypedData()` (maps to viem's signTypedData)
- `signMessage()`
- `provider` (JsonRpcProvider for Polygon)

## What Still Needs to Be Done

### Critical: Update UI Components

All components calling `deriveCredentials()` need to pass an Ethers wallet:

#### 1. **app/trading-setup/page.tsx**
```typescript
import { useWalletClient } from "wagmi";
import { viemToEthersWallet } from "@/lib/polymarket/walletAdapter";

// Inside component:
const { data: walletClient } = useWalletClient();

const handleDeriveCredentials = async () => {
  if (!walletClient) {
    console.error("Wallet not connected");
    return;
  }

  // Convert Viem to Ethers
  const ethersWallet = viemToEthersWallet(walletClient);

  // Pass both signTypedData and ethersWallet
  await polymarketStore.deriveCredentials(
    async (domain, types, value) => {
      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: Object.keys(types).find(k => k !== "EIP712Domain"),
        message: value,
      });
      return signature;
    },
    ethersWallet // NEW: Pass Ethers wallet
  );
};
```

#### 2. **components/trading/PositionsPanel.tsx**
Remove direct API calls - they should go through the store now:
```typescript
// BEFORE:
const orders = await getOpenOrders(safeAddress, credentials);

// AFTER:
const { openOrders } = usePolymarketStore();
// Data automatically updated by store.refreshBalances()
```

### Optional Improvements

#### 1. Builder Attribution (Server-Side Signing)
The `app/api/sign/route.ts` endpoint is ready, but ClobClient needs Builder configuration:

```typescript
// In createClobClient():
import type { BuilderConfig } from "@polymarket/builder-signing-sdk";

const builderConfig: BuilderConfig = {
  url: "/api/sign", // Our Next.js API route
};

const client = new ClobClient(
  POLYMARKET_API.CLOB,
  137,
  signer,
  creds,
  SignatureType.EOA,
  funderAddress,
  undefined, // geoBlockToken
  false, // useServerTime
  builderConfig // Add builder config
);
```

#### 2. Error Handling & Type Safety
- Convert ClobClient types to match our custom types (Trade, Order, Position)
- Add proper error handling for network failures
- Implement retry logic for failed orders

#### 3. Advanced Order Types
ClobClient supports more order types:
- `createAndPostMarketOrder()` - Market orders (FOK/FAK)
- `postOrders()` - Batch order posting
- `cancelMarketOrders()` - Cancel by market ID

## Testing Checklist

- [ ] Update trading-setup page to pass Ethers wallet
- [ ] Test L2 credential derivation
- [ ] Test ClobClient initialization
- [ ] Test order creation with EIP-712 signing
- [ ] Test order cancellation
- [ ] Test balance/position fetching
- [ ] Verify Builder attribution headers sent
- [ ] Test with real Polygon funds (small amounts!)

## Architecture Notes

### Authentication Flow (Simplified)
1. **User connects wallet** (wagmi/viem)
2. **Derive L2 credentials** 
   - Sign EIP-712 message with wallet
   - POST to `/api/polymarket/derive` → Polymarket CLOB API
   - Receive `{apiKey, secret, passphrase}`
3. **Create ClobClient**
   - Convert Viem wallet to Ethers format
   - Instantiate ClobClient with credentials
   - Store in Zustand state
4. **Place orders**
   - ClobClient builds order object
   - Signs with EIP-712 (using Ethers wallet)
   - POSTs to CLOB API with L2 headers
   - Builder headers added automatically (if configured)

### Why EIP-712 Signing?
Orders on Polymarket are signed messages that can be:
- Posted to CLOB (centralized order book)
- Settled on-chain (when matched)

EIP-712 provides:
- Human-readable signature prompts
- Type safety
- Replay protection
- Standard format for DEXes

### Builder Attribution
Builder credentials are SEPARATE from user credentials:
- **User credentials**: Authenticate the user (required)
- **Builder credentials**: Attribute orders to your platform (optional, for revenue share)

Both sets of headers are sent with orders, but generated separately:
- User: Client-side signing with user's wallet
- Builder: Server-side signing with platform's secret (secure)

## Troubleshooting

### "ClobClient not initialized"
**Cause**: `deriveCredentials()` called without ethersWallet parameter
**Fix**: Pass Ethers wallet to `deriveCredentials(signTypedData, ethersWallet)`

### "Signer must be an Ethers Wallet"
**Cause**: Trying to pass Viem WalletClient directly to ClobClient
**Fix**: Use `viemToEthersWallet()` adapter first

### Orders fail with "Invalid signature"
**Cause**: Order signing not working correctly
**Debug**: 
- Check ethersWallet._signTypedData() works
- Verify wallet has correct address
- Check network is Polygon (chainId: 137)

### "Cannot read property 'orders' of undefined"
**Cause**: ClobClient methods return different format than expected
**Fix**: Add type assertions in tradingApi.ts functions

## References

- [Polymarket CLOB Client Docs](https://docs.polymarket.com/developers/CLOB/clients/ts-clob-client)
- [Create Order Docs](https://docs.polymarket.com/developers/CLOB/orders/create-order)
- [ClobClient GitHub](https://github.com/Polymarket/clob-client)
- [EIP-712 Spec](https://eips.ethereum.org/EIPS/eip-712)
