# Portfolio Data Loading Debug Guide

## 🔍 How to Debug

### 1. Open Browser Console (F12)

### 2. Check These Console Logs:

#### **Initial Mount:**
```
[Portfolio] Mount effect triggered: { isMounted, canTrade, safeAddress }
```

**Expected:**
- `isMounted: true`
- `canTrade: true` 
- `safeAddress: "0x..."` (40 chars hex address)

#### **Refresh Balances Called:**
```
[Portfolio] refreshBalances called with: { 
  canTrade, hasWallet, isConnected, isWalletConnected, 
  isTradingSessionComplete, hasClobClient, safeAddress 
}
```

**Expected all TRUE and safeAddress present**

#### **Data Fetch Started:**
```
[Portfolio] Starting data fetch, safeAddress: 0x...
```

#### **Orders Response:**
```
[Portfolio] Raw orders received: 2
[Portfolio] Transformed orders: [...]
```

#### **Positions Response:**
```
[Portfolio] Fetching positions from: https://data-api.polymarket.com/positions?user=0x...
[Portfolio] Positions response status: 200
[Portfolio] Raw positions received: 5
[Portfolio] Transformed positions: [...]
```

#### **Final Result:**
```
[Portfolio] Successfully loaded: { orders: 2, positions: 5, balance: 100 }
```

---

## ❌ Common Issues & Solutions

### Issue 1: `canTrade: false`
**Cause:** Trading session not complete
**Solution:** 
1. Go to `/wallet` page
2. Complete wallet setup
3. Wait for Safe deployment

### Issue 2: `safeAddress: undefined`
**Cause:** Safe address not derived yet
**Solution:**
1. Check `derivedSafeAddressFromEoa` in TradingProvider
2. Make sure wallet is connected
3. Check Safe deployment hook

### Issue 3: `Trading service not ready`
**Cause:** CLOB client not initialized
**Solution:**
1. Check `clobClient` is not null
2. Check `isTradingSessionComplete: true`
3. Review trading session logs

### Issue 4: API returns 401/403
**Cause:** Authentication failure
**Solution:**
1. Check Builder API credentials
2. Verify Trading API key derivation
3. Check CLOB client initialization with credentials

### Issue 5: API returns empty array but status 200
**Cause:** User has no positions/orders/trades
**Solution:** 
- Place some orders first
- Check if using correct Safe address
- Verify user parameter in API URL

### Issue 6: `positions.length = 0` but API returned data
**Cause:** Data transformation error or state not updating
**Solution:**
1. Check "Transformed positions" log
2. Verify `setPositions()` is called
3. Check React state updates

---

## 🧪 Quick Test

Run this in browser console:
```javascript
// Get Safe address
const { safeAddress } = window.__NEXT_DATA__.props.pageProps;
console.log('Safe Address:', safeAddress);

// Test positions API directly
fetch(`https://data-api.polymarket.com/positions?user=${safeAddress}&limit=100`)
  .then(r => r.json())
  .then(data => console.log('Positions API:', data));

// Test orders API (requires auth)
// This will show if authentication is the issue
```

---

## 📊 Expected Network Calls

In Network tab, you should see:

1. **GET** `polygon-rpc.com` - Blockchain RPC calls
2. **GET** `data-api.polymarket.com/positions?user=0x...`
3. **GET** `clob.polymarket.com/...` - Orders from CLOB API
4. **GET** `data-api.polymarket.com/trades?user=0x...&limit=100`

---

## ✅ Success Indicators

You know it's working when:

1. ✅ Console shows: "Successfully loaded: { orders: X, positions: Y, balance: Z }"
2. ✅ Network tab shows 200 OK responses
3. ✅ UI displays data in tables
4. ✅ No error messages in console
5. ✅ Balance shows correct amount

---

## 🚨 Critical Checklist

Before debugging, verify:

- [ ] Wallet connected (check address in header)
- [ ] Trading session complete (check Trading Setup page)
- [ ] Safe wallet deployed (check wallet page)
- [ ] USDC balance > 0 (if expecting balance)
- [ ] Have placed orders/trades (if expecting those)
- [ ] Browser console open to see logs
- [ ] Network tab open to see API calls
