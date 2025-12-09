/**
 * WebSocket Provider
 * 
 * Initializes and manages WebSocket connection at app level.
 * Place this in your root layout to enable real-time features.
 */

"use client";

import React, { useEffect } from "react";
import { getWebSocketClient, type WSMessage, type PriceUpdate, type BookUpdate, type TradeUpdate } from "@/lib/polymarket/websocket";
import { useWebSocketStore } from "@/stores/websocketStore";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const connect = useWebSocketStore((state) => state.connect);
  const setConnectionStatus = useWebSocketStore((state) => state.setConnectionStatus);
  const updatePrice = useWebSocketStore((state) => state.updatePrice);
  const updateOrderBook = useWebSocketStore((state) => state.updateOrderBook);
  const addTrade = useWebSocketStore((state) => state.addTrade);

  useEffect(() => {
    const client = getWebSocketClient();

    // Setup message handler
    const unsubscribeMessage = client.onMessage((message: WSMessage) => {
      switch (message.type) {
        case "price_change": {
          const data = message.data as PriceUpdate;
          updatePrice(data.asset_id, data);
          break;
        }
        case "book_update": {
          const data = message.data as BookUpdate;
          updateOrderBook(data.asset_id, data);
          break;
        }
        case "trade": {
          const data = message.data as TradeUpdate;
          addTrade(data);
          break;
        }
      }
    });

    // Setup connection handlers
    const unsubscribeConnect = client.onConnect(() => {
      setConnectionStatus(true);
    });

    const unsubscribeDisconnect = client.onDisconnect(() => {
      setConnectionStatus(false);
    });

    // Try to connect (optional - will fallback to polling if fails)
    connect().catch(() => {
      console.warn("[WebSocket] Connection unavailable, using polling mode");
    });

    // Cleanup
    return () => {
      unsubscribeMessage();
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, [connect, setConnectionStatus, updatePrice, updateOrderBook, addTrade]);

  return <>{children}</>;
}
