import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@/providers/WalletContext";
import useUserApiCredentials from "@/hooks/useUserApiCredentials";
import useTokenApprovals from "@/hooks/useTokenApprovals";
import useSafeDeployment from "@/hooks/useSafeDeployment";
import useRelayClient from "@/hooks/useRelayClient";
import {
  loadSession,
  saveSession,
  clearSession,
  TradingSession,
  SessionStep,
} from "@/utils/session";

export default function useTradingSession() {
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(null);
  const [currentStep, setCurrentStep] = useState<SessionStep>("idle");
  const [sessionError, setSessionError] = useState<Error | null>(null);

  const { eoaAddress, walletClient } = useWallet();
  const { createOrDeriveUserApiCredentials } = useUserApiCredentials();
  const { checkAllTokenApprovals, setAllTokenApprovals } = useTokenApprovals();
  const { derivedSafeAddressFromEoa, isSafeDeployed, deploySafe } = useSafeDeployment();
  const { relayClient, initializeRelayClient, clearRelayClient } = useRelayClient();

  // Load existing session when wallet connects
  useEffect(() => {
    if (!eoaAddress) {
      setTradingSession(null);
      setCurrentStep("idle");
      setSessionError(null);
      return;
    }

    const stored = loadSession(eoaAddress);
    setTradingSession(stored);

    // Reset state when switching wallets
    if (!stored) {
      setCurrentStep("idle");
      setSessionError(null);
    }
  }, [eoaAddress]);

  // Restore relay client when session exists
  // Note: Only attempt restoration when both wallet client and ethers signer are ready
  useEffect(() => {
    if (tradingSession && !relayClient && eoaAddress && walletClient) {
      // Check if wallet is fully ready by attempting initialization
      // initializeRelayClient will return null if ethersSigner not ready yet
      initializeRelayClient().catch((err) => {
        console.error("Failed to restore relay client:", err);
      });
    }
  }, [tradingSession, relayClient, eoaAddress, walletClient, initializeRelayClient]);

  // Main session initialization flow
  const initializeTradingSession = useCallback(async () => {
    if (!eoaAddress) {
      throw new Error("Wallet not connected");
    }

    setCurrentStep("checking");
    setSessionError(null);

    try {
      // Load existing session to check completed steps
      const existingSession = loadSession(eoaAddress);

      // Step 1: Initialize RelayClient with builder config
      const initializedRelayClient = await initializeRelayClient();
      
      if (!initializedRelayClient) {
        throw new Error("Failed to initialize relay client - wallet not ready");
      }

      // Step 2: Get Safe address (deterministic derivation from EOA)
      if (!derivedSafeAddressFromEoa) {
        throw new Error("Failed to derive Safe address");
      }

      // Step 3: Check if Safe is deployed
      setCurrentStep("checking");
      let isDeployed = await isSafeDeployed(
        initializedRelayClient,
        derivedSafeAddressFromEoa
      );

      // Step 4: Deploy Safe if not already deployed
      if (!isDeployed) {
        setCurrentStep("deploying");
        console.log("[TradingSession] Safe not deployed, deploying now...");
        await deploySafe(initializedRelayClient);
        
        // Verify Safe was actually deployed
        const verifyDeployed = await isSafeDeployed(initializedRelayClient, derivedSafeAddressFromEoa);
        if (!verifyDeployed) {
          throw new Error("Safe deployment failed - unable to verify deployment");
        }
        isDeployed = true;
        console.log("[TradingSession] ✅ Safe deployment verified");
      } else {
        console.log("[TradingSession] ✅ Safe already deployed, skipping deployment");
      }

      // Step 5: Get User API Credentials (derive or create)
      // NOTE: Safe MUST be deployed before deriving credentials
      let apiCreds = existingSession?.apiCredentials;
      if (
        !existingSession?.hasApiCredentials ||
        !apiCreds?.key ||
        !apiCreds?.secret ||
        !apiCreds?.passphrase
      ) {
        setCurrentStep("credentials");
        apiCreds = await createOrDeriveUserApiCredentials();
      }

      // Step 6: Set all required token approvals
      setCurrentStep("approvals");
      const approvalStatus = await checkAllTokenApprovals(derivedSafeAddressFromEoa);

      let hasApprovals = false;
      if (approvalStatus.allApproved) {
        hasApprovals = true;
      } else {
        if (!initializedRelayClient) {
          throw new Error("Relay client not available for setting approvals");
        }
        hasApprovals = await setAllTokenApprovals(initializedRelayClient);
      }

      // Step 7: Create session object
      const newSession: TradingSession = {
        eoaAddress: eoaAddress,
        safeAddress: derivedSafeAddressFromEoa,
        isSafeDeployed: true,
        hasApiCredentials: true,
        hasApprovals,
        apiCredentials: apiCreds,
        lastChecked: Date.now(),
      };

      setTradingSession(newSession);
      saveSession(eoaAddress, newSession);
      setCurrentStep("complete");
    } catch (err) {
      console.error("Session initialization error:", err);
      const error = err instanceof Error ? err : new Error("Unknown error");
      setSessionError(error);
      setCurrentStep("idle");
    }
  }, [
    eoaAddress,
    derivedSafeAddressFromEoa,
    initializeRelayClient,
    isSafeDeployed,
    deploySafe,
    createOrDeriveUserApiCredentials,
    checkAllTokenApprovals,
    setAllTokenApprovals,
  ]);

  // Clear session and reset state
  const endTradingSession = useCallback(() => {
    if (!eoaAddress) return;

    clearSession(eoaAddress);
    setTradingSession(null);
    clearRelayClient();
    setCurrentStep("idle");
    setSessionError(null);
  }, [eoaAddress, clearRelayClient]);

  return {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete:
      tradingSession?.isSafeDeployed &&
      tradingSession?.hasApiCredentials &&
      tradingSession?.hasApprovals,
    initializeTradingSession,
    endTradingSession,
    relayClient,
  };
}