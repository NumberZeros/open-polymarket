/**
 * Clipboard Hook
 * 
 * Reusable hook for copy-to-clipboard functionality with toast notifications
 */

import { useState, useCallback } from "react";

interface UseClipboardOptions {
  timeout?: number;
  onSuccess?: () => void;
  onError?: () => void;
}

export function useClipboard(options: UseClipboardOptions = {}) {
  const { timeout = 2000, onSuccess, onError } = options;
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = useCallback(
    async (text: string, id?: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(id || text);
        onSuccess?.();
        setTimeout(() => setCopied(null), timeout);
      } catch (error) {
        onError?.();
        throw error;
      }
    },
    [timeout, onSuccess, onError]
  );

  const isCopied = useCallback(
    (id: string) => copied === id,
    [copied]
  );

  return {
    copied,
    copyToClipboard,
    isCopied,
  };
}
