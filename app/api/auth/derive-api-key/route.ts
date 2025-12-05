/**
 * Derive API Key - Proxy Route
 *
 * Proxies the derive-api-key request to Polymarket CLOB API
 * to avoid CORS issues from browser
 */

import { NextRequest, NextResponse } from "next/server";

const CLOB_API_URL = "https://clob.polymarket.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, signature, timestamp, nonce } = body;

    if (!address || !signature || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // First try to derive existing key
    const deriveResponse = await fetch(`${CLOB_API_URL}/auth/derive-api-key`, {
      method: "GET",
      headers: {
        "POLY_ADDRESS": address,
        "POLY_SIGNATURE": signature,
        "POLY_TIMESTAMP": timestamp.toString(),
        "POLY_NONCE": (nonce ?? 0).toString(),
      },
    });

    if (deriveResponse.ok) {
      const data = await deriveResponse.json();
      return NextResponse.json({
        apiKey: data.apiKey,
        secret: data.secret,
        passphrase: data.passphrase,
      });
    }

    // If derive fails, try to create new key
    const createResponse = await fetch(`${CLOB_API_URL}/auth/api-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "POLY_ADDRESS": address,
        "POLY_SIGNATURE": signature,
        "POLY_TIMESTAMP": timestamp.toString(),
        "POLY_NONCE": (nonce ?? 0).toString(),
      },
    });

    if (createResponse.ok) {
      const data = await createResponse.json();
      return NextResponse.json({
        apiKey: data.apiKey,
        secret: data.secret,
        passphrase: data.passphrase,
      });
    }

    // Both failed - return error
    const errorText = await createResponse.text();
    console.error("[Derive API Key] Failed:", errorText);
    
    return NextResponse.json(
      { error: "Failed to derive or create API key", details: errorText },
      { status: createResponse.status }
    );
  } catch (error) {
    console.error("[Derive API Key] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
