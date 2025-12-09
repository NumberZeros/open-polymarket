# BetHub 🎯

[![Next.js](https://img.shields.io/badge/Next.js-15.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Polymarket](https://img.shields.io/badge/Polymarket-CLOB%20API-purple)](https://docs.polymarket.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

A modern prediction markets trading platform built on Polymarket's CLOB API. Trade on real-world events with crypto.

## 📖 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Configuration](#%EF%B8%8F-configuration)
- [Architecture](#-architecture)
- [Trading Flow](#-trading-flow)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Security](#-security)

---

## ✨ Features

- **🔍 Market Discovery** - Browse and search prediction markets with real-time data
- **💰 Trading** - Place limit and market orders on Polymarket's CLOB
- **🏦 Safe Wallet** - Automatic proxy wallet deployment for secure trading
- **📊 Portfolio** - Track positions, orders, and P&L
- **💸 Deposits/Withdrawals** - Manage USDC.e funds
- **🏅 Builder Attribution** - Earn commissions on platform trades

---

## 🛠️ Tech Stack

**Frontend**
- Next.js 15.2 (App Router, Server Components)
- React 18.3 + TypeScript 5.6
- TailwindCSS + Framer Motion
- Wagmi 2.14 + Viem 2.21 + RainbowKit

**Blockchain**
- Polymarket CLOB Client SDK
- Ethers.js 5.8
- Safe Wallet (Proxy)
- Polygon Network

**State & Data**
- Zustand 5.0
- TanStack Query 5.62
- Axios

**Testing**
- Vitest 4.0 (Unit)
- Playwright 1.57 (E2E)

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.17.0
- pnpm >= 8.0
- MetaMask or Web3 wallet

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd bethub

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Environment Variables

Create `.env.local`:

```bash
# WalletConnect (Required)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Builder Credentials (Required for commission)
POLY_BUILDER_API_KEY=your_key
POLY_BUILDER_SECRET=your_secret
POLY_BUILDER_PASSPHRASE=your_passphrase

# Optional
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com
```

### Development

```bash
# Start dev server
pnpm dev
# Open http://localhost:3000

# Run tests
pnpm test

# Build for production
pnpm build
pnpm start
```

---

## 📁 Project Structure

```
bethub/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Markets listing
│   ├── markets/[id]/page.tsx     # Market detail + trading
│   ├── portfolio/                # User positions
│   ├── wallet/                   # Wallet management
│   └── api/
│       ├── builder/sign/         # Builder signing
│       └── polymarket/           # API proxy
│
├── components/
│   ├── layout/                   # Header, nav
│   ├── markets/                  # Market cards
│   ├── trading/                  # Order forms
│   └── ui/                       # Reusable UI
│
├── lib/polymarket/
│   ├── clobTradingService.ts     # Trading logic
│   ├── marketApi.ts              # Market data
│   └── config.ts                 # Configuration
│
├── hooks/
│   ├── useClobClient.ts          # CLOB client
│   ├── useSafeDeployment.ts      # Safe wallet
│   └── useTradingSession.ts      # Trading state
│
└── providers/
    └── WalletContext.tsx         # Wallet state
```

---

## ⚙️ Configuration

**Key Contracts** (`lib/polymarket/config.ts`):

```typescript
POLYGON_CONTRACTS = {
  USDC: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
  CTF: "0x4d97dcd97ec945f40cf65f87097ace5ea0476045",
  CTF_EXCHANGE: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
  SAFE_PROXY_FACTORY: "0xaacfeea03eb1561c4e67d661e40682bd20e3541b",
}
```

**Supported Wallets**:
- MetaMask
- WalletConnect
- Rainbow
- Coinbase Wallet

---

## 🏗️ Architecture

```
User → Wallet (Wagmi) → Safe Wallet → CLOB Client → Polymarket API
                                    ↓
                            Builder Signing
                         (Commission Attribution)
```

**Key Components**:

1. **ClobTradingService** - Singleton service for trading operations
2. **BuilderConfig** - Remote signing for builder attribution
3. **Safe Wallet** - Proxy wallet deployed via RelayClient
4. **API Routes** - Server-side endpoints for secure operations

---

## 🔄 Trading Flow

### 1. One-Time Setup

1. **Connect Wallet** → EOA address from MetaMask/WalletConnect
2. **Deploy Safe Wallet** → Proxy wallet via RelayClient (CREATE2)
3. **Approve Tokens** → USDC.e and CTF approvals
4. **Derive API Credentials** → Sign EIP-712 message → Get trading keys

### 2. Placing an Order

1. **User enters order** → tokenId, side, price, size
2. **Sign order** → EIP-712 signature with wallet
3. **Builder signing** → `/api/builder/sign` adds attribution headers
4. **Submit order** → POST to Polymarket CLOB API
5. **Order live** → Appears in order book

---

## 📡 API Reference

### Internal API Routes

**POST `/api/builder/sign`**
- Signs requests with builder credentials
- Returns attribution headers for commission tracking

**`/api/polymarket/*`**
- Proxy to avoid CORS issues
- Routes: `/gamma/*`, `/clob/*`, `/data/*`

### Polymarket APIs

**Gamma API** - Market metadata
- `GET /events` - List events
- `GET /markets` - List markets
- `GET /sampling-markets` - Featured markets

**CLOB API** - Trading operations
- `POST /auth/api-key` - Derive credentials
- `POST /order` - Create order
- `DELETE /order` - Cancel order
- `GET /orders` - User orders
- `GET /book` - Order book

### Core Services

**ClobTradingService** (`lib/polymarket/clobTradingService.ts`)

```typescript
// Initialize
initializeWithSigner(signer, address)

// Orders
createOrder(params)
cancelOrder(orderId)
getOpenOrders()

// Market Data
getOrderBook(tokenId)
getMarketPrice(tokenId)
getBalance(tokenAddress)
```

---

## 🧪 Testing

```bash
# Unit tests (Vitest)
pnpm test
pnpm test:ui
pnpm test:coverage

# E2E tests (Playwright)
pnpm test:e2e
pnpm test:e2e:ui
```

**Test Structure**:
```
tests/
├── unit/           # Component & service tests
└── e2e/            # End-to-end flows
```

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel --prod
```

**Environment Variables** (Vercel Dashboard):
- `POLY_BUILDER_API_KEY`
- `POLY_BUILDER_SECRET`
- `POLY_BUILDER_PASSPHRASE`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

**Optimizations**:
- Server Components for optimal rendering
- Automatic code splitting
- Image optimization via Vercel CDN
- API caching (`s-maxage=60`)

---

## 🔒 Security

**Best Practices**:

✅ Builder credentials stored server-side only  
✅ User API keys derived via wallet signature  
✅ Safe Proxy Wallet for all trading  
✅ EIP-712 signatures for orders  
✅ Token approvals limited to specific contracts  
✅ CORS, XSS, and security headers configured  
✅ Rate limiting via Vercel  
✅ Input validation on all API routes  

**Security Headers**:
```typescript
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 📚 Documentation

**Official Polymarket**:
- [CLOB API Docs](https://docs.polymarket.com/developers/CLOB/introduction)
- [Builder Attribution](https://docs.polymarket.com/developers/builders/order-attribution)
- [Market Data API](https://docs.polymarket.com/developers/gamma-markets-api/)

**Internal**:
- [API Routing Guide](./docs/API_ROUTING_GUIDE.md)
- [CLOB Integration](./docs/CLOB_CLIENT_INTEGRATION.md)
- [Architecture](./docs/POLYMARKET_CLEAN_ARCHITECTURE.md)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Commit Convention**: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details

---

## ⚠️ Disclaimer

This software is for educational purposes only. Trading prediction markets involves financial risk. Always do your own research and comply with local regulations.

---

## 🙏 Acknowledgments

Built with amazing tools from:
- [Polymarket](https://polymarket.com/) - CLOB infrastructure
- [Wagmi](https://wagmi.sh/) - Web3 React hooks
- [Vercel](https://vercel.com/) - Deployment platform
- [Safe](https://safe.global/) - Smart wallet infrastructure

---

**Made with ❤️ by the community**
