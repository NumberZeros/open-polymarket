/**
 * Proxy Wallet (Gnosis Safe) Utilities
 * 
 * Polymarket uses Gnosis Safe (GnosisSafeL2) as Proxy Wallets.
 * Each user has a deterministic Proxy Wallet address derived from their EOA address.
 * 
 * This module provides:
 * 1. Address derivation from EOA
 * 2. Deployment and balance checks
 * 3. Safe transaction execution (withdrawals)
 * 4. Validation helpers
 * 
 * Safe implementation: 0xE51abdf814f8854941b9Fe8e3A4F65CAB4e7A4a8 (GnosisSafeL2)
 */

import { 
  getCreate2Address, 
  keccak256, 
  encodeAbiParameters, 
  getAddress, 
  encodeFunctionData, 
  parseAbi, 
  concat, 
  type Hex 
} from "viem";
import { POLYGON_CONTRACTS, SAFE_INIT_CODE_HASH } from "./config";

// ============= ABIs =============

const GNOSIS_SAFE_ABI = parseAbi([
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) external payable returns (bool success)",
  "function nonce() external view returns (uint256)",
  "function domainSeparator() external view returns (bytes32)",
  "function isOwner(address owner) external view returns (bool)",
  "function getThreshold() external view returns (uint256)",
]);

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
]);

// ============= Constants =============

export const USDC_DECIMALS = 6;
export const MIN_WITHDRAWAL_USDC = 0.01;

// Safe transaction type hash
const SAFE_TX_TYPEHASH = "0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8";

// Gnosis Safe Operation enum
enum Operation {
  Call = 0,
  DelegateCall = 1,
}

// ============= Types =============

export interface WithdrawParams {
  proxyWalletAddress: string;
  destinationAddress: string;
  amount: bigint;
}

export interface WithdrawResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface WithdrawPreview {
  amount: string;
  amountRaw: string;
  destinationAddress: string;
  estimatedGasCost: string;
  finalAmount: string;
  isGasless: boolean;
  tokenSymbol: string;
}

// ============= Address Derivation =============

/**
 * Derive the Proxy Wallet (Safe) address from a user's EOA address
 * Uses CREATE2 to deterministically compute the address
 */
export function deriveProxyWalletAddress(walletAddress: string): string {
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

// ============= Balance & Deployment Checks =============

/**
 * Check if a Proxy Wallet has been deployed
 */
export async function isProxyWalletDeployed(
  proxyWalletAddress: string,
  publicClient: { getBytecode: (args: { address: `0x${string}` }) => Promise<string | undefined> }
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

// ============= Formatting & Validation =============

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

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate withdrawal amount
 */
export function validateWithdrawAmount(
  amount: string,
  balance: string
): { valid: boolean; error?: string } {
  const amountNum = parseFloat(amount);
  const balanceNum = parseFloat(balance);

  if (isNaN(amountNum) || amountNum <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  if (amountNum < MIN_WITHDRAWAL_USDC) {
    return { valid: false, error: `Minimum withdrawal is ${MIN_WITHDRAWAL_USDC} USDC` };
  }

  if (amountNum > balanceNum) {
    return { valid: false, error: "Insufficient balance" };
  }

  return { valid: true };
}

/**
 * Convert human-readable USDC to raw units
 */
export function usdcToRaw(amount: string): string {
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum)) throw new Error("Invalid amount");
  return Math.floor(amountNum * Math.pow(10, USDC_DECIMALS)).toString();
}

/**
 * Create withdrawal preview for UI
 */
export function createWithdrawPreview(
  destinationAddress: string,
  amount: string,
  isGasless: boolean = false
): WithdrawPreview {
  return {
    amount,
    amountRaw: usdcToRaw(amount),
    destinationAddress,
    estimatedGasCost: isGasless ? "0" : "~0.01 MATIC",
    finalAmount: amount,
    isGasless,
    tokenSymbol: "USDC.e",
  };
}

// ============= Safe Transaction Execution =============

/**
 * Build ERC20 transfer calldata
 */
function buildTransferCalldata(to: string, amount: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [to as `0x${string}`, amount],
  });
}

/**
 * Withdraw USDC from Gnosis Safe (Proxy Wallet)
 * 
 * Creates a Safe transaction to transfer USDC, signs it with the owner's key,
 * and executes it via execTransaction.
 */
