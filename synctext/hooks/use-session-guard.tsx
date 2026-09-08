"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  getTabId,
  LOGGED_OUT_URL,
  logoutClient,
  SESSION_CHANNEL,
  type SessionMessage,
} from "@/lib/auth/session-state";

const POLL_MS = 30_000;

async function fetchSessionStatus(): Promise<{ signedIn: boolean }> {
  try {
    const res = await fetch("/api/session", { cache: "no-store" });
    return res.ok
      ? ((await res.json()) as { signedIn: boolean })
      : { signedIn: false };
  } catch {
    return { signedIn: true }; // network blip: don't log the user out
  }
}

/*
Listen for cross-tab session events and fire the matching callback.

Mount once per page (inside SessionGuard). We ignore messages we sent
ourselves (`getTabId()` matches the sender's `tabId`).

- onOtherTabSignedIn: another tab logged in  -> show the "signed in with
  another tab or window" notice.
- onOtherTabSignedOut: another tab logged out -> every tab (shared cookie!)
  now has a dead session, so clear state and go to /auth.
*/

/*
Poll + refocus + redirect + banner. Uses BroadcastChannel API sender and
listener. Mounted on every protected page (dashboard, doc editor etc).

1. Server-side authority: polls /api/session every POLL_MS and re-checks on
   visibilitychange / focus / pageshow.
2. Cross-tab sync via BroadcastChannel: a signed-out event from another tab
   (manual logout or idle/expiry detected there) clears state + redirects +
   shows the "signed in with another tab or window" notice with a reload
   action.

BroadcastChannel sender lives in lib/auth/session-state.ts,
*/
export function SessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [showOtherTabNotice, setShowOtherTabNotice] = useState(false);

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

  useEffect(() => {
    // cross-tab listener - open once and stays open until unmount
    const channel = new BroadcastChannel(SESSION_CHANNEL);
    const ownTabId = getTabId();
    channel.onmessage = (event: MessageEvent<SessionMessage>) => {
      const message = event.data;
      if (!message || message.tabId === ownTabId) return; // ignore own broadcast

      if (message.action === "signed-in") setShowOtherTabNotice(true);
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

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);

    // cleanup when page unmounts
    return () => {
      channel.close();
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [checkSession]);

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
