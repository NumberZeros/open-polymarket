"use client";

/**
 * Market Card Component
 *
 * Displays a single market with key info and prices
 */

import Link from "next/link";
import type { Market } from "@/lib/polymarket/types";
import { parseOutcomePrices, formatPercent } from "@/lib/polymarket/marketApi";
import { Clock, Users } from "lucide-react";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const prices = parseOutcomePrices(market);
  const isActive = market.active && !market.closed;
  const endDate = market.end_date_iso
    ? new Date(market.end_date_iso)
    : null;

  return (
    <Link
      href={`/markets/${market.condition_id}`}
      className="block bg-[#16161a] rounded-xl border border-[#27272a] hover:border-[#8b5cf6]/50 transition-all duration-200 overflow-hidden group"
    >
      {/* Image */}
      {market.image && (
        <div className="relative h-32 overflow-hidden">
          <img
            src={market.image}
            alt={market.question}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#16161a] to-transparent" />
        </div>
      )}

      <div className="p-4">
        {/* Question */}
        <h3 className="font-semibold text-white mb-3 line-clamp-2 group-hover:text-[#8b5cf6] transition-colors">
          {market.question}
        </h3>

        {/* Prices */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-[#22c55e]/10 rounded-lg p-2 text-center">
            <div className="text-[#22c55e] font-bold text-lg">
              {formatPercent(prices.yes)}
            </div>
            <div className="text-xs text-[#a1a1aa]">Yes</div>
          </div>
          <div className="flex-1 bg-[#ef4444]/10 rounded-lg p-2 text-center">
            <div className="text-[#ef4444] font-bold text-lg">
              {formatPercent(prices.no)}
            </div>
            <div className="text-xs text-[#a1a1aa]">No</div>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-[#71717a]">
          <div className="flex items-center gap-1">
            {market.volume && (
              <>
                <Users className="w-3 h-3" />
                <span>${parseFloat(market.volume).toLocaleString()}</span>
              </>
            )}
          </div>

          {endDate && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                {endDate > new Date()
                  ? `Ends ${endDate.toLocaleDateString()}`
                  : "Ended"}
              </span>
            </div>
          )}
        </div>

        {/* Status badge */}
        {!isActive && (
          <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-[#27272a] rounded-full text-xs text-[#a1a1aa]">
            {market.closed ? "Closed" : "Inactive"}
          </div>
        )}
      </div>
    </Link>
  );
}
