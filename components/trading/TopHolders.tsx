"use client";

/**
 * Top Holders Component
 * 
 * Displays the largest position holders for a market outcome
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface Holder {
  address: string;
  size: number;
  value: number;
  percentage: number;
}

interface TopHoldersProps {
  tokenId: string;
  outcome: string;
}

export function TopHolders({ tokenId, outcome }: TopHoldersProps) {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopHolders = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use internal proxy to avoid CORS
        const response = await fetch(
          `/api/polymarket/top-holders/${tokenId}?limit=10`
        );

        if (!response.ok) {
          // Gracefully handle if endpoint doesn't exist
          console.warn("[TopHolders] API not available");
          setError(null); // Don't show error, just hide the component
          setHolders([]);
          return;
        }

        const data = await response.json();
        setHolders(data.holders || []);
      } catch (err) {
        // Silently fail - this feature is optional
        console.warn("[TopHolders] Feature not available");
        setError(null);
        setHolders([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (tokenId) {
      fetchTopHolders();
    }
  }, [tokenId]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#8b5cf6]" />
          <h3 className="font-semibold text-white">Top Holders</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#8b5cf6]" />
        </div>
      </div>
    );
  }

  // Hide component if no data (optional feature)
  if (error || holders.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#16161a] rounded-xl border border-[#27272a] overflow-hidden">
      <div className="p-4 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#8b5cf6]" />
          <h3 className="font-semibold text-white">Top Holders - {outcome}</h3>
        </div>
        <p className="text-xs text-[#71717a] mt-1">
          Largest position holders by size
        </p>
      </div>

      <div className="divide-y divide-[#27272a]">
        {holders.map((holder, index) => (
          <motion.div
            key={holder.address}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-4 hover:bg-[#1a1a1e] transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] font-semibold text-sm">
                #{index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-white">
                    {formatAddress(holder.address)}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(holder.address);
                    }}
                    className="text-[#71717a] hover:text-[#8b5cf6] transition-colors"
                    title="Copy address"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-[#71717a]">
                  {holder.percentage.toFixed(2)}% of total supply
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-white">
                {holder.size.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </div>
              <div className="text-xs text-[#71717a]">
                ${holder.value.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
