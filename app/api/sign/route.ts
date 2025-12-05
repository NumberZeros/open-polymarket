/**
 * Polymarket Signing Server - API Route
 *
 * This is an internal signing server for the Builder Program.
 * It signs requests using the Builder API credentials stored server-side.
 *
 * This route handles:
 * - HMAC signature generation for Polymarket API requests
 * - Secure credential storage (server-side only)
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
  path: string;
  body?: string;
  timestamp?: number;
}

/**
 * Generate HMAC signature for Polymarket API
 */
function generateSignature(
  secret: string,
  timestamp: number,
  method: string,
  path: string,
  body: string = ""
): string {
  const message = `${timestamp}${method}${path}${body}`;
  // Use base64 decoding that works in both Node.js and Edge runtime
  const secretBuffer = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
  const hmac = crypto.createHmac("sha256", secretBuffer);
  hmac.update(message);
  return hmac.digest("base64");
}

/**
 * POST /api/sign
 * Sign a request for Polymarket API
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
          message: "Builder credentials are not set",
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body: SigningRequest = await request.json();

    if (!body.method || !body.path) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "method and path are required",
        },
        { status: 400 }
      );
    }

    // Generate timestamp if not provided
    const timestamp = body.timestamp || Math.floor(Date.now() / 1000);

    // Generate signature
    const signature = generateSignature(
      BUILDER_CREDENTIALS.secret,
      timestamp,
      body.method.toUpperCase(),
      body.path,
      body.body || ""
    );

    return NextResponse.json({
      signature,
      timestamp,
      key: BUILDER_CREDENTIALS.key,
      passphrase: BUILDER_CREDENTIALS.passphrase,
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
  });
}
