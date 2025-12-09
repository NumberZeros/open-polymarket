# Polymarket API Routing Guide

Complete guide to API routing structure following official Polymarket documentation.

**Official Documentation:** https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide

---

## Architecture Overview

```
Client/Server → Internal Proxy → Polymarket APIs
                (/api/polymarket)
```

All requests go through internal proxy to:
- Avoid CORS issues
- Add builder attribution headers
- Centralize error handling
- Provide consistent interface

---

## API Types

### 1. Gamma API (Market Metadata)
**Base:** `https://gamma-api.polymarket.com`  
**Proxy:** `/api/polymarket/gamma/{path}`

**Purpose:**
- Market discovery and metadata
- Event information
- Category/tag filtering
- General market information

**Best For:**
- Browsing markets
- Filtering by category
- Getting market details
- Market discovery

### 2. CLOB API (Trading Data)
**Base:** `https://clob.polymarket.com`  
**Proxy:** `/api/polymarket/clob/{path}`

**Purpose:**
- Real-time orderbook data
- Trade execution
- Live market prices
- Trading operations

**Best For:**
- Placing orders
- Getting live prices
- Viewing orderbooks
- Trade history

### 3. Data API (Historical)
**Base:** `https://data-api.polymarket.com`  
**Proxy:** `/api/polymarket/data/{path}`

**Purpose:**
- Historical market data
- Price history
- Volume analytics

### 4. Relayer API (Gasless Transactions)
**Base:** `https://relayer-v2.polymarket.com`  
**Proxy:** `/api/polymarket/relayer/{path}`

**Purpose:**
- Safe wallet deployment
- Gasless transaction relay

---

## Three Fetching Strategies

Per official documentation, there are 3 recommended approaches:

### Strategy 1: By Slug ⭐ (Best for Individual Markets)

**Use Case:** When you have a market URL/slug

**Extract Slug from URL:**
```
https://polymarket.com/event/fed-decision-in-october?tid=123
                               ↑
                  Slug: fed-decision-in-october
```

**Endpoints:**
- Events: `/api/polymarket/gamma/events/slug/{slug}`
- Markets: `/api/polymarket/gamma/markets/slug/{slug}`

**Library Functions:**
```typescript
import { getEventBySlug, getMarketBySlug } from '@/lib/polymarket';

// Get event with all markets
const event = await getEventBySlug('fed-decision-in-october');

// Get single market
const market = await getMarketBySlug('market-slug-here');
```

**Best Performance:** Use this when you know the slug!

---

### Strategy 2: By Tags 🏷️ (Best for Category Filtering)

**Use Case:** Filter markets by sport, category, or topic

**Step 1: Get Available Tags**
```typescript
import { getTags, getSportsTags } from '@/lib/polymarket';

// General tags (politics, crypto, etc.)
const tags = await getTags();

// Sports-specific tags with metadata
const sportsTags = await getSportsTags();
```

**Step 2: Filter Markets by Tag**
```typescript
import { getMarketsByTag } from '@/lib/polymarket';

// Get markets for specific tag
const sportsMarkets = await getMarketsByTag({
  tag_id: '100381',
  closed: false,
  limit: 50,
});
```

**Endpoints:**
- Get tags: `/api/polymarket/gamma/tags`
- Get sports tags: `/api/polymarket/gamma/sports`
- Filter events: `/api/polymarket/gamma/events?tag_id={id}`
- Filter markets: `/api/polymarket/gamma/markets?tag_id={id}`

**Advanced Filtering:**
```typescript
// Include related tags
getMarketsByTag({
  tag_id: '100381',
  related_tags: true,
});

// Exclude specific tag
getMarketsByTag({
  tag_id: '100381',
  exclude_tag_id: '999',
});
```

---

### Strategy 3: Via Events 📊 (Best for All Active Markets)

**Use Case:** Discover all available active markets

**Why Events Over Markets?**
- More efficient (events contain markets)
- Recommended by official docs
- Better for pagination

**Get All Active Markets:**
```typescript
import { getEvents, getMarkets } from '@/lib/polymarket';

// Recommended: Get events (contains markets)
const events = await getEvents({
  order: 'id',           // Order by ID
  ascending: false,      // Newest first
  closed: false,         // Active only
  limit: 100,           // Page size
  offset: 0,            // Page offset
});

// Alternative: Get markets directly
const marketsResult = await getMarkets({
  limit: 100,
  closed: false,
});
```

