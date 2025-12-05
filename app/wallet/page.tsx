"use client";

/**
 * Wallet Page
 *
 * Wallet setup, deposits, and withdrawals
 */

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { usePolymarket } from "@/contexts/PolymarketContext";
import { useAccount } from "wagmi";
import { formatUsdc } from "@/lib/polymarket/marketApi";
import { POLYGON_CONTRACTS } from "@/lib/polymarket/config";
import {
  Wallet,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  ArrowDownCircle,
  ArrowUpCircle,
  Key,
} from "lucide-react";

export default function WalletPage() {
  const { address } = useAccount();
  const {
    status,
    isLoading,
    error,
    safeAddress,
    usdcBalance,
    deploySafeWallet,
    setupApprovals,
    deriveCredentials,
    credentials,
  } = usePolymarket();

  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const openPolygonScan = (address: string) => {
    window.open(`https://polygonscan.com/address/${address}`, "_blank");
  };

  // Setup steps
  const steps = [
    {
      id: "connect",
      title: "Connect Wallet",
      description: "Connect your MetaMask or other Web3 wallet",
      completed: status.hasWallet,
      action: null, // Handled by RainbowKit
    },
    {
      id: "safe",
      title: "Deploy Safe Wallet",
      description: "Create a Safe wallet for secure trading",
      completed: !!safeAddress,
      action: deploySafeWallet,
      actionLabel: "Deploy Safe",
    },
    {
      id: "approvals",
      title: "Setup Approvals",
      description: "Approve token spending for trading",
      completed: false, // We don't track this currently
      action: setupApprovals,
      actionLabel: "Setup Approvals",
      requiresPrevious: !safeAddress,
    },
    {
      id: "credentials",
      title: "Derive Trading Credentials",
      description: "Sign to derive your API credentials",
      completed: !!credentials,
      action: deriveCredentials,
      actionLabel: "Derive Credentials",
      requiresPrevious: !safeAddress,
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Wallet Setup</h1>

        {/* Balance Card */}
        {status.hasWallet && (
          <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#a1a1aa] mb-1">Available Balance</p>
                <div className="text-3xl font-bold text-white">
                  {formatUsdc(usdcBalance)}
                </div>
                <p className="text-sm text-[#71717a] mt-1">USDC.e on Polygon</p>
              </div>
              <Wallet className="w-12 h-12 text-[#8b5cf6]" />
            </div>
          </div>
        )}

        {/* Setup Steps */}
        <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#8b5cf6]" />
            Setup Steps
          </h2>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`p-4 rounded-lg border ${
                  step.completed
                    ? "border-[#22c55e]/30 bg-[#22c55e]/5"
                    : "border-[#27272a] bg-[#1a1a1e]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Step Number / Check */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.completed
                        ? "bg-[#22c55e] text-white"
                        : "bg-[#27272a] text-[#a1a1aa]"
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="font-medium">{step.title}</h3>
                    <p className="text-sm text-[#a1a1aa] mt-1">
                      {step.description}
                    </p>

                    {/* Action Button */}
                    {step.action && !step.completed && (
                      <button
                        onClick={step.action}
                        disabled={isLoading || step.requiresPrevious}
                        className="mt-3 px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:bg-[#8b5cf6]/50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : null}
                        {step.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wallet Addresses */}
        {status.hasWallet && (
          <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">Wallet Addresses</h2>

            <div className="space-y-4">
              {/* EOA Address */}
              <div className="p-4 bg-[#1a1a1e] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#a1a1aa]">EOA Wallet</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(address!, "eoa")}
                      className="p-1 hover:bg-[#27272a] rounded transition-colors"
                      title="Copy address"
                    >
                      {copied === "eoa" ? (
                        <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                      ) : (
                        <Copy className="w-4 h-4 text-[#a1a1aa]" />
                      )}
                    </button>
                    <button
                      onClick={() => openPolygonScan(address!)}
                      className="p-1 hover:bg-[#27272a] rounded transition-colors"
                      title="View on PolygonScan"
                    >
                      <ExternalLink className="w-4 h-4 text-[#a1a1aa]" />
                    </button>
                  </div>
                </div>
                <p className="font-mono text-sm break-all">{address}</p>
              </div>

              {/* Safe Address */}
              {safeAddress && (
                <div className="p-4 bg-[#1a1a1e] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#a1a1aa]">
                      Safe Wallet (Trading)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(safeAddress, "safe")}
                        className="p-1 hover:bg-[#27272a] rounded transition-colors"
                        title="Copy address"
                      >
                        {copied === "safe" ? (
                          <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                        ) : (
                          <Copy className="w-4 h-4 text-[#a1a1aa]" />
                        )}
                      </button>
                      <button
                        onClick={() => openPolygonScan(safeAddress)}
                        className="p-1 hover:bg-[#27272a] rounded transition-colors"
                        title="View on PolygonScan"
                      >
                        <ExternalLink className="w-4 h-4 text-[#a1a1aa]" />
                      </button>
                    </div>
                  </div>
                  <p className="font-mono text-sm break-all">{safeAddress}</p>
                  <p className="text-xs text-[#71717a] mt-2">
                    Deposit USDC.e to this address to fund your trading account
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deposit/Withdraw Info */}
        {safeAddress && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Deposit */}
            <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
              <div className="flex items-center gap-3 mb-4">
                <ArrowDownCircle className="w-8 h-8 text-[#22c55e]" />
                <h3 className="text-lg font-semibold">Deposit</h3>
              </div>
              <p className="text-sm text-[#a1a1aa] mb-4">
                Send USDC.e to your Safe wallet address on Polygon network.
              </p>
              <div className="p-3 bg-[#1a1a1e] rounded-lg mb-4">
                <p className="text-xs text-[#a1a1aa] mb-1">Token Contract</p>
                <p className="font-mono text-xs break-all">
                  {POLYGON_CONTRACTS.USDC}
                </p>
              </div>
              <a
                href={`https://app.uniswap.org/swap?chain=polygon&outputCurrency=${POLYGON_CONTRACTS.USDC}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-3 bg-[#22c55e] hover:bg-[#16a34a] rounded-lg font-medium transition-colors"
              >
                Get USDC.e on Uniswap
              </a>
            </div>

            {/* Withdraw */}
            <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
              <div className="flex items-center gap-3 mb-4">
                <ArrowUpCircle className="w-8 h-8 text-[#8b5cf6]" />
                <h3 className="text-lg font-semibold">Withdraw</h3>
              </div>
              <p className="text-sm text-[#a1a1aa] mb-4">
                Withdraw USDC.e from your Safe wallet to any address.
              </p>
              <p className="text-xs text-[#71717a] mb-4">
                Withdrawals are processed through the Polymarket relayer
                (gasless).
              </p>
              <button
                disabled
                className="w-full px-4 py-3 bg-[#27272a] rounded-lg font-medium text-[#71717a] cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        )}

        {/* API Credentials Info */}
        {credentials && (
          <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-5 h-5 text-[#8b5cf6]" />
              <h3 className="text-lg font-semibold">Trading Credentials</h3>
            </div>
            <p className="text-sm text-[#a1a1aa] mb-4">
              Your trading credentials are derived from your wallet signature
              and stored locally.
            </p>
            <div className="p-3 bg-[#0a0a0b] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#71717a]">API Key</span>
                <span className="font-mono text-xs text-[#a1a1aa]">
                  {credentials.apiKey.slice(0, 8)}...
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#71717a]">Status</span>
                <span className="flex items-center gap-1 text-xs text-[#22c55e]">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg text-[#ef4444] flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
