/**
 * Polymarket CLOB Trading Service
 * 
 * Provides order creation and management through Polymarket's CLOB (Central Limit Order Book).
 * Uses official @polymarket/clob-client with Builder attribution headers.
 * 
 * Architecture for bethub:
 * - Singleton service pattern
 * - Integrates with BuilderConfigManager for remote signing
 * - Supports ethers v5 Wallet/Signer
 * - Handles EOA and Safe (POLY_PROXY) signature types
 * 
 * @see https://docs.polymarket.com/developers/CLOB/introduction
 * @see https://docs.polymarket.com/developers/builders/order-attribution
 */

import { ClobClient, Side, OrderType, AssetType } from '@polymarket/clob-client';
import { SignatureType } from '@polymarket/order-utils';
import { ethers } from 'ethers';
import type { Wallet, Signer } from 'ethers';
import { getBuilderConfigManager } from './builderConfig';
import { POLYMARKET_API, POLYGON_CHAIN_ID } from './config';

// ============= Types =============

export interface TradingCredentials {
    apiKey: string;
    secret: string;
    passphrase: string;
}

export interface OrderParams {
    tokenId: string;       // CLOB token ID for the outcome
    side: 'buy' | 'sell';
    price: number;         // Price in USDC (0.01 to 0.99)
    size: number;          // Size in USDC
    orderType?: OrderType; // GTC, GTD, FOK, IOC
    expiration?: number;   // Unix timestamp for GTD orders
}

export interface OrderResult {
    success: boolean;
    orderId?: string;
    status?: string;
    error?: string;
    orderDetails?: {
        side: string;
        price: number;
        size: number;
        tokenId: string;
    };
}

export interface OrderBookLevel {
    price: string;
    size: string;
}

export interface OrderBookData {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    market: string;
    asset_id: string;
    timestamp: string;
}

export interface MarketPrice {
    tokenId: string;
    bestBid: number;
    bestAsk: number;
    midPrice: number;
    spread: number;
}

export interface TradeEstimate {
    cost: number;
    shares: number;
    avgPrice: number;
    slippage: number;
    potentialReturn: number;
    potentialProfit: number;
}

export interface TradingStatus {
    isReady: boolean;
    hasWallet: boolean;
    hasCreds: boolean;           // Backward compatibility - same as canTrade
    canTrade: boolean;           // Has Trading API credentials
    canReadMarketData: boolean;  // Can read order books etc
    isBuilder: boolean;
    builderMode: string;
    walletAddress?: string;
    readOnlyMode?: boolean;      // True if we can read but not trade
}

// ============= Re-exports =============

export { Side, OrderType, AssetType } from '@polymarket/clob-client';

// ============= Main Service Class =============

/**
 * ClobTradingService - Wrapper around Polymarket ClobClient with Builder support
 */
export class ClobTradingService {
    private static instance: ClobTradingService | null = null;
    
    private clobClient: ClobClient | null = null;
    private wallet: Wallet | Signer | null = null;
    private walletAddress: string | null = null;
    private funderAddress: string | null = null;
    private isInitialized: boolean = false;
    private _hasTradingCredentials: boolean = false;
    private signatureType: SignatureType = SignatureType.EOA;
    
    private constructor() {}
    
    /**
     * Get singleton instance
     */
    static getInstance(): ClobTradingService {
        if (!ClobTradingService.instance) {
            ClobTradingService.instance = new ClobTradingService();
        }
        return ClobTradingService.instance;
    }
    
    // ============= Private Helper Methods =============
    
    private createClobClient(
        creds?: { key: string; secret: string; passphrase: string },
        signatureType?: SignatureType,
        funderAddress?: string
    ): ClobClient {
        const builderConfig = getBuilderConfigManager().getConfig();
        const actualFunderAddress = funderAddress || this.funderAddress || undefined;
        
        return new ClobClient(
            POLYMARKET_API.CLOB,
            POLYGON_CHAIN_ID,
            this.wallet as Wallet,
            creds,
            signatureType || this.signatureType,
            actualFunderAddress,
            undefined,
            false,  // useServerTime - use local time with nonce, matching admin-lab pattern
            builderConfig
        );
    }
    
