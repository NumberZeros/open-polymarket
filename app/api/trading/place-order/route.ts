/**
 * API Route: Place Order (Server-Side L2 + Builder Auth)
 * 
 * Receives EIP-712 signed order + credentials from client and posts to CLOB
 * with BOTH user L2 authentication AND builder attribution
 * 
 * Flow:
 * 1. Client signs order with wallet (EIP-712)
 * 2. Client sends order + API credentials
 * 3. Server calculates L2 HMAC using user credentials
 * 4. Server adds Builder headers
 * 5. Server posts to CLOB with BOTH signatures
 */

import { NextRequest, NextResponse } from "next/server";
import { BuilderSigner } from "@polymarket/builder-signing-sdk";
import crypto from "crypto";

const CLOB_API_URL = process.env.NEXT_PUBLIC_CLOB_API_URL || "https://clob.polymarket.com";

// Initialize builder signer with credentials from environment
const builderSigner = new BuilderSigner({
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
});

/**
 * Calculate HMAC signature for L2 authentication
 * 
 * Polymarket L2 auth format:
 * - Message: timestamp + method + path + body
 * - Key: base64-decoded secret
 * - Output: base64-encoded HMAC-SHA256
 * 
 * The secret should be base64 format (44 chars).
 * If it's hex format (64 chars), we need to convert hex → bytes first.
 */
function calculateL2Hmac(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  body: string
): string {
  const message = timestamp + method + path + body;
  
  console.log("[PlaceOrder API] L2 HMAC calculation:");
  console.log("[PlaceOrder API]   Secret length:", secret.length);
  console.log("[PlaceOrder API]   Secret format:", secret.length === 44 ? "BASE64" : secret.length === 64 ? "HEX" : "UNKNOWN");
  
  let keyBuffer: Buffer;
  
  // Check if secret is hex (64 chars) or base64 (44 chars)
  const isHex = /^[a-f0-9]{64}$/i.test(secret);
  
  if (isHex) {
    // Hex format: convert hex → bytes directly
    console.log("[PlaceOrder API]   Converting HEX secret to bytes...");
    keyBuffer = Buffer.from(secret, "hex");
  } else {
    // Base64 format: decode base64 → bytes
    console.log("[PlaceOrder API]   Decoding BASE64 secret...");
    keyBuffer = Buffer.from(secret, "base64");
  }
  
  console.log("[PlaceOrder API]   Key buffer length:", keyBuffer.length, "bytes");
  
  const hmac = crypto.createHmac("sha256", keyBuffer);
  hmac.update(message);
  const signature = hmac.digest("base64");
  
  console.log("[PlaceOrder API]   Generated HMAC:", signature.substring(0, 30) + "...");
  
  return signature;
}

export async function POST(request: NextRequest) {
  try {
    const {
      walletAddress,
      signedOrder,
      apiKey,
      apiSecret,
      apiPassphrase,
    } = await request.json();

    if (!walletAddress || !signedOrder) {
      return NextResponse.json(
        { error: "Missing walletAddress or signedOrder" },
        { status: 400 }
      );
    }

    if (!apiKey || !apiSecret || !apiPassphrase) {
      return NextResponse.json(
        { error: "Missing API credentials (apiKey, apiSecret, apiPassphrase)" },
        { status: 400 }
      );
    }

    console.log("[PlaceOrder API] Placing order for:", walletAddress);
    console.log("[PlaceOrder API] API Key received:", !!apiKey ? apiKey.substring(0, 10) : "undefined");
    console.log("[PlaceOrder API] API Secret length:", apiSecret?.length);
    console.log("[PlaceOrder API] API Secret (first 20 chars):", apiSecret?.substring(0, 20));
    console.log("[PlaceOrder API] API Passphrase:", apiPassphrase?.substring(0, 5));

    const method = "post"; // Must be lowercase for HMAC calculation!
    const path = "/order";
    const body = JSON.stringify(signedOrder);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    console.log("[PlaceOrder API] Signed order keys:", Object.keys(signedOrder).slice(0, 5));

    // Step 1: Calculate L2 HMAC using user's API secret
    console.log("[PlaceOrder API] Calculating L2 HMAC with user credentials...");
    console.log("[PlaceOrder API] HMAC Debug:", {
      methodForHmac: method,
      secretLength: apiSecret?.length,
      secretStart: apiSecret?.substring(0, 20),
      timestamp,
      path,
      bodyLength: body.length
    });
    const l2Hmac = calculateL2Hmac(apiSecret, timestamp, method, path, body);
    console.log("[PlaceOrder API] ✅ L2 HMAC calculated");

    // Step 2: Generate Builder authentication headers
    console.log("[PlaceOrder API] Generating Builder headers...");
    const builderHeaders = builderSigner.createBuilderHeaderPayload(
      method,
      path,
      body
    );
    console.log("[PlaceOrder API] ✅ Builder headers generated");

    // Step 3: Post order to CLOB API with BOTH L2 and Builder authentication
    console.log("[PlaceOrder API] Posting to CLOB with combined headers...");
    const response = await fetch(`${CLOB_API_URL}${path}`, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        // L2 Authentication (User)
        "POLY-ADDRESS": walletAddress,
        "POLY-SIGNATURE": l2Hmac,
        "POLY-TIMESTAMP": timestamp,
        "POLY-API-KEY": apiKey,
        "POLY-PASSPHRASE": apiPassphrase,
        // Builder Attribution (Server)
        "POLY-BUILDER-API-KEY": builderHeaders.POLY_BUILDER_API_KEY,
        "POLY-BUILDER-SIGNATURE": builderHeaders.POLY_BUILDER_SIGNATURE,
        "POLY-BUILDER-TIMESTAMP": builderHeaders.POLY_BUILDER_TIMESTAMP,
        "POLY-BUILDER-PASSPHRASE": builderHeaders.POLY_BUILDER_PASSPHRASE,
      },
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      console.error("[PlaceOrder API] CLOB API returned error:");
      console.error("[PlaceOrder API] Status:", response.status);
      console.error("[PlaceOrder API] Response:", JSON.stringify(errorData, null, 2));
      console.error("[PlaceOrder API] Request that was sent:");
      console.error("[PlaceOrder API]   URL:", `${CLOB_API_URL}${path}`);
      console.error("[PlaceOrder API]   Headers (partial):", {
        "POLY-ADDRESS": walletAddress,
        "POLY-API-KEY": apiKey?.substring(0, 10) + "...",
        "POLY-TIMESTAMP": timestamp,
        "POLY-SIGNATURE": l2Hmac.substring(0, 20) + "...",
        "POLY-BUILDER-API-KEY": (builderHeaders as any).POLY_BUILDER_API_KEY?.substring(0, 10) + "...",
      });
      console.error("[PlaceOrder API]   Body length:", body.length);
      
      throw new Error(errorData.error || `HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("[PlaceOrder API] ✅ Order placed:", result.orderID);

    return NextResponse.json({
      success: true,
      orderID: result.orderID,
      transactionsHashes: result.transactionsHashes,
      ...result,
    });
  } catch (error) {
    console.error("[PlaceOrder API] ❌ Error:", error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to place order",
        details: error,
      },
      { status: 500 }
    );
  }
}
