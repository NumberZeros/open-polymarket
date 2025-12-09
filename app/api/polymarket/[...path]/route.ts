/**
 * Polymarket API Proxy Route
 *
 * Proxies requests to Polymarket APIs to avoid CORS issues
 * and add builder attribution headers.
 * 
 * ROUTING STRUCTURE:
 * =================
 * This catch-all route handles: /api/polymarket/{apiType}/{...path}
 * 
 * Supported API Types:
 * - gamma: Gamma Markets API (market data, events, tags)
 *   Example: /api/polymarket/gamma/events → https://gamma-api.polymarket.com/events
 * 
 * - clob: CLOB API (orderbooks, trades, real-time trading data)
 *   Example: /api/polymarket/clob/book?token_id=123 → https://clob.polymarket.com/book?token_id=123
 * 
 * - data: Data API (historical data)
 *   Example: /api/polymarket/data/... → https://data-api.polymarket.com/...
 * 
 * - relayer: Relayer API (gasless transactions)
 *   Example: /api/polymarket/relayer/... → https://relayer-v2.polymarket.com/...
 * 
 * GAMMA API ENDPOINTS (per official docs):
 * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
 * 
 * 1. Fetch by Slug (individual markets/events):
 *    - /api/polymarket/gamma/events/slug/{slug}
 *    - /api/polymarket/gamma/markets/slug/{slug}
 * 
 * 2. Fetch by Tags (category filtering):
 *    - /api/polymarket/gamma/tags (get available tags)
 *    - /api/polymarket/gamma/sports (sports tags/metadata)
 *    - /api/polymarket/gamma/events?tag_id={id}
 *    - /api/polymarket/gamma/markets?tag_id={id}
 * 
 * 3. Fetch All Active (recommended for discovery):
 *    - /api/polymarket/gamma/events?order=id&ascending=false&closed=false&limit=100
 *    - Use events endpoint (more efficient than markets)
 * 
 * CUSTOM ENDPOINTS (not proxied):
 * - /api/polymarket/markets (convenience wrapper - see markets/route.ts)
 * - /api/polymarket/sign-and-create-order
 * - /api/polymarket/cancel-order
 * - /api/polymarket/derive-api-key
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

    // Skip catch-all for our custom endpoints
    // These are handled by specific route.ts files in their own folders
    const customEndpoints = ["derive-api-key", "place-order", "cancel-order", "sign-and-create-order"];
    if (customEndpoints.includes(apiType)) {
      return NextResponse.json(
        { error: "Endpoint not handled by proxy - check route configuration" },
        { status: 405 }
      );
    }

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

    // Forward L2 authentication headers (user credentials)
    const authHeaders = [
      "POLY_ADDRESS",
      "POLY_SIGNATURE",
      "POLY_TIMESTAMP",
      "POLY_NONCE",
      "POLY_API_KEY",
      "POLY_PASSPHRASE",
    ];

    // Forward Builder attribution headers (optional)
    const builderHeaders = [
      "POLY_BUILDER_API_KEY",
      "POLY_BUILDER_SIGNATURE",
      "POLY_BUILDER_TIMESTAMP",
      "POLY_BUILDER_PASSPHRASE",
    ];

    [...authHeaders, ...builderHeaders].forEach((header) => {
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
    
    // Handle non-2xx responses
    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
      
      // Try to parse error response
      if (contentType?.includes("application/json")) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }
      } else {
        // Non-JSON response (likely HTML error page)
        const text = await response.text();
        if (text.includes("Unauthorized") || text.includes("401")) {
          errorMessage = "Unauthorized - Invalid or missing API credentials";
        } else if (text.includes("Forbidden") || text.includes("403")) {
          errorMessage = "Forbidden - Access denied";
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }
    
    // Parse successful response
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
