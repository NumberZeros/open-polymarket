export interface TradingSession {
  eoaAddress: string;
  safeAddress: string;
  isSafeDeployed: boolean;
  hasApiCredentials: boolean;
  hasApprovals: boolean;
  apiCredentials?: {
    key: string;
    secret: string;
    passphrase: string;
  };
  lastChecked: number;
}

export type SessionStep = 
  | "idle"
  | "checking"
  | "deploying"
  | "credentials"
  | "approvals"
  | "complete";

// Session storage utilities
const SESSION_STORAGE_KEY = "bethub_trading_session";

export function loadSession(eoaAddress: string): TradingSession | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem(`${SESSION_STORAGE_KEY}_${eoaAddress}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveSession(eoaAddress: string, session: TradingSession): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(`${SESSION_STORAGE_KEY}_${eoaAddress}`, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}

export function clearSession(eoaAddress: string): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem(`${SESSION_STORAGE_KEY}_${eoaAddress}`);
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
}