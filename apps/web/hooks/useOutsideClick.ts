"use client";

import { useEffect, type RefObject } from "react";

/**
 * Invoke `handler` when the user clicks outside `ref` or presses Escape.
 * Pass `active = false` to disable the listeners while the popover is closed.
 */
export function useOutsideClick<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  active = true,
): void {
  useEffect(() => {
    if (!active) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        handler();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handler();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, handler, active]);
}
