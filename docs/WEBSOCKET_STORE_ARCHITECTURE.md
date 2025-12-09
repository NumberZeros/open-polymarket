# WebSocket Architecture - Store vs Hook Pattern

## Vấn đề ban đầu

Khi implement WebSocket, có 2 approaches chính:

### 1. **Hook Pattern** (Ban đầu)
```typescript
// useMarketWebSocket.ts
export function useLivePrice(assetId: string) {
  const [price, setPrice] = useState(null);
  // Each component creates own subscription
}
```

**Pros:**
- ✅ Simple, clean separation
- ✅ Component-level control

**Cons:**
- ❌ Multiple WebSocket connections
- ❌ Duplicate subscriptions
- ❌ No data sharing between components

### 2. **Store Pattern** (Centralized)
```typescript
// websocketStore.ts
export const useWebSocketStore = create((set, get) => ({
  prices: new Map(),
  // Single source of truth
}))
```

**Pros:**
- ✅ Single WebSocket connection
- ✅ Shared data across app
- ✅ Centralized state management

**Cons:**
- ❌ Potential over-rendering
- ❌ Tight coupling

## Solution: Hybrid Approach ✅

Kết hợp ưu điểm của cả 2 patterns!

### Architecture

```
┌─────────────────────────────────────────────────┐
│           Root Layout / App                     │
│  ┌───────────────────────────────────────────┐  │
│  │      WebSocketProvider                    │  │
│  │  • Initialize WebSocket connection        │  │
│  │  • Setup global message handlers          │  │
│  │  • Update websocketStore                  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      │
                      ├── Single WebSocket Connection
                      │
                      ▼
         ┌────────────────────────┐
         │   websocketStore.ts    │
         │  (Zustand Store)       │
         │  • prices: Map         │
         │  • orderBooks: Map     │
         │  • trades: Array       │
         │  • subscriptions: Set  │
         └────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│  PriceChart     │       │  OrderBook      │
│                 │       │                 │
│ useLivePrice()  │       │ useLiveBook()   │
│ ↓               │       │ ↓               │
│ Auto-subscribe  │       │ Auto-subscribe  │
│ Auto-cleanup    │       │ Auto-cleanup    │
└─────────────────┘       └─────────────────┘
```

### Key Components

#### 1. **websocketStore.ts** - Centralized state
```typescript
export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  prices: new Map(),
  orderBooks: new Map(),
  
  updatePrice: (assetId, update) => {
    // Update store, trigger re-renders only for subscribers
  },
  
  subscribePrices: (assetIds) => {
    // Manage subscriptions, avoid duplicates
  }
}))
```

**Benefits:**
- Single source of truth
- Efficient subscription management
- No duplicate WebSocket connections

#### 2. **WebSocketProvider** - Initialization
```typescript
export function WebSocketProvider({ children }) {
  useEffect(() => {
    const client = getWebSocketClient();
    
    // Setup global handlers
    client.onMessage((message) => {
      // Update store based on message type
    });
    
    // Connect once
    client.connect();
  }, []);
  
  return <>{children}</>;
}
```

**Benefits:**
- Initialize once at app level
- Automatic cleanup on unmount
- Graceful error handling

#### 3. **Selector Hooks** - Component API
```typescript
export function useLivePrice(assetId: string) {
  // Select only the price for this specific asset
  const price = useWebSocketStore(state => 
    state.prices.get(assetId)
  );
  
  // Auto-subscribe on mount
  useEffect(() => {
    subscribePrices([assetId]);
    return () => unsubscribePrices([assetId]);
  }, [assetId]);
  
  return price;
}
```

**Benefits:**
- Clean component API
- Auto-subscribe/unsubscribe
- Only re-renders when specific data changes

## Usage

### 1. Add WebSocketProvider to root layout

```typescript
// app/layout.tsx
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </body>
    </html>
  );
}
```

### 2. Use hooks in components

```typescript
// components/PriceChart.tsx
import { useLivePrice } from "@/stores/websocketStore";

export function PriceChart({ tokenId }) {
  const priceUpdate = useLivePrice(tokenId);
  
  // priceUpdate contains: { asset_id, price, timestamp }
  // Automatically subscribes on mount, unsubscribes on unmount
  // Only re-renders when THIS specific asset's price changes
  
  return <div>{priceUpdate?.price}</div>;
}
```

```typescript
// components/OrderBook.tsx
import { useLiveOrderBook } from "@/stores/websocketStore";

export function OrderBook({ tokenId }) {
  const book = useLiveOrderBook(tokenId);
  
  // book contains: { asset_id, bids, asks, timestamp }
  
  return <div>...</div>;
}
```

## Performance Benefits

### Before (Hook Pattern)
```
Component A: useLivePrice("asset1") → WebSocket connection #1
Component B: useLivePrice("asset1") → WebSocket connection #2 (duplicate!)
Component C: useLivePrice("asset2") → WebSocket connection #3
```
- **3 WebSocket connections**
- **Duplicate subscriptions**
- **Wasted resources**

### After (Store Pattern)
```
WebSocketProvider → Single WebSocket connection
├── Component A: useLivePrice("asset1") → Subscribe once
├── Component B: useLivePrice("asset1") → Reuse subscription
└── Component C: useLivePrice("asset2") → Subscribe once

Total: 1 connection, 2 unique subscriptions
```
- **1 WebSocket connection**
- **No duplicates** - managed by store
- **Efficient resource usage**

## Re-render Optimization

Zustand's selector pattern ensures minimal re-renders:

```typescript
// ❌ Bad: Will re-render on ANY price update
const allPrices = useWebSocketStore(state => state.prices);

// ✅ Good: Only re-renders when THIS asset's price changes
const price = useWebSocketStore(state => state.prices.get(assetId));

// ✅ Even better: Use provided hook
const price = useLivePrice(assetId);
```

## Migration Path

### Old code (useMarketWebSocket.ts):
```typescript
const liveBook = useLiveOrderBook(tokenId);
```

### New code (websocketStore.ts):
```typescript
import { useLiveOrderBook } from "@/stores/websocketStore";
const liveBook = useLiveOrderBook(tokenId);
```

**Same API, better performance!** 🚀

## Backward Compatibility

The old `useMarketWebSocket.ts` can still work alongside the new store:
- Old components continue to work
- New components use the store
- Migrate gradually, no breaking changes

## Summary

### What we achieved:

1. ✅ **Single WebSocket connection** across entire app
2. ✅ **Centralized state management** with Zustand
3. ✅ **Auto-subscription management** - no duplicates
4. ✅ **Minimal re-renders** - only when specific data changes
5. ✅ **Clean component API** - simple hooks
6. ✅ **Graceful fallback** - works without WebSocket
7. ✅ **Better performance** - efficient resource usage
8. ✅ **Easy testing** - centralized mock points

### Best practices:

- ✅ Initialize WebSocket at root level (WebSocketProvider)
- ✅ Use selector hooks in components (useLivePrice, useLiveOrderBook)
- ✅ Never access store directly, always use hooks
- ✅ Let hooks handle subscription lifecycle
- ✅ Store only stores data, not business logic
- ✅ Keep WebSocket logic separate from UI logic

This hybrid approach gives us the best of both worlds! 🎉