    /**
     * Try to derive or create API key from wallet
     * First attempts to derive existing key (GET), then falls back to creating new (POST)
     * This pattern matches Polymarket's recommended approach
     * Returns credentials or undefined if failed
     */
    private async deriveOrCreateApiKey(client: ClobClient): Promise<{ key: string; secret: string; passphrase: string } | undefined> {
        try {
            console.log('[ClobTradingService] Trying deriveApiKey...');
            return await client.deriveApiKey();
        } catch (error) {
            try {
                console.log('[ClobTradingService] deriveApiKey failed, trying createApiKey...');
                return await client.createApiKey();
            } catch (createError) {
                const errorMsg = createError instanceof Error ? createError.message : String(createError);
                if (errorMsg.includes('Could not create api key')) {
                    console.log('[ClobTradingService] ℹ️ No API key available - read-only mode');
                } else {
                    console.warn('[ClobTradingService] API key derivation failed:', errorMsg);
                }
                return undefined;
            }
        }
    }
    
    /**
     * Validate service is initialized with client
     */
    private validateInitialized(requireTrading = false): { valid: boolean; error?: string } {
        if (!this.clobClient) {
            return { valid: false, error: 'Trading service not initialized' };
        }
        
        if (requireTrading && !this.hasTradingCapability()) {
            return { 
                valid: false, 
                error: 'Trading not available. Please create a Polymarket account at https://polymarket.com first, then reconnect your wallet.' 
            };
        }
        
        return { valid: true };
    }
    
    /**
     * Initialize the trading service with an ethers Signer (MetaMask, WalletConnect)
     * 
     * This method will:
     * 1. Create a ClobClient without API creds (for deriving)
     * 2. Derive Trading API credentials from wallet signature
     * 3. Re-create ClobClient with derived credentials + Builder config
     * 
     * Note: If API key derivation fails, user needs to have a Polymarket account.
     * 
     * @param signer - Ethers signer from Web3Provider
     * @param address - Wallet address
     * @param funderAddress - Optional funder address (for proxy wallets/Safe)
     */
    async initializeWithSigner(
        signer: Wallet | Signer,
        address: string,
        funderAddress?: string
    ): Promise<boolean> {
        try {
            this.wallet = signer;
            this.walletAddress = address;
            this.funderAddress = funderAddress || address;
            
            // Determine signature type
            const isSafe = funderAddress && funderAddress.toLowerCase() !== address.toLowerCase();
            this.signatureType = isSafe ? SignatureType.POLY_GNOSIS_SAFE : SignatureType.EOA;
            console.log(`[ClobTradingService] Using ${isSafe ? 'POLY_GNOSIS_SAFE' : 'EOA'} signature type`);
            
            // Step 1: Create temp client for API key derivation
            console.log('[ClobTradingService] Creating temp client for API key derivation...');
            const tempClient = this.createClobClient();
            
            // Step 2: Derive API credentials
            console.log('[ClobTradingService] Attempting to derive Trading API credentials...');
            const derivedCreds = await this.deriveOrCreateApiKey(tempClient);
            
            // Step 3: Create final client
            this._hasTradingCredentials = !!derivedCreds;
            this.clobClient = this.createClobClient(derivedCreds);
            this.isInitialized = true;
            
            // Log results
            const mode = derivedCreds ? 'FULL trading capability' : 'LIMITED mode (read-only)';
            console.log(`[ClobTradingService] ✅ Initialized with ${mode}`);
            console.log('[ClobTradingService] Wallet:', address);
            console.log('[ClobTradingService] Builder mode:', getBuilderConfigManager().getSigningMode());
            console.log('[ClobTradingService] Funder address:', this.funderAddress);
            
            if (!derivedCreds) {
                console.log('[ClobTradingService] ⚠️  Trading disabled - no API credentials');
                console.log('[ClobTradingService] User needs to create a Polymarket account first');
            }
            
            return true;
        } catch (error) {
            console.error('[ClobTradingService] Signer initialization failed:', error);
            return false;
        }
    }
    
