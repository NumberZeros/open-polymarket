/**
 * Derive API Key - Proxy Route
 *
 * Proxies the derive-api-key request to Polymarket CLOB API
 * to avoid CORS issues from browser.
 * 
 * Based on: https://github.com/Polymarket/clob-client/blob/main/src/signing/eip712.ts
 */

import { NextRequest, NextResponse } from "next/server";

const CLOB_API_URL = "https://clob.polymarket.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, signature, timestamp, nonce } = body;

    if (!address || !signature || timestamp === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: address, signature, timestamp" },
        { status: 400 }
      );
    }

    // Build L1 auth headers (EIP-712 based)
    const authHeaders = {
      "POLY_ADDRESS": address,
      "POLY_SIGNATURE": signature,
      "POLY_TIMESTAMP": timestamp.toString(),
      "POLY_NONCE": (nonce ?? 0).toString(),
    };

    console.log("[Derive API Key] Attempting to derive key for:", address);
    console.log("[Derive API Key] Headers:", JSON.stringify(authHeaders, null, 2));

    // First try to derive existing key (GET endpoint)
    const deriveResponse = await fetch(`${CLOB_API_URL}/auth/derive-api-key`, {
      method: "GET",
      headers: authHeaders,
    });

    console.log("[Derive API Key] Derive response status:", deriveResponse.status);

    if (deriveResponse.ok) {
      const data = await deriveResponse.json();
      console.log("[Derive API Key] Successfully derived existing key");
      return NextResponse.json({
        apiKey: data.apiKey,
        secret: data.secret,
        passphrase: data.passphrase,
      });
    }

    // Log derive error for debugging
    const deriveError = await deriveResponse.text();
    console.log("[Derive API Key] Derive failed:", deriveError);

    // If derive fails (404 or other), try to create new key (POST endpoint)
    console.log("[Derive API Key] Attempting to create new key...");
    
    const createResponse = await fetch(`${CLOB_API_URL}/auth/api-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
    });

    console.log("[Derive API Key] Create response status:", createResponse.status);

    if (createResponse.ok) {
      const data = await createResponse.json();
      console.log("[Derive API Key] Successfully created new key");
      return NextResponse.json({
        apiKey: data.apiKey,
        secret: data.secret,
        passphrase: data.passphrase,
      });
    }

    // Both failed - return detailed error
    const createError = await createResponse.text();
    console.error("[Derive API Key] Create failed:", createError);
    
    return NextResponse.json(
      { 
        error: "Failed to derive or create API key", 
        details: {
          deriveStatus: deriveResponse.status,
          deriveError: deriveError,
          createStatus: createResponse.status,
          createError: createError,
        }
      },
      { status: createResponse.status || 500 }
    );
  } catch (error) {
    console.error("[Derive API Key] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
