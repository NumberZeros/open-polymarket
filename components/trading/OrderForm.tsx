"use client";

/**
 * Order Form Component
 *
 * Allows users to place buy/sell orders on a market outcome
 */

import { useState, useEffect } from "react";
import { usePolymarketStore } from "@/stores/polymarketStore";
import { getOrderBook, calculateMarketPrice } from "@/lib/polymarket/marketApi";
import { estimateBuy, estimateSell } from "@/lib/polymarket/tradingApi";
import type { Market, OrderBook, TradeEstimate } from "@/lib/polymarket/types";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";

interface OrderFormProps {
  market: Market;
  selectedOutcome?: "Yes" | "No";
}

export function OrderForm({ market, selectedOutcome = "Yes" }: OrderFormProps) {
  const { placeOrder, isLoading: storeLoading, getStatus } = usePolymarketStore();
  const status = getStatus();
  
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState<string>("");
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [estimate, setEstimate] = useState<TradeEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get the token for the selected outcome
  const selectedToken = market.tokens.find(
    (t) => t.outcome.toLowerCase() === selectedOutcome.toLowerCase()
  );

  // Load order book
  useEffect(() => {
    if (!selectedToken) return;

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
  }, [selectedToken]);

  // Calculate estimate when amount changes
  useEffect(() => {
    if (!orderBook || !amount || isNaN(parseFloat(amount))) {
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
  }, [amount, side, orderBook]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!status.canTrade) {
      setError("Trading not available. Please connect wallet and setup first.");
      return;
    }

    if (!selectedToken || !amount || !estimate) {
      setError("Please enter a valid amount");
      return;
    }

    setIsLoading(true);

    try {
      const result = await placeOrder({
        tokenId: selectedToken.token_id,
        side,
        price: estimate.avgPrice,
        size: parseFloat(amount),
      });

      if (result.success) {
        setSuccess(`Order placed successfully!`);
        setAmount("");
      } else {
        setError(result.error || "Failed to place order");
      }
    } catch (err) {
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

      {/* Estimate */}
      {estimate && (
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
        disabled={isLoading || storeLoading || !amount || !status.canTrade}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
          side === "BUY"
            ? "bg-[#22c55e] hover:bg-[#16a34a] disabled:bg-[#22c55e]/50"
            : "bg-[#ef4444] hover:bg-[#dc2626] disabled:bg-[#ef4444]/50"
        } disabled:cursor-not-allowed`}
      >
        {isLoading || storeLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            {side === "BUY" ? "Buy" : "Sell"} {selectedOutcome}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Wallet Connection Warning */}
      {!status.hasWallet && (
        <p className="mt-3 text-center text-sm text-[#a1a1aa]">
          Connect wallet to trade
        </p>
      )}
      {status.hasWallet && !status.canTrade && (
        <p className="mt-3 text-center text-sm text-[#f59e0b]">
          Complete wallet setup to enable trading
        </p>
      )}
    </form>
  );
}
