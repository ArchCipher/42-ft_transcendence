"use client";

import { useCallback, useEffect, useRef } from "react";

const POLL_MS = 30_000;

// Call fn now, then every POLL_MS while the tab is visible, and again when it
// becomes visible. Each call aborts the previous one. fn must be stable
// (useCallback): a new fn restarts the polling. Returns cancel(), which aborts
// the call in flight so its stale answer cannot overwrite a local change.
export function usePoll(fn: (signal: AbortSignal) => Promise<unknown>, enabled = true): () => void {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      if (document.visibilityState !== "visible") return;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      fn(controller.signal).catch((error: unknown) => {
        if (!controller.signal.aborted) console.error("Polling failed", error);
      });
    };

    run();
    const intervalId = window.setInterval(run, POLL_MS);
    document.addEventListener("visibilitychange", run);

    return () => {
      controllerRef.current?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", run);
    };
  }, [fn, enabled]);

  return useCallback(() => controllerRef.current?.abort(), []);
}
