"use client";

import { useCallback, useState } from "react";

type SetValue<T> = (next: T | ((previous: T) => T)) => void;

function readValue<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") {
    return initialValue;
  }

  try {
    const stored = window.localStorage.getItem(key);
    return stored !== null ? (JSON.parse(stored) as T) : initialValue;
  } catch {
    return initialValue;
  }
}

/**
 * State persisted in localStorage. Read lazily on first client render so there
 * is no default-value flash. Returns `[value, setValue]`.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): readonly [T, SetValue<T>] {
  const [value, setValue] = useState<T>(() => readValue(key, initialValue));

  const setStoredValue = useCallback<SetValue<T>>(
    (next) => {
      setValue((previous) => {
        const resolved = next instanceof Function ? next(previous) : next;

        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage may be unavailable; keep in-memory state anyway.
        }

        return resolved;
      });
    },
    [key],
  );

  return [value, setStoredValue] as const;
}
