/**
 * Deposit Service - Polymarket Trading Setup
 * 
 * To trade on Polymarket, users need to:
 * 1. Have USDC.e on Polygon in their wallet
 * 2. Approve USDC.e for the CTF Exchange (to place orders)
 * 3. Approve CTF tokens for the Exchange (to sell positions)
 * 
 * This service handles the approval transactions.
 * Based on: https://github.com/Polymarket/clob-client/blob/main/examples/approveAllowances.ts
 */

import { POLYGON_CONTRACTS } from "./config";
import { encodeFunctionData, parseUnits, maxUint256 } from "viem";
// Re-export from proxyWallet to avoid duplicates
export { formatUsdcAmount } from "./proxyWallet";

// ============= Contract ABIs (minimal) =============

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const CTF_ABI = [
  {
    name: "setApprovalForAll",
    type: "function",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "isApprovedForAll",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ============= Types =============

export interface ApprovalStatus {
  usdcAllowanceExchange: bigint;
  usdcAllowanceNegRiskExchange: bigint;
  ctfApprovedExchange: boolean;
  ctfApprovedNegRiskExchange: boolean;
  ctfApprovedNegRiskAdapter: boolean;
  usdcBalance: bigint;
  isFullyApproved: boolean;
}

export interface ApprovalTransaction {
  to: string;
  data: string;
  description: string;
}

// ============= Read Functions =============

/**
 * Check current approval status for trading
 */
export async function checkApprovalStatus(
  walletAddress: string,
  publicClient: {
    readContract: (args: {
      address: `0x${string}`;
      abi: readonly unknown[];
      functionName: string;
      args: readonly unknown[];
    }) => Promise<unknown>;
  }
): Promise<ApprovalStatus> {
  const [
    usdcAllowanceExchange,
    usdcAllowanceNegRiskExchange,
    ctfApprovedExchange,
    ctfApprovedNegRiskExchange,
    ctfApprovedNegRiskAdapter,
    usdcBalance,
  ] = await Promise.all([
    // USDC allowance for CTF Exchange
    publicClient.readContract({
      address: POLYGON_CONTRACTS.USDC as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [walletAddress, POLYGON_CONTRACTS.CTF_EXCHANGE],
    }) as Promise<bigint>,
    // USDC allowance for Neg Risk Exchange
    publicClient.readContract({
      address: POLYGON_CONTRACTS.USDC as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [walletAddress, POLYGON_CONTRACTS.NEG_RISK_CTF_EXCHANGE],
    }) as Promise<bigint>,
    // CTF approved for Exchange
    publicClient.readContract({
      address: POLYGON_CONTRACTS.CTF as `0x${string}`,
      abi: CTF_ABI,
      functionName: "isApprovedForAll",
      args: [walletAddress, POLYGON_CONTRACTS.CTF_EXCHANGE],
    }) as Promise<boolean>,
    // CTF approved for Neg Risk Exchange
    publicClient.readContract({
      address: POLYGON_CONTRACTS.CTF as `0x${string}`,
      abi: CTF_ABI,
      functionName: "isApprovedForAll",
      args: [walletAddress, POLYGON_CONTRACTS.NEG_RISK_CTF_EXCHANGE],
    }) as Promise<boolean>,
    // CTF approved for Neg Risk Adapter
    publicClient.readContract({
      address: POLYGON_CONTRACTS.CTF as `0x${string}`,
      abi: CTF_ABI,
      functionName: "isApprovedForAll",
      args: [walletAddress, POLYGON_CONTRACTS.NEG_RISK_ADAPTER],
    }) as Promise<boolean>,
    // USDC balance
    publicClient.readContract({
      address: POLYGON_CONTRACTS.USDC as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress],
    }) as Promise<bigint>,
  ]);

  const minAllowance = parseUnits("1000000", 6); // 1M USDC threshold

  const isFullyApproved =
    usdcAllowanceExchange >= minAllowance &&
    usdcAllowanceNegRiskExchange >= minAllowance &&
    ctfApprovedExchange &&
    ctfApprovedNegRiskExchange &&
    ctfApprovedNegRiskAdapter;

  return {
    usdcAllowanceExchange,
    usdcAllowanceNegRiskExchange,
    ctfApprovedExchange,
    ctfApprovedNegRiskExchange,
    ctfApprovedNegRiskAdapter,
    usdcBalance,
    isFullyApproved,
  };
}

// ============= Write Functions =============

/**
 * Build all required approval transactions
 * Returns array of transactions that need to be executed
 */
export function buildApprovalTransactions(status: ApprovalStatus): ApprovalTransaction[] {
  const transactions: ApprovalTransaction[] = [];
  const minAllowance = parseUnits("1000000", 6);

  // 1. Approve USDC for CTF Exchange
  if (status.usdcAllowanceExchange < minAllowance) {
    transactions.push({
      to: POLYGON_CONTRACTS.USDC,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [POLYGON_CONTRACTS.CTF_EXCHANGE as `0x${string}`, maxUint256],
      }),
      description: "Approve USDC for CTF Exchange",
    });
  }

  // 2. Approve USDC for Neg Risk Exchange
  if (status.usdcAllowanceNegRiskExchange < minAllowance) {
    transactions.push({
      to: POLYGON_CONTRACTS.USDC,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [POLYGON_CONTRACTS.NEG_RISK_CTF_EXCHANGE as `0x${string}`, maxUint256],
      }),
      description: "Approve USDC for Neg Risk Exchange",
    });
  }

  // 3. Approve CTF tokens for Exchange
  if (!status.ctfApprovedExchange) {
    transactions.push({
      to: POLYGON_CONTRACTS.CTF,
      data: encodeFunctionData({
        abi: CTF_ABI,
        functionName: "setApprovalForAll",
        args: [POLYGON_CONTRACTS.CTF_EXCHANGE as `0x${string}`, true],
      }),
      description: "Approve CTF tokens for Exchange",
    });
  }

  // 4. Approve CTF tokens for Neg Risk Exchange
  if (!status.ctfApprovedNegRiskExchange) {
    transactions.push({
      to: POLYGON_CONTRACTS.CTF,
      data: encodeFunctionData({
        abi: CTF_ABI,
        functionName: "setApprovalForAll",
        args: [POLYGON_CONTRACTS.NEG_RISK_CTF_EXCHANGE as `0x${string}`, true],
      }),
      description: "Approve CTF tokens for Neg Risk Exchange",
    });
  }

  // 5. Approve CTF tokens for Neg Risk Adapter
  if (!status.ctfApprovedNegRiskAdapter) {
    transactions.push({
      to: POLYGON_CONTRACTS.CTF,
      data: encodeFunctionData({
        abi: CTF_ABI,
        functionName: "setApprovalForAll",
        args: [POLYGON_CONTRACTS.NEG_RISK_ADAPTER as `0x${string}`, true],
      }),
      description: "Approve CTF tokens for Neg Risk Adapter",
    });
  }

  return transactions;
}

