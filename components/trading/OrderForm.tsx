"use client";

/**
 * Order Form Component
 *
 * Allows users to place buy/sell orders on a market outcome
 * Supports both Market and Limit order types
 */

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";
import { getOrderBook, calculateMarketPrice } from "@/lib/polymarket/marketApi";
import type { Market, OrderBook, TradeEstimate, OrderType } from "@/lib/polymarket/types";
import { Loader2, AlertCircle, ArrowRight, TrendingUp, Target } from "lucide-react";

// Temporary estimate functions until we migrate to SDK
function estimateBuy(orderBook: OrderBook, usdcAmount: number): TradeEstimate {
  const bestAsk = orderBook.asks[0];
  const price = bestAsk ? parseFloat(bestAsk.price) : 0.5;
  const shares = usdcAmount / price; // USDC amount / price = shares
  return {
    cost: usdcAmount,
    shares: shares,
    avgPrice: price,
    slippage: 0,
    potentialReturn: shares,
    potentialProfit: shares - usdcAmount,
  };
}

function estimateSell(orderBook: OrderBook, shareAmount: number): TradeEstimate {
  const bestBid = orderBook.bids[0];
  const price = bestBid ? parseFloat(bestBid.price) : 0.5;
  const proceeds = shareAmount * price; // shares * price = USDC received
  return {
    cost: shareAmount,
    shares: shareAmount,
    avgPrice: price,
    slippage: 0,
    potentialReturn: proceeds,
    potentialProfit: proceeds - shareAmount,
  };
}

interface OrderFormProps {
  market: Market;
  selectedOutcome?: "Yes" | "No";
}

