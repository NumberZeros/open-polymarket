/**
 * Custom Markets Endpoint - Convenience wrapper
 * 
 * This endpoint provides a simplified interface for fetching active markets.
 * It wraps the Gamma API proxy to provide formatted results.
 * 
 * ROUTING NOTE:
 * - This endpoint is at /api/polymarket/markets (custom)
 * - Gamma API proxy is at /api/polymarket/gamma/events (standard)
 * - Use proxy for direct Gamma API access, use this for simplified data
 * 
 * Per Polymarket documentation:
 * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
 * - Use /events endpoint (most efficient for all active markets)
 * - Include closed=false unless historical data needed
 * - Implement pagination with limit/offset
 */

import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit") || "100";
    const offset = searchParams.get("offset") || "0";
    const closed = searchParams.get("closed") || "false";
    const tag_id = searchParams.get("tag_id"); // Optional tag filtering
    
    console.log("[Markets API] Fetching markets from Gamma API proxy...");

    // Build URL for our internal Gamma proxy
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const proxyUrl = new URL(`${baseUrl}/api/polymarket/gamma/events`);
    proxyUrl.searchParams.set("order", "id");
    proxyUrl.searchParams.set("ascending", "false");
    proxyUrl.searchParams.set("closed", closed);
    proxyUrl.searchParams.set("limit", limit);
    proxyUrl.searchParams.set("offset", offset);
    if (tag_id) {
      proxyUrl.searchParams.set("tag_id", tag_id);
    }

    // Call through our proxy (handles CORS and attribution)
    const response = await fetch(proxyUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Gamma API proxy error: ${response.status}`);
    }

    const events = await response.json();
    
    // Gamma API returns array of events, each containing markets array
    const eventsList = Array.isArray(events) ? events : [];

    console.log("[Markets API] Fetched events:", {
      count: eventsList.length,
      firstEvent: eventsList[0]?.title,
    });

    // Extract and flatten markets from events
    const allMarkets: any[] = [];
    
    eventsList.forEach((event: any) => {
      if (event.markets && Array.isArray(event.markets)) {
        event.markets.forEach((market: any) => {
          allMarkets.push({
            ...market,
            eventTitle: event.title,
            eventSlug: event.slug,
            eventId: event.id,
          });
        });
      }
    });

    // Return simplified format
    const formattedMarkets = allMarkets.map((market: any) => ({
      id: market.id,
      conditionId: market.condition_id,
      questionId: market.question_id,
      title: market.question || market.eventTitle,
      description: market.description,
      eventSlug: market.eventSlug,
      eventId: market.eventId,
      active: market.active,
      closed: market.closed,
      acceptingOrders: market.accepting_orders,
      endDate: market.end_date_iso,
      tokens: market.tokens?.map((token: any) => ({
        id: token.token_id,
        outcome: token.outcome,
        price: token.price,
      })) || [],
      volume: market.volume,
      volume24hr: market.volume24hr,
    }));

    console.log("[Markets API] Returning markets:", formattedMarkets.length);

    return Response.json({
      success: true,
      count: formattedMarkets.length,
      markets: formattedMarkets,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error: any) {
    console.error("[Markets API] Error:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Failed to fetch markets",
      },
      { status: 500 }
    );
  }
}
