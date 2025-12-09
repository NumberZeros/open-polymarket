import { useCallback } from "react";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { encodeFunctionData, erc20Abi } from "viem";
import { useWallet } from "@/providers/WalletContext";
import { POLYGON_CONTRACTS } from "@/lib/polymarket/config";

const MAX_UINT256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

const ERC1155_ABI = [
  {
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default function useTokenApprovals() {
  const { publicClient } = useWallet();

  const checkAllTokenApprovals = useCallback(async (safeAddress: string) => {
    try {
      // Check all required approvals
      const [
        usdcCtfExchange,
        usdcNegRiskExchange, 
        usdcNegRiskAdapter,
        ctfCtfExchange,
        ctfNegRiskExchange,
        ctfNegRiskAdapter
      ] = await Promise.all([
        // USDC approvals
        publicClient.readContract({
          address: POLYGON_CONTRACTS.USDC as `0x${string}`,
          abi: erc20Abi,
          functionName: "allowance",
          args: [safeAddress as `0x${string}`, POLYGON_CONTRACTS.CTF_EXCHANGE as `0x${string}`],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: POLYGON_CONTRACTS.USDC as `0x${string}`,
          abi: erc20Abi,
          functionName: "allowance",
          args: [safeAddress as `0x${string}`, POLYGON_CONTRACTS.NEG_RISK_CTF_EXCHANGE as `0x${string}`],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: POLYGON_CONTRACTS.USDC as `0x${string}`,
          abi: erc20Abi,
          functionName: "allowance",
          args: [safeAddress as `0x${string}`, POLYGON_CONTRACTS.NEG_RISK_ADAPTER as `0x${string}`],
        }) as Promise<bigint>,
        // CTF token approvals
        publicClient.readContract({
          address: POLYGON_CONTRACTS.CTF as `0x${string}`,
          abi: ERC1155_ABI,
          functionName: "isApprovedForAll",
          args: [safeAddress as `0x${string}`, POLYGON_CONTRACTS.CTF_EXCHANGE as `0x${string}`],
        }) as Promise<boolean>,
        publicClient.readContract({
          address: POLYGON_CONTRACTS.CTF as `0x${string}`,
          abi: ERC1155_ABI,
          functionName: "isApprovedForAll",
          args: [safeAddress as `0x${string}`, POLYGON_CONTRACTS.NEG_RISK_CTF_EXCHANGE as `0x${string}`],
        }) as Promise<boolean>,
        publicClient.readContract({
          address: POLYGON_CONTRACTS.CTF as `0x${string}`,
          abi: ERC1155_ABI,
          functionName: "isApprovedForAll",
          args: [safeAddress as `0x${string}`, POLYGON_CONTRACTS.NEG_RISK_ADAPTER as `0x${string}`],
        }) as Promise<boolean>,
      ]);

      const threshold = BigInt("1000000000000"); // 1M USDC
      const allApproved = 
        usdcCtfExchange >= threshold &&
        usdcNegRiskExchange >= threshold &&
        usdcNegRiskAdapter >= threshold &&
        ctfCtfExchange &&
        ctfNegRiskExchange &&
        ctfNegRiskAdapter;

      return { allApproved };
    } catch (error) {
      console.error("Failed to check token approvals:", error);
      return { allApproved: false };
    }
  }, [publicClient]);

  const setAllTokenApprovals = useCallback(async (relayClient: RelayClient): Promise<boolean> => {
    try {
      // Create approval transactions
      const approvalTxs = [
        // USDC approvals
        {
          to: POLYGON_CONTRACTS.USDC,
          operation: 0, // Call
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [POLYGON_CONTRACTS.CTF_EXCHANGE as `0x${string}`, BigInt(MAX_UINT256)]
          }),
          value: '0'
        },
        {
          to: POLYGON_CONTRACTS.USDC,
          operation: 0,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [POLYGON_CONTRACTS.NEG_RISK_CTF_EXCHANGE as `0x${string}`, BigInt(MAX_UINT256)]
          }),
          value: '0'
        },
        {
          to: POLYGON_CONTRACTS.USDC,
          operation: 0,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [POLYGON_CONTRACTS.NEG_RISK_ADAPTER as `0x${string}`, BigInt(MAX_UINT256)]
          }),
          value: '0'
        },
        // CTF token approvals
        {
          to: POLYGON_CONTRACTS.CTF,
          operation: 0,
          data: encodeFunctionData({
            abi: ERC1155_ABI,
            functionName: 'setApprovalForAll',
            args: [POLYGON_CONTRACTS.CTF_EXCHANGE as `0x${string}`, true]
          }),
          value: '0'
        },
        {
          to: POLYGON_CONTRACTS.CTF,
          operation: 0,
          data: encodeFunctionData({
            abi: ERC1155_ABI,
            functionName: 'setApprovalForAll',
            args: [POLYGON_CONTRACTS.NEG_RISK_CTF_EXCHANGE as `0x${string}`, true]
          }),
          value: '0'
        },
        {
          to: POLYGON_CONTRACTS.CTF,
          operation: 0,
          data: encodeFunctionData({
            abi: ERC1155_ABI,
            functionName: 'setApprovalForAll',
            args: [POLYGON_CONTRACTS.NEG_RISK_ADAPTER as `0x${string}`, true]
          }),
          value: '0'
        },
      ];

      // Execute all approvals in batch
      const response = await relayClient.execute(
        approvalTxs,
        "Set all token approvals for trading"
      );
      await response.wait();
      
      console.log("✅ All token approvals set successfully");
      return true;
    } catch (error) {
      console.error("Failed to set token approvals:", error);
      return false;
    }
  }, []);

  return {
    checkAllTokenApprovals,
    setAllTokenApprovals,
  };
}