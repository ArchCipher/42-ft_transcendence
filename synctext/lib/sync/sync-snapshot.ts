import type { HocuspocusProvider } from "@hocuspocus/provider"

// No persistence exists yet on the Hocuspocus server (no onStateless
// handler configured in services/collab) — this just puts a real message
// on the wire over the existing collab connection. It's a no-op on the
// server for now, and the seam to wire up actual snapshot storage later.
export function saveSnapshot(provider: HocuspocusProvider, title: string): void {
  provider.sendStateless(
    JSON.stringify({ type: "snapshot", title, at: new Date().toISOString() })
  )
}
