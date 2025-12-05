"use client";

/**
 * Trading Setup Page
 * 
 * Before trading on Polymarket, users need to approve:
 * 1. USDC.e for the CTF Exchange contracts
 * 2. CTF tokens for the Exchange (to sell positions)
 * 
 * This is a ONE-TIME setup per wallet.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import {
  checkApprovalStatus,
  buildApprovalTransactions,
  formatUsdcAmount,
  type ApprovalStatus,
  type ApprovalTransaction,
} from "@/lib/polymarket/depositService";
import { POLYGON_CONTRACTS } from "@/lib/polymarket/config";
import {
  Wallet,
  ArrowLeft,
  CheckCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  Info,
  Shield,
  Zap,
  RefreshCw,
} from "lucide-react";

type TxStatus = "idle" | "pending" | "success" | "error";

export default function TradingSetupPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [pendingTxs, setPendingTxs] = useState<ApprovalTransaction[]>([]);
  const [currentTxIndex, setCurrentTxIndex] = useState<number>(-1);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txError, setTxError] = useState<string | null>(null);

  // Fetch approval status
  const fetchApprovalStatus = useCallback(async () => {
    if (!address || !publicClient) return;
    
    setIsLoading(true);
    try {
      const status = await checkApprovalStatus(address, publicClient);
      setApprovalStatus(status);
      const txs = buildApprovalTransactions(status);
      setPendingTxs(txs);
    } catch (e) {
      console.error("Failed to fetch approval status:", e);
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient]);

  // Execute single approval transaction
  const executeApproval = async (tx: ApprovalTransaction, index: number) => {
    if (!walletClient || !publicClient) return;

    setCurrentTxIndex(index);
    setTxStatus("pending");
    setTxError(null);

    try {
      const hash = await walletClient.sendTransaction({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxStatus("success");
      await fetchApprovalStatus();
    } catch (e: unknown) {
      setTxStatus("error");
      const errorMessage = e instanceof Error ? e.message : "Transaction failed";
      setTxError(errorMessage);
    } finally {
      setCurrentTxIndex(-1);
    }
  };

  // Execute all approvals
  const executeAllApprovals = async () => {
    if (!walletClient || !publicClient || pendingTxs.length === 0) return;

    for (let i = 0; i < pendingTxs.length; i++) {
      await executeApproval(pendingTxs[i], i);
      if (txStatus === "error") break;
    }
  };

  // Effects
  useEffect(() => {
    fetchApprovalStatus();
  }, [fetchApprovalStatus]);

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
              Please connect your wallet to set up trading
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
            <h1 className="text-3xl font-bold text-white mb-2">Trading Setup</h1>
            <p className="text-gray-400">
              One-time approval to enable trading on Polymarket
            </p>
          </div>

          {/* Current Balance */}
          <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">USDC.e Balance (Polygon)</span>
              <span className="text-2xl font-bold text-white">
                {approvalStatus ? `$${formatUsdcAmount(approvalStatus.usdcBalance)}` : "Loading..."}
              </span>
            </div>
            
            {approvalStatus && approvalStatus.usdcBalance === BigInt(0) && (
              <div className="mt-4 flex items-start gap-2 text-sm text-yellow-400 bg-yellow-500/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  You need USDC.e to trade.{" "}
                  <Link href="/deposit" className="text-yellow-300 hover:underline">
                    Deposit funds first →
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 rounded-xl p-4 mb-6 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">Why do I need to approve?</p>
                <p className="text-blue-300/70">
                  Before Polymarket can execute trades on your behalf, you need to give the 
                  exchange contracts permission to move your USDC and outcome tokens. 
                  This is a standard ERC-20 approval and only needs to be done once.
                </p>
              </div>
            </div>
          </div>

          {/* Approval Status */}
          <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Approval Status</h2>
              </div>
              <button
                onClick={fetchApprovalStatus}
                disabled={isLoading}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {isLoading && !approvalStatus ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : approvalStatus ? (
              <div className="space-y-3">
                <ApprovalItem
                  label="USDC → CTF Exchange"
                  approved={approvalStatus.usdcAllowanceExchange > BigInt(0)}
                />
                <ApprovalItem
                  label="USDC → Neg Risk Exchange"
                  approved={approvalStatus.usdcAllowanceNegRiskExchange > BigInt(0)}
                />
                <ApprovalItem
                  label="CTF → CTF Exchange"
                  approved={approvalStatus.ctfApprovedExchange}
                />
                <ApprovalItem
                  label="CTF → Neg Risk Exchange"
                  approved={approvalStatus.ctfApprovedNegRiskExchange}
                />
                <ApprovalItem
                  label="CTF → Neg Risk Adapter"
                  approved={approvalStatus.ctfApprovedNegRiskAdapter}
                />

                {approvalStatus.isFullyApproved ? (
                  <div className="mt-4 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Ready to Trade!</span>
                    </div>
                    <p className="text-sm text-green-400/70 mt-1">
                      All approvals are set. You can now place orders on Polymarket.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Approvals Required</span>
                    </div>
                    <p className="text-sm text-yellow-400/70 mt-1">
                      {pendingTxs.length} approval(s) needed to enable trading.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Failed to load status</p>
            )}
          </div>

          {/* Pending Approvals */}
          {pendingTxs.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Pending Approvals</h2>
              </div>

              <div className="space-y-3 mb-4">
                {pendingTxs.map((tx, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">{tx.description}</p>
                      <p className="text-xs text-gray-500 font-mono">{tx.to.slice(0, 10)}...</p>
                    </div>
                    <button
                      onClick={() => executeApproval(tx, index)}
                      disabled={txStatus === "pending"}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {currentTxIndex === index && txStatus === "pending" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Approve"
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {pendingTxs.length > 1 && (
                <button
                  onClick={executeAllApprovals}
                  disabled={txStatus === "pending"}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {txStatus === "pending" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Approve All (${pendingTxs.length} transactions)`
                  )}
                </button>
              )}

              {txError && (
                <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                  <p className="text-sm text-red-400">{txError}</p>
                </div>
              )}
            </div>
          )}

          {/* Contract Info */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Contract Addresses</h2>
            <div className="space-y-2 text-sm">
              <ContractLink label="USDC.e" address={POLYGON_CONTRACTS.USDC} />
              <ContractLink label="CTF Exchange" address={POLYGON_CONTRACTS.CTF_EXCHANGE} />
              <ContractLink label="Neg Risk Exchange" address={POLYGON_CONTRACTS.NEG_RISK_CTF_EXCHANGE} />
              <ContractLink label="CTF" address={POLYGON_CONTRACTS.CTF} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper components
function ApprovalItem({ label, approved }: { label: string; approved: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
      <span className="text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${approved ? "text-green-400" : "text-gray-500"}`}>
          {approved ? "Approved" : "Not approved"}
        </span>
        {approved ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <AlertCircle className="w-4 h-4 text-gray-500" />
        )}
      </div>
    </div>
  );
}

function ContractLink({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}</span>
      <a
        href={`https://polygonscan.com/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-blue-400 hover:text-blue-300 text-xs"
      >
        {address.slice(0, 6)}...{address.slice(-4)}
        <ExternalLink className="w-3 h-3 inline ml-1" />
      </a>
    </div>
  );
}
