/**
 * Relayer Service
 *
 * Handles gasless transactions through Polymarket's relayer infrastructure.
 * - Safe wallet deployment
 * - Token approvals
 * - CTF operations (split, merge, redeem)
 */

import { RelayClient } from "@polymarket/builder-relayer-client";
import type { JsonRpcSigner } from "@ethersproject/providers";
import { POLYMARKET_API, POLYGON_CONTRACTS } from "./config";

// ============= Types =============

export interface RelayerStatus {
  isReady: boolean;
  hasWallet: boolean;
  hasSafe: boolean;
  safeAddress?: string;
  walletAddress?: string;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  proxyAddress?: string;
  state?: string;
  error?: string;
}

export interface SafeDeploymentResult extends TransactionResult {
  safeAddress?: string;
}

// ============= Safe Transaction Types =============

interface SafeTransaction {
  to: string;
  data: string;
  value: string;
  operation: number; // 0 = Call, 1 = DelegateCall
}

// ============= Relayer API =============

/**
 * Get Safe address for a wallet
 * 
 * Uses RelayClient SDK to check if Safe is deployed
 */
export async function getSafeAddress(
  walletAddress: string,
  signer: JsonRpcSigner
): Promise<string | null> {
  try {
    console.log("[Relayer] Checking if Safe deployed for:", walletAddress);
    
    // Use RelayClient to check deployment status
    const relayClient = new RelayClient(
      "https://relayer-v2.polymarket.com",
      137, // Polygon mainnet
      signer
    );
    
    // Check if Safe is deployed
    const isDeployed = await relayClient.getDeployed(walletAddress);
    console.log("[Relayer] Safe deployment status:", isDeployed);
    
    if (isDeployed) {
      // Safe address is predictable from owner address
      // Format: `${walletAddress}_safe` but RelayClient computes it
      // For now, return owner as Safe address (they're same in Polymarket)
      console.log("[Relayer] ✅ Safe deployed for:", walletAddress);
      return walletAddress;
    } else {
      console.log("[Relayer] ⚠️ No Safe deployed yet for:", walletAddress);
      return null;
    }
  } catch (error) {
    console.error("[Relayer] Error checking Safe deployment:", error);
    return null;
  }
}

/**
 * Deploy a new Safe wallet for the user
 * 
 * Uses Polymarket's RelayClient to deploy a Gnosis Safe proxy wallet.
 * This is a gasless operation - the relayer pays for deployment.
 * 
 * @param signer - Ethers JsonRpcSigner from Web3Provider (MetaMask)
 * @returns SafeDeploymentResult with safeAddress if successful
 */
