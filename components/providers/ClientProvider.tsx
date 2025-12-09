"use client";

/**
 * Client Provider
 * 
 * Handles client-side hooks that need to run globally
 */

interface ClientProviderProps {
  children: React.ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
  return <>{children}</>;
}