export async function withdrawFromProxyWallet(
  params: WithdrawParams,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicClient: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletClient: any
): Promise<WithdrawResult> {
  try {
    const { proxyWalletAddress, destinationAddress, amount } = params;
    const safeAddress = proxyWalletAddress as `0x${string}`;
    const ownerAddress = walletClient.account?.address;

    if (!ownerAddress) {
      return { success: false, error: "Wallet not connected" };
    }

    console.log("[SafeWithdraw] Starting withdrawal:", {
      safe: safeAddress,
      owner: ownerAddress,
      to: destinationAddress,
      amount: (Number(amount) / 1e6).toFixed(6),
    });

    // 1. Check if Safe is deployed
    const bytecode = await publicClient.getBytecode({ address: safeAddress });
    if (!bytecode || bytecode === "0x") {
      return { success: false, error: "Safe Wallet not deployed. Please complete Trading Setup first." };
    }

    // 2. Check if caller is owner
    const isOwner = await publicClient.readContract({
      address: safeAddress,
      abi: GNOSIS_SAFE_ABI,
      functionName: "isOwner",
      args: [ownerAddress],
    });

    if (!isOwner) {
      return { success: false, error: "You are not an owner of this Safe Wallet" };
    }

    // 3. Check Safe USDC balance
    const balance = await publicClient.readContract({
      address: POLYGON_CONTRACTS.USDC as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [safeAddress],
    }) as bigint;

    if (balance < amount) {
      const balanceFormatted = (Number(balance) / 1e6).toFixed(2);
      const amountFormatted = (Number(amount) / 1e6).toFixed(2);
      return { 
        success: false, 
        error: `Insufficient balance. Available: ${balanceFormatted} USDC.e, Requested: ${amountFormatted} USDC.e` 
      };
    }

    // 4. Get Safe nonce
    const nonce = await publicClient.readContract({
      address: safeAddress,
      abi: GNOSIS_SAFE_ABI,
      functionName: "nonce",
    }) as bigint;

    // 5. Get domain separator
    const domainSeparator = await publicClient.readContract({
      address: safeAddress,
      abi: GNOSIS_SAFE_ABI,
      functionName: "domainSeparator",
    }) as `0x${string}`;

    // 6. Build transfer calldata
    const transferData = buildTransferCalldata(destinationAddress, amount);

    // 7. Build Safe transaction params
    const safeTxParams = {
      to: POLYGON_CONTRACTS.USDC as `0x${string}`,
      value: BigInt(0),
      data: transferData,
      operation: Operation.Call,
      safeTxGas: BigInt(0),
      baseGas: BigInt(0),
      gasPrice: BigInt(0),
      gasToken: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      refundReceiver: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      nonce: nonce,
    };

    console.log("[SafeWithdraw] Safe tx params:", safeTxParams);

    // 8. Create safeTxHash (EIP-712 hash)
    const dataHash = keccak256(safeTxParams.data);
    
    const encodedData = encodeAbiParameters(
      [
        { type: "bytes32" }, { type: "address" }, { type: "uint256" },
        { type: "bytes32" }, { type: "uint8" }, { type: "uint256" },
        { type: "uint256" }, { type: "uint256" }, { type: "address" },
        { type: "address" }, { type: "uint256" },
      ],
      [
        SAFE_TX_TYPEHASH as `0x${string}`,
        safeTxParams.to, safeTxParams.value, dataHash,
        safeTxParams.operation, safeTxParams.safeTxGas,
        safeTxParams.baseGas, safeTxParams.gasPrice,
        safeTxParams.gasToken, safeTxParams.refundReceiver,
        safeTxParams.nonce,
      ]
    );

    const safeTxStructHash = keccak256(encodedData);
    const safeTxHash = keccak256(concat(["0x1901" as Hex, domainSeparator, safeTxStructHash]));

    console.log("[SafeWithdraw] SafeTx hash:", safeTxHash);

    // 9. Sign the hash
    const signature = await walletClient.signMessage({ message: { raw: safeTxHash } });

    // 10. Adjust v value for eth_sign signatures (+4)
    let adjustedSignature = signature as string;
    const v = parseInt(adjustedSignature.slice(-2), 16);
    if (v === 27 || v === 28) {
      const newV = (v + 4).toString(16).padStart(2, '0');
      adjustedSignature = adjustedSignature.slice(0, -2) + newV;
    }

    console.log("[SafeWithdraw] Executing transaction...");

    // 11. Execute the transaction
    const hash = await walletClient.writeContract({
      address: safeAddress,
      abi: GNOSIS_SAFE_ABI,
      functionName: "execTransaction",
      args: [
        safeTxParams.to, safeTxParams.value, safeTxParams.data,
        safeTxParams.operation, safeTxParams.safeTxGas,
        safeTxParams.baseGas, safeTxParams.gasPrice,
        safeTxParams.gasToken, safeTxParams.refundReceiver,
        adjustedSignature as `0x${string}`,
      ],
    });

    console.log("[SafeWithdraw] Transaction hash:", hash);

    // 12. Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
      return { success: false, error: "Transaction was reverted" };
    }

    return { success: true, transactionHash: hash };

  } catch (error) {
    console.error("[SafeWithdraw] Error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("execution reverted")) {
        if (error.message.includes("GS026")) return { success: false, error: "Invalid signature. Please try again." };
        if (error.message.includes("GS025")) return { success: false, error: "Invalid signer. You must be an owner of this Safe." };
        if (error.message.includes("GS013")) return { success: false, error: "Safe transaction failed. Please try again." };
        return { success: false, error: `Transaction reverted: ${error.message}` };
      }
      if (error.message.includes("insufficient funds")) {
        return { success: false, error: "Insufficient MATIC for gas. Please add MATIC to your wallet." };
      }
      if (error.message.includes("User rejected") || error.message.includes("user rejected")) {
        return { success: false, error: "Transaction was rejected by user" };
      }
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "Failed to withdraw from Safe Wallet" };
  }
}
