"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  getTabId,
  LOGGED_OUT_URL,
  logoutClient,
  SESSION_CHANNEL,
  type SessionMessage,
} from "@/lib/auth/session-state";

const POLL_MS = 30_000;
const TOUCH_MIN_MS = 60_000;

async function fetchSessionStatus(): Promise<{ signedIn: boolean }> {
  try {
    const res = await fetch("/api/session", { cache: "no-store" });
    return res.ok
      ? ((await res.json()) as { signedIn: boolean })
      : { signedIn: true }; // non-2xx: don't log the user out
  } catch {
    return { signedIn: true }; // network blip: don't log the user out
  }
}

/*
Poll + presence + cross-tab sync. Mounted on every protected page (dashboard,
doc editor etc).

1. Server-side authority: polls GET /api/session every POLL_MS and re-checks on
   visibilitychange / focus / pageshow. This is READ-ONLY, it detects idle
   sessions but never refreshes them.
2. Real presence: pointerdown / keydown gestures ping POST /api/session/activity.
   This refreshes lastUsedAt server-side, so a user doing client-side-only
   activity stays logged in.
3. Cross-tab sync via BroadcastChannel: another tab's session event is broadcast
   (sender lives in lib/auth/session-state.ts). A signed-in event shows
   "signed in with another tab or window" notice, a signed-out event clears state
   + redirects to login page.
*/
export function SessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [showOtherTabNotice, setShowOtherTabNotice] = useState(false);
  const lastTouchRef = useRef(0);

  const checkSession = useCallback(async () => {
    if (
      typeof document === "undefined" ||
      document.visibilityState !== "visible"
    )
      return;
    const status = await fetchSessionStatus();
    if (!status.signedIn) {
      logoutClient();
    }
  }, []);

  // Report REAL user gestures so the server refreshes lastUsedAt.
  const touchSession = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    const now = Date.now();
    if (now - lastTouchRef.current < TOUCH_MIN_MS) return;
    lastTouchRef.current = now;
    void fetch("/api/session/activity", {
      method: "POST",
      cache: "no-store",
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // cross-tab listener - open once and stays open until unmount
    const channel = new BroadcastChannel(SESSION_CHANNEL);
    const ownTabId = getTabId();
    channel.onmessage = (event: MessageEvent<SessionMessage>) => {
      const message = event.data;
      if (!message || message.tabId === ownTabId) return; // ignore own broadcast

      //  another tab signed-in
      if (message.action === "signed-in") setShowOtherTabNotice(true);
      // another tab signed-out
      else if (message.action === "signed-out") {
        setShowOtherTabNotice(false);
        router.replace(LOGGED_OUT_URL);
      }
    };

    // ask the server every POLL_MS, on focus / visibility.
    void checkSession();
    const id = setInterval(() => void checkSession(), POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void checkSession();
    };
    const onFocus = () => void checkSession();
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void checkSession();
    };

    const onPointerDown = () => touchSession();
    const onKeyDown = () => touchSession();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);

    // cleanup when page unmounts
    return () => {
      channel.close();
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [checkSession, touchSession]);

  return (
    <>
      {children}
      {showOtherTabNotice && (
        <div
          role="status"
          style={{
            position: "fixed",
            insetInline: 0,
            top: 0,
            zIndex: 9999,
            background: "#6fd3ff",
            color: "#000",
            padding: "10px 16px",
            display: "flex",
            gap: 12,
            justifyContent: "center",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
          }}
        >
          <span>
            You signed in with another tab or window. Reload to refresh your
            session.
          </span>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "none",
              border: "none",
              textDecoration: "underline",
              color: "#000",
              fontSize: "inherit",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      )}
    </>
  );
}
