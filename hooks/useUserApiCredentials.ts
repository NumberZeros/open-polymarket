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
    const tempClient = new ClobClient(
      CLOB_API_URL,
      POLYGON_CHAIN_ID,
      ethersSigner
    );

    // Try derive first, fall back to create
    let credentials: UserApiCredentials;
    try {
      credentials = await tempClient.deriveApiKey();
      console.log("✅ Derived existing API credentials");
    } catch {
      try {
        console.log("Derive failed, creating new API credentials...");
        credentials = await tempClient.createApiKey();
        console.log("✅ Created new API credentials");
      } catch {
        throw new Error("Failed to derive or create API credentials. Please ensure you have a Polymarket account.");
      }
    }

    if (!credentials?.key || !credentials?.secret || !credentials?.passphrase) {
      throw new Error("Invalid credentials returned from API");
    }

    return credentials;
  }, [ethersSigner]);

  return {
    createOrDeriveUserApiCredentials,
  };
}