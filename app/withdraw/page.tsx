"use client";

/**
 * Withdraw Page
 * 
 * Withdraw USDC.e from wallet on Polygon network
 * User signs ERC20 transfer transaction directly
 */

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { usePolymarketStore } from "@/stores/polymarketStore";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import {
  isValidEthereumAddress,
  validateWithdrawAmount,
  createWithdrawPreview,
  buildEoaWithdrawTx,
  type WithdrawPreview,
} from "@/lib/polymarket/withdrawService";
import { formatUsdc } from "@/lib/polymarket/marketApi";
import { POLYGON_CONTRACTS } from "@/lib/polymarket/config";
import {
  Wallet,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  ExternalLink,
} from "lucide-react";

export default function WithdrawPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { usdcBalance, refreshBalances } = usePolymarketStore();

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

  const balance = (usdcBalance || 0).toString();

  // Validate form
  const validateForm = useCallback(() => {
    setError(null);

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

    const validation = validateWithdrawAmount(amount, balance);
    if (!validation.valid) {
      setError(validation.error || "Invalid amount");
      return false;
    }

    return true;
  }, [destinationAddress, amount, balance]);

  // Create preview
  const handlePreview = useCallback(() => {
    if (!validateForm()) return;

    const withdrawPreview = createWithdrawPreview({
      destinationAddress,
      amount,
    });

    setPreview(withdrawPreview);
    setShowConfirmation(true);
  }, [validateForm, destinationAddress, amount]);

  // Execute withdrawal
  const handleWithdraw = useCallback(async () => {
    if (!preview || !walletClient || !address) {
      setError("Wallet not connected");
      return;
    }

    setIsWithdrawing(true);
    setError(null);

    try {
      // Build transaction
      const tx = buildEoaWithdrawTx({
        destinationAddress: preview.destinationAddress,
        amount: preview.amount,
      });

      console.log("[Withdraw] Sending transaction:", tx);

      // Send transaction via wallet
      const hash = await walletClient.sendTransaction({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: BigInt(0),
      });

      console.log("[Withdraw] Transaction hash:", hash);
      setTxHash(hash);

      // Wait for confirmation if publicClient available
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setSuccess(true);
      refreshBalances();
    } catch (e: unknown) {
      console.error("[Withdraw] Error:", e);
      if (e instanceof Error) {
        if (e.message.includes("rejected") || e.message.includes("denied")) {
          setError("Transaction rejected by user");
        } else {
          setError(e.message);
        }
      } else {
        setError("Transaction failed");
      }
    } finally {
      setIsWithdrawing(false);
    }
  }, [preview, walletClient, address, publicClient, refreshBalances]);

  // Set max amount
  const handleSetMax = () => {
    setAmount(balance);
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
                  <span className="text-gray-400">Estimated Gas</span>
                  <span className="text-white">{preview.estimatedGasCost}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-400">You will receive</span>
                  <span className="text-green-400 font-semibold">{preview.finalAmount} USDC.e</span>
                </div>
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
                      Confirming...
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
              Send USDC.e from your wallet to any Polygon address
            </p>
          </div>

          {/* Balance */}
          <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Available Balance</span>
              <span className="text-2xl font-bold text-white">{formatUsdc(usdcBalance || 0)}</span>
            </div>
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
            <div className="mb-6 flex items-start gap-2 text-sm text-gray-400 bg-blue-500/10 p-3 rounded-lg">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p>
                Withdrawals are sent on the <span className="text-white font-medium">Polygon network</span>. 
                You will need to pay gas fees in MATIC.
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
              disabled={!amount || !destinationAddress}
              className="w-full px-4 py-3 bg-blue-600 rounded-lg text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Preview Withdrawal
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
