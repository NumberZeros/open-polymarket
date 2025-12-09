"use client";

/**
 * Debug Configuration Page
 * Shows all configuration details to help diagnose signature issues
 */

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";

export default function DebugPage() {
  const { address, isConnected } = useAccount();
  const { eoaAddress } = useWallet();
  const { tradingSession, isTradingSessionComplete, safeAddress } = useTrading();
  
  const credentials = tradingSession?.apiCredentials;

  // Determine overall status
  const needsSetup = isConnected && !credentials;
  const setupComplete = isConnected && credentials && isTradingSessionComplete;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Debug Configuration</h1>

        {/* Status Banner */}
        {!isConnected && (
          <div className="bg-yellow-900/30 border border-yellow-800 p-4 rounded-lg mb-6">
            <p className="text-yellow-300 font-semibold">⚠️ Connect wallet first!</p>
            <p className="text-sm text-gray-300 mt-1">Click "Connect Wallet" button below</p>
          </div>
        )}
        
        {needsSetup && (
          <div className="bg-blue-900/30 border border-blue-800 p-4 rounded-lg mb-6">
            <p className="text-blue-300 font-semibold">ℹ️ Setup required</p>
            <p className="text-sm text-gray-300 mt-1">
              Go to <a href="/test-order" className="text-blue-400 underline">/test-order</a> and click "Setup Trading"
            </p>
            <p className="text-xs text-gray-400 mt-2">
              All the ❌ below are EXPECTED until you complete setup!
            </p>
          </div>
        )}
        
        {setupComplete && (
          <div className="bg-green-900/30 border border-green-800 p-4 rounded-lg mb-6">
            <p className="text-green-300 font-semibold">✅ All systems ready!</p>
            <p className="text-sm text-gray-300 mt-1">You can now place orders</p>
          </div>
        )}

        {/* Wallet Info */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
          <div className="mb-4">
            <ConnectButton />
          </div>
          <div className="space-y-2 text-sm font-mono">
            <p>Connected: {isConnected ? "✅ Yes" : "❌ No"}</p>
            <p>Wagmi Address: {address || "N/A"}</p>
          </div>
        </div>

        {/* API Credentials */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">API Credentials</h2>
          {credentials ? (
            <div className="space-y-2 text-sm font-mono break-all">
              <p className="text-green-400">✅ Credentials exist</p>
              <p>API Key: {credentials.key}</p>
              <p>Secret: {credentials.secret.substring(0, 20)}...</p>
              <p>Passphrase: {credentials.passphrase.substring(0, 20)}...</p>
            </div>
          ) : (
            <div>
              <p className="text-red-400 mb-2">❌ No credentials found</p>
              {isConnected && (
                <p className="text-sm text-gray-400">
                  → Need to run "Setup Trading" first!<br />
                  → Go to <a href="/test-order" className="text-blue-400 underline">/test-order</a> and click the button
                </p>
              )}
            </div>
          )}
        </div>

        {/* Trading Service */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Trading Service</h2>
          {isTradingSessionComplete ? (
            <div className="space-y-2 text-sm font-mono">
              <p className="text-green-400">✅ Service initialized</p>
              <p>Safe Address: {safeAddress || "None (using EOA)"}</p>
              <p>EOA Address: {eoaAddress || "N/A"}</p>
            </div>
          ) : (
            <div>
              <p className="text-red-400 mb-2">❌ Service not initialized</p>
              {credentials ? (
                <p className="text-sm text-gray-400">
                  Service should auto-initialize after credentials exist.<br />
                  If stuck, try Clear Storage & Reload.
                </p>
              ) : (
                <p className="text-sm text-gray-400">
                  Cannot initialize without credentials.<br />
                  Run "Setup Trading" first.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Environment Variables */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Builder Configuration</h2>
          <div className="space-y-2 text-sm font-mono">
            <p>Builder Sign Endpoint: /api/builder/sign</p>
            <p className="text-gray-400">
              Check .env.local for:
              <br />- POLY_BUILDER_API_KEY
              <br />- POLY_BUILDER_SECRET
              <br />- POLY_BUILDER_PASSPHRASE
            </p>
          </div>
        </div>

        {/* Validation Checks */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Validation Checks</h2>
          <div className="space-y-2 text-sm">
            {/* Check 1: Wallet connected */}
            <div className="flex items-center gap-2">
              {isConnected ? "✅" : "❌"}
              <span>Wallet connected</span>
            </div>

            {/* Check 2: Credentials exist */}
            <div className="flex items-center gap-2">
              {credentials ? "✅" : "❌"}
              <span>API credentials derived</span>
            </div>

            {/* Check 3: Service initialized */}
            <div className="flex items-center gap-2">
              {isTradingSessionComplete ? "✅" : "❌"}
              <span>Trading session complete</span>
            </div>

            {/* Check 4: EOA Address */}
            <div className="flex items-center gap-2">
              {eoaAddress ? "✅" : "❌"}
              <span>EOA address available</span>
            </div>
          </div>
        </div>

        {/* How to Fix */}
        <div className="bg-blue-900/20 border border-blue-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">💡 How to Fix Issues</h2>
          <div className="space-y-4 text-sm">
            {needsSetup && (
              <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded">
                <p className="font-semibold text-yellow-300 mb-2">🎯 You need to setup first!</p>
                <ol className="list-decimal list-inside text-gray-300 ml-4 space-y-1">
                  <li>Go to <a href="/test-order" className="text-blue-400 underline">/test-order</a></li>
                  <li>Click "Setup Trading" button</li>
                  <li>Sign message in wallet popup</li>
                  <li>Wait for "✅ Trading setup complete!"</li>
                  <li>Return to this page - all should be ✅</li>
                </ol>
              </div>
            )}

            {setupComplete && (
              <div className="bg-green-900/20 border border-green-700 p-4 rounded">
                <p className="font-semibold text-green-300 mb-2">✅ Setup complete!</p>
                <p className="text-gray-300">
                  You're ready to place orders. Go to <a href="/test-order" className="text-blue-400 underline">/test-order</a> and try the sample buttons.
                </p>
              </div>
            )}

            <div>
              <p className="font-semibold text-blue-400">Common Issues & Solutions</p>
              <ul className="list-disc list-inside text-gray-300 ml-4 space-y-1 mt-2">
                <li><strong>"Setup failed"</strong> → You rejected signature. Try again and click "Sign"</li>
                <li><strong>"Invalid signature"</strong> → Clear storage and setup again</li>
                <li><strong>"Market not found"</strong> → Use sample buttons (valid token IDs)</li>
                <li><strong>Client stuck initializing</strong> → Clear storage & reload</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => {
              localStorage.removeItem("polymarket-store");
              window.location.reload();
            }}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg"
          >
            Clear Storage & Reload
          </button>
          <a
            href="/test-order"
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg inline-block"
          >
            Back to Test Order
          </a>
        </div>
      </div>
    </div>
  );
}
