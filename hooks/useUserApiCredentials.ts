import { useCallback } from "react";
import { useWallet } from "@/providers/WalletContext";
import { ClobClient } from "@polymarket/clob-client";

const CLOB_API_URL = "https://clob.polymarket.com";
const POLYGON_CHAIN_ID = 137;

export interface UserApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

export default function useUserApiCredentials() {
  const { ethersSigner } = useWallet();

  const createOrDeriveUserApiCredentials = useCallback(async (): Promise<UserApiCredentials> => {
    if (!ethersSigner) {
      throw new Error("Wallet not connected");
    }

    // Create temporary CLOB client for credential derivation
    // NOTE: Do NOT pass BuilderConfig here - only needed for authenticated client
    const tempClient = new ClobClient(
      CLOB_API_URL,
      POLYGON_CHAIN_ID,
      ethersSigner as any
    );

    // Try derive first (for returning users), fall back to create (for new users)
    try {
      console.log("[Credentials] Attempting to derive existing API key...");
      const derivedCreds = await tempClient.deriveApiKey().catch(() => null);
      
      if (
        derivedCreds?.key &&
        derivedCreds?.secret &&
        derivedCreds?.passphrase
      ) {
        console.log("✅ Successfully derived existing API credentials");
        return derivedCreds;
      }
      
      // Derive returned null or invalid data - create new credentials
      console.log("[Credentials] Derive returned invalid data, creating new credentials...");
      const newCreds = await tempClient.createApiKey();
      
      if (!newCreds?.key || !newCreds?.secret || !newCreds?.passphrase) {
        throw new Error("Invalid credentials returned from API");
      }
      
      console.log("✅ Successfully created new API credentials");
      return newCreds;
    } catch (error) {
      console.error("[Credentials] Failed to get credentials:", error);
      throw new Error(
        "Failed to derive or create API credentials. " +
        "This usually means:\n" +
        "1. You don't have a Polymarket account yet (visit polymarket.com to create one)\n" +
        "2. Your Safe wallet needs to be fully deployed and recognized by Polymarket\n" +
        "3. Try again in a few moments after Safe deployment"
      );
    }
  }, [ethersSigner]);

  return {
    createOrDeriveUserApiCredentials,
  };
}