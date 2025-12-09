"use client";

/**
 * Header Component
 *
 * Navigation header with wallet connection
 * Shows both EOA and Proxy Wallet USDC balances
 * Includes mobile menu
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance } from "wagmi";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";
import { POLYGON_CONTRACTS } from "@/lib/polymarket/config";
import { MobileMenu } from "@/components/ui/MobileMenu";
import { TrendingUp, Wallet, Shield } from "lucide-react";
import useSafeBalance from "@/hooks/useSafeBalance";

export function Header() {
  const { address, isConnected } = useAccount();
  const { isConnected: isWalletConnected } = useWallet();
  const { isTradingSessionComplete, clobClient, safeAddress } = useTrading();
  
  const [isMounted, setIsMounted] = useState(false);
  const [eoaUsdcBalance, setEoaUsdcBalance] = useState<number>(0);
  
  // Fetch Safe balance using custom hook
  const { balance: safeBalance } = useSafeBalance(safeAddress);
  
  const canTrade = isConnected && isWalletConnected && isTradingSessionComplete && !!clobClient;

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch EOA USDC balance from chain
  const { data: eoaBalanceData } = useBalance({
    address: address,
    token: POLYGON_CONTRACTS.USDC as `0x${string}`,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 30000, // Refresh every 30s
    },
  });

  // Sync EOA balance from chain data
  useEffect(() => {
    if (eoaBalanceData) {
      const balance = parseFloat(eoaBalanceData.formatted);
      setEoaUsdcBalance(balance);
    }
  }, [eoaBalanceData]);

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
            {/* Balances - only render after mount to prevent hydration mismatch */}
            {isMounted && isConnected && (
              <div className="hidden sm:flex items-center gap-3">
                {/* EOA Balance */}
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1e] rounded-lg border border-[#27272a]"
                  title="Wallet Balance (EOA)"
                >
                  <Wallet className="w-4 h-4 text-[#a1a1aa]" />
                  <span className="text-sm font-medium text-[#a1a1aa]">
                    ${eoaUsdcBalance.toFixed(2)}
                  </span>
                </div>
                {/* Safe Wallet Balance */}
                {safeAddress && (
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1e] rounded-lg border border-[#8b5cf6]/30"
                    title="Trading Balance (Safe Wallet)"
                  >
                    <Shield className="w-4 h-4 text-[#8b5cf6]" />
                    <span className="text-sm font-medium text-white">
                      ${safeBalance.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Connect Wallet - only render after mount to prevent SSR issues */}
            {isMounted && (
              <ConnectButton
                chainStatus="icon"
                accountStatus={{
                  smallScreen: "avatar",
                  largeScreen: "full",
                }}
                showBalance={false}
              />
            )}

            {/* Mobile Menu */}
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
