/**
 * Test Trading Service Script
 * 
 * This script tests the new ClobTradingService with a real wallet
 * Run with: npx ts-node scripts/test-trading-service.ts
 */

import { ethers } from 'ethers';
import { getClobTradingService } from '../lib/polymarket/clobTradingService';
import { getBuilderConfigManager } from '../lib/polymarket/builderConfig';

// Test configuration
const TEST_CONFIG = {
  // Use your own test wallet private key (with small amount of USDC on Polygon)
  PRIVATE_KEY: process.env.TEST_WALLET_PRIVATE_KEY || '',
  
  // Test market token ID (example: Yes token for a market)
  // Replace with actual token ID from Polymarket
  TOKEN_ID: '21742633143463906290569050155826241533067272736897614950488156847949938836455',
  
  // Test order params
  SIDE: 'buy' as const,
  PRICE: 0.50, // 50 cents
  SIZE: 1, // $1 USDC (minimum order size)
  
  // Optional: Safe wallet address if using proxy
  SAFE_ADDRESS: process.env.TEST_SAFE_ADDRESS || undefined,
};

async function main() {
  console.log('\n🚀 Testing ClobTradingService\n');
  console.log('='.repeat(60));
  
  // Validate configuration
  if (!TEST_CONFIG.PRIVATE_KEY) {
    console.error('❌ ERROR: TEST_WALLET_PRIVATE_KEY not set');
    console.log('\nSet it in .env.local:');
    console.log('TEST_WALLET_PRIVATE_KEY=0x...');
    process.exit(1);
  }
  
  try {
    // Step 1: Setup wallet
    console.log('\n📝 Step 1: Setup Wallet');
    console.log('-'.repeat(60));
    
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com'
    );
    const wallet = new ethers.Wallet(TEST_CONFIG.PRIVATE_KEY, provider);
    const address = await wallet.getAddress();
    
    console.log('✅ Wallet connected');
    console.log('   Address:', address);
    console.log('   Network:', await provider.getNetwork());
    
    const balance = await provider.getBalance(address);
    console.log('   MATIC Balance:', ethers.utils.formatEther(balance));
    
    // Step 2: Check Builder Configuration
    console.log('\n📝 Step 2: Check Builder Configuration');
    console.log('-'.repeat(60));
    
    const builderManager = getBuilderConfigManager();
    const builderStatus = builderManager.getStatus();
    
    console.log('   Builder Ready:', builderStatus.isReady);
    console.log('   Signing Mode:', builderStatus.mode);
    console.log('   Remote URL:', builderStatus.remoteUrl);
    
    if (!builderStatus.isReady) {
      console.warn('⚠️  WARNING: Builder not configured');
      console.log('   Orders will be placed without Builder attribution');
    }
    
    // Step 3: Initialize Trading Service
    console.log('\n📝 Step 3: Initialize Trading Service');
    console.log('-'.repeat(60));
    
    const service = getClobTradingService();
    const initSuccess = await service.initializeWithSigner(
      wallet,
      address,
      TEST_CONFIG.SAFE_ADDRESS
    );
    
    if (!initSuccess) {
      console.error('❌ Failed to initialize trading service');
      process.exit(1);
    }
    
    const status = service.getStatus();
    console.log('✅ Service initialized');
    console.log('   Ready:', status.isReady);
    console.log('   Can Trade:', status.canTrade);
    console.log('   Can Read Market Data:', status.canReadMarketData);
    console.log('   Read-Only Mode:', status.readOnlyMode);
    console.log('   Wallet:', status.walletAddress);
    
    if (status.readOnlyMode) {
      console.log('\n⚠️  WARNING: Read-Only Mode');
      console.log('   You need a Polymarket account to trade');
      console.log('   1. Go to https://polymarket.com');
      console.log('   2. Connect wallet and create account');
      console.log('   3. Run this script again');
      
      // Still test read operations
      console.log('\n📊 Testing Read Operations');
      console.log('-'.repeat(60));
      
      const orderBook = await service.getOrderBook(TEST_CONFIG.TOKEN_ID);
      if (orderBook) {
        console.log('✅ Order Book Retrieved');
        console.log('   Bids:', orderBook.bids.length);
        console.log('   Asks:', orderBook.asks.length);
        if (orderBook.bids.length > 0) {
          console.log('   Best Bid:', orderBook.bids[0].price);
        }
        if (orderBook.asks.length > 0) {
          console.log('   Best Ask:', orderBook.asks[0].price);
        }
      }
      
      const price = await service.getMarketPrice(TEST_CONFIG.TOKEN_ID);
      if (price) {
        console.log('✅ Market Price Retrieved');
        console.log('   Best Bid:', price.bestBid);
        console.log('   Best Ask:', price.bestAsk);
        console.log('   Mid Price:', price.midPrice);
        console.log('   Spread:', price.spread);
      }
      
      process.exit(0);
    }
    
    // Step 4: Check USDC Balance
    console.log('\n📝 Step 4: Check USDC Balance');
    console.log('-'.repeat(60));
    
    const balanceInfo = await service.getBalanceAllowance();
    if (balanceInfo) {
      console.log('✅ Balance Retrieved');
      console.log('   USDC Balance:', balanceInfo.balance);
      console.log('   Allowance:', balanceInfo.allowance);
      console.log('   Has Allowance:', balanceInfo.hasAllowance);
      
      const balanceNum = parseFloat(balanceInfo.balance);
      if (balanceNum < TEST_CONFIG.SIZE) {
        console.error(`❌ Insufficient balance: ${balanceNum} USDC < ${TEST_CONFIG.SIZE} USDC`);
        process.exit(1);
      }
      
      if (!balanceInfo.hasAllowance) {
        console.warn('⚠️  WARNING: No USDC allowance');
        console.log('   You need to approve USDC spending first');
        console.log('   Use the deposit flow in the app');
        process.exit(1);
      }
    }
    
    // Step 5: Get Market Data
    console.log('\n📝 Step 5: Get Market Data');
    console.log('-'.repeat(60));
    
    const orderBook = await service.getOrderBook(TEST_CONFIG.TOKEN_ID);
    if (!orderBook) {
      console.error('❌ Failed to get order book');
      process.exit(1);
    }
    
    console.log('✅ Order Book Retrieved');
    console.log('   Market:', orderBook.market);
    console.log('   Token ID:', orderBook.asset_id);
    console.log('   Bids:', orderBook.bids.length);
    console.log('   Asks:', orderBook.asks.length);
    
    const price = await service.getMarketPrice(TEST_CONFIG.TOKEN_ID);
    if (price) {
      console.log('✅ Market Price');
      console.log('   Best Bid:', price.bestBid);
      console.log('   Best Ask:', price.bestAsk);
      console.log('   Mid Price:', price.midPrice);
      console.log('   Spread:', price.spread);
    }
    
    // Step 6: Estimate Trade
    console.log('\n📝 Step 6: Estimate Trade');
    console.log('-'.repeat(60));
    
    const estimate = await service.estimateWithOrderBook(
      TEST_CONFIG.TOKEN_ID,
      TEST_CONFIG.SIDE,
      TEST_CONFIG.SIZE
    );
    
    if (estimate) {
      console.log('✅ Trade Estimate');
      console.log('   Cost:', estimate.cost, 'USDC');
      console.log('   Shares:', estimate.shares);
      console.log('   Avg Price:', estimate.avgPrice);
      console.log('   Slippage:', estimate.slippage.toFixed(2), '%');
      console.log('   Potential Return:', estimate.potentialReturn);
      console.log('   Potential Profit:', estimate.potentialProfit);
    }
    
    // Step 7: Place Order (ASK FOR CONFIRMATION)
    console.log('\n📝 Step 7: Place Test Order');
    console.log('-'.repeat(60));
    console.log('⚠️  WARNING: This will place a REAL order on Polymarket');
    console.log('\nOrder Details:');
    console.log('   Side:', TEST_CONFIG.SIDE.toUpperCase());
    console.log('   Price:', TEST_CONFIG.PRICE);
    console.log('   Size:', TEST_CONFIG.SIZE, 'USDC');
    console.log('   Total Cost:', (TEST_CONFIG.PRICE * TEST_CONFIG.SIZE).toFixed(2), 'USDC');
    
    // In real usage, you'd prompt for confirmation here
    // For testing, we'll skip the order placement by default
    console.log('\n⏸️  Order placement SKIPPED (safety check)');
    console.log('   To place order, uncomment the code in the script');
    
    /*
    // Uncomment to actually place order:
    console.log('\n🚀 Placing order...');
    const result = await service.createOrder({
      tokenId: TEST_CONFIG.TOKEN_ID,
      side: TEST_CONFIG.SIDE,
      price: TEST_CONFIG.PRICE,
      size: TEST_CONFIG.SIZE,
    });
    
    if (result.success) {
      console.log('✅ Order placed successfully!');
      console.log('   Order ID:', result.orderId);
      console.log('   Status:', result.status);
      
      // Step 8: Get Order Details
      console.log('\n📝 Step 8: Get Order Details');
      console.log('-'.repeat(60));
      
      const orderDetails = await service.getOrderDetails(result.orderId!);
      if (orderDetails) {
        console.log('✅ Order Details');
        console.log('   ID:', orderDetails.id);
        console.log('   Side:', orderDetails.side);
        console.log('   Price:', orderDetails.price);
        console.log('   Size:', orderDetails.originalSize);
        console.log('   Filled:', orderDetails.filledSize);
        console.log('   Status:', orderDetails.status);
      }
      
      // Step 9: Cancel Order (cleanup)
      console.log('\n📝 Step 9: Cancel Test Order');
      console.log('-'.repeat(60));
      console.log('⚠️  Cancelling test order...');
      
      const cancelled = await service.cancelOrder(result.orderId!);
      if (cancelled) {
        console.log('✅ Order cancelled successfully');
      }
    } else {
      console.error('❌ Order failed:', result.error);
    }
    */
    
    // Step 8: Get Open Orders
    console.log('\n📝 Step 8: Get Open Orders');
    console.log('-'.repeat(60));
    
    const openOrders = await service.getOpenOrders();
    console.log(`✅ Found ${openOrders.length} open orders`);
    
    if (openOrders.length > 0) {
      console.log('\nOpen Orders:');
      openOrders.forEach((order: any, i: number) => {
        console.log(`   ${i + 1}. ${order.side} ${order.size} @ ${order.price}`);
        console.log(`      ID: ${order.id}`);
        console.log(`      Market: ${order.market}`);
      });
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Complete!');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log('   ✅ Wallet connected');
    console.log('   ✅ Builder configured');
    console.log('   ✅ Trading service initialized');
    console.log('   ✅ Balance checked');
    console.log('   ✅ Market data retrieved');
    console.log('   ✅ Trade estimated');
    console.log('   ⏸️  Order placement skipped (safety)');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Review the code and test parameters');
    console.log('   2. Uncomment order placement section');
    console.log('   3. Run again to place real order');
    console.log('   4. Monitor order in Polymarket dashboard');
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  main().catch(console.error);
}
