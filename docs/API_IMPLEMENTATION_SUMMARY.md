# API Implementation Summary

## ✅ Compliance with Polymarket Documentation

This implementation follows the official Polymarket Gamma Markets API documentation:
https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client    │────▶│  Internal Proxy  │────▶│  Polymarket API │
│  /Server    │     │  /api/polymarket │     │  (Gamma/CLOB)   │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

**Benefits:**
- ✅ No CORS issues
- ✅ Centralized builder attribution
- ✅ Consistent error handling
- ✅ Type-safe interfaces

---

## Three Official Fetching Strategies

### 1. By Slug (Individual Markets) ⭐

**When:** You have a market URL/slug  
**Performance:** Best (direct lookup)

```typescript
// Extract from URL: polymarket.com/event/fed-decision-in-october
const event = await getEventBySlug('fed-decision-in-october');
const market = await getMarketBySlug('market-slug');
```

**Endpoints:**
- `/api/polymarket/gamma/events/slug/{slug}`
- `/api/polymarket/gamma/markets/slug/{slug}`

---

### 2. By Tags (Category Filtering) 🏷️

**When:** Filter by sport, politics, crypto, etc.  
**Performance:** Good (indexed by tags)

```typescript
// Get available tags
const tags = await getTags();
const sportsTags = await getSportsTags();

// Filter markets
const sportsMarkets = await getMarketsByTag({
  tag_id: '100381',
  closed: false,
  limit: 50,
});
```

**Endpoints:**
- `/api/polymarket/gamma/tags`
- `/api/polymarket/gamma/sports`
- `/api/polymarket/gamma/events?tag_id={id}`

---

### 3. Via Events (All Active Markets) 📊

**When:** Browse/discover all markets  
**Performance:** Most efficient for bulk data

```typescript
// Recommended approach (events contain markets)
const events = await getEvents({
  order: 'id',
  ascending: false,
  closed: false,
  limit: 100,
  offset: 0,
});

// Extract markets
const markets = events.flatMap(e => e.markets);
```

**Endpoint:**
```
/api/polymarket/gamma/events?order=id&ascending=false&closed=false&limit=100
```

---

## API Structure

### Gamma API (Market Metadata)
**Purpose:** Market discovery, event info, filtering  
**Base:** `https://gamma-api.polymarket.com`  
**Proxy:** `/api/polymarket/gamma/*`

**Key Endpoints:**
- `/events` - List events (contains markets)
- `/events/slug/{slug}` - Get specific event
- `/markets` - List markets
- `/markets/slug/{slug}` - Get specific market
- `/tags` - Get filtering tags
- `/sports` - Get sports metadata

### CLOB API (Trading Data)
**Purpose:** Real-time prices, orderbooks, trading  
**Base:** `https://clob.polymarket.com`  
**Proxy:** `/api/polymarket/clob/*`

**Key Endpoints:**
- `/book?token_id={id}` - Get orderbook
- `/markets/{condition_id}` - Get market data
- `/trades` - Get trade history
- `/prices-history` - Get price history

---

## Library Functions

### Market Discovery
```typescript
getEvents()           // All events (contains markets)
getMarkets()          // All markets (via events internally)
getSamplingMarkets()  // Featured markets
getMarketsByTag()     // Filter by category
```

### Direct Lookup
```typescript
getEvent(id)          // By event ID
getEventBySlug(slug)  // By event slug (best)
getMarket(id)         // By condition ID
getMarketBySlug(slug) // By market slug (best)
```

### Tags
```typescript
getTags()             // All tags
getSportsTags()       // Sports categories
```

### Trading Data
```typescript
getOrderBook(tokenId)         // Live orderbook
getLastTradePrice(tokenId)    // Latest price
getPriceHistory(params)       // Historical prices
getMarketTrades(params)       // Trade history
```

---

## Best Practices

### ✅ DO

