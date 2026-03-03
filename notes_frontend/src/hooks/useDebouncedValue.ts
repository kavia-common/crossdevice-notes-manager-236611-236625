"use client";

import { useEffect, useState } from "react";

// PUBLIC_INTERFACE
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  /** Debounce any value, returning the latest value after delayMs. */
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