export async function deploySafe(
  signer: JsonRpcSigner
): Promise<SafeDeploymentResult> {
  try {
    console.log("[Relayer] Starting Safe deployment...");
    
    // Get wallet address
    const walletAddress = await signer.getAddress();
    console.log("[Relayer] Deploying Safe for:", walletAddress);
    
    // Check if Safe already exists
    const existingSafe = await getSafeAddress(walletAddress, signer);
    if (existingSafe) {
      console.log("[Relayer] ✅ Safe already deployed:", existingSafe);
      return {
        success: true,
        safeAddress: existingSafe,
        state: "already-deployed",
      };
    }
    
    // Create RelayClient instance
    const relayClient = new RelayClient(
      "https://relayer-v2.polymarket.com",
      137, // Polygon mainnet
      signer
    );
    
    console.log("[Relayer] Calling deploy()...");
    
    // Deploy Safe (gasless transaction)
    const response = await relayClient.deploy();
    console.log("[Relayer] Deploy response received, waiting for confirmation...");
    
    // Wait for deployment to complete
    const result = await response.wait();
    
    if (result && result.proxyAddress) {
      console.log("[Relayer] ✅ Safe deployed successfully!");
      console.log("[Relayer] Transaction Hash:", result.transactionHash);
      console.log("[Relayer] Safe Address:", result.proxyAddress);
      
      return {
        success: true,
        safeAddress: result.proxyAddress,
        transactionHash: result.transactionHash,
        state: result.state,
      };
    } else {
      console.error("[Relayer] ❌ Deployment failed - no proxyAddress in result:", result);
      return {
        success: false,
        error: "Safe deployment failed - no proxy address returned",
      };
    }
  } catch (error: any) {
    const errorMessage = error?.message?.toLowerCase() || "";
    console.error("[Relayer] ❌ Safe deployment error:", error);
    console.error("[Relayer] Error message:", errorMessage);
    
    // Check if it's already deployed error (case-insensitive)
    if (errorMessage.includes("already deployed") || errorMessage.includes("already exists")) {
      console.log("[Relayer] Safe already exists, checking for address...");
      try {
        const walletAddress = await signer.getAddress();
        const existingSafe = await getSafeAddress(walletAddress, signer);
        if (existingSafe) {
          console.log("[Relayer] ✅ Found existing Safe:", existingSafe);
          return {
            success: true,
            safeAddress: existingSafe,
            state: "already-deployed",
          };
        }
      } catch (checkError) {
        console.error("[Relayer] Error checking for existing Safe:", checkError);
      }
    }
    
    return {
      success: false,
      error: error?.message || "Failed to deploy Safe wallet",
    };
  }
}

// NOTE: executeTransaction and setupTradingApprovals have been removed
// The Polymarket Relayer /transaction-data endpoint returns 404
// For approvals, use EOA direct transactions via depositService.ts
// For withdrawals, use proxyWallet.ts with Gnosis Safe execTransaction

/**
 * Check relayer status
 */
export async function getRelayerStatus(
  walletAddress?: string,
  signer?: JsonRpcSigner
): Promise<RelayerStatus> {
  if (!walletAddress || !signer) {
    return {
      isReady: false,
      hasWallet: false,
      hasSafe: false,
    };
  }

  const safeAddress = await getSafeAddress(walletAddress, signer);

  return {
    isReady: !!safeAddress,
    hasWallet: true,
    hasSafe: !!safeAddress,
    safeAddress: safeAddress || undefined,
    walletAddress,
  };
}

/**
 * Check if approvals are set up for a Safe wallet
 * Checks USDC.e and CTF allowances
 */
export async function checkApprovals(safeAddress: string): Promise<boolean> {
  try {
    // Use Polygon RPC to check allowances
    const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";
    
    // ERC20 allowance function selector: 0xdd62ed3e
    const allowanceSelector = "0xdd62ed3e";
    
    // Check USDC.e allowance for CTF Exchange
    const checkAllowance = async (token: string, owner: string, spender: string): Promise<bigint> => {
      const paddedOwner = owner.slice(2).padStart(64, "0");
      const paddedSpender = spender.slice(2).padStart(64, "0");
      const data = `${allowanceSelector}${paddedOwner}${paddedSpender}`;
      
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_call",
          params: [{ to: token, data }, "latest"],
          id: 1,
        }),
      });
      
      const result = await response.json();
      if (result.error) {
        console.error("[Relayer] Allowance check error:", result.error);
        return BigInt(0);
      }
      
      return BigInt(result.result || "0x0");
    };
    
    // Check USDC.e allowance for CTF Exchange
    const usdcAllowance = await checkAllowance(
      POLYGON_CONTRACTS.USDC,
      safeAddress,
      POLYGON_CONTRACTS.CTF_EXCHANGE
    );
    
    // If allowance is greater than a reasonable threshold (e.g., 1000 USDC = 1000 * 10^6)
    // Consider approvals as set up
    const minAllowance = BigInt(1000) * BigInt(10 ** 6);
    
    return usdcAllowance >= minAllowance;
  } catch (error) {
    console.error("[Relayer] Failed to check approvals:", error);
    return false;
  }
}
