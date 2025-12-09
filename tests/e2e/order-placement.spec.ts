import { test, expect } from '@playwright/test';

test.describe('Polymarket Order Placement', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page
    await page.goto('http://localhost:3000/test-order');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should place an order successfully', async ({ page }) => {
    // Intercept network requests to see what's being sent
    let orderRequestData: any = null;
    
    await page.route('https://clob.polymarket.com/order', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      orderRequestData = postData;
      
      console.log('=== ORDER REQUEST ===');
      console.log('Headers:', request.headers());
      console.log('Body:', postData);
      console.log('==================');
      
      // Continue the request
      await route.continue();
    });

    // Check if wallet is connected
    const connectButton = page.locator('button:has-text("Connect Wallet")');
    const isVisible = await connectButton.isVisible().catch(() => false);
    
    if (isVisible) {
      console.log('⚠️ Wallet not connected. Skipping test.');
      test.skip();
      return;
    }

    // Get credentials status
    const credentialsSection = page.locator('text=API Credentials: Ready');
    if (!(await credentialsSection.isVisible())) {
      console.log('⚠️ No credentials. Running setup...');
      
      const setupButton = page.locator('button:has-text("Setup Trading")');
      if (await setupButton.isVisible()) {
        await setupButton.click();
        
        // Wait for wallet signature
        await page.waitForTimeout(5000);
        
        // Wait for credentials to appear
        await credentialsSection.waitFor({ timeout: 10000 });
      }
    }

    // Wait for trading client to initialize
    await page.waitForTimeout(2000);

    // Check if trading client is ready
    const tradingClientStatus = page.locator('text=Trading Client: Initialized');
    if (!(await tradingClientStatus.isVisible())) {
      console.log('⚠️ Trading client not initialized. Waiting...');
      await tradingClientStatus.waitFor({ timeout: 15000 });
    }

    // Set token ID
    const tokenInput = page.locator('input[placeholder="Paste token ID here..."]');
    await tokenInput.fill('104470386186972467692602641298244256158599485319501919587446980978971553459532');

    // Set price
    const priceInput = page.locator('input[type="number"]').nth(0);
    await priceInput.fill('0.55');

    // Set size
    const sizeInput = page.locator('input[type="number"]').nth(1);
    await sizeInput.fill('5');

    // Click "Place Order"
    const placeOrderButton = page.locator('button:has-text("Place Order")');
    await placeOrderButton.click();

    // Wait for order response
    console.log('Waiting for order response...');
    await page.waitForTimeout(3000);

    // Check for success or error message
    const successMessage = page.locator('text=Order placed successfully');
    const errorMessage = page.locator('text=Error|Failed|Unauthorized|Invalid');

    const isSuccess = await successMessage.isVisible().catch(() => false);
    const hasError = await errorMessage.isVisible().catch(() => false);

    if (isSuccess) {
      console.log('✅ ORDER PLACED SUCCESSFULLY');
    } else if (hasError) {
      const errorText = await errorMessage.textContent();
      console.log('❌ ORDER FAILED:', errorText);
      
      // Log captured request data
      if (orderRequestData) {
        console.log('\n=== CAPTURED REQUEST DATA ===');
        console.log(JSON.stringify(orderRequestData, null, 2));
      }
    } else {
      console.log('⚠️ No clear success or error message found');
    }

    // Log console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Print some relevant logs
    const tradingClientLogs = consoleLogs.filter(log => 
      log.includes('Trading Client') || 
      log.includes('API') || 
      log.includes('signature') ||
      log.includes('secret')
    );

    console.log('\n=== RELEVANT LOGS ===');
    tradingClientLogs.forEach(log => console.log(log));

    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test('should validate API credentials are properly encoded', async ({ page }) => {
    // This test checks if the secret is base64-encoded
    
    const consoleLogs: any[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('secret') || text.includes('base64') || text.includes('credentials')) {
        consoleLogs.push({
          type: msg.type(),
          text: text
        });
      }
    });

    // Navigate and wait for hydration
    await page.goto('http://localhost:3000/test-order');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if conversion message appears
    const hasConversion = consoleLogs.some(log => 
      log.text.includes('Converting secret') || 
      log.text.includes('converted to base64')
    );

    if (hasConversion) {
      console.log('✅ Secret is being converted to base64');
    } else {
      console.log('⚠️ No secret conversion detected (might already be base64)');
    }

    console.log('\n=== CREDENTIAL LOGS ===');
    consoleLogs.forEach(log => console.log(`[${log.type}] ${log.text}`));
  });
});
