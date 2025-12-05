"use client";

/**
 * Deposit Page
 * 
 * Get USDC.e on Polygon to trade on Polymarket.
 * 
 * Options:
 * 1. Bridge from other chains (Ethereum, Solana, Bitcoin, etc.) via Polymarket Bridge
 * 2. Direct transfer USDC.e on Polygon to your Proxy Wallet
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { usePolymarketStore } from "@/stores/polymarketStore";
import { useAccount, usePublicClient } from "wagmi";
import {
  getSupportedAssets,
  createDepositAddresses,
  groupAssetsByChain,
  formatUsdcAmount,
  checkApprovalStatus,
  type SupportedAsset,
  type BridgeDepositAddresses,
} from "@/lib/polymarket/depositService";
import {
  deriveProxyWalletAddress,
  isProxyWalletDeployed,
  getProxyWalletUsdcBalance,
} from "@/lib/polymarket/proxyWallet";
import {
  Wallet,
  ArrowLeft,
  Copy,
  CheckCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Star,
} from "lucide-react";

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { refreshBalances } = usePolymarketStore();

  // State
  const [supportedAssets, setSupportedAssets] = useState<SupportedAsset[]>([]);
  const [depositAddresses, setDepositAddresses] = useState<BridgeDepositAddresses | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedChain, setExpandedChain] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  
  // Proxy Wallet state
  const [proxyWalletAddress, setProxyWalletAddress] = useState<string | null>(null);
  const [isProxyDeployed, setIsProxyDeployed] = useState<boolean | null>(null);
  const [proxyWalletBalance, setProxyWalletBalance] = useState<bigint | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      // Derive Proxy Wallet address
      const proxyAddr = deriveProxyWalletAddress(address);
      setProxyWalletAddress(proxyAddr);
      
      const [assets, addresses] = await Promise.all([
        getSupportedAssets(),
        createDepositAddresses(address),
      ]);
      setSupportedAssets(assets);
      setDepositAddresses(addresses);
      
      // Also fetch USDC balance and Proxy Wallet status
      if (publicClient) {
        const [status, deployed, proxyBalance] = await Promise.all([
          checkApprovalStatus(address, publicClient),
          isProxyWalletDeployed(proxyAddr, publicClient),
          getProxyWalletUsdcBalance(proxyAddr, publicClient),
        ]);
        setUsdcBalance(status.usdcBalance);
        setIsProxyDeployed(deployed);
        setProxyWalletBalance(proxyBalance);
      }
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient]);

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedAddress(id);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Group assets by chain
  const assetsByChain = groupAssetsByChain(supportedAssets);

  // Effects
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(refreshBalances, 30000);
    return () => clearInterval(interval);
  }, [isConnected, refreshBalances]);

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-lg mx-auto text-center">
            <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Connect Wallet</h1>
            <p className="text-gray-400">
              Please connect your wallet to deposit funds
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <Link
            href="/wallet"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Wallet
          </Link>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Deposit</h1>
            <p className="text-gray-400">
              Get USDC.e on Polygon to start trading on Polymarket
            </p>
          </div>

          {/* Current Balance */}
          <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400">Your Wallet Balance (EOA)</span>
              <span className="text-2xl font-bold text-white">
                {usdcBalance !== null ? `$${formatUsdcAmount(usdcBalance)}` : "Loading..."}
              </span>
            </div>
            {proxyWalletBalance !== null && proxyWalletBalance > 0n && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <span className="text-gray-400">Proxy Wallet Balance</span>
                <span className="text-lg font-semibold text-green-400">
                  ${formatUsdcAmount(proxyWalletBalance)}
                </span>
              </div>
            )}
          </div>

          {/* OPTION 1: Direct Polygon Deposit (Recommended) */}
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-6 mb-6 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-white">Option 1: Direct Polygon Deposit (Recommended)</h2>
            </div>
            
            <p className="text-sm text-gray-400 mb-4">
              If you already have <strong className="text-white">USDC.e on Polygon</strong>, send it directly to your Proxy Wallet address:
            </p>
            
            {proxyWalletAddress ? (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-white">Your Proxy Wallet Address</p>
                    <p className="text-xs text-gray-500">
                      {isProxyDeployed === null ? "Checking..." : 
                       isProxyDeployed ? "✅ Deployed & Ready" : "⚠️ Not deployed yet (will be deployed on first use)"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-purple-300 font-mono bg-gray-900 px-3 py-2 rounded truncate">
                    {proxyWalletAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(proxyWalletAddress, "proxy")}
                    className="p-2 rounded bg-purple-600 hover:bg-purple-500 transition-colors flex-shrink-0"
                  >
                    {copiedAddress === "proxy" ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : (
                      <Copy className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Send <strong className="text-purple-400">USDC.e (0x2791Bca...)</strong> on Polygon to this address
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            )}
          </div>

          {/* OPTION 2: Bridge from Other Chains */}
          <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Option 2: Bridge from Other Chains</h2>
            <p className="text-sm text-gray-400 mb-4">
              Send crypto from other chains (Ethereum, Solana, Bitcoin, etc.) to your Bridge deposit addresses. 
              Polymarket will automatically convert to USDC.e on Polygon.
            </p>
          </div>

          {/* Deposit Addresses (Bridge) */}
          <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Bridge Deposit Addresses</h2>
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mb-4">
              Use these addresses to bridge assets from other chains. Polymarket auto-converts to USDC.e.
            </p>

            {isLoading && !depositAddresses ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : depositAddresses ? (
              <div className="space-y-4">
                {/* EVM Chains */}
                <DepositAddressCard
                  title="EVM Chains"
                  subtitle="Ethereum, Polygon, Arbitrum, Base, Optimism, etc."
                  address={depositAddresses.evm}
                  isCopied={copiedAddress === "evm"}
                  onCopy={() => copyToClipboard(depositAddresses.evm, "evm")}
                />
                
                {/* Solana */}
                <DepositAddressCard
                  title="Solana"
                  subtitle="SOL, USDC, and other SPL tokens"
                  address={depositAddresses.svm}
                  isCopied={copiedAddress === "svm"}
                  onCopy={() => copyToClipboard(depositAddresses.svm, "svm")}
                />
                
                {/* Bitcoin */}
                <DepositAddressCard
                  title="Bitcoin"
                  subtitle="BTC only"
                  address={depositAddresses.btc}
                  isCopied={copiedAddress === "btc"}
                  onCopy={() => copyToClipboard(depositAddresses.btc, "btc")}
                />
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Failed to load deposit addresses. Click refresh to try again.
              </p>
            )}
          </div>

          {/* Supported Tokens */}
          <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Supported Tokens by Chain</h2>
            
            {isLoading && supportedAssets.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : supportedAssets.length > 0 ? (
              <div className="space-y-2">
                {Array.from(assetsByChain.entries()).map(([chainName, assets]) => (
                  <div key={chainName} className="border border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedChain(expandedChain === chainName ? null : chainName)}
                      className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-white">{chainName}</span>
                        <span className="text-xs text-gray-500">
                          {assets.length} token{assets.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      {expandedChain === chainName ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    
                    {expandedChain === chainName && (
                      <div className="p-3 bg-gray-850 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {assets.map((asset) => (
                          <div
                            key={`${asset.chainId}-${asset.token.address}`}
                            className="bg-gray-800 rounded-lg p-2 text-center"
                          >
                            <p className="font-medium text-white text-sm">{asset.token.symbol}</p>
                            <p className="text-xs text-gray-500">Min: ${asset.minCheckoutUsd}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No supported assets found</p>
            )}
          </div>

          {/* Alternative: Polymarket Bridge UI */}
          <a
            href="https://bridge.polymarket.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-purple-500/10 rounded-xl hover:bg-purple-500/20 transition-colors border border-purple-500/30 mb-6"
          >
            <div>
              <p className="font-semibold text-white">Polymarket Bridge UI</p>
              <p className="text-sm text-gray-400">Use the official bridge interface</p>
            </div>
            <ExternalLink className="w-5 h-5 text-purple-400" />
          </a>

          {/* Warning */}
          <div className="bg-yellow-500/10 rounded-xl p-4 mb-6 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-200">
                <p className="font-medium mb-1">Important</p>
                <ul className="text-yellow-300/70 space-y-1 list-disc list-inside">
                  <li>Check minimum deposit amounts before sending</li>
                  <li>Only send supported tokens on supported networks</li>
                  <li>Sending wrong tokens/networks may result in permanent loss</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Next Step: Trading Setup */}
          <Link
            href="/trading-setup"
            className="flex items-center justify-between p-4 bg-gray-800 rounded-xl hover:bg-gray-750 transition-colors border border-gray-700"
          >
            <div>
              <p className="font-semibold text-white">Next: Set Up Trading</p>
              <p className="text-sm text-gray-400">Approve tokens to start trading</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </main>
    </div>
  );
}

// Deposit Address Card Component
function DepositAddressCard({
  title,
  subtitle,
  address,
  isCopied,
  onCopy,
}: {
  title: string;
  subtitle: string;
  address: string;
  isCopied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs text-gray-300 font-mono bg-gray-900 px-3 py-2 rounded truncate">
          {address}
        </code>
        <button
          onClick={onCopy}
          className="p-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors flex-shrink-0"
        >
          {isCopied ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );
}
