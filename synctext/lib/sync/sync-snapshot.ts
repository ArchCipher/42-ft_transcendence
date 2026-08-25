import type { HocuspocusProvider } from "@hocuspocus/provider"

type SnapshotMessage = {
  type: "snapshot"
  title: string
  at: string
}

// TODO : implement on the server side - just an empty request ws message yet 
// (no onStateless handler configured in services/collab)
export function requestSnapshot(
  provider: HocuspocusProvider,
  title: string
): void {
  const message: SnapshotMessage = {
    type: "snapshot",
    title,
    at: new Date().toISOString(),
  }

  provider.sendStateless(JSON.stringify(message))
}
