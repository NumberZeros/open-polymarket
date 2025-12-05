/**
 * Relayer Service
 *
 * Handles gasless transactions through Polymarket's relayer infrastructure.
 * - Safe wallet deployment
 * - Token approvals
 * - CTF operations (split, merge, redeem)
 */

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
 */
export async function getSafeAddress(walletAddress: string): Promise<string | null> {
  try {
    const url = `${POLYMARKET_API.RELAYER}/safe?owner=${walletAddress}`;
    console.log("[Relayer] Getting safe address from:", url);
    
    const response = await fetch(url);

    console.log("[Relayer] Response status:", response.status);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log("[Relayer] No safe found (404)");
        return null;
      }
      throw new Error(`Failed to get safe: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[Relayer] Safe data:", data);
    return data.safeAddress || data.address || null;
  } catch (error) {
    console.error("[Relayer] Failed to get safe address:", error);
    return null;
  }
}

/**
 * Deploy a new Safe wallet for the user
 * Requires wallet signature
 */
export async function deploySafe(
  walletAddress: string,
  signTypedData: (domain: object, types: object, value: object) => Promise<string>
): Promise<SafeDeploymentResult> {
  try {
    // 1. Get deployment data from relayer
    const deployResponse = await fetch(
      `${POLYMARKET_API.RELAYER}/safe/deploy-data?owner=${walletAddress}`
    );

    if (!deployResponse.ok) {
      throw new Error(`Failed to get deploy data: ${deployResponse.statusText}`);
    }

    const deployData = await deployResponse.json();
    const { domain, types, message, safeAddress } = deployData;

    // 2. Sign the deployment message
    const signature = await signTypedData(domain, types, message);

    // 3. Submit deployment
    const submitResponse = await fetch(`${POLYMARKET_API.RELAYER}/safe/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: walletAddress,
        signature,
        safeAddress,
      }),
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.json().catch(() => ({}));
      throw new Error(error.message || "Failed to deploy safe");
    }

    const result = await submitResponse.json();
    return {
      success: true,
      safeAddress: result.safeAddress || safeAddress,
      transactionHash: result.transactionHash,
      state: result.state,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to deploy safe",
    };
  }
}

/**
 * Execute a transaction through the relayer
 */
export async function executeTransaction(
  walletAddress: string,
  safeAddress: string,
  transactions: SafeTransaction[],
  signTypedData: (domain: object, types: object, value: object) => Promise<string>
): Promise<TransactionResult> {
  try {
    // 1. Get transaction data for signing
    const txDataResponse = await fetch(
      `${POLYMARKET_API.RELAYER}/transaction-data`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safe: safeAddress,
          transactions,
        }),
      }
    );

    if (!txDataResponse.ok) {
      throw new Error(`Failed to get tx data: ${txDataResponse.statusText}`);
    }

    const txData = await txDataResponse.json();
    const { domain, types, message } = txData;

    // 2. Sign the transaction
    const signature = await signTypedData(domain, types, message);

    // 3. Submit transaction
    const submitResponse = await fetch(`${POLYMARKET_API.RELAYER}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: walletAddress,
        safe: safeAddress,
        transactions,
        signature,
      }),
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.json().catch(() => ({}));
      throw new Error(error.message || "Failed to execute transaction");
    }

    const result = await submitResponse.json();
    return {
      success: true,
      transactionHash: result.transactionHash,
      state: result.state,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute transaction",
    };
  }
}

// ============= Pre-built Transactions =============

/**
 * Encode ERC20 approve call
 */
function encodeApprove(spender: string, amount: string): string {
  // Simple ABI encoding for approve(address,uint256)
  // Function selector: 0x095ea7b3
  const selector = "0x095ea7b3";
  const paddedSpender = spender.slice(2).padStart(64, "0");
  const paddedAmount = BigInt(amount).toString(16).padStart(64, "0");
  return `${selector}${paddedSpender}${paddedAmount}`;
}

/**
 * Setup trading approvals for a Safe wallet
 * Approves USDC.e spending by CTF Exchange contracts
 */
export async function setupTradingApprovals(
  walletAddress: string,
  safeAddress: string,
  signTypedData: (domain: object, types: object, value: object) => Promise<string>
): Promise<TransactionResult> {
  const maxUint256 =
    "115792089237316195423570985008687907853269984665640564039457584007913129639935";

  const transactions: SafeTransaction[] = [
    // Approve USDC.e for CTF Exchange
    {
      to: POLYGON_CONTRACTS.USDC,
      data: encodeApprove(POLYGON_CONTRACTS.CTF_EXCHANGE, maxUint256),
      value: "0",
      operation: 0,
    },
    // Approve USDC.e for Neg Risk CTF Exchange
    {
      to: POLYGON_CONTRACTS.USDC,
      data: encodeApprove(POLYGON_CONTRACTS.NEG_RISK_CTF_EXCHANGE, maxUint256),
      value: "0",
      operation: 0,
    },
    // Approve CTF for CTF Exchange
    {
      to: POLYGON_CONTRACTS.CTF,
      data: encodeApprove(POLYGON_CONTRACTS.CTF_EXCHANGE, maxUint256),
      value: "0",
      operation: 0,
    },
    // Approve CTF for Neg Risk CTF Exchange
    {
      to: POLYGON_CONTRACTS.CTF,
      data: encodeApprove(POLYGON_CONTRACTS.NEG_RISK_CTF_EXCHANGE, maxUint256),
      value: "0",
      operation: 0,
    },
  ];

  return executeTransaction(walletAddress, safeAddress, transactions, signTypedData);
}

/**
 * Check relayer status
 */
export async function getRelayerStatus(
  walletAddress?: string
): Promise<RelayerStatus> {
  if (!walletAddress) {
    return {
      isReady: false,
      hasWallet: false,
      hasSafe: false,
    };
  }

  const safeAddress = await getSafeAddress(walletAddress);

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
