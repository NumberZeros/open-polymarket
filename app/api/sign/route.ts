/**
 * Polymarket Signing Server - API Route
 *
 * Generates HMAC signatures for authenticated CLOB API requests.
 * Uses Builder credentials stored server-side.
 * 
 * Based on: https://github.com/Polymarket/clob-client/blob/main/src/headers/index.ts
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Builder credentials - only accessible server-side
const BUILDER_CREDENTIALS = {
  key: process.env.POLY_BUILDER_API_KEY || "",
  secret: process.env.POLY_BUILDER_SECRET || "",
  passphrase: process.env.POLY_BUILDER_PASSPHRASE || "",
};

interface SigningRequest {
  method: string;
  requestPath: string;
  body?: string;
  timestamp?: number;
  address: string;
}

/**
 * Generate HMAC signature for Polymarket CLOB API
 * Format: HMAC_SHA256(base64_decode(secret), timestamp + method + requestPath + body)
 * Result: base64 encoded
 */
function buildHmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  requestPath: string,
  body: string = ""
): string {
  const message = timestamp + method + requestPath + body;
  
  // Secret is base64 encoded, decode it first
  const keyBuffer = Buffer.from(secret, "base64");
  const key = new Uint8Array(keyBuffer.buffer, keyBuffer.byteOffset, keyBuffer.byteLength);
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(message);
  
  return hmac.digest("base64");
}

/**
 * POST /api/sign
 * 
 * Generate L2 authentication headers for CLOB API requests.
 * Returns signed headers that client can use to call CLOB API.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate credentials are configured
    if (
      !BUILDER_CREDENTIALS.key ||
      !BUILDER_CREDENTIALS.secret ||
      !BUILDER_CREDENTIALS.passphrase
    ) {
      return NextResponse.json(
        {
          error: "Signing server not configured",
          message: "Builder credentials are not set. Set POLY_BUILDER_API_KEY, POLY_BUILDER_SECRET, POLY_BUILDER_PASSPHRASE in .env",
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body: SigningRequest = await request.json();

    if (!body.method || !body.requestPath || !body.address) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "method, requestPath, and address are required",
        },
        { status: 400 }
      );
    }

    // Generate timestamp if not provided
    const timestamp = body.timestamp ?? Math.floor(Date.now() / 1000);
    const timestampStr = timestamp.toString();

    // Generate HMAC signature
    const signature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      timestampStr,
      body.method.toUpperCase(),
      body.requestPath,
      body.body || ""
    );

    // Return L2 auth headers
    return NextResponse.json({
      headers: {
        POLY_ADDRESS: body.address,
        POLY_SIGNATURE: signature,
        POLY_TIMESTAMP: timestampStr,
        POLY_API_KEY: BUILDER_CREDENTIALS.key,
        POLY_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
      },
    });
  } catch (error) {
    console.error("[Signing Server] Error:", error);
    return NextResponse.json(
      {
        error: "Signing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sign
 * Health check endpoint
 */
export async function GET() {
  const isConfigured = !!(
    BUILDER_CREDENTIALS.key &&
    BUILDER_CREDENTIALS.secret &&
    BUILDER_CREDENTIALS.passphrase
  );

  return NextResponse.json({
    status: isConfigured ? "ok" : "not_configured",
    service: "bethub-signing-server",
    timestamp: new Date().toISOString(),
    configured: isConfigured,
    keyPrefix: isConfigured ? BUILDER_CREDENTIALS.key.slice(0, 8) + "..." : null,
  });
}
