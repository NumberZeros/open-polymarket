# Trading Service Test Scripts

Scripts để test ClobTradingService trước khi integrate vào UI.

## Setup

1. **Install dependencies** (nếu chưa có):
```bash
pnpm install
```

2. **Configure environment variables** trong `.env.local`:
```bash
# Required: Builder credentials (server-side)
POLY_BUILDER_API_KEY=your_builder_key
POLY_BUILDER_SECRET=your_builder_secret
POLY_BUILDER_PASSPHRASE=your_builder_passphrase

# Required: Test wallet private key
TEST_WALLET_PRIVATE_KEY=0x...

# Optional: Polygon RPC
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com

# Optional: Safe wallet address (if using proxy)
TEST_SAFE_ADDRESS=0x...
```

3. **Ensure wallet has USDC on Polygon**:
   - Minimum $1 USDC (test order size)
   - Must approve USDC spending first (use deposit flow in app)

## Run Test

```bash
# Run test script
npx ts-node scripts/test-trading-service.ts

# Or with tsx (faster)
npx tsx scripts/test-trading-service.ts
```

## Test Flow

Script will:

1. ✅ Connect wallet to Polygon
2. ✅ Check Builder configuration
3. ✅ Initialize ClobTradingService
4. ✅ Check USDC balance and allowance
5. ✅ Get market data (order book, prices)
6. ✅ Estimate trade with slippage
7. ⏸️ Skip order placement (safety - uncomment to enable)
8. ✅ List open orders

## Safety Features

- **Order placement is COMMENTED OUT by default**
- Test only uses $1 minimum order size
- Validates balance before attempting orders
- Clear warnings before any real transactions
- Option to cancel test orders immediately

## Enable Order Placement

To actually place test orders, edit `test-trading-service.ts` and uncomment this section:

```typescript
// Uncomment to actually place order:
/*
console.log('\n🚀 Placing order...');
const result = await service.createOrder({
  tokenId: TEST_CONFIG.TOKEN_ID,
  side: TEST_CONFIG.SIDE,
  price: TEST_CONFIG.PRICE,
  size: TEST_CONFIG.SIZE,
});
...
*/
```

## Test Scenarios

### 1. Read-Only Mode (No Polymarket Account)
```bash
# Script will detect and show market data only
# Prompts user to create Polymarket account
```

### 2. Full Trading (With Polymarket Account)
```bash
# Script will attempt full flow
# Uncomment order placement to test trades
```

### 3. Safe Wallet Testing
```bash
# Set TEST_SAFE_ADDRESS in .env.local
# Script will use POLY_PROXY signature type
```

## Troubleshooting

### "Trading not available"
- Go to https://polymarket.com
- Connect wallet and create account
- Run script again

### "Insufficient balance"
- Bridge USDC to Polygon
- Minimum $1 required

### "No USDC allowance"
- Use deposit flow in app to approve USDC
- Or manually approve CTF Exchange contract

### "Failed to get order book"
- Check TOKEN_ID is correct
- Verify market exists on Polymarket

## Find Token IDs

1. Go to https://polymarket.com
2. Open any market
3. Open browser dev tools → Network tab
4. Look for API calls to `/markets/...`
5. Find `token_id` in response

Or use Polymarket API:
```bash
curl https://gamma-api.polymarket.com/markets
```

## Production Checklist

Before using in production:

- [ ] Test with small amounts ($1-5)
- [ ] Verify Builder headers are sent
- [ ] Test EOA wallet
- [ ] Test Safe wallet (if applicable)
- [ ] Test order cancellation
- [ ] Monitor orders in Polymarket dashboard
- [ ] Check Builder attribution in dashboard

## Next Steps

After successful testing:

1. Integrate `useTradingService()` hook in UI components
2. Add order placement UI
3. Add order management dashboard
4. Monitor production usage
5. Iterate based on feedback
