/**
 * Proxy Wallet Utilities
 * 
 * Polymarket uses Safe (Gnosis Safe) smart contract wallets as Proxy Wallets.
 * Each user has a deterministic Proxy Wallet address derived from their EOA address.
 * 
 * This module provides utilities to:
 * 1. Derive Proxy Wallet address from EOA address
 * 2. Check if Proxy Wallet is deployed
 * 3. Get Proxy Wallet balance
 */

import { getCreate2Address, keccak256, encodeAbiParameters, getAddress } from "viem";
import { POLYGON_CONTRACTS, SAFE_INIT_CODE_HASH } from "./config";

/**
 * Derive the Proxy Wallet (Safe) address from a user's EOA address
 * 
 * This uses the CREATE2 opcode to deterministically compute the address
 * without needing to query the blockchain.
 * 
 * @param walletAddress - The user's EOA (Externally Owned Account) address
 * @returns The Proxy Wallet address
 */
export function deriveProxyWalletAddress(walletAddress: string): string {
  // Normalize address with proper checksum
  const normalizedAddr = getAddress(walletAddress.toLowerCase());
  
  const salt = keccak256(
    encodeAbiParameters(
      [{ name: "address", type: "address" }],
      [normalizedAddr as `0x${string}`]
    )
  );

  return getCreate2Address({
    bytecodeHash: SAFE_INIT_CODE_HASH as `0x${string}`,
    from: POLYGON_CONTRACTS.SAFE_PROXY_FACTORY as `0x${string}`,
    salt: salt,
  });
}

/**
 * Check if a Proxy Wallet has been deployed
 * 
 * @param proxyWalletAddress - The Proxy Wallet address to check
 * @param publicClient - Viem public client
 * @returns True if deployed, false otherwise
 */
export async function isProxyWalletDeployed(
  proxyWalletAddress: string,
  publicClient: {
    getBytecode: (args: { address: `0x${string}` }) => Promise<string | undefined>;
  }
): Promise<boolean> {
  try {
    const bytecode = await publicClient.getBytecode({
      address: proxyWalletAddress as `0x${string}`,
    });
    return bytecode !== undefined && bytecode !== "0x";
  } catch {
    return false;
  }
}

/**
 * Get USDC.e balance of a Proxy Wallet
 * 
 * @param proxyWalletAddress - The Proxy Wallet address
 * @param publicClient - Viem public client
 * @returns Balance in USDC.e (raw bigint with 6 decimals)
 */
export async function getProxyWalletUsdcBalance(
  proxyWalletAddress: string,
  publicClient: {
    readContract: (args: {
      address: `0x${string}`;
      abi: readonly unknown[];
      functionName: string;
      args: readonly unknown[];
    }) => Promise<unknown>;
  }
): Promise<bigint> {
  const ERC20_ABI = [
    {
      name: "balanceOf",
      type: "function",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    },
  ] as const;

  try {
    const balance = await publicClient.readContract({
      address: POLYGON_CONTRACTS.USDC as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [proxyWalletAddress as `0x${string}`],
    });
    return balance as bigint;
  } catch {
    return BigInt(0);
  }
}

/**
 * Format USDC amount for display (6 decimals)
 */
export function formatUsdcAmount(amount: bigint): string {
  const value = Number(amount) / 1e6;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