```typescript
// Use slug when available (fastest)
const event = await getEventBySlug(slug);

// Filter closed markets
const events = await getEvents({ closed: false });

// Use events over markets (more efficient)
const events = await getEvents();

// Implement pagination
const page1 = await getEvents({ limit: 50, offset: 0 });
const page2 = await getEvents({ limit: 50, offset: 50 });
```

### ❌ DON'T

```typescript
// Don't fetch all without filtering
const all = await getEvents({ closed: true }); // Includes historical

// Don't use markets directly if you need events
const markets = await getMarkets(); // Less efficient than getEvents()

// Don't fetch without pagination
const everything = await getEvents({ limit: 10000 }); // Too large
```

---

## Key Files

### API Routes
```
/app/api/polymarket/
├── [...path]/route.ts       # Main proxy (handles all Polymarket APIs)
├── markets/route.ts         # Convenience wrapper
├── sign-and-create-order/   # Trading endpoints
├── cancel-order/
└── clob/                    # CLOB-specific endpoints
```

### Library
```
/lib/polymarket/
├── marketApi.ts             # Market fetching functions
├── types.ts                 # TypeScript types
├── config.ts                # API configuration
└── index.ts                 # Main export
```

### Documentation
```
/docs/
├── API_ROUTING_GUIDE.md     # Complete guide (this file)
└── (other docs)
```

---

## Example Usage

### Home Page (Browse Markets)
```typescript
export default async function HomePage() {
  // Get latest active events
  const events = await getEvents({
    order: 'id',
    ascending: false,
    closed: false,
    limit: 50,
  });

  // Extract markets
  const markets = events.flatMap(event => 
    event.markets.map(m => ({
      ...m,
      eventTitle: event.title,
      eventSlug: event.slug,
    }))
  );

  return <MarketsList markets={markets} />;
}
```

### Market Detail Page (Specific Market)
```typescript
export default async function MarketPage({ params }) {
  const { slug } = await params;
  
  // Direct lookup by slug (best performance)
  const event = await getEventBySlug(slug);
  
  if (!event) {
    notFound();
  }

  // Get real-time prices
  const market = event.markets[0];
  const orderbook = await getOrderBook(market.tokens[0].token_id);

  return <MarketDetail event={event} orderbook={orderbook} />;
}
```

### Sports Category Page (Filter by Tag)
```typescript
export default async function SportsPage() {
  // Get sports categories
  const sportsTags = await getSportsTags();

  // Filter markets
  const markets = await getMarketsByTag({
    tag_id: sportsTags.basketball.id,
    closed: false,
    limit: 100,
  });

  return <SportsMarkets markets={markets} />;
}
```

---

## Compliance Checklist

- ✅ Uses Gamma API for market discovery (official recommendation)
- ✅ Implements all three fetching strategies (slug, tags, events)
- ✅ Events endpoint preferred over markets (more efficient)
- ✅ Proper pagination support (limit/offset)
- ✅ Filters closed markets by default
- ✅ Slug-based lookup for known markets (best performance)
- ✅ Tag filtering for category browsing
- ✅ Internal proxy for CORS and attribution
- ✅ Type-safe TypeScript interfaces
- ✅ Comprehensive error handling
- ✅ Follows official endpoint structure
- ✅ Complete documentation with examples

---

## Testing

```bash
# Start dev server
pnpm dev

# Test endpoints
curl http://localhost:3000/api/polymarket/gamma/events?closed=false&limit=10
curl http://localhost:3000/api/polymarket/gamma/events/slug/fed-decision-in-october
curl http://localhost:3000/api/polymarket/gamma/tags
curl http://localhost:3000/api/polymarket/markets?limit=50
```

---

## References

- **Official Guide:** https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
- **API Reference:** https://docs.polymarket.com/api-reference
- **Complete Guide:** `/docs/API_ROUTING_GUIDE.md`

---

**Status:** ✅ Fully compliant with official Polymarket documentation
**Last Updated:** 2025-12-09
