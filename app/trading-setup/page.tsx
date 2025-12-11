/**
 * Trading Setup Page
 * 
 * Complete one-time setup for Polymarket trading:
 * 1. Deploy Safe (Proxy Wallet)
 * 2. Approve USDC + CTF tokens
 * 3. Create API credentials
 * 
 * After setup, user can trade on /markets page
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";
import { CheckCircle, Loader2, ArrowRight, Key } from "lucide-react";

type Step = "setup" | "complete";

export default function TradingSetupPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  // Prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("setup");

  // Providers
  const { eoaAddress } = useWallet();
  const {
    tradingSession,
    currentStep: sessionStep,
    sessionError,
    initializeTradingSession,
    safeAddress
  } = useTrading();

  // Derived state from session
  const isSetupComplete = tradingSession?.isSafeDeployed && tradingSession?.hasApiCredentials && tradingSession?.hasApprovals;
  const isLoading = sessionStep !== "idle" && sessionStep !== "complete";
  const error = sessionError?.message;

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check wallet connection
  useEffect(() => {
    if (!isMounted) return;
    if (!isConnected || !address) {
      router.push("/");
      return;
    }
  }, [isMounted, isConnected, address, router]);

  // Update step based on session
  useEffect(() => {
    if (!isMounted) return;
    if (isSetupComplete) {
      setCurrentStep("complete");
    }
  }, [isMounted, isSetupComplete]);

  // Initialize complete trading session (Safe + Approvals + Credentials)
  const handleStartSetup = async () => {
    try {
      await initializeTradingSession();
      setCurrentStep("complete");
    } catch (error) {
      console.error('[TradingSetup] Setup failed:', error);
    }
  };

  // Complete - go to markets
  const handleComplete = () => {
    router.push("/");
  };

  // Prevent hydration mismatch by not rendering until mounted
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

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Trading Setup</h1>
            <p className="text-gray-300">Complete these one-time steps to start trading</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-400 mb-1">Setup Failed</h3>
                  <p className="text-sm text-red-300 whitespace-pre-line">{error}</p>
                  {error.includes("relayer") && (
                    <div className="mt-3 p-3 bg-red-500/5 rounded border border-red-500/20">
                      <p className="text-xs text-red-200 font-semibold mb-2">💡 Troubleshooting:</p>
                      <ul className="text-xs text-red-200 space-y-1 list-disc list-inside">
                        <li>Check your internet connection</li>
                        <li>Disable VPN if active</li>
                        <li>Verify Builder credentials are set in .env.local</li>
                        <li>Try refreshing the page</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-6">
            {/* Info: Safe wallet auto-deployment */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400">
                <strong>ℹ️ About Safe Wallet:</strong> When you create credentials, a Safe (Gnosis Safe) wallet will be automatically deployed if you don't have one yet. This is your trading wallet that holds USDC and manages positions.
              </p>
              {safeAddress && (
                <p className="text-xs text-blue-300 mt-2 font-mono break-all">
                  Your Safe: {safeAddress}
                </p>
              )}
            </div>

            {/* Loading Status */}
            {isLoading && (sessionStep === "checking" || sessionStep === "deploying" || sessionStep === "credentials" || sessionStep === "approvals") && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-purple-400">
                      {sessionStep === "checking" && "🔍 Checking setup status..."}
                      {sessionStep === "deploying" && "🚀 Deploying Safe wallet..."}
                      {sessionStep === "credentials" && "🔑 Creating API credentials..."}
                      {sessionStep === "approvals" && "✅ Setting token approvals..."}
                    </p>
                    <p className="text-xs text-purple-300 mt-1">This may take a few moments</p>
                  </div>
                </div>
              </div>
            )}

            {/* Single Step: Complete Trading Setup */}
            <StepCard
              icon={<Key className="w-6 h-6" />}
              title="Complete Trading Setup"
              description="Deploy Safe wallet, set token approvals, and generate API credentials"
              status={
                isSetupComplete
                  ? "complete"
                  : currentStep === "setup"
                  ? "active"
                  : "pending"
              }
              isLoading={isLoading}
              onAction={handleStartSetup}
              actionLabel={isSetupComplete ? "Setup Complete ✓" : "Start Setup"}
              disabled={isSetupComplete}
            />

            {/* Complete */}
            {currentStep === "complete" && (
              <div className="p-6 bg-green-500/10 border border-green-500 rounded-lg">
                <div className="flex items-center gap-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Setup Complete!</h3>
                    <p className="text-gray-300">You're ready to start trading</p>
                  </div>
                  <button
                    onClick={handleComplete}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    Go to Markets
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Step Card Component
interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "pending" | "active" | "complete";
  isLoading?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  disabled?: boolean;
}

function StepCard({
  icon,
  title,
  description,
  status,
  isLoading,
  onAction,
  actionLabel,
  disabled,
}: StepCardProps) {
  return (
    <div
      className={`p-6 rounded-lg border transition-all ${
        status === "active"
          ? "bg-purple-500/10 border-purple-500"
          : status === "complete"
          ? "bg-green-500/10 border-green-500"
          : "bg-gray-800/50 border-gray-700"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-3 rounded-lg ${
            status === "active"
              ? "bg-purple-500/20 text-purple-400"
              : status === "complete"
              ? "bg-green-500/20 text-green-400"
              : "bg-gray-700/50 text-gray-400"
          }`}
        >
          {status === "complete" ? <CheckCircle className="w-6 h-6" /> : icon}
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>

        {status === "active" && onAction && (
          <button
            onClick={onAction}
            disabled={disabled || isLoading}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              actionLabel
            )}
          </button>
        )}
      </div>

      <Footer />
    </div>
  );
}
