/**
 * API Route: Derive API Key
 * 
 * Derives or creates Polymarket API credentials for a user.
 * This is a ONE-TIME operation per wallet.
 * 
 * Flow:
 * 1. User signs authentication message with MetaMask
 * 2. Backend derives deterministic API credentials
 * 3. Credentials are returned to client (user should store them)
 */

import { NextRequest, NextResponse } from "next/server";

const CLOB_API_URL = process.env.NEXT_PUBLIC_CLOB_API_URL || "https://clob.polymarket.com";

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, signature, nonce } = await request.json();

    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json(
        { error: "Missing walletAddress, signature, or nonce" },
        { status: 400 }
      );
    }

    console.log("[DeriveApiKey] Deriving credentials for:", walletAddress);

    // Call CLOB API to derive/create API key
    const response = await fetch(`${CLOB_API_URL}/auth/derive-api-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: walletAddress,
        signature: signature,
        nonce: nonce,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      console.error("[DeriveApiKey] CLOB error:", errorData);
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log("[DeriveApiKey] ✅ Credentials derived");

    return NextResponse.json({
      success: true,
      apiKey: result.apiKey,
      secret: result.secret,
      passphrase: result.passphrase,
    });
  } catch (error) {
    console.error("[DeriveApiKey] ❌ Error:", error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to derive API key",
        details: error,
      },
      { status: 500 }
    );
  }
}
