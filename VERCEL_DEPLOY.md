# Vercel Deployment Guide

## Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository with this code
- WalletConnect Project ID (https://cloud.walletconnect.com)

## Step 1: Prepare Repository

Commit và push tất cả changes:
```bash
git add .
git commit -m "feat: add vercel deployment configuration"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Follow prompts:
   - Link to existing project? → No (first time) or Yes (existing)
   - Project name → bethub (or your preference)
   - Framework preset → Next.js (auto-detected)
   - Root directory → ./
   - Build command → pnpm build (auto-filled)
   - Output directory → .next (auto-filled)

5. Set environment variables in Vercel dashboard (see Step 3)

### Option B: Using GitHub Integration (Easiest)

1. Go to https://vercel.com/new
2. Click "Continue with GitHub"
3. Select your GitHub repository
4. Configure:
   - **Project Name**: bethub
   - **Framework**: Next.js (auto-detected)
   - **Build Command**: pnpm build
   - **Install Command**: pnpm install
   - **Output Directory**: .next
5. Set environment variables (see Step 3)
6. Click "Deploy"

## Step 3: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

### Required Variables:
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=[Your WalletConnect Project ID]
```

### Optional Variables (with defaults):
```
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com
NEXT_PUBLIC_POLYMARKET_API_BASE=https://gamma-api.polymarket.com
NEXT_PUBLIC_CLOB_API_BASE=https://clob.polymarket.com
NEXT_PUBLIC_POLYMARKET_DATA_API_BASE=https://data-api.polymarket.com
```

## Step 4: Verify Deployment

1. Check deployment status in Vercel Dashboard
2. Once complete, your site is live at:
   - Preview URL: `https://bethub-[random].vercel.app`
   - Production URL: `https://bethub.vercel.app` (if custom domain)

## Step 5: Setup Custom Domain (Optional)

1. Go to Vercel Dashboard → Project Settings → Domains
2. Add your custom domain
3. Update DNS settings as instructed by Vercel

## Configuration Files

### vercel.json
- Build commands
- Environment variables
- Regions (iad1 = US East)
- API function timeout: 60s, memory: 512MB
- Security headers (CORS, XSS protection)
- Caching strategies for API routes

### .vercelignore
- Excludes files not needed for production
- Reduces deployment size
- Improves build speed

## Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] Wallet connection works (Rainbow Kit)
- [ ] API endpoints respond correctly
- [ ] Market data fetches properly
- [ ] Portfolio page displays data
- [ ] Position panel shows orders/positions
- [ ] No 500 errors in logs

## Monitoring & Logs

View logs in Vercel Dashboard:
1. Project → Deployments → Latest
2. Click deployment
3. View "Build Logs" and "Runtime Logs"

## Common Issues

### Issue: WalletConnect not configured
**Solution**: Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` to environment variables

### Issue: CORS errors on API calls
**Solution**: Already handled by `/api/polymarket/[...path]` proxy route

### Issue: Build fails with "memory exceeded"
**Solution**: Vercel functions are limited to 512MB. Check for large assets or dependencies.

### Issue: Dynamic imports not working
**Solution**: Ensure all dynamic imports use `ssr: false` option

## Automatic Deployments

Every push to `main` branch automatically triggers:
1. Build process (next build)
2. Test run (optional)
3. Preview deployment
4. Production deployment (if tests pass)

## Rollback

If deployment breaks:
1. Go to Vercel Dashboard → Deployments
2. Find previous stable deployment
3. Click "Promote to Production"

---

For more help: https://vercel.com/docs
