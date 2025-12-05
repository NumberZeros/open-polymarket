# BetHub - Polymarket Prediction Markets MVP

A simple prediction market application built with Next.js 16, powered by Polymarket Builder Program.

## Features

- 🔐 **Wallet Authentication** - Connect with MetaMask via RainbowKit
- 📊 **Browse Markets** - View all available prediction markets from Polymarket
- 💰 **Place Bets** - Buy/sell outcome shares on prediction markets
- 📈 **Portfolio** - Track your positions and open orders
- 💳 **Wallet Management** - Deposit/withdraw USDC.e (Polygon)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Blockchain**: Polygon Network
- **Wallet**: wagmi v2 + RainbowKit v2
- **Trading**: Polymarket CLOB API + Builder SDK
- **Styling**: Tailwind CSS v4

## Project Structure

```
bethub/
├── app/
│   ├── api/
│   │   ├── sign/route.ts          # Internal signing server
│   │   └── polymarket/[...path]/  # API proxy for CORS
│   ├── markets/[id]/              # Market detail page
│   ├── portfolio/                 # User portfolio
│   ├── wallet/                    # Wallet setup & deposits
│   └── page.tsx                   # Home - markets list
├── components/
│   ├── layout/Header.tsx
│   ├── markets/
│   │   ├── MarketCard.tsx
│   │   └── MarketsList.tsx
│   ├── providers/Web3Provider.tsx
│   └── trading/OrderForm.tsx
├── contexts/
│   └── PolymarketContext.tsx      # Trading state management
└── lib/
    ├── polymarket/
    │   ├── config.ts              # Contracts, API endpoints
    │   ├── types.ts               # TypeScript types
    │   ├── marketApi.ts           # Public market data
    │   ├── tradingApi.ts          # Authenticated trading
    │   └── relayerApi.ts          # Gasless transactions
    └── wagmi/
        └── config.ts              # Wallet configuration
```

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `POLY_BUILDER_API_KEY` - Builder API key (server-side only)
- `POLY_BUILDER_SECRET` - Builder secret (server-side only)
- `POLY_BUILDER_PASSPHRASE` - Builder passphrase (server-side only)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Get from https://cloud.walletconnect.com

### 3. Get Builder Credentials

1. Go to [Polymarket Builder Portal](https://polymarket.com/builders)
2. Create a builder account
3. Generate API credentials
4. Add them to your `.env.local` file

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage Flow

### For Users

1. **Connect Wallet** - Click "Connect Wallet" and select MetaMask
2. **Setup Trading** - Go to `/wallet` page and complete:
   - Deploy Safe Wallet (gasless)
   - Setup Approvals (gasless)
   - Derive Trading Credentials (sign message)
3. **Deposit Funds** - Send USDC.e to your Safe wallet address
4. **Trade** - Browse markets and place orders

### For Developers

#### Adding New API Endpoints

The app includes an API proxy at `/api/polymarket/[...path]` that handles:
- CORS bypass for Polymarket APIs
- Request forwarding to CLOB, Gamma, Data APIs

Example: `/api/polymarket/clob/markets` → `https://clob.polymarket.com/markets`

#### Signing Server

The built-in signing server at `/api/sign` handles Builder authentication:
- Stores credentials server-side only
- Generates HMAC signatures for API requests
- No client-side credential exposure

## Key Components

### PolymarketContext

Central state management for trading:

```tsx
const { 
  status,          // Trading readiness
  placeOrder,      // Place buy/sell order
  positions,       // Current positions
  usdcBalance,     // Available balance
  deploySafeWallet,// Deploy trading wallet
} = usePolymarket();
```

### Market APIs

```tsx
import { getMarkets, getMarket, getOrderBook } from "@/lib/polymarket";

// Fetch all markets
const markets = await getMarkets({ limit: 20 });

// Get order book
const book = await getOrderBook(tokenId);

// Calculate price
const { midPrice, spread } = calculateMarketPrice(book);
```

### Trading APIs

```tsx
import { createOrder, estimateBuy } from "@/lib/polymarket";

// Estimate trade
const estimate = estimateBuy(orderBook, 100); // $100 USDC

// Place order
const result = await createOrder(walletAddress, {
  tokenId: "...",
  side: "BUY",
  price: 0.55,
  size: 100,
});
```

## Architecture Notes

### Why Safe Wallets?

Polymarket uses Safe (Gnosis) wallets for trading to enable:
- Gasless transactions via Relayer
- Secure multi-sig potential
- Account abstraction features

### Builder Attribution

All orders include Builder headers for:
- Revenue sharing (earn from user trades)
- Analytics and tracking
- Builder program benefits

### USDC.e vs Native USDC

Polymarket uses **USDC.e** (bridged via PoS), not native USDC on Polygon. Make sure users deposit the correct token:
- USDC.e: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

## Resources

- [Polymarket Docs](https://docs.polymarket.com)
- [Builder Program](https://docs.polymarket.com/developers/builders)
- [CLOB API Reference](https://docs.polymarket.com/developers/CLOB)
- [wagmi Documentation](https://wagmi.sh)
- [RainbowKit Docs](https://rainbowkit.com)

## License

MIT

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
