/**
 * Builder Signing Server Endpoint
 * 
 * Implements remote signing for Polymarket Builder Attribution
 * Based on: https://docs.polymarket.com/developers/builders/builder-signing-server
 * 
 * This endpoint:
 * 1. Receives signing requests from client (method, path, body)
 * 2. Uses Builder API credentials to create HMAC signature
 * 3. Returns BuilderHeaderPayload with all required headers
 * 
 * Security: Builder credentials never leave the server
 */

import { NextRequest, NextResponse } from "next/server";
import { BuilderSigner } from "@polymarket/builder-signing-sdk";

// Check if builder credentials are configured
if (!process.env.POLY_BUILDER_API_KEY || !process.env.POLY_BUILDER_SECRET || !process.env.POLY_BUILDER_PASSPHRASE) {
  console.error("❌ Missing builder credentials in environment variables!");
  console.error("Please set: POLY_BUILDER_API_KEY, POLY_BUILDER_SECRET, POLY_BUILDER_PASSPHRASE");
}

// Initialize builder signer with credentials from environment
const builderSigner = new BuilderSigner({
  key: process.env.POLY_BUILDER_API_KEY || "",
  secret: process.env.POLY_BUILDER_SECRET || "",
  passphrase: process.env.POLY_BUILDER_PASSPHRASE || "",
});

interface SignRequest {
  path: string;
  method: string;
  body?: string;
  timestamp?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SignRequest = await request.json();
    const { path, method, body: requestBody } = body;

    // Validate required fields
    if (!path || !method) {
      return NextResponse.json(
        { error: "Missing required fields: path, method" },
        { status: 400 }
      );
    }

    console.log("[Builder Sign] Signing request:", {
      method,
      path,
      hasBody: !!requestBody,
    });

    // Create builder header payload using SDK
    const payload = builderSigner.createBuilderHeaderPayload(
      method,
      path,
      requestBody
    );

    console.log("[Builder Sign] ✅ Signed successfully");

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[Builder Sign] ❌ Error:", error);
    return NextResponse.json(
      {
        error: "Failed to sign request",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
