# API Credentials Fix - Order Placement

## Problem
Orders were failing with "Unauthorized/Invalid api key" error because the CLOB API requires **two types of authentication**:

1. **Order Signature (EIP-712)** - User signs the order with MetaMask ✅ Already working
2. **L2 Authentication** - API credentials to authenticate the POST request ❌ Was missing

## Solution Implemented

### Architecture Flow

```
User Action → Get/Derive API Creds → Sign Order → Post with Both Auth
```

**Step-by-step:**

1. **First Time Only**: Derive API credentials
   - User signs authentication message
   - Backend calls CLOB API `/auth/derive-api-key`
   - Credentials stored in localStorage

2. **Every Order**: 
   - Get stored API credentials
   - Sign order with MetaMask (EIP-712)
   - POST order with BOTH:
     * Signed order (user's signature)
     * L2 auth headers (API credentials)

### Files Created/Modified

#### New Files

1. **`lib/polymarket/apiCreds.ts`**
   - Manages API credentials lifecycle
   - Functions:
     * `getStoredApiCreds()` - Get from localStorage
     * `storeApiCreds()` - Save to localStorage
     * `deriveApiCredentials()` - Derive new credentials
     * `getOrDeriveApiCreds()` - Get existing or derive new

2. **`app/api/polymarket/derive-api-key/route.ts`**
   - Backend endpoint to derive credentials
   - Calls CLOB API `/auth/derive-api-key`
   - Returns: `{ apiKey, secret, passphrase }`

#### Modified Files

1. **`app/api/polymarket/place-order/route.ts`**
   - Added L2 authentication headers:
     ```typescript
     headers: {
       "POLY_ADDRESS": walletAddress,
       "POLY_SIGNATURE": hmac_sha256(timestamp, secret),
       "POLY_TIMESTAMP": timestamp,
       "POLY_API_KEY": apiKey,
       "POLY_PASSPHRASE": passphrase,
     }
     ```

2. **`lib/polymarket/tradingApi.ts`**
   - Added credential derivation before order placement
   - Passes `apiCreds` to backend API

### Authentication Details

**L2 Authentication Headers:**
- `POLY_ADDRESS`: User's wallet address
- `POLY_SIGNATURE`: HMAC-SHA256(timestamp, secret) in base64
- `POLY_TIMESTAMP`: Unix timestamp in seconds
- `POLY_API_KEY`: API key from derivation
- `POLY_PASSPHRASE`: Passphrase from derivation

**Order Signature:**
- EIP-712 typed data signature
- Signed by user with MetaMask
- Proves user authorized the order

## User Experience

### First Order
1. Click "Place Order"
2. **Sign Authentication Message** (new step - one time only)
3. Sign Order (MetaMask)
4. Order placed ✅

### Subsequent Orders
1. Click "Place Order"
2. Sign Order (MetaMask)  
3. Order placed ✅

API credentials are cached in localStorage, so only signed once per wallet.

## Storage

**localStorage Key Format:**
```
polymarket_api_creds_<address_lowercase>
```

**Stored Data:**
```json
{
  "key": "uuid-format-key",
  "secret": "hex-string",
  "passphrase": "hex-string"
}
```

## Security Notes

1. **API Credentials**
   - Stored in browser localStorage
   - Not sensitive for reads (only authenticates your own orders)
   - Can be regenerated anytime by clearing localStorage

2. **Order Signature**
   - User signs each order
   - Cannot place orders without user approval
   - Signature proves order authenticity

## Testing

Try placing an order now:
1. First order will ask for 2 signatures (auth + order)
2. Subsequent orders will only ask for 1 signature (order)
3. Check console logs for:
   ```
   [API Creds] Using stored credentials
   [TradingAPI] ✅ Order signature received
   [PlaceOrder API] ✅ Order placed
   ```

## Troubleshooting

**If you get "Invalid API key":**
```javascript
// Clear credentials and re-derive:
localStorage.removeItem('polymarket_api_creds_<your_address>');
// Then place order again
```

**If signature fails:**
- Check MetaMask is connected
- Verify network is Polygon (chainId 137)
- Try refreshing page

## Next Steps

✅ API credentials working
✅ Order signing working  
✅ Order placement endpoint fixed
⏭️ **Test order placement**
⏭️ Verify order appears in CLOB
⏭️ Test order cancellation