/**
 * Build single USDC approval for a specific spender
 */
export function buildUsdcApproval(spender: string, amount?: bigint): ApprovalTransaction {
  return {
    to: POLYGON_CONTRACTS.USDC,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender as `0x${string}`, amount ?? maxUint256],
    }),
    description: `Approve USDC for ${spender.slice(0, 8)}...`,
  };
}

// ============= Utility =============

// Note: formatUsdcAmount is re-exported from ./proxyWallet at top of file

/**
 * Parse USDC amount to bigint
 */
export function parseUsdcAmount(amount: string): bigint {
  return parseUnits(amount, 6);
}

// ============= Bridge API Types =============

export interface BridgeToken {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
}

export interface SupportedAsset {
  chainId: string;
  chainName: string;
  token: BridgeToken;
  minCheckoutUsd: number;
}

/**
 * Bridge deposit addresses - one per network type
 * EVM address works for: Ethereum, Polygon, Arbitrum, Base, Optimism, etc.
 * SVM address works for: Solana
 * BTC address works for: Bitcoin
 */
export interface BridgeDepositAddresses {
  evm: string;    // For all EVM chains (Ethereum, Polygon, Arbitrum, Base, etc.)
  svm: string;    // For Solana
  btc: string;    // For Bitcoin
}

export interface BridgeDepositResponse {
  address: BridgeDepositAddresses;
  note: string;
}

export interface SupportedAssetsResponse {
  supportedAssets: SupportedAsset[];
}

// ============= Bridge API Functions =============

// Use proxy API to avoid CORS issues
const BRIDGE_API_URL = "/api/bridge";

/**
 * Get all supported chains and tokens for deposits
 * Each asset has a minimum deposit amount (minCheckoutUsd)
 */
export async function getSupportedAssets(): Promise<SupportedAsset[]> {
  try {
    const response = await fetch(`${BRIDGE_API_URL}/supported-assets`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch supported assets: ${response.status}`);
    }
    
    const data: SupportedAssetsResponse = await response.json();
    return data.supportedAssets || [];
  } catch (error) {
    console.error("[Bridge] Error fetching supported assets:", error);
    return [];
  }
}

/**
 * Create deposit addresses for bridging assets to Polymarket
 * Returns 3 addresses: EVM (for all EVM chains), Solana, Bitcoin
 * 
 * @param walletAddress - Your Polymarket wallet address (destination for USDC.e)
 */
export async function createDepositAddresses(
  walletAddress: string
): Promise<BridgeDepositAddresses | null> {
  try {
    const response = await fetch(`${BRIDGE_API_URL}/deposit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address: walletAddress }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create deposit addresses: ${response.status}`);
    }
    
    const data: BridgeDepositResponse = await response.json();
    return data.address || null;
  } catch (error) {
    console.error("[Bridge] Error creating deposit addresses:", error);
    return null;
  }
}

/**
 * Group supported assets by chain name
 */
export function groupAssetsByChain(
  assets: SupportedAsset[]
): Map<string, SupportedAsset[]> {
  const grouped = new Map<string, SupportedAsset[]>();
  
  for (const asset of assets) {
    const existing = grouped.get(asset.chainName) || [];
    existing.push(asset);
    grouped.set(asset.chainName, existing);
  }
  
  return grouped;
}

/**
 * Get network type for a chain (EVM, Solana, or Bitcoin)
 */
export function getNetworkType(chainName: string): "evm" | "svm" | "btc" {
  const solanaChains = ["Solana"];
  const btcChains = ["Bitcoin"];
  
  if (solanaChains.includes(chainName)) return "svm";
  if (btcChains.includes(chainName)) return "btc";
  return "evm"; // Default to EVM for Ethereum, Polygon, Arbitrum, Base, etc.
}

/**
 * Get minimum deposit amount for a specific chain/token
 */
export function getMinimumDeposit(
  assets: SupportedAsset[],
  chainId: string,
  tokenAddress: string
): number | null {
  const asset = assets.find(
    a => a.chainId === chainId && 
         a.token.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  return asset?.minCheckoutUsd ?? null;
}