    /**
     * Retry API key derivation after Safe deployment
     * Call this after user deploys Safe wallet to enable trading
     */
    async retryApiKeyDerivation(): Promise<boolean> {
        if (!this.wallet || !this.isInitialized) {
            console.error('[ClobTradingService] Cannot retry - not initialized');
            return false;
        }
        
        if (this._hasTradingCredentials) {
            console.log('[ClobTradingService] Already have trading credentials');
            return true;
        }
        
        try {
            console.log('[ClobTradingService] Retrying API key derivation...');
            
            // Create temp client and try to derive
            const tempClient = this.createClobClient();
            const derivedCreds = await this.deriveOrCreateApiKey(tempClient);
            
            if (derivedCreds) {
                // Recreate client with credentials
                this._hasTradingCredentials = true;
                this.clobClient = this.createClobClient(derivedCreds);
                console.log('[ClobTradingService] ✅ Trading now enabled');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('[ClobTradingService] Retry API key derivation failed:', error);
            return false;
        }
    }
    
    /**
     * Update the funder address (Safe wallet address)
     * This is needed because balance queries use the funder address
     * Call this after Safe wallet is deployed or when Safe address is discovered
     * 
     * Note: This only updates the internal funderAddress property.
     * Balance queries will use this new address.
     * We don't recreate the ClobClient because API credentials are tied to the EOA, not Safe.
     */
    async updateFunderAddress(safeAddress: string): Promise<boolean> {
        if (!this.isInitialized || !this.wallet) {
            console.error('[ClobTradingService] Cannot update funder - not initialized');
            return false;
        }
        
        if (this.funderAddress === safeAddress && this.signatureType === SignatureType.POLY_GNOSIS_SAFE) {
            console.log('[ClobTradingService] Funder address already set to:', safeAddress);
            return true;
        }
        
        console.log('[ClobTradingService] Updating funder address from', this.funderAddress, 'to', safeAddress);
        this.funderAddress = safeAddress;
        
        // IMPORTANT: When Safe is detected, switch to POLY_GNOSIS_SAFE signature type
        if (safeAddress && safeAddress.toLowerCase() !== this.walletAddress?.toLowerCase()) {
            this.signatureType = SignatureType.POLY_GNOSIS_SAFE;
            console.log('[ClobTradingService] Switched to POLY_GNOSIS_SAFE signature type');
            
            // Recreate client with POLY_GNOSIS_SAFE signature type
            const hasCreds = this._hasTradingCredentials;
            if (hasCreds && this.clobClient) {
                // Get current credentials (if any) and recreate client
                console.log('[ClobTradingService] Recreating client with POLY_GNOSIS_SAFE signature type...');
                this.clobClient = this.createClobClient(undefined, SignatureType.POLY_GNOSIS_SAFE, safeAddress);
                console.log('[ClobTradingService] ✅ Client recreated with Safe support');
            }
        }
        
        return true;
    }
    
    /**
     * Get the current funder address
     */
    getFunderAddress(): string | null {
        return this.funderAddress;
    }
    
    /**
     * Check if trading is fully enabled (has API credentials)
     */
    hasTradingCapability(): boolean {
        // Must have derived Trading API credentials to trade
        return this.isInitialized && this.clobClient !== null && this._hasTradingCredentials;
    }
    
    /**
     * Check if service is ready
     */
    isReady(): boolean {
        return this.isInitialized && this.clobClient !== null;
    }
    
    /**
     * Get current status
     */
    getStatus(): TradingStatus {
        const builderManager = getBuilderConfigManager();
        const canTrade = this.hasTradingCapability();
        const canReadMarketData = this.clobClient !== null;
        
        return {
            isReady: this.isReady(),
            hasWallet: this.wallet !== null,
            hasCreds: canTrade,
            canTrade,
            canReadMarketData,
            isBuilder: builderManager.isReady(),
            builderMode: builderManager.getSigningMode(),
            walletAddress: this.walletAddress || undefined,
            readOnlyMode: canReadMarketData && !canTrade
        };
    }
    
    // ============= Order Book =============
    
    /**
     * Get order book for a token
     */
    async getOrderBook(tokenId: string): Promise<OrderBookData | null> {
        if (!this.clobClient) {
            console.error('[ClobTradingService] Not initialized');
            return null;
        }
        
        try {
            const orderBook = await this.clobClient.getOrderBook(tokenId);
            return orderBook as OrderBookData;
        } catch (error) {
            console.error('[ClobTradingService] Failed to get order book:', error);
            return null;
        }
    }
    
    /**
     * Get current market prices from order book
     */
    async getMarketPrice(tokenId: string): Promise<MarketPrice | null> {
        const orderBook = await this.getOrderBook(tokenId);
        
        if (!orderBook) {
            return null;
        }
        
        const bestBid = orderBook.bids.length > 0 
            ? parseFloat(orderBook.bids[0].price) 
            : 0;
        const bestAsk = orderBook.asks.length > 0 
            ? parseFloat(orderBook.asks[0].price) 
            : 1;
        
        const midPrice = (bestBid + bestAsk) / 2;
        const spread = bestAsk - bestBid;
        
        return {
            tokenId,
            bestBid,
            bestAsk,
            midPrice,
            spread
        };
    }
    
    // ============= Trade Estimation =============
    
    /**
     * Estimate a buy order cost and shares
     */
    estimateBuyOrder(price: number, amount: number): TradeEstimate {
        const shares = amount / price;
        const potentialReturn = shares;  // $1 per share if win
        const potentialProfit = potentialReturn - amount;
        const slippage = 0;  // Would need order book for real slippage
        
        return {
            cost: amount,
            shares,
            avgPrice: price,
            slippage,
            potentialReturn,
            potentialProfit
        };
    }
    
    /**
     * Estimate a sell order
     */
    estimateSellOrder(price: number, shares: number): TradeEstimate {
        const proceeds = shares * price;
        
        return {
            cost: 0,
            shares,
            avgPrice: price,
            slippage: 0,
            potentialReturn: proceeds,
            potentialProfit: proceeds
        };
    }
    
    /**
     * Estimate with order book depth (more accurate)
     */
    async estimateWithOrderBook(
        tokenId: string,
        side: 'buy' | 'sell',
        amount: number
    ): Promise<TradeEstimate | null> {
        const orderBook = await this.getOrderBook(tokenId);
        
        if (!orderBook) {
            return null;
        }
        
        const levels = side === 'buy' ? orderBook.asks : orderBook.bids;
        
        let remainingAmount = amount;
        let totalCost = 0;
        let totalShares = 0;
        
        for (const level of levels) {
            if (remainingAmount <= 0) break;
            
            const price = parseFloat(level.price);
            const size = parseFloat(level.size);
            
            if (side === 'buy') {
                // Buying: cost = shares * price
                const maxShares = size; // Size is in shares
                const costForLevel = maxShares * price;
                
                if (remainingAmount >= costForLevel) {
                    totalCost += costForLevel;
                    totalShares += maxShares;
                    remainingAmount -= costForLevel;
                } else {
                    const shares = remainingAmount / price;
                    totalCost += remainingAmount;
                    totalShares += shares;
                    remainingAmount = 0;
                }
            } else {
                // Selling: proceeds = shares * price
                const maxShares = size;
                
                if (remainingAmount >= maxShares) {
                    totalCost += maxShares * price;
                    totalShares += maxShares;
                    remainingAmount -= maxShares;
                } else {
                    totalCost += remainingAmount * price;
                    totalShares += remainingAmount;
                    remainingAmount = 0;
                }
            }
        }
        
        const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
        const midPrice = await this.getMarketPrice(tokenId);
        const slippage = midPrice ? Math.abs(avgPrice - midPrice.midPrice) / midPrice.midPrice * 100 : 0;
        
        return {
            cost: side === 'buy' ? totalCost : 0,
            shares: totalShares,
            avgPrice,
            slippage,
            potentialReturn: side === 'buy' ? totalShares : totalCost,
            potentialProfit: side === 'buy' ? totalShares - totalCost : totalCost
        };
    }
    
    // ============= Order Creation =============
    
    /**
     * Create and post a market order
     * Uses builder attribution headers automatically
     */
    async createOrder(params: OrderParams): Promise<OrderResult> {
        const validation = this.validateInitialized(true);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        
        // Validate minimum order value (Polymarket requires >= $1)
        const orderValue = params.size * params.price;
        if (orderValue < 1) {
            return {
                success: false,
                error: `Order value must be at least $1 (current: $${orderValue.toFixed(2)})`
            };
        }
        
        try {
            const orderType = params.orderType || OrderType.GTC;
            const side = params.side === 'buy' ? Side.BUY : Side.SELL;
            
            console.log('[ClobTradingService] Creating order:', {
                tokenId: params.tokenId,
                side: params.side,
                price: params.price,
                size: params.size,
                orderType,
                expiration: params.expiration
            });
            
            const signedOrder = await this.clobClient!.createOrder({
                tokenID: params.tokenId,
                side,
                price: params.price,
                size: params.size,
            });
            
            // Post the order
            const response = await this.clobClient!.postOrder(signedOrder, orderType);
            
            console.log('[ClobTradingService] ✅ Order created:', response);
            
            return {
                success: true,
                orderId: response.orderID || response.id,
                status: response.status || 'LIVE',
                orderDetails: {
                    side: params.side,
                    price: params.price,
                    size: params.size,
                    tokenId: params.tokenId
                }
            };
        } catch (error) {
            console.error('[ClobTradingService] Order failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    
    /**
     * Create a GTC (Good-Til-Cancelled) order
     */
    async createGTCOrder(
        tokenId: string,
        side: 'buy' | 'sell',
        price: number,
        size: number
    ): Promise<OrderResult> {
        return this.createOrder({
            tokenId,
            side,
            price,
            size,
            orderType: OrderType.GTC
        });
    }
    
    /**
     * Create a FOK (Fill-Or-Kill) order
     * Must be filled immediately and completely, or cancelled
     */
    async createFOKOrder(
        tokenId: string,
        side: 'buy' | 'sell',
        price: number,
        size: number
    ): Promise<OrderResult> {
        return this.createOrder({
            tokenId,
            side,
            price,
            size,
            orderType: OrderType.FOK
        });
    }
    
    /**
     * Create a GTD (Good-Til-Date) order
     * Valid until the specified expiration time
     */
    async createGTDOrder(
        tokenId: string,
        side: 'buy' | 'sell',
        price: number,
        size: number,
        expiration: Date
    ): Promise<OrderResult> {
        return this.createOrder({
            tokenId,
            side,
            price,
            size,
            orderType: OrderType.GTD,
            expiration: Math.floor(expiration.getTime() / 1000)
        });
    }
    
    // ============= Order Management =============
    
    /**
     * Cancel an order
     */
    async cancelOrder(orderId: string): Promise<boolean> {
        const validation = this.validateInitialized(true);
        if (!validation.valid) {
            console.error('[ClobTradingService]', validation.error);
            return false;
        }
        
        try {
            await this.clobClient!.cancelOrder({ orderID: orderId });
            console.log('[ClobTradingService] ✅ Order cancelled:', orderId);
            return true;
        } catch (error) {
            console.error('[ClobTradingService] Cancel failed:', error);
            return false;
        }
    }
    
    /**
     * Cancel all orders for a market
     */
    async cancelAllOrders(marketId?: string): Promise<boolean> {
        const validation = this.validateInitialized(true);
        if (!validation.valid) {
            console.error('[ClobTradingService]', validation.error);
            return false;
        }
        
        try {
            if (marketId) {
                await this.clobClient!.cancelMarketOrders({ market: marketId });
                console.log('[ClobTradingService] ✅ Market orders cancelled:', marketId);
            } else {
                await this.clobClient!.cancelAll();
                console.log('[ClobTradingService] ✅ All orders cancelled');
            }
            return true;
        } catch (error) {
            console.error('[ClobTradingService] Cancel all failed:', error);
            return false;
        }
    }
    
    /**
     * Get open orders
     */
    async getOpenOrders(marketId?: string): Promise<unknown[]> {
        if (!this.clobClient) {
            console.error('[ClobTradingService] Not initialized');
            return [];
        }
        
        try {
            const orders = marketId 
                ? await this.clobClient.getOpenOrders({ market: marketId })
                : await this.clobClient.getOpenOrders();
            return orders;
        } catch (error) {
            console.error('[ClobTradingService] Failed to get open orders:', error);
            return [];
        }
    }
    
    /**
     * Get trade history
     * Note: Use Polymarket Data API directly as ClobClient doesn't have this method
     */
    async getTradeHistory(params?: { marketId?: string; userAddress?: string }): Promise<unknown[]> {
        if (!this.clobClient) {
            console.error('[ClobTradingService] Not initialized');
            return [];
        }
        
        try {
            // Build query parameters
            const queryParams = new URLSearchParams();
            queryParams.append('limit', '100');
            
            if (params?.marketId) {
                queryParams.append('market', params.marketId);
            }
            
            if (params?.userAddress) {
                queryParams.append('user', params.userAddress);
            }
            
            const url = `${POLYMARKET_API.DATA}/trades?${queryParams.toString()}`;
            console.log('[ClobTradingService] Fetching trades from:', url);
            
            const response = await fetch(url);
            if (!response.ok) {
                console.error('[ClobTradingService] Trade history API error:', response.status, response.statusText);
                return [];
            }
            
            const trades = await response.json();
            console.log('[ClobTradingService] Fetched trades:', trades?.length || 0);
            return trades;
        } catch (error) {
            console.error('[ClobTradingService] Failed to get trade history:', error);
            return [];
        }
    }
    
    /**
     * Update an existing order (cancel and recreate with new parameters)
     * Note: Polymarket CLOB doesn't support direct order modification,
     * so we cancel the existing order and create a new one with updated params
     * 
     * @param orderId - ID of the order to update
     * @param updates - New values for price, size, or expiration
     * @returns OrderResult with new order ID if successful
     */
    async updateOrder(
        orderId: string,
        updates: {
            price?: number;
            size?: number;
            expiration?: number;
        }
    ): Promise<OrderResult> {
        const validation = this.validateInitialized(true);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        
        try {
            // Get current order details
            const orders = await this.getOpenOrders();
            const order = orders.find((o: any) => o.id === orderId);
            
            if (!order) {
                return { success: false, error: 'Order not found' };
            }
            
            // Cancel existing order
            const cancelled = await this.cancelOrder(orderId);
            if (!cancelled) {
                return { success: false, error: 'Failed to cancel order' };
            }
            
            // Create new order with updated params
            const orderAny = order as any;
            return await this.createOrder({
                tokenId: orderAny.asset_id || orderAny.tokenID,
                side: orderAny.side === 'BUY' ? 'buy' : 'sell',
                price: updates.price ?? orderAny.price,
                size: updates.size ?? orderAny.original_size ?? orderAny.size,
                expiration: updates.expiration ?? orderAny.expiration
            });
        } catch (error) {
            console.error('[ClobTradingService] Update order failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    
    /**
     * Get detailed order information
     */
    async getOrderDetails(orderId: string): Promise<{
        id: string;
        tokenId: string;
        side: 'buy' | 'sell';
        price: number;
        originalSize: number;
        filledSize: number;
        remainingSize: number;
        status: string;
        market: string;
        createdAt: string;
        expiration?: string;
    } | null> {
        if (!this.clobClient) {
            console.error('[ClobTradingService] Not initialized');
            return null;
        }
        
        try {
            const orders = await this.getOpenOrders();
            const order = orders.find((o: any) => o.id === orderId) as any;
            
            if (!order) {
                return null;
            }
            
            return {
                id: order.id,
                tokenId: order.asset_id || order.tokenID,
                side: order.side === 'BUY' ? 'buy' : 'sell',
                price: parseFloat(order.price),
                originalSize: parseFloat(order.original_size || order.size),
                filledSize: parseFloat(order.size_matched || 0),
                remainingSize: parseFloat(order.size),
                status: order.status,
                market: order.market,
                createdAt: order.created_at,
                expiration: order.expiration
            };
        } catch (error) {
            console.error('[ClobTradingService] Failed to get order details:', error);
            return null;
        }
    }
    
    /**
     * Get orders grouped by market
     */
    async getOrdersByMarket(): Promise<Record<string, Array<{
        id: string;
        side: 'buy' | 'sell';
        price: number;
        size: number;
        filled: number;
        status: string;
        tokenId: string;
    }>>> {
        if (!this.clobClient) {
            console.error('[ClobTradingService] Not initialized');
            return {};
        }
        
        try {
            const orders = await this.getOpenOrders();
            const grouped: Record<string, any[]> = {};
            
            for (const order of orders) {
                const orderAny = order as any;
                const market = orderAny.market;
                
                if (!grouped[market]) {
                    grouped[market] = [];
                }
                
                grouped[market].push({
                    id: orderAny.id,
                    side: orderAny.side === 'BUY' ? 'buy' : 'sell',
                    price: parseFloat(orderAny.price),
                    size: parseFloat(orderAny.size),
                    filled: parseFloat(orderAny.size_matched || 0),
                    status: orderAny.status,
                    tokenId: orderAny.asset_id || orderAny.tokenID
                });
            }
            
            return grouped;
        } catch (error) {
            console.error('[ClobTradingService] Failed to get orders by market:', error);
            return {};
        }
    }
    
    /**
     * Get balance and allowance info for the connected wallet
     * Returns USDC balance and approval status for trading contracts
     * 
     * Requires Trading API credentials (derived via createOrDeriveApiKey)
     */
    async getBalanceAllowance(): Promise<{
        balance: string;
        allowance: string;
        hasAllowance: boolean;
    } | null> {
        if (!this.clobClient) {
            console.error('[ClobTradingService] Not initialized');
            return null;
        }
        
        // Need trading credentials to call balance API
        if (!this._hasTradingCredentials) {
            console.error('[ClobTradingService] Trading credentials required for balance queries');
            return null;
        }
        
        try {
            const result = await this.clobClient.getBalanceAllowance({
                asset_type: AssetType.COLLATERAL  // USDC collateral
            });
            
            const balance = result?.balance || '0';
            const allowance = result?.allowance || '0';
            const hasAllowance = parseFloat(allowance) > 0;
            
            return {
                balance,
                allowance,
                hasAllowance
            };
        } catch (error) {
            console.error('[ClobTradingService] Failed to get balance:', error);
            return null;
        }
    }
    
    /**
     * Get conditional token balance for a specific position
     * @param tokenId - The CLOB token ID for the outcome
     */
    async getPositionBalance(tokenId: string): Promise<{
        balance: string;
        allowance: string;
    } | null> {
        if (!this.clobClient) {
            console.error('[ClobTradingService] Not initialized');
            return null;
        }
        
        if (!this._hasTradingCredentials) {
            console.error('[ClobTradingService] Trading credentials required');
            return null;
        }
        
        try {
            const result = await this.clobClient.getBalanceAllowance({
                asset_type: AssetType.CONDITIONAL,
                token_id: tokenId
            });
            
            return {
                balance: result?.balance || '0',
                allowance: result?.allowance || '0'
            };
        } catch (error) {
            console.error('[ClobTradingService] Failed to get position balance:', error);
            return null;
        }
    }
    
    /**
     * Refresh balance cache on server
     * Call this after deposits or trades to update balance
     */
    async refreshBalance(): Promise<boolean> {
        if (!this.clobClient) {
            console.error('[ClobTradingService] Not initialized');
            return false;
        }
        
        if (!this._hasTradingCredentials) {
            console.error('[ClobTradingService] Trading credentials required');
            return false;
        }
        
        try {
            // Just query balance to refresh cache
            await this.getBalanceAllowance();
            console.log('[ClobTradingService] ✅ Balance refreshed');
            return true;
        } catch (error) {
            console.error('[ClobTradingService] Failed to refresh balance:', error);
            return false;
        }
    }
}

// ============= Exports =============

/**
 * Get the ClobTradingService singleton instance
 */
export function getClobTradingService(): ClobTradingService {
    return ClobTradingService.getInstance();
}

export default ClobTradingService;

// Import POLYGON_CONTRACTS for balance queries
import { POLYGON_CONTRACTS } from './config';
