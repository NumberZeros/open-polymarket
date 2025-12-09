"use client";

/**
 * Wallet Page
 *
 * Wallet setup, deposits, and withdrawals
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";
import { useAccount, usePublicClient, useWalletClient, useSignTypedData } from "wagmi";
import { formatUsdc } from "@/lib/polymarket/marketApi";
import { createEthersWallet } from "@/lib/polymarket/ethersWallet";

import { POLYGON_CONTRACTS } from "@/lib/polymarket/config";
import { deploySafe } from "@/lib/polymarket/relayerApi";
import {
  deriveProxyWalletAddress,
  isProxyWalletDeployed,
  getProxyWalletUsdcBalance,
  formatUsdcAmount,
} from "@/lib/polymarket/proxyWallet";
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
  RefreshCw,
} from "lucide-react";

export default function WalletPage() {
  // Prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Provider hooks
  const { isConnected: isWalletConnected } = useWallet();
  const { 
    sessionError,
    tradingSession,
    initializeTradingSession 
  } = useTrading();
  
  const credentials = tradingSession?.apiCredentials;

  // Proxy Wallet state
  const [proxyWalletAddress, setProxyWalletAddress] = useState<string | null>(null);
  const [proxyWalletDeployed, setProxyWalletDeployed] = useState<boolean | null>(null);
  const [localProxyBalance, setLocalProxyBalance] = useState<bigint | null>(null);
  const [eoaBalance, setEoaBalance] = useState<bigint | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Fetch Proxy Wallet info
  const fetchProxyWalletInfo = useCallback(async () => {
    if (!address || !publicClient) return;

    setIsLoadingWallet(true);
    try {
      // Derive proxy wallet address
      const proxyAddr = deriveProxyWalletAddress(address);
      setProxyWalletAddress(proxyAddr);

      // Check if deployed
      const deployed = await isProxyWalletDeployed(proxyAddr, publicClient);
      setProxyWalletDeployed(deployed);

      // Get balances for both EOA and Proxy
      const [proxyBalance, eoaBal] = await Promise.all([
        getProxyWalletUsdcBalance(proxyAddr, publicClient),
        getProxyWalletUsdcBalance(address, publicClient), // Using same function for EOA
      ]);
      
      setLocalProxyBalance(proxyBalance);
      setEoaBalance(eoaBal);
    } catch (err) {
      console.error("Failed to fetch proxy wallet info:", err);
    } finally {
      setIsLoadingWallet(false);
    }
  }, [address, publicClient]);

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch on mount and address change
  useEffect(() => {
    if (!isMounted) return;
    fetchProxyWalletInfo();
  }, [isMounted, fetchProxyWalletInfo]);

  // Deploy Proxy Wallet (Safe)
  const handleDeployProxyWallet = async () => {
    if (!address || !walletClient) return;

    setIsDeploying(true);
    setDeployError(null);

    try {
      // Create ethers wallet from viem wallet client
      const ethersWallet = await createEthersWallet();
      if (!ethersWallet) {
        throw new Error('Failed to create ethers wallet');
      }

      // Cast to JsonRpcSigner since createEthersWallet returns a signer
      const result = await deploySafe(ethersWallet as any);

      if (result.success) {
        // Refresh proxy wallet info after deployment
        await fetchProxyWalletInfo();
      } else {
        setDeployError(result.error || "Failed to deploy Proxy Wallet");
      }
    } catch (err) {
      console.error("Deploy error:", err);
      setDeployError(err instanceof Error ? err.message : "Failed to deploy Proxy Wallet");
    } finally {
      setIsDeploying(false);
    }
  };

  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const openPolygonScan = (address: string) => {
    window.open(`https://polygonscan.com/address/${address}`, "_blank");
  };

  // Action handlers
  const handleDeriveCredentials = async () => {
    try {
      await initializeTradingSession();
    } catch (error) {
      console.error('Failed to create credentials:', error);
    }
  };

  // Setup steps - Including Proxy Wallet (Safe) status
  const steps = [
    {
      id: "connect",
      title: "Connect Wallet",
      description: "Connect your MetaMask or Web3 wallet",
      completed: isConnected,
      action: null as (() => Promise<void>) | null,
      actionLabel: "",
      requiresPrevious: false,
    },
    {
      id: "proxy-wallet",
      title: "Proxy Wallet (Safe)",
      description: proxyWalletDeployed
        ? "Your Proxy Wallet is deployed and ready for trading"
        : "Deploy your Proxy Wallet to start trading on Polymarket",
      completed: proxyWalletDeployed === true,
      action: proxyWalletDeployed === false ? handleDeployProxyWallet : null,
      actionLabel: "Deploy Proxy Wallet",
      requiresPrevious: !isConnected,
      showStatus: true,
      statusText: proxyWalletDeployed === null
        ? "Checking..."
        : proxyWalletDeployed
        ? "Deployed"
        : "Not Deployed",
      isDeploying: isDeploying,
    },
    {
      id: "credentials",
      title: "Create Trading Credentials",
      description: "Sign to create API credentials for trading",
      completed: !!credentials,
      action: handleDeriveCredentials,
      actionLabel: "Create Credentials",
      requiresPrevious: !isConnected,
    },
  ];

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Wallet Setup</h1>

        {/* Balance Cards */}
        {isConnected && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* EOA Balance */}
            <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-[#a1a1aa] mb-1">EOA Wallet Balance</p>
                  <div className="text-2xl font-bold text-white">
                    {isLoadingWallet ? (
                      <Loader2 className="w-6 h-6 animate-spin text-[#a1a1aa]" />
                    ) : eoaBalance !== null ? (
                      `$${formatUsdcAmount(eoaBalance)}`
                    ) : (
                      "$0.00"
                    )}
                  </div>
                  <p className="text-xs text-[#71717a] mt-1">Your connected wallet</p>
                </div>
                <Wallet className="w-10 h-10 text-[#3b82f6]" />
              </div>
            </div>

            {/* Proxy Wallet Balance */}
            <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-[#a1a1aa] mb-1">Proxy Wallet Balance</p>
                  <div className="text-2xl font-bold text-white flex items-center gap-2">
                    {isLoadingWallet ? (
                      <Loader2 className="w-6 h-6 animate-spin text-[#a1a1aa]" />
                    ) : localProxyBalance !== null ? (
                      `$${formatUsdcAmount(localProxyBalance)}`
                    ) : (
                      "$0.00"
                    )}
                    <button
                      onClick={fetchProxyWalletInfo}
                      disabled={isLoadingWallet}
                      className="p-1.5 hover:bg-[#27272a] rounded-lg transition-colors"
                      title="Refresh balances"
                    >
                      <RefreshCw className={`w-4 h-4 text-[#a1a1aa] ${isLoadingWallet ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  <p className="text-xs text-[#71717a] mt-1">Trading balance (USDC.e)</p>
                </div>
                <Shield className="w-10 h-10 text-[#8b5cf6]" />
              </div>
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

                    {/* Status Badge */}
                    {(step as any).showStatus && (
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            (step as any).statusText === "Deployed"
                              ? "bg-[#22c55e]/10 text-[#22c55e]"
                              : (step as any).statusText === "Checking..."
                              ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                              : "bg-[#71717a]/10 text-[#71717a]"
                          }`}
                        >
                          {(step as any).statusText === "Deployed" && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {(step as any).statusText === "Checking..." && (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                          {(step as any).statusText}
                        </span>
                      </div>
                    )}

                    {/* Action Button */}
                    {step.action && !step.completed && (
                      <button
                        onClick={step.action}
                        disabled={isLoadingWallet || step.requiresPrevious || (step as any).isDeploying}
                        className="mt-3 px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:bg-[#8b5cf6]/50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        {(isLoadingWallet || (step as any).isDeploying) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : null}
                        {(step as any).isDeploying ? "Deploying..." : step.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wallet Addresses */}
        {isConnected && (
          <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">Wallet Addresses</h2>

            <div className="space-y-4">
              {/* Proxy Wallet Address */}
              {proxyWalletAddress && (
                <div className="p-4 bg-[#1a1a1e] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#a1a1aa] flex items-center gap-2">
                      Proxy Wallet (Safe)
                      {proxyWalletDeployed !== null && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            proxyWalletDeployed
                              ? "bg-[#22c55e]/10 text-[#22c55e]"
                              : "bg-[#71717a]/10 text-[#71717a]"
                          }`}
                        >
                          {proxyWalletDeployed ? "Deployed" : "Not Deployed"}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(proxyWalletAddress, "proxy")}
                        className="p-1 hover:bg-[#27272a] rounded transition-colors"
                        title="Copy address"
                      >
                        {copied === "proxy" ? (
                          <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                        ) : (
                          <Copy className="w-4 h-4 text-[#a1a1aa]" />
                        )}
                      </button>
                      <button
                        onClick={() => openPolygonScan(proxyWalletAddress)}
                        className="p-1 hover:bg-[#27272a] rounded transition-colors"
                        title="View on PolygonScan"
                      >
                        <ExternalLink className="w-4 h-4 text-[#a1a1aa]" />
                      </button>
                    </div>
                  </div>
                  <p className="font-mono text-sm break-all">{proxyWalletAddress}</p>
                  <p className="text-xs text-[#71717a] mt-2">
                    This is your trading wallet on Polymarket. Deposit USDC.e here.
                  </p>
                </div>
              )}

              {/* EOA Address */}
              <div className="p-4 bg-[#1a1a1e] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#a1a1aa]">EOA Wallet (Owner)</span>
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

              {/* Safe Address - Now just shows EOA as trading address */}
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
                  {credentials.key.slice(0, 8)}...
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
        {(sessionError || deployError) && (
          <div className="mt-4 p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg text-[#ef4444] flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {sessionError?.message || deployError}
          </div>
        )}
      </main>
    </div>
  );
}