export function OrderForm({ market, selectedOutcome = "Yes" }: OrderFormProps) {
  // Use provider hooks
  const { isConnected } = useAccount();
  const { isConnected: isWalletConnected } = useWallet();
  const { clobClient, tradingSession, isTradingSessionComplete, initializeTradingSession } = useTrading();
  
  const canTrade = isConnected && isWalletConnected && isTradingSessionComplete && !!clobClient;
  
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState<string>("");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [estimate, setEstimate] = useState<TradeEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get the token for the selected outcome
  // If market.tokens exists (from CLOB API), use it
  // Otherwise, derive from clobTokenIds and outcomes
  const selectedToken = (() => {
    // Try to get from tokens array first (CLOB API)
    if (market.tokens?.length) {
      return market.tokens.find((t) => 
        t.outcome?.toLowerCase() === selectedOutcome.toLowerCase()
      ) || null;
    }
    
    // Fallback: construct token object from clobTokenIds and outcomes
    if (market.outcomes) {
      try {
        // Parse outcomes
        const outcomes = typeof market.outcomes === 'string' 
          ? JSON.parse(market.outcomes) 
          : market.outcomes;
        
        // Parse clobTokenIds if it's a string
        let tokenIds: string[] = [];
        if (typeof market.clobTokenIds === 'string') {
          tokenIds = JSON.parse(market.clobTokenIds);
        } else if (Array.isArray(market.clobTokenIds)) {
          tokenIds = market.clobTokenIds;
        }
        
        if (Array.isArray(outcomes) && tokenIds.length > 0) {
          const outcomeIndex = outcomes.findIndex(
            (o: string) => o.toLowerCase() === selectedOutcome.toLowerCase()
          );
          
          if (outcomeIndex >= 0 && tokenIds[outcomeIndex]) {
            const tokenId = tokenIds[outcomeIndex];
            // Clean token ID (remove quotes if present)
            const cleanTokenId = tokenId.replace(/^["']|["']$/g, '').trim();
            
            if (cleanTokenId) {
              return {
                token_id: cleanTokenId,
                outcome: selectedOutcome,
                price: undefined,
                winner: false,
              };
            }
          }
        }
      } catch (err) {
        console.error("[OrderForm] Failed to parse token data:", err);
      }
    }
    
    return null;
  })();

  // Auto-initialize trading session if wallet is connected and session exists but not initialized
  useEffect(() => {
    const shouldInitialize = isConnected && isWalletConnected && tradingSession && !isTradingSessionComplete && !clobClient;
    
    if (shouldInitialize) {
      // Session exists but relay client not initialized, restore it
      let isMounted = true;
      
      initializeTradingSession().catch((err) => {
        if (isMounted) {
          console.error("[OrderForm] Failed to initialize trading session:", err);
        }
      });

      return () => {
        isMounted = false;
      };
    }
  }, [isConnected, isWalletConnected, tradingSession, isTradingSessionComplete, clobClient]);

  // Load order book
  useEffect(() => {
    if (!selectedToken?.token_id) return;

    const loadOrderBook = async () => {
      try {
        const book = await getOrderBook(selectedToken.token_id);
        setOrderBook(book);
      } catch (err) {
        console.error("Failed to load order book:", err);
      }
    };

    loadOrderBook();
    const interval = setInterval(loadOrderBook, 5000); // Refresh every 5s

    return () => clearInterval(interval);
  }, [selectedToken?.token_id]);

  // Calculate estimate when amount changes (for market orders)
  useEffect(() => {
    if (orderType !== "MARKET" || !orderBook || !amount || isNaN(parseFloat(amount))) {
      setEstimate(null);
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      setEstimate(null);
      return;
    }

    if (side === "BUY") {
      setEstimate(estimateBuy(orderBook, amountNum));
    } else {
      setEstimate(estimateSell(orderBook, amountNum));
    }
  }, [amount, side, orderBook, orderType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canTrade) {
      setError("Trading not available. Please connect wallet and complete trading setup first.");
      return;
    }

    if (!selectedToken || !amount) {
      setError("Please enter a valid amount");
      return;
    }

    // Validate market is open
    if (market.closed) {
      setError("This market is closed and not accepting orders");
      return;
    }

    // Support both camelCase (Gamma API) and snake_case (CLOB API)
    const acceptingOrders = market.acceptingOrders ?? market.accepting_orders;
    if (!acceptingOrders) {
      setError("This market is not currently accepting orders");
      return;
    }

    // Validate token exists
    if (!selectedToken.token_id) {
      setError("Invalid token - please refresh the page");
      return;
    }

    // Validate minimum order size
    const minSize = parseFloat(market.minimum_order_size || "1");
    if (parseFloat(amount) < minSize) {
      setError(`Minimum order size is ${minSize} USDC`);
      return;
    }

    // Validate CLOB minimum shares (5 shares minimum)
    let currentPrice = marketPrice?.midPrice || 0.5;
    const shareSize = side === "BUY" 
      ? parseFloat(amount) / (orderType === "LIMIT" ? parseFloat(limitPrice) : currentPrice)
      : parseFloat(amount);
    if (shareSize < 5) {
      setError("Minimum order size is 5 shares");
      return;
    }

    // Validate limit order price
    if (orderType === "LIMIT") {
      if (!limitPrice || isNaN(parseFloat(limitPrice))) {
        setError("Please enter a valid limit price");
        return;
      }
      const price = parseFloat(limitPrice);
      if (price <= 0 || price >= 1) {
        setError("Price must be between $0.01 and $0.99");
        return;
      }
    } else {
      // Market order needs estimate
      if (!estimate) {
        setError("Unable to estimate market order");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (!clobClient) {
        throw new Error('Trading client not initialized');
      }

      const orderPrice = orderType === "LIMIT" 
        ? parseFloat(limitPrice)
        : estimate!.avgPrice;

      // Calculate the size in shares
      // For BUY: amount is in USDC, so size = amount / price
      // For SELL: amount is in shares, so size = amount
      const size = side === "BUY" 
        ? parseFloat(amount) / orderPrice
        : parseFloat(amount);

      // Create order using CLOB client directly
      const order = await clobClient.createOrder({
        tokenID: selectedToken.token_id,
        price: orderPrice,
        size: size,
        side: side as any, // BUY or SELL string matches Side enum
        feeRateBps: 0,
      });

      // Post the order to the order book
      await clobClient.postOrder(order);

      setSuccess(`Order placed successfully!`);
      setAmount("");
    } catch (err) {
      console.error('Order placement error:', err);
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setIsLoading(false);
    }
  };

  const marketPrice = orderBook ? calculateMarketPrice(orderBook) : null;

  return (
    <form onSubmit={handleSubmit} className="bg-[#16161a] rounded-xl border border-[#27272a] p-4">
      <h3 className="font-semibold mb-4">
        Trade {selectedOutcome}
      </h3>

      {/* Order Type Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setOrderType("MARKET")}
          className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1.5 ${
            orderType === "MARKET"
              ? "bg-[#8b5cf6] text-white"
              : "bg-[#1a1a1e] text-[#a1a1aa] hover:text-white"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Market
        </button>
        <button
          type="button"
          onClick={() => setOrderType("LIMIT")}
          className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1.5 ${
            orderType === "LIMIT"
              ? "bg-[#8b5cf6] text-white"
              : "bg-[#1a1a1e] text-[#a1a1aa] hover:text-white"
          }`}
        >
          <Target className="w-4 h-4" />
          Limit
        </button>
      </div>

      {/* Buy/Sell Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setSide("BUY")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            side === "BUY"
              ? "bg-[#22c55e] text-white"
              : "bg-[#1a1a1e] text-[#a1a1aa] hover:text-white"
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setSide("SELL")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            side === "SELL"
              ? "bg-[#ef4444] text-white"
              : "bg-[#1a1a1e] text-[#a1a1aa] hover:text-white"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Current Price */}
      {marketPrice && (
        <div className="mb-4 p-3 bg-[#1a1a1e] rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-[#a1a1aa]">Current Price</span>
            <span className="font-medium">
              ${marketPrice.midPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-[#a1a1aa]">Spread</span>
            <span className="text-[#71717a]">
              ${marketPrice.spread.toFixed(3)}
            </span>
          </div>
        </div>
      )}

      {/* Limit Price Input (only for limit orders) */}
      {orderType === "LIMIT" && (
        <div className="mb-4">
          <label className="block text-sm text-[#a1a1aa] mb-2">
            Limit Price (USD)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71717a]">$</span>
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="0.50"
              min="0.01"
              max="0.99"
              step="0.01"
              className="w-full bg-[#1a1a1e] border border-[#27272a] rounded-lg pl-8 pr-4 py-3 text-white focus:outline-none focus:border-[#8b5cf6]"
            />
          </div>
          <p className="mt-1 text-xs text-[#71717a]">
            {marketPrice && `Market: $${marketPrice.midPrice.toFixed(2)}`}
          </p>
        </div>
      )}

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-sm text-[#a1a1aa] mb-2">
          Amount ({side === "BUY" ? "USDC" : "Shares"})
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
          className="w-full bg-[#1a1a1e] border border-[#27272a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8b5cf6]"
        />
      </div>

      {/* Estimate for Market Orders */}
      {orderType === "MARKET" && estimate && (
        <div className="mb-4 p-3 bg-[#0a0a0b] rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#a1a1aa]">
              {side === "BUY" ? "You'll receive" : "You'll get"}
            </span>
            <span className="font-medium">
              {side === "BUY"
                ? `${estimate.shares.toFixed(2)} shares`
                : `$${estimate.shares.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#a1a1aa]">Avg. Price</span>
            <span>${estimate.avgPrice.toFixed(3)}</span>
          </div>
          {estimate.slippage > 0.01 && (
            <div className="flex justify-between text-sm">
              <span className="text-[#f59e0b]">Slippage</span>
              <span className="text-[#f59e0b]">
                {(estimate.slippage * 100).toFixed(2)}%
              </span>
            </div>
          )}
          {side === "BUY" && estimate.potentialProfit > 0 && (
            <div className="flex justify-between text-sm border-t border-[#27272a] pt-2 mt-2">
              <span className="text-[#22c55e]">Potential Profit</span>
              <span className="text-[#22c55e]">
                ${estimate.potentialProfit.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Estimate for Limit Orders */}
      {orderType === "LIMIT" && limitPrice && amount && (
        <div className="mb-4 p-3 bg-[#0a0a0b] rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#a1a1aa]">
              {side === "BUY" ? "You'll receive" : "You'll get"}
            </span>
            <span className="font-medium">
              {side === "BUY"
                ? `~${(parseFloat(amount) / parseFloat(limitPrice)).toFixed(2)} shares`
                : `~$${amount}`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#a1a1aa]">Limit Price</span>
            <span>${parseFloat(limitPrice).toFixed(3)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#a1a1aa]">Total Cost</span>
            <span>${side === "BUY" ? amount : (parseFloat(amount) * parseFloat(limitPrice)).toFixed(2)}</span>
          </div>
          {marketPrice && (
            <div className="flex justify-between text-sm text-[#71717a] border-t border-[#27272a] pt-2 mt-2">
              <span>Current Market</span>
              <span>${marketPrice.midPrice.toFixed(3)}</span>
            </div>
          )}
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg text-[#ef4444] text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg text-[#22c55e] text-sm">
          {success}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={
          isLoading || 
          !amount || 
          !canTrade ||
          (orderType === "LIMIT" && !limitPrice)
        }
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
          side === "BUY"
            ? "bg-[#22c55e] hover:bg-[#16a34a] disabled:bg-[#22c55e]/50"
            : "bg-[#ef4444] hover:bg-[#dc2626] disabled:bg-[#ef4444]/50"
        } disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Place {orderType === "LIMIT" ? "Limit" : "Market"} {side === "BUY" ? "Buy" : "Sell"}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
      
      {/* Order Type Info */}
      <p className="mt-2 text-xs text-[#71717a] text-center">
        {orderType === "MARKET" 
          ? "Market orders execute immediately at the best available price"
          : "Limit orders only execute at your specified price or better"}
      </p>

      {/* Wallet Connection Warning */}
      {!isConnected && (
        <div className="mt-3 p-3 bg-[#27272a] rounded-lg text-center">
          <p className="text-sm text-[#a1a1aa] mb-2">
            Connect your wallet to start trading
          </p>
          <p className="text-xs text-[#71717a]">
            Click "Connect Wallet" in the header
          </p>
        </div>
      )}
      {isConnected && !canTrade && (
        <div className="mt-3 p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg text-center">
          <p className="text-sm text-[#f59e0b] mb-2">
            ⚠️ {tradingSession ? "Trading client not initialized" : "Trading not enabled"}
          </p>
          <p className="text-xs text-[#a1a1aa] mb-3">
            {tradingSession
              ? "Please go to Wallet page and re-initialize trading session"
              : "You need to complete trading setup to trade"
            }
          </p>
          <a
            href={tradingSession ? "/wallet" : "/trading-setup"}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] text-white text-sm font-medium rounded-lg hover:bg-[#7c3aed] transition-colors"
          >
            {tradingSession ? "Go to Wallet" : "Complete Setup"}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </form>
  );
}
