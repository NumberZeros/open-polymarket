"use client";

/**
 * Polymarket Order Testing Page
 * 
 * Clean provider-based implementation following official example.
 * Based on: https://github.com/Polymarket/wagmi-safe-builder-example
 * 
 * Flow:
 * 1. Connect wallet via WalletProvider
 * 2. Initialize trading session via TradingProvider 
 * 3. Use authenticated ClobClient for order placement
 * 4. BuilderConfig handles remote signing via /api/builder/sign
 */

import { useState, useEffect } from "react";
import { ClobClient, Side } from "@polymarket/clob-client";
import { SignatureType } from "@polymarket/order-utils";
import { useActiveMarkets } from "@/hooks/useActiveMarkets";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";
import { Loader2 } from "lucide-react";

type OrderSide = "BUY" | "SELL";

// Test market data for quick testing
const TEST_MARKET = {
  question: "Will David Williams cash in 2024 WSOP main event?",
  volume: "14273.52",
  acceptingOrders: true,
  tokens: [
    {
      token_id: "71321045679252212594626385532706912750332728571942532289631379312455583992563",
      outcome: "Yes",
      price: "0.52"
    },
    {
      token_id: "52114319501363938864832343106690222372723862543054122390149020365151148486242",
      outcome: "No", 
      price: "0.48"
    }
  ]
};