**Endpoint:**
```
/api/polymarket/gamma/events?order=id&ascending=false&closed=false&limit=100
```

**Pagination:**
```typescript
// Page 1 (offset=0)
const page1 = await getEvents({ limit: 50, offset: 0, closed: false });

// Page 2 (offset=50)
const page2 = await getEvents({ limit: 50, offset: 50, closed: false });

// Page 3 (offset=100)
const page3 = await getEvents({ limit: 50, offset: 100, closed: false });
```

---

## API Endpoints Reference

### Gamma API (Market Metadata)

#### Events
| Endpoint | Purpose | Example |
|----------|---------|---------|
| `GET /events` | List all events | `?order=id&closed=false&limit=100` |
| `GET /events/{id}` | Get event by ID | `/events/12345` |
| `GET /events/slug/{slug}` | Get event by slug | `/events/slug/fed-decision` |

#### Markets
| Endpoint | Purpose | Example |
|----------|---------|---------|
| `GET /markets` | List all markets | `?closed=false&limit=100` |
| `GET /markets/{condition_id}` | Get market by condition ID | `/markets/0x123...` |
| `GET /markets/slug/{slug}` | Get market by slug | `/markets/slug/market-slug` |

#### Tags
| Endpoint | Purpose | Example |
|----------|---------|---------|
| `GET /tags` | Get all tags | `/tags` |
| `GET /sports` | Get sports metadata | `/sports` |

### CLOB API (Trading Data)

| Endpoint | Purpose | Example |
|----------|---------|---------|
| `GET /book` | Get orderbook | `?token_id=123` |
| `GET /markets/{condition_id}` | Get market data | `/markets/0x123...` |
| `GET /trades` | Get trade history | `?market=0x123...` |
| `GET /prices-history` | Get price history | `?market=0x123...` |

---

## Custom Endpoints

### Convenience Wrapper
**Endpoint:** `/api/polymarket/markets`

Simplified wrapper around Gamma API for easy market fetching.

**Query Parameters:**
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)
- `closed` - Include closed markets (default: false)
- `tag_id` - Filter by tag (optional)

**Response:**
```json
{
  "success": true,
  "count": 42,
  "markets": [
    {
      "id": "123",
      "conditionId": "0x...",
      "title": "Market question",
      "eventSlug": "event-slug",
      "active": true,
      "tokens": [...]
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0
  }
}
```

### Trading Endpoints
- `/api/polymarket/sign-and-create-order` - Place orders
- `/api/polymarket/cancel-order` - Cancel orders
- `/api/polymarket/derive-api-key` - Generate API credentials

---

## Library Functions Reference

### Market Functions
```typescript
// Get all markets (via events)
getMarkets(params?: { limit?, offset?, closed?, order?, ascending? }): Promise<PaginatedResponse<Market>>

// Get single market by condition ID
getMarket(conditionId: string): Promise<Market | null>

// Get market by slug (URL path)
getMarketBySlug(slug: string): Promise<Market | null>

// Get featured/sampling markets
getSamplingMarkets(): Promise<Market[]>

// Get markets by tag
getMarketsByTag(params: { tag_id, limit?, offset?, closed?, related_tags?, exclude_tag_id? }): Promise<PaginatedResponse<Market>>
```

### Event Functions
```typescript
// Get all events
getEvents(params?: { limit?, offset?, closed?, order?, ascending?, tag_id?, related_tags?, exclude_tag_id? }): Promise<Event[]>

// Get single event by ID
getEvent(eventId: string): Promise<Event | null>

// Get event by slug (URL path)
getEventBySlug(slug: string): Promise<Event | null>
```

### Tag Functions
```typescript
// Get all available tags
getTags(): Promise<any[]>

// Get sports tags with metadata
getSportsTags(): Promise<any>
```

### Trading Data Functions
```typescript
// Get orderbook for token
getOrderBook(tokenId: string): Promise<OrderBook>

// Get multiple orderbooks
getOrderBooks(tokenIds: string[]): Promise<OrderBook[]>

// Get last trade price
getLastTradePrice(tokenId: string): Promise<{ price: string }>

// Get price history
getPriceHistory(params: { market, interval?, fidelity?, startTs?, endTs? }): Promise<PricePoint[]>

// Get market trades
getMarketTrades(params: { market, limit?, offset? }): Promise<Trade[]>
```

---

## Best Practices

### 1. Choose Right Strategy
```typescript
// ✅ Known slug? Use slug method (fastest)
const event = await getEventBySlug('fed-decision-in-october');

// ✅ Category filtering? Use tags
const sportsMarkets = await getMarketsByTag({ tag_id: '100381' });

// ✅ Browse all? Use events endpoint
const allEvents = await getEvents({ closed: false, limit: 100 });
```

### 2. Always Filter Closed Markets
```typescript
// ✅ Good - Only active markets
getEvents({ closed: false });

// ❌ Bad - Includes historical (slower)
getEvents({ closed: true });
```

### 3. Implement Pagination
```typescript
// ✅ Good - Paginated
async function loadAllMarkets() {
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  while (hasMore) {
    const events = await getEvents({ limit, offset, closed: false });
    // Process events...
    
    hasMore = events.length === limit;
    offset += limit;
  }
}
```

### 4. Use Events Over Markets
```typescript
// ✅ Recommended - More efficient
const events = await getEvents({ closed: false });
events.forEach(event => {
  event.markets.forEach(market => {
    // Process market...
  });
});

// ⚠️ Less efficient - Extra calls
const { data: markets } = await getMarkets({ closed: false });
```

### 5. Respect Rate Limits
```typescript
// ✅ Good - Reasonable limits
getEvents({ limit: 100 });

// ⚠️ Careful - Large responses
getEvents({ limit: 1000 });
```

---

## Example Use Cases

### Use Case 1: Display Market Page
```typescript
// Extract slug from URL
const slug = params.slug; // "fed-decision-in-october"

// Fetch event with markets
const event = await getEventBySlug(slug);

// Get real-time prices from CLOB
const market = event.markets[0];
const orderbook = await getOrderBook(market.tokens[0].token_id);
```

### Use Case 2: Sports Markets List
```typescript
// Get sports tags
const sportsTags = await getSportsTags();

// Filter by basketball tag
const basketballMarkets = await getMarketsByTag({
  tag_id: sportsTags.basketball.id,
  closed: false,
  limit: 20,
});
```

### Use Case 3: Home Page Market Discovery
```typescript
// Get latest active markets
const events = await getEvents({
  order: 'id',
  ascending: false,
  closed: false,
  limit: 50,
});

// Extract and display markets
const allMarkets = events.flatMap(event => 
  event.markets.map(market => ({
    ...market,
    eventTitle: event.title,
    eventSlug: event.slug,
  }))
);
```

### Use Case 4: Real-Time Trading
```typescript
// Get market by condition ID
const market = await getMarket(conditionId);

// Get live orderbook
const book = await getOrderBook(market.tokens[0].token_id);

// Get recent trades
const trades = await getMarketTrades({
  market: conditionId,
  limit: 50,
});
```

---

## Error Handling

```typescript
try {
  const event = await getEventBySlug(slug);
  if (!event) {
    // 404 - Event not found
    return notFound();
  }
} catch (error) {
  if (error.message.includes('404')) {
    // Handle not found
  } else if (error.message.includes('429')) {
    // Handle rate limit
  } else {
    // Handle other errors
  }
}
```

---

## Summary

| Strategy | When to Use | Function | Endpoint |
|----------|------------|----------|----------|
| **By Slug** | Known market URL | `getEventBySlug()` | `/events/slug/{slug}` |
| **By Tags** | Category filtering | `getMarketsByTag()` | `/markets?tag_id=X` |
| **Via Events** | Browse all markets | `getEvents()` | `/events?closed=false` |

**Key Takeaways:**
1. Use internal proxy (`/api/polymarket/...`) for all requests
2. Prefer events endpoint over markets (more efficient)
3. Use slug methods when you have URLs (best performance)
4. Always filter closed markets unless you need historical data
5. Implement pagination for large datasets
6. Use Gamma API for metadata, CLOB API for trading data

---

**References:**
- [Official Fetch Markets Guide](https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide)
- [Gamma API Reference](https://docs.polymarket.com/api-reference)
- [CLOB API Documentation](https://docs.polymarket.com/api-reference/clob)
