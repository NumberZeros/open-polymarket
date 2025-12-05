/**
 * Polymarket API Proxy Route
 *
 * Proxies requests to Polymarket APIs to avoid CORS issues
 * and add builder attribution headers.
 */

import { NextRequest, NextResponse } from "next/server";

const POLYMARKET_APIS = {
  clob: "https://clob.polymarket.com",
  gamma: "https://gamma-api.polymarket.com",
  data: "https://data-api.polymarket.com",
  relayer: "https://relayer-v2.polymarket.com",
} as const;

type ApiType = keyof typeof POLYMARKET_APIS;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, "POST");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, "DELETE");
}

async function handleRequest(
  request: NextRequest,
  paramsPromise: Promise<{ path: string[] }>,
  method: string
) {
  try {
    const params = await paramsPromise;
    const [apiType, ...pathParts] = params.path;
    const path = pathParts.join("/");

    if (!apiType || !(apiType in POLYMARKET_APIS)) {
      return NextResponse.json(
        { error: "Invalid API type", validTypes: Object.keys(POLYMARKET_APIS) },
        { status: 400 }
      );
    }

    const baseUrl = POLYMARKET_APIS[apiType as ApiType];
    const url = new URL(`/${path}`, baseUrl);

    // Forward query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    // Build headers
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Forward authorization headers if present
    const authHeaders = [
      "POLY_ADDRESS",
      "POLY_SIGNATURE",
      "POLY_TIMESTAMP",
      "POLY_NONCE",
      "POLY_API_KEY",
      "POLY_PASSPHRASE",
    ];

    authHeaders.forEach((header) => {
      const value = request.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    });

    // Make request to Polymarket
    const options: RequestInit = {
      method,
      headers,
    };

    if (method !== "GET" && method !== "HEAD") {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    }

    const response = await fetch(url.toString(), options);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Polymarket Proxy] Error:", error);
    return NextResponse.json(
      {
        error: "Proxy error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