export default function TestOrderPage() {
  // Prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  // Provider state
  const { 
    eoaAddress, 
    isConnected, 
    connect, 
    disconnect 
  } = useWallet();
  
  const { 
    tradingSession,
    currentStep,
    sessionError,
    clobClient,
    safeAddress,
    initializeTradingSession,
    endTradingSession 
  } = useTrading();

  // Form state
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("0.52");
  const [size, setSize] = useState("1.00");
  const [side, setSide] = useState<OrderSide>("BUY");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: string;
    error?: string;
    status?: string;
    orderId?: string;
    fullResponse?: any;
    fullError?: any;
  } | null>(null);
  const [walletWarning, setWalletWarning] = useState<string | null>(null);

  // Markets for dropdown
  const { 
    markets, 
    isLoading: marketsLoading, 
    error: marketsError 
  } = useActiveMarkets();

  // Computed values
  const isTradingSessionComplete = tradingSession && currentStep === "complete";

  /**
   * Initialize trading session
   */
  const handleSetupTrading = async () => {
    if (!eoaAddress) return;

    setIsLoading(true);
    setResult(null);

    try {
      await initializeTradingSession();
      setResult({ success: "Trading session initialized successfully!" });
    } catch (error: any) {
      console.error("[TestOrder] Setup trading error:", error);
      setResult({ 
        error: error.message || "Failed to initialize trading session",
        fullError: error 
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Place order using provider's ClobClient
   */
  const handlePlaceOrder = async () => {
    if (!clobClient || !tokenId) return;

    setIsLoading(true);
    setResult(null);

    try {
      console.log("[TestOrder] Creating order...");

      // Create order with authenticated client (simple parameters)
      const order = await clobClient.createOrder({
        tokenID: tokenId,
        price: parseFloat(price),
        size: parseFloat(size),
        side: side as Side
      });

      console.log("[TestOrder] Order created, posting...");

      // Post order - SDK automatically calls /api/builder/sign for Builder headers
      const response = await clobClient.postOrder(order);

      console.log("[TestOrder] Order posted successfully:", response);

      setResult({
        success: `✅ Order placed! ID: ${response.id}`,
        orderId: response.id,
        fullResponse: response
      });
    } catch (error: any) {
      console.error("[TestOrder] Order failed:", error);
      
      let errorMsg = "Failed to place order";
      if (error?.message?.includes("401")) {
        errorMsg = "Builder authentication failed - check /api/builder/sign endpoint";
      } else if (error?.message?.includes("invalid signature")) {
        errorMsg = "Invalid signature - credentials may be stale. Try reinitializing the trading session.";
      } else if (error?.message?.includes("Insufficient")) {
        errorMsg = "Insufficient balance - need more USDC on Polygon";
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      setResult({ error: errorMsg, fullError: error });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset trading session
   */
  const handleReset = () => {
    endTradingSession();
    setResult(null);
  };

  /**
   * Disconnect wallet and end session
   */
  const handleDisconnect = () => {
    disconnect();
    endTradingSession();
    setResult(null);
  };

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🧪 Polymarket Order Test</h1>
        <p className="text-gray-400 mb-8">Clean provider-based implementation with remote signing</p>

        {/* === STEP 1: Connect Wallet === */}
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-semibold mb-4">Step 1: Connect Wallet</h2>

          {walletWarning && (
            <div className="bg-red-900/30 border border-red-700 p-4 rounded mb-4">
              <p className="text-red-400 font-semibold">🚫 {walletWarning}</p>
            </div>
          )}

          {!isConnected ? (
            <button
              onClick={connect}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold"
            >
              🦊 Connect Wallet
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-900/20 border border-green-700 p-3 rounded">
                <p className="text-green-400 font-semibold mb-2">✅ Connected</p>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-500 text-xs">EOA:</span>
                    <p className="text-gray-300 font-mono text-sm break-all">{eoaAddress}</p>
                  </div>
                  {safeAddress && (
                    <div>
                      <span className="text-gray-500 text-xs">Safe (Trading):</span>
                      <p className="text-green-400 font-mono text-sm break-all">{safeAddress}</p>
                    </div>
                  )}
                  {currentStep !== "idle" && currentStep !== "complete" && (
                    <div className="text-blue-400 text-xs">⏳ {currentStep}...</div>
                  )}
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
              >
                Disconnect
              </button>
            </div>
          )}

          {/* Quick Test Market Loader */}
          <div className="mt-4">
            <button
              onClick={() => {
                // Load test market data into the form
                setTokenId(TEST_MARKET.tokens[0].token_id); // Default to Yes token
                // Show test market info
                alert(
                  `📊 Test Market Loaded:\\n\\n` +
                  `${TEST_MARKET.question}\\n\\n` +
                  `Tokens:\\n` +
                  `• Yes: ${TEST_MARKET.tokens[0].token_id.slice(0, 20)}...${TEST_MARKET.tokens[0].token_id.slice(-10)} (${TEST_MARKET.tokens[0].price})\\n` +
                  `• No: ${TEST_MARKET.tokens[1].token_id.slice(0, 20)}...${TEST_MARKET.tokens[1].token_id.slice(-10)} (${TEST_MARKET.tokens[1].price})\\n\\n` +
                  `Volume: $${parseFloat(TEST_MARKET.volume).toLocaleString()}\\n` +
                  `Status: ${TEST_MARKET.acceptingOrders ? '✅ Accepting Orders' : '❌ Not Accepting'}`
                );
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold text-sm"
            >
              🎯 Load Test Market (David Williams Poker)
            </button>
          </div>
        </div>

        {eoaAddress && !isTradingSessionComplete && (
          <>
            {/* === STEP 2: Setup Trading === */}
            <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg mb-6">
              <h2 className="text-2xl font-semibold mb-4">Step 2: Initialize Trading Session</h2>
              <p className="text-gray-400 mb-4">
                Deploy Safe wallet, set token approvals, and derive API credentials.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleSetupTrading}
                  disabled={isLoading || currentStep !== "idle"}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading || currentStep !== "idle" ? "⏳ Initializing..." : "Initialize Trading Session"}
                </button>

                {currentStep !== "idle" && (
                  <p className="text-sm text-blue-400 mt-3">
                    Current step: {currentStep}...
                  </p>
                )}

                {sessionError && (
                  <p className="text-sm text-red-400 mt-3">
                    {sessionError.message}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {isTradingSessionComplete && (
          <>
            {/* === STEP 3: Place Order === */}
            <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg mb-6">
              <h2 className="text-2xl font-semibold mb-4">Step 3: Place Order</h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Token ID */}
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-2">Token ID (Required)</label>
                  
                  {/* Markets Dropdown */}
                  {!marketsLoading && markets && markets.length > 0 && (
                    <div className="mb-3">
                      <label className="block text-xs text-gray-400 mb-1">Or select from active markets:</label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            const [tokenIdValue, tokenName] = e.target.value.split("|");
                            setTokenId(tokenIdValue);
                            console.log("[TestOrder] Selected market token:", tokenName, tokenIdValue);
                          }
                        }}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                      >
                        <option value="">-- Select a market --</option>
                        {markets.map((market, idx) => (
                          market.tokens && market.tokens.length > 0 ? (
                            <optgroup key={idx} label={market.question || market.description || "Market"}>
                              {market.tokens.map((token) => (
                                <option 
                                  key={token.token_id} 
                                  value={`${token.token_id}|${token.outcome}`}
                                >
                                  {token.outcome} - {token.token_id.slice(0, 20)}...
                                </option>
                              ))}
                            </optgroup>
                          ) : null
                        ))}
                      </select>
                    </div>
                  )}

                  {marketsLoading && (
                    <div className="mb-3 text-xs text-gray-400">
                      ⏳ Loading active markets...
                    </div>
                  )}

                  {marketsError && (
                    <div className="mb-3 text-xs text-yellow-500">
                      ⚠️ Could not load markets (manual entry available)
                    </div>
                  )}

                  {/* Manual input */}
                  <input
                    type="text"
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono"
                    placeholder="Or paste token ID here..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    ⚠️ <strong>Must be a valid, open market token ID.</strong>
                  </p>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Price</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0.01"
                    max="0.99"
                    step="0.01"
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
                  />
                </div>

                {/* Size */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Size (USDC)</label>
                  <input
                    type="number"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    min="0.01"
                    step="0.01"
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum: 0.01 USDC</p>
                </div>

                {/* Side */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Side</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSide("BUY")}
                      className={`flex-1 py-2 rounded ${
                        side === "BUY"
                          ? "bg-green-600 font-semibold"
                          : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      onClick={() => setSide("SELL")}
                      className={`flex-1 py-2 rounded ${
                        side === "SELL"
                          ? "bg-red-600 font-semibold"
                          : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={isLoading || !tokenId}
                className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "⏳ Placing order..." : "Place Order"}
              </button>

              {!tokenId && (
                <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded text-sm text-yellow-400">
                  ⚠️ Please enter a valid Token ID above to place an order
                </div>
              )}
            </div>

            {/* Session Info */}
            <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-3">Trading Session</h3>
              {tradingSession && (
                <div className="bg-gray-900 p-3 rounded text-xs space-y-2 mb-4">
                  <div>
                    <span className="text-gray-500">Safe Address:</span>
                    <p className="text-gray-300 font-mono break-all">{tradingSession.safeAddress}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">API Key:</span>
                    <p className="text-gray-300 font-mono break-all">
                      {tradingSession.apiCredentials?.key.slice(0, 20)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Status:</span>
                    <span className="text-green-400">✅ Active</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleReset}
                className="text-sm bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded"
              >
                Reset Session
              </button>
            </div>
          </>
        )}

        {/* Result Messages */}
        {result && (
          <div className={`border rounded-lg p-6 mb-6 ${
            result.success 
              ? "bg-green-900/20 border-green-700"
              : result.error
              ? "bg-red-900/20 border-red-700"
              : "bg-blue-900/20 border-blue-700"
          }`}>
            {result.success && (
              <p className="text-green-400 font-semibold mb-2">✅ {result.success}</p>
            )}
            {result.status && !result.success && !result.error && (
              <p className="text-blue-400 font-semibold mb-2">ℹ️ {result.status}</p>
            )}
            {result.error && (
              <p className="text-red-400 font-semibold mb-2">❌ {result.error}</p>
            )}

            {result.fullResponse && (
              <details className="mt-3 cursor-pointer">
                <summary className="text-sm text-gray-400 hover:text-gray-300">Full Response</summary>
                <pre className="bg-gray-900 p-3 rounded mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(result.fullResponse, null, 2)}
                </pre>
              </details>
            )}

            {result.fullError && (
              <details className="mt-3 cursor-pointer">
                <summary className="text-sm text-gray-400 hover:text-gray-300">Error Details</summary>
                <pre className="bg-gray-900 p-3 rounded mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(result.fullError, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Architecture Info */}
        <div className="bg-green-900/20 border border-green-700 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-3 text-green-400">✅ How It Works</h3>
          <ol className="space-y-2 text-sm">
            <li><strong>1. Connect:</strong> Wagmi + ethers abstraction via WalletProvider</li>
            <li><strong>2. Initialize Session:</strong> TradingProvider orchestrates Safe deployment, approvals, and credentials</li>
            <li><strong>3. Create ClobClient:</strong> With BuilderConfig pointing to <code className="text-xs bg-gray-900 px-2 py-1 rounded">/api/builder/sign</code></li>
            <li><strong>4. Create Order:</strong> <code className="text-xs bg-gray-900 px-2 py-1 rounded">clobClient.createOrder()</code> - Signs EIP-712 with wallet</li>
            <li><strong>5. Post Order:</strong> <code className="text-xs bg-gray-900 px-2 py-1 rounded">clobClient.postOrder()</code> - SDK automatically:
              <ul className="list-disc list-inside ml-4 mt-1 text-xs text-gray-400">
                <li>Adds L2 auth headers (HMAC)</li>
                <li>Calls <code>/api/builder/sign</code> for Builder headers</li>
                <li>Posts to CLOB with all headers</li>
              </ul>
            </li>
          </ol>
        </div>

        {/* Links */}
        <div className="flex gap-4 text-sm">
          <a 
            href="https://docs.polymarket.com/developers/builders/builder-signing-server"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            → Builder Signing Docs
          </a>
          <a 
            href="https://github.com/Polymarket/wagmi-safe-builder-example"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            → Official Example
          </a>
        </div>
      </div>
    </div>
  );
}