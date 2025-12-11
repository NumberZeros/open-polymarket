"use client";

/**
 * Withdraw Page
 * 
 * Withdraw USDC.e from Proxy Wallet (Gnosis Safe) on Polygon network.
 * Executes Safe transactions with EIP-712 signature (user pays gas).
 */

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import {
  isValidEthereumAddress,
  validateWithdrawAmount,
  createWithdrawPreview,
  deriveProxyWalletAddress,
  isProxyWalletDeployed,
  getProxyWalletUsdcBalance,
  formatUsdcAmount,
  withdrawFromProxyWallet,
  type WithdrawPreview,
} from "@/lib/polymarket/proxyWallet";
import {
  Wallet,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

export default function WithdrawPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Proxy Wallet state
  const [proxyWalletAddress, setProxyWalletAddress] = useState<string | null>(null);
  const [proxyWalletDeployed, setProxyWalletDeployed] = useState<boolean | null>(null);
  const [proxyWalletBalance, setProxyWalletBalance] = useState<bigint | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Form state
  const [destinationAddress, setDestinationAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Transaction state
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [preview, setPreview] = useState<WithdrawPreview | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Calculate human-readable balance
  const balanceFormatted = proxyWalletBalance !== null 
    ? (Number(proxyWalletBalance) / 1e6).toString()
    : "0";

  // Fetch Proxy Wallet info
  const fetchProxyWalletInfo = useCallback(async () => {
    if (!address || !publicClient) return;

    setIsLoadingWallet(true);
    try {
      const proxyAddr = deriveProxyWalletAddress(address);
      setProxyWalletAddress(proxyAddr);

      const deployed = await isProxyWalletDeployed(proxyAddr, publicClient);
      setProxyWalletDeployed(deployed);

      if (deployed) {
        const balance = await getProxyWalletUsdcBalance(proxyAddr, publicClient);
        setProxyWalletBalance(balance);
      } else {
        setProxyWalletBalance(BigInt(0));
      }
    } catch (err) {
      console.error("Failed to fetch proxy wallet info:", err);
    } finally {
      setIsLoadingWallet(false);
    }
  }, [address, publicClient]);

  // Fetch on mount
  useEffect(() => {
    fetchProxyWalletInfo();
  }, [fetchProxyWalletInfo]);

  // Validate form
  const validateForm = useCallback(() => {
    setError(null);

    if (!proxyWalletDeployed) {
      setError("Proxy Wallet not deployed. Please complete Trading Setup first.");
      return false;
    }

    if (!destinationAddress) {
      setError("Please enter destination address");
      return false;
    }

    if (!isValidEthereumAddress(destinationAddress)) {
      setError("Invalid wallet address");
      return false;
    }

    if (!amount) {
      setError("Please enter amount");
      return false;
    }

    const validation = validateWithdrawAmount(amount, balanceFormatted);
    if (!validation.valid) {
      setError(validation.error || "Invalid amount");
      return false;
    }

    return true;
  }, [destinationAddress, amount, balanceFormatted, proxyWalletDeployed]);

  // Create preview
  const handlePreview = useCallback(() => {
    if (!validateForm()) return;

    const withdrawPreview = createWithdrawPreview(
      destinationAddress,
      amount,
      false // NOT gasless - user pays gas
    );

    setPreview(withdrawPreview);
    setShowConfirmation(true);
  }, [validateForm, destinationAddress, amount]);

  // Execute withdrawal from Proxy Wallet via Safe execTransaction
  const handleWithdraw = useCallback(async () => {
    if (!preview || !address || !proxyWalletAddress || !publicClient || !walletClient) {
      setError("Wallet not connected");
      return;
    }

    setIsWithdrawing(true);
    setError(null);

    try {
      // Convert amount to raw USDC (6 decimals)
      const amountRaw = BigInt(Math.floor(parseFloat(preview.amount) * 1e6));

      console.log("[Withdraw] Executing Proxy Wallet transaction:", {
        from: proxyWalletAddress,
        to: preview.destinationAddress,
        amount: preview.amount,
        amountRaw: amountRaw.toString(),
      });

      // Execute withdrawal through Proxy Wallet's execCalls function
      const result = await withdrawFromProxyWallet(
        {
          proxyWalletAddress,
          destinationAddress: preview.destinationAddress,
          amount: amountRaw,
        },
        publicClient,
        walletClient
      );

      if (result.success && result.transactionHash) {
        console.log("[Withdraw] Transaction hash:", result.transactionHash);
        setTxHash(result.transactionHash);
        setSuccess(true);
        // Refresh balance after withdrawal
        await fetchProxyWalletInfo();
      } else {
        throw new Error(result.error || "Transaction failed");
      }
    } catch (e: unknown) {
      console.error("[Withdraw] Error:", e);
      if (e instanceof Error) {
        if (e.message.includes("rejected") || e.message.includes("denied")) {
          setError("Transaction rejected by user");
        } else if (e.message.includes("insufficient funds")) {
          setError("Insufficient MATIC for gas. Please add MATIC to your EOA wallet.");
        } else {
          setError(e.message);
        }
      } else {
        setError("Transaction failed");
      }
    } finally {
      setIsWithdrawing(false);
    }
  }, [preview, address, proxyWalletAddress, publicClient, walletClient, fetchProxyWalletInfo]);

  // Set max amount
  const handleSetMax = () => {
    setAmount(balanceFormatted);
  };

  // Reset form
  const handleReset = () => {
    setDestinationAddress("");
    setAmount("");
    setPreview(null);
    setShowConfirmation(false);
    setTxHash(null);
    setSuccess(false);
    setError(null);
  };

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
              Please connect your wallet to withdraw funds
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Success state
  if (success && txHash) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-lg mx-auto">
            <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Withdrawal Successful</h1>
              <p className="text-gray-400 mb-6">
                {preview?.amount} USDC.e has been sent to your destination address
              </p>
              
              <div className="bg-gray-800 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
                <p className="font-mono text-sm text-white break-all">{txHash}</p>
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href={`https://polygonscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  View on PolygonScan
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={handleReset}
                  className="px-4 py-3 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition-colors"
                >
                  Make Another Withdrawal
                </button>
                <Link
                  href="/wallet"
                  className="px-4 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Back to Wallet
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Confirmation state
  if (showConfirmation && preview) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-lg mx-auto">
            <Link
              href="/wallet"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Wallet
            </Link>

            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h1 className="text-2xl font-bold text-white mb-6">Confirm Withdrawal</h1>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <span className="text-gray-400">From (Proxy Wallet)</span>
                  <span className="text-white font-mono text-sm truncate max-w-[200px]">
                    {proxyWalletAddress?.slice(0, 8)}...{proxyWalletAddress?.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-white font-semibold">{preview.amount} USDC.e</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <span className="text-gray-400">To Address</span>
                  <span className="text-white font-mono text-sm truncate max-w-[200px]">
                    {preview.destinationAddress}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <span className="text-gray-400">Network</span>
                  <span className="text-white">Polygon</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <span className="text-gray-400">Gas Fee</span>
                  <span className="text-yellow-400">~0.01-0.05 MATIC (paid by you)</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-400">You will receive</span>
                  <span className="text-green-400 font-semibold">{preview.finalAmount} USDC.e</span>
                </div>
              </div>

              {/* Gas warning */}
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-400 text-sm">
                  You will need MATIC in your EOA wallet ({address?.slice(0, 8)}...) to pay for gas fees.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={isWithdrawing}
                  className="flex-1 px-4 py-3 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  className="flex-1 px-4 py-3 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Confirm Withdrawal
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          {/* Back button */}
          <Link
            href="/wallet"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Wallet
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Withdraw</h1>
            <p className="text-gray-400">
              Withdraw USDC.e from your Proxy Wallet to any Polygon address
            </p>
          </div>

          {/* Proxy Wallet Balance */}
          <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Proxy Wallet Balance</span>
              <button
                onClick={fetchProxyWalletInfo}
                disabled={isLoadingWallet}
                className="p-1 hover:bg-gray-800 rounded transition-colors"
                title="Refresh balance"
              >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoadingWallet ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="text-2xl font-bold text-white">
              {isLoadingWallet ? (
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              ) : proxyWalletBalance !== null ? (
                `$${formatUsdcAmount(proxyWalletBalance)}`
              ) : (
                "$0.00"
              )}
            </div>
            {proxyWalletAddress && (
              <p className="text-xs text-gray-500 font-mono mt-2">
                {proxyWalletAddress}
              </p>
            )}
            
            {/* Proxy Wallet not deployed warning */}
            {proxyWalletDeployed === false && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-400 text-sm">
                  Proxy Wallet not deployed.{" "}
                  <Link href="/wallet" className="underline hover:text-yellow-300">
                    Set up your wallet first →
                  </Link>
                </p>
              </div>
            )}

            {/* Not deployed warning */}
            {!proxyWalletDeployed && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-400 text-sm">
                  Proxy Wallet not deployed.{" "}
                  <Link href="/trading-setup" className="underline hover:text-yellow-300">
                    Complete Trading Setup first →
                  </Link>
                </p>
              </div>
            )}
            
            {/* No balance warning */}
            {proxyWalletDeployed && proxyWalletBalance === BigInt(0) && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-400 text-sm">
                  No USDC.e in Proxy Wallet.{" "}
                  <Link href="/deposit" className="underline hover:text-yellow-300">
                    Deposit funds first →
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            {/* Destination Address */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Destination Address
              </label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Amount */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 pr-20 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSetMax}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded hover:bg-blue-600/30 transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="mb-6 flex items-start gap-2 text-sm text-gray-400 bg-yellow-500/10 p-3 rounded-lg">
              <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p>
                <span className="text-yellow-400 font-medium">Gas required:</span>{" "}
                You need MATIC in your connected wallet to pay for transaction gas (~0.01-0.05 MATIC).
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handlePreview}
              disabled={!amount || !destinationAddress || !proxyWalletDeployed || proxyWalletBalance === BigInt(0)}
              className="w-full px-4 py-3 bg-blue-600 rounded-lg text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Preview Withdrawal
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
