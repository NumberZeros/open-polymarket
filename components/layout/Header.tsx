"use client";

/**
 * Header Component
 *
 * Navigation header with wallet connection
 */

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePolymarketStore } from "@/stores/polymarketStore";
import { TrendingUp, Wallet } from "lucide-react";

export function Header() {
  const { usdcBalance, getStatus } = usePolymarketStore();
  const status = getStatus();

  return (
    <header className="sticky top-0 z-50 bg-[#121214]/80 backdrop-blur-md border-b border-[#27272a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-[#8b5cf6]" />
            <span className="text-xl font-bold">BetHub</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-[#a1a1aa] hover:text-white transition-colors"
            >
              Markets
            </Link>
            <Link
              href="/portfolio"
              className="text-[#a1a1aa] hover:text-white transition-colors"
            >
              Portfolio
            </Link>
            <Link
              href="/wallet"
              className="text-[#a1a1aa] hover:text-white transition-colors"
            >
              Wallet
            </Link>
            <Link
              href="/deposit"
              className="text-[#a1a1aa] hover:text-white transition-colors"
            >
              Deposit
            </Link>
            <Link
              href="/withdraw"
              className="text-[#a1a1aa] hover:text-white transition-colors"
            >
              Withdraw
            </Link>
            <Link
              href="/trading-setup"
              className="text-[#a1a1aa] hover:text-white transition-colors"
            >
              Trading Setup
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Balance */}
            {status.hasWallet && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1e] rounded-lg border border-[#27272a]">
                <Wallet className="w-4 h-4 text-[#8b5cf6]" />
                <span className="text-sm font-medium">
                  ${usdcBalance.toFixed(2)}
                </span>
              </div>
            )}

            {/* Connect Wallet */}
            <ConnectButton
              chainStatus="icon"
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
              showBalance={false}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
