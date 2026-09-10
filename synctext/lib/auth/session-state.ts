"use client";

/*
Broadcast Channel - sender

Cross-tab session markers. BroadcastChannel lets open tabs on the same origin
talk directly to each other, so when one tab signs out, the others hear about
it instantly.

The tab that posts a message also receives it. So each message carries a unique
tabId, and listeners ignore messages with their own tabId.

This file only SENDS. Listening lives in hooks/use-session-guard.ts.
*/

export const SESSION_CHANNEL = "synctext:session-state";
export const LOGGED_OUT_URL = "/auth?verify=logged-out";

// tabId is unique id for THIS tab, so it can ignore its own broadcasts.
let tabId = 0;

export function getTabId(): number {
  if (typeof window !== "undefined" && tabId === 0) {
    tabId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  }
  return tabId;
}

export type SessionMessage = { action: "signed-out"; tabId: number };

function postMessage(action: SessionMessage["action"]): void {
  const channel = new BroadcastChannel(SESSION_CHANNEL);
  channel.postMessage({ action, tabId: getTabId() });
  channel.close(); // sender: done after one send
}

// Call on logout OR when a tab detects an expired/idle session, so all other
// tabs clear their state and redirect to /auth too.
export function notifySignedOut(): void {
  postMessage("signed-out");
}

export async function logoutClient(navigate: () => void): Promise<void> {
  notifySignedOut();
  // wait for logout to return
  await Promise.race([
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
  navigate();
}
