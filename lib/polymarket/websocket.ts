/**
 * Polymarket WebSocket Client
 * 
 * Real-time data streaming for:
 * - Market prices
 * - Order book updates
 * - Trade feeds
 * 
 * Based on Polymarket WebSocket API documentation
 * 
 * IMPORTANT: Polymarket WebSocket should connect DIRECTLY to:
 * - wss://ws-subscriptions-clob.polymarket.com/ws/market (public data)
 * - wss://ws-subscriptions-clob.polymarket.com/ws/user (authenticated)
 * 
 * WebSocket connections CANNOT be proxied through Next.js API routes.
 * Current implementation is disabled (autoReconnect: false) as it causes errors.
 * 
 * For production use:
 * 1. Update POLYMARKET_API.ws to point directly to Polymarket WSS
 * 2. Send subscription message with proper format:
 *    { type: "market", assets_ids: [...], initial_dump: true }
 * 3. Handle authentication in subscription message for user channel
 */

import { POLYMARKET_API } from "./config";

// ============= Types =============

export type WSMessageType = 
  | "price_change" 
  | "book_update" 
  | "trade" 
  | "subscribed"
  | "unsubscribed"
  | "error"
  | "pong";

export interface WSMessage {
  type: WSMessageType;
  channel?: string;
  data?: unknown;
  timestamp?: number;
}

export interface PriceUpdate {
  asset_id: string;
  market: string;
  price: string;
  timestamp: number;
}

export interface BookUpdate {
  asset_id: string;
  market: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: number;
}

export interface TradeUpdate {
  id: string;
  market: string;
  asset_id: string;
  side: "BUY" | "SELL";
  price: string;
  size: string;
  timestamp: number;
}

export interface WSSubscription {
  channel: "price" | "book" | "trades";
  assets?: string[]; // token IDs
  markets?: string[]; // condition IDs
}

type MessageHandler = (message: WSMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event) => void;

// ============= WebSocket Client =============

export class PolymarketWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private subscriptions: Set<string> = new Set();
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 1; // Only try once to avoid spam
  private reconnectDelay = 5000; // Wait 5s before retry
  private pingInterval: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private autoReconnect = false; // Disabled by default

  constructor(url: string = POLYMARKET_API.WSS_CLOB, options?: { autoReconnect?: boolean }) {
    this.url = url;
    // Disable auto-reconnect by default to prevent error spam
    this.autoReconnect = options?.autoReconnect ?? false;
  }

  // ============= Connection Management =============

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.isManualClose = false;
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("[WS] Connected to", this.url);
          this.reconnectAttempts = 0;
          this.startPing();
          this.resubscribe();
          this.connectHandlers.forEach(handler => handler());
          resolve();
        };

        this.ws.onclose = (event) => {
          console.debug("[WS] Connection closed");
          this.stopPing();
          this.disconnectHandlers.forEach(handler => handler());
          
          if (!this.isManualClose && this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          // Silently handle WebSocket errors - app works fine with polling
          console.debug("[WS] Connection unavailable - using polling mode");
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WSMessage;
            this.messageHandlers.forEach(handler => handler(message));
          } catch (err) {
            console.error("[WS] Failed to parse message:", err);
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect(): void {
    this.isManualClose = true;
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
  }

  private scheduleReconnect(): void {
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(console.error);
    }, delay);
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private resubscribe(): void {
    this.subscriptions.forEach(sub => {
      const parsed = JSON.parse(sub);
      this.sendSubscription(parsed, "subscribe");
    });
  }

  // ============= Subscriptions =============

  private sendSubscription(subscription: WSSubscription, action: "subscribe" | "unsubscribe"): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn("[WS] Cannot send, connection not open");
      return;
    }

    const message = {
      type: action,
      channel: subscription.channel,
      ...(subscription.assets && { assets: subscription.assets }),
      ...(subscription.markets && { markets: subscription.markets }),
    };

    this.ws.send(JSON.stringify(message));
  }

  subscribe(subscription: WSSubscription): void {
    const key = JSON.stringify(subscription);
    if (!this.subscriptions.has(key)) {
      this.subscriptions.add(key);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendSubscription(subscription, "subscribe");
      }
    }
  }

  unsubscribe(subscription: WSSubscription): void {
    const key = JSON.stringify(subscription);
    if (this.subscriptions.has(key)) {
      this.subscriptions.delete(key);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendSubscription(subscription, "unsubscribe");
      }
    }
  }

  // ============= Convenience Methods =============

  subscribePrices(assetIds: string[]): void {
    this.subscribe({ channel: "price", assets: assetIds });
  }

  subscribeOrderBook(assetIds: string[]): void {
    this.subscribe({ channel: "book", assets: assetIds });
  }

  subscribeTrades(marketIds: string[]): void {
    this.subscribe({ channel: "trades", markets: marketIds });
  }

  unsubscribePrices(assetIds: string[]): void {
    this.unsubscribe({ channel: "price", assets: assetIds });
  }

  unsubscribeOrderBook(assetIds: string[]): void {
    this.unsubscribe({ channel: "book", assets: assetIds });
  }

  unsubscribeTrades(marketIds: string[]): void {
    this.unsubscribe({ channel: "trades", markets: marketIds });
  }

  // ============= Event Handlers =============

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  // ============= Getters =============

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}

// ============= Singleton Instance =============

let wsInstance: PolymarketWebSocket | null = null;

export function getWebSocketClient(): PolymarketWebSocket {
  if (!wsInstance) {
    wsInstance = new PolymarketWebSocket();
  }
  return wsInstance;
}

// ============= React Hook =============

export function createWebSocketHook() {
  const client = getWebSocketClient();
  
  return {
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
    subscribePrices: (assetIds: string[]) => client.subscribePrices(assetIds),
    subscribeOrderBook: (assetIds: string[]) => client.subscribeOrderBook(assetIds),
    subscribeTrades: (marketIds: string[]) => client.subscribeTrades(marketIds),
    unsubscribePrices: (assetIds: string[]) => client.unsubscribePrices(assetIds),
    unsubscribeOrderBook: (assetIds: string[]) => client.unsubscribeOrderBook(assetIds),
    unsubscribeTrades: (marketIds: string[]) => client.unsubscribeTrades(marketIds),
    onMessage: (handler: MessageHandler) => client.onMessage(handler),
    onConnect: (handler: ConnectionHandler) => client.onConnect(handler),
    onDisconnect: (handler: ConnectionHandler) => client.onDisconnect(handler),
    onError: (handler: ErrorHandler) => client.onError(handler),
    isConnected: () => client.isConnected,
  };
}
