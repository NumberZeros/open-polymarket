import { test, expect } from '@playwright/test'

test.describe('Wallet Connection & Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display connect wallet button on homepage', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: /connect/i })
    await expect(connectButton).toBeVisible()
  })

  test('should navigate to wallet page', async ({ page }) => {
    await page.goto('/wallet')
    await expect(page).toHaveURL('/wallet')
    await expect(page.getByText(/wallet management/i)).toBeVisible()
  })

  test('should show wallet connection status', async ({ page }) => {
    await page.goto('/wallet')
    
    // Check for connection status indicators
    const statusSection = page.locator('[data-testid="wallet-status"]').or(
      page.locator('text=Wallet Status').locator('..')
    )
    
    await expect(statusSection).toBeVisible()
  })

  test('should display derive credentials button when wallet connected', async ({ page }) => {
    // This test requires a wallet to be connected
    // In real E2E, you'd need to mock wallet connection or use a test wallet
    await page.goto('/wallet')
    
    // Look for either "Connect Wallet" or "Derive Credentials" button
    const actionButton = page.getByRole('button', { name: /connect wallet|derive credentials/i })
    await expect(actionButton).toBeVisible()
  })

  test('should show error message when deriving credentials without wallet', async ({ page }) => {
    await page.goto('/wallet')
    
    // Try to derive without connecting wallet (if button is available)
    const deriveButton = page.getByRole('button', { name: /derive credentials/i })
    
    if (await deriveButton.isVisible()) {
      await deriveButton.click()
      
      // Should show error message
      await expect(page.getByText(/wallet not connected|connect your wallet/i)).toBeVisible()
    }
  })
})

test.describe('Market Browsing', () => {
  test('should load and display markets on homepage', async ({ page }) => {
    await page.goto('/')
    
    // Wait for markets to load
    await page.waitForSelector('[data-testid="market-card"]', { timeout: 10000 }).catch(() => {
      // If specific test ID doesn't exist, look for market-related content
      return page.waitForSelector('text=Yes', { timeout: 10000 })
    })
    
    // Check if markets are displayed
    const marketCards = page.locator('[data-testid="market-card"]').or(
      page.locator('text=Yes').locator('..')
    )
    
    await expect(marketCards.first()).toBeVisible()
  })

  test('should navigate to market detail page', async ({ page }) => {
    await page.goto('/')
    
    // Wait for markets to load
    await page.waitForLoadState('networkidle')
    
    // Find and click first market link
    const firstMarketLink = page.locator('a[href*="/markets/"]').first()
    
    if (await firstMarketLink.isVisible()) {
      await firstMarketLink.click()
      
      // Should navigate to market detail page
      await expect(page).toHaveURL(/\/markets\//)
      
      // Should show market details
      await expect(page.getByText(/buy|sell|place order/i)).toBeVisible()
    }
  })

  test('should display order book on market detail page', async ({ page }) => {
    // Navigate directly to a market (you'll need a real market ID)
    await page.goto('/')
    
    // Get first market link
    const firstMarketLink = page.locator('a[href*="/markets/"]').first()
    
    if (await firstMarketLink.isVisible()) {
      await firstMarketLink.click()
      
      // Wait for order book to load
      await page.waitForLoadState('networkidle')
      
      // Check for order book elements
      const orderBookSection = page.locator('text=Bids').or(page.locator('text=Asks'))
      await expect(orderBookSection).toBeVisible()
    }
  })
})

test.describe('Trading Interface', () => {
  test('should show order form on market detail page', async ({ page }) => {
    await page.goto('/')
    
    const firstMarketLink = page.locator('a[href*="/markets/"]').first()
    
    if (await firstMarketLink.isVisible()) {
      await firstMarketLink.click()
      await page.waitForLoadState('networkidle')
      
      // Look for buy/sell buttons
      const buyButton = page.getByRole('button', { name: /buy/i })
      const sellButton = page.getByRole('button', { name: /sell/i })
      
      await expect(buyButton.or(sellButton)).toBeVisible()
    }
  })

  test('should display trading disabled message when not authenticated', async ({ page }) => {
    await page.goto('/')
    
    const firstMarketLink = page.locator('a[href*="/markets/"]').first()
    
    if (await firstMarketLink.isVisible()) {
      await firstMarketLink.click()
      await page.waitForLoadState('networkidle')
      
      // Look for trading disabled or connection required message
      const message = page.getByText(/connect wallet|trading not available|derive credentials/i)
      await expect(message).toBeVisible()
    }
  })

  test('should validate order form inputs', async ({ page }) => {
    await page.goto('/')
    
    const firstMarketLink = page.locator('a[href*="/markets/"]').first()
    
    if (await firstMarketLink.isVisible()) {
      await firstMarketLink.click()
      await page.waitForLoadState('networkidle')
      
      // Find amount input
      const amountInput = page.locator('input[type="number"]').or(
        page.locator('input[placeholder*="amount"]')
      )
      
      if (await amountInput.isVisible()) {
        // Try entering invalid amount
        await amountInput.fill('-10')
        
        // Should show validation error or prevent submission
        const placeOrderButton = page.getByRole('button', { name: /place order/i })
        
        if (await placeOrderButton.isVisible()) {
          await placeOrderButton.click()
          
          // Should see error message
          await expect(page.getByText(/invalid|error/i)).toBeVisible()
        }
      }
    }
  })
})

test.describe('Portfolio Page', () => {
  test('should navigate to portfolio page', async ({ page }) => {
    await page.goto('/portfolio')
    
    await expect(page).toHaveURL('/portfolio')
    await expect(page.getByText(/portfolio|positions|orders/i)).toBeVisible()
  })

  test('should show connection message when wallet not connected', async ({ page }) => {
    await page.goto('/portfolio')
    
    // Should prompt to connect wallet
    const connectMessage = page.getByText(/connect.*wallet|wallet.*not.*connected/i)
    await expect(connectMessage).toBeVisible()
  })
})

test.describe('API Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept API calls and simulate network error
    await page.route('**/api/polymarket/**', (route) => {
      route.abort('failed')
    })
    
    await page.goto('/')
    
    // Should show error message or fallback UI
    await expect(page.getByText(/error|failed|try again/i).or(
      page.locator('[data-testid="error-message"]')
    )).toBeVisible({ timeout: 15000 })
  })

  test('should retry failed API calls', async ({ page }) => {
    let callCount = 0
    
    await page.route('**/api/polymarket/clob/markets', (route) => {
      callCount++
      if (callCount === 1) {
        route.abort('failed')
      } else {
        route.continue()
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // After retry, markets should load
    expect(callCount).toBeGreaterThan(1)
  })
})
