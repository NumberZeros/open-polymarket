/**
 * Withdraw Service
 * 
 * Handles withdrawing USDC from Polymarket to external addresses.
 * 
 * For EOA wallets (MetaMask):
 * - Users directly control their funds
 * - Standard ERC20 transfer from wallet to destination
 * - User pays gas fees
 * 
 * For Polymarket Safe wallets:
 * - Requires relayer for gasless transactions
 * - Uses @polymarket/builder-relayer-client
 * - Polymarket pays gas fees
 * 
 * Note: This simplified version handles EOA withdrawals.
 * For Safe wallet withdrawals, see admin-lab's relayerService.
 */

import { POLYGON_CONTRACTS } from "./config";

// ============= Constants =============

export const USDC_DECIMALS = 6;
export const MIN_WITHDRAWAL_USDC = 0.01;

// ERC20 Transfer ABI
export const ERC20_TRANSFER_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ============= Types =============

export interface WithdrawRequest {
  /** Destination Ethereum/Polygon address */
  destinationAddress: string;
  /** Amount in USDC (human-readable, e.g., "10.5") */
  amount: string;
}

export interface WithdrawPreview {
  /** Amount in USDC (human-readable) */
  amount: string;
  /** Amount in raw USDC units (6 decimals) */
  amountRaw: string;
  /** Destination address */
  destinationAddress: string;
  /** Estimated gas cost in MATIC */
  estimatedGasCost: string;
  /** Final amount user will receive */
  finalAmount: string;
  /** Whether transaction is gasless */
  isGasless: boolean;
  /** Token being withdrawn */
  tokenSymbol: string;
}

export interface WithdrawResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// ============= Validation Functions =============

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

// ============= Conversion Functions =============

/**
 * Convert human-readable USDC amount to raw units (6 decimals)
 */
export function usdcToRaw(amount: string): string {
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum)) {
    throw new Error("Invalid amount");
  }
  const rawAmount = Math.floor(amountNum * Math.pow(10, USDC_DECIMALS));
  return rawAmount.toString();
}

/**
 * Convert raw USDC units to human-readable amount
 */
export function rawToUsdc(rawAmount: string): string {
  const rawNum = parseFloat(rawAmount);
  if (isNaN(rawNum)) {
    throw new Error("Invalid raw amount");
  }
  return (rawNum / Math.pow(10, USDC_DECIMALS)).toFixed(USDC_DECIMALS);
}

// ============= Transaction Helpers =============

/**
 * Get USDC contract address on Polygon
 */
export function getUsdcAddress(): string {
  return POLYGON_CONTRACTS.USDC;
}

/**
 * Create withdrawal preview
 */
export function createWithdrawPreview(
  request: WithdrawRequest,
  isGasless: boolean = false
): WithdrawPreview {
  const amountRaw = usdcToRaw(request.amount);

  return {
    amount: request.amount,
    amountRaw,
    destinationAddress: request.destinationAddress,
    estimatedGasCost: isGasless ? "0" : "~0.01 MATIC",
    finalAmount: request.amount,
    isGasless,
    tokenSymbol: "USDC.e",
  };
}

/**
 * Encode ERC20 transfer function call
 * Returns hex data for transfer(address,uint256)
 */
export function encodeTransferData(to: string, amount: string): string {
  // Function selector for transfer(address,uint256)
  const TRANSFER_SELECTOR = "0xa9059cbb";
  
  // Remove 0x prefix and pad address to 32 bytes
  const addressPadded = to.toLowerCase().replace("0x", "").padStart(64, "0");
  
  // Convert amount to hex and pad to 32 bytes
  const amountHex = BigInt(amount).toString(16).padStart(64, "0");
  
  return `${TRANSFER_SELECTOR}${addressPadded}${amountHex}`;
}

// ============= EOA Withdrawal =============

/**
 * Build transaction parameters for EOA withdrawal
 * User will sign and send this transaction directly
 */
export function buildEoaWithdrawTx(request: WithdrawRequest): {
  to: string;
  data: string;
  value: string;
} {
  if (!isValidEthereumAddress(request.destinationAddress)) {
    throw new Error("Invalid destination address");
  }

  const amountRaw = usdcToRaw(request.amount);

  return {
    to: POLYGON_CONTRACTS.USDC,
    data: encodeTransferData(request.destinationAddress, amountRaw),
    value: "0x0",
  };
}

// ============= Error Types =============

export class WithdrawError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "WithdrawError";
  }
}

export const WITHDRAW_ERROR_CODES = {
  INVALID_ADDRESS: "INVALID_ADDRESS",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  USER_REJECTED: "USER_REJECTED",
} as const;
