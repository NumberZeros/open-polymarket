/**
 * API Route: Cancel Order
 * 
 * Cancels an order using builder credentials
 */

import { NextRequest, NextResponse } from "next/server";
import { ClobClient } from "@polymarket/clob-client";

const CLOB_API_URL = process.env.NEXT_PUBLIC_CLOB_API_URL || "https://clob.polymarket.com";

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, orderId } = await request.json();

    if (!walletAddress || !orderId) {
      return NextResponse.json(
        { error: "Missing walletAddress or orderId" },
        { status: 400 }
      );
    }

    console.log("[CancelOrder API] Canceling order:", orderId);

    // Create ClobClient - no builder config needed
    const client = new ClobClient(
      CLOB_API_URL,
      137 // Polygon chainId
    );

    // Cancel order
    const response = await client.cancelOrder({ orderID: orderId });

    console.log("[CancelOrder API] ✅ Order canceled:", response);

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("[CancelOrder API] ❌ Error:", error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to cancel order",
        details: error,
      },
      { status: 500 }
    );
  }
}
