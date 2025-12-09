/**
 * Direct Ethers Wallet Connection
 * 
 * Bypasses wagmi/viem adapters to connect directly with ethers v5.
 * This eliminates potential conflicts with wallet adapters.
 */

import { ethers, Wallet } from "ethers";

/**
 * Create ethers Wallet directly from browser wallet
 * Bypasses all wagmi/viem adapters
 */
export async function createEthersWallet(): Promise<Wallet | null> {
  try {
    console.log("[Ethers Wallet] Creating direct ethers v5 connection...");
    
    // Check if wallet is available
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("No wallet found");
    }

    const ethereum = (window as any).ethereum;

    // Enforce MetaMask to avoid Phantom/other injected providers
    if (!ethereum.isMetaMask) {
      throw new Error("MetaMask not detected (found a different injected wallet such as Phantom)");
    }

    // Get provider directly from window.ethereum (ethers v5)
    const provider = new ethers.providers.Web3Provider(ethereum);
    
    // Request account access
    await provider.send("eth_requestAccounts", []);
    
    // Get signer (this will prompt user for signatures when needed)
    const signer = provider.getSigner();
    
    // Get address to verify connection
    const address = await signer.getAddress();
    
    console.log("[Ethers Wallet] ✅ Direct ethers v5 wallet created:", {
      address,
      provider: "window.ethereum",
      bypassedAdapters: true,
      ethersVersion: "v5"
    });

    // Return signer as Wallet (it implements the same interface)
    return signer as unknown as Wallet;
    
  } catch (error) {
    console.error("[Ethers Wallet] ❌ Failed to create direct wallet:", error);
    return null;
  }
}

/**
 * Alternative: Create ethers Wallet from private key (for testing)
 */
export function createWalletFromPrivateKey(privateKey: string): Wallet {
  // Create provider for Polygon mainnet (ethers v5)
  const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
  
  // Create wallet with private key
  const wallet = new Wallet(privateKey, provider);
  
  console.log("[Ethers Wallet] ✅ Wallet created from private key:", {
    address: wallet.address,
    provider: "JsonRpcProvider",
    ethersVersion: "v5"
  });
  
  return wallet;
}

/**
 * Get wallet address from ethers wallet
 */
export async function getWalletAddress(wallet: Wallet): Promise<string> {
  return wallet.address;
}

/**
 * Check if wallet is connected and ready
 */
export async function isWalletReady(wallet: Wallet): Promise<boolean> {
  try {
    const address = await wallet.getAddress();
    return !!address;
  } catch {
    return false;
  }
}