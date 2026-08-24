"use client"

import { useState } from "react"
import {
  useHocuspocusAwareness,
  useHocuspocusConnectionStatus,
  useHocuspocusProvider,
} from "@hocuspocus/provider-react"

import { Badge } from "@/components/tiptap-ui-primitive/badge"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Input } from "@/components/tiptap-ui-primitive/input"
import { saveSnapshot } from "@/lib/sync/sync-snapshot"

const STATUS_VARIANT = {
  connected: "green",
  connecting: "yellow",
  disconnected: "gray",
} as const

// CollaborationCaret stores identity as a nested "user" field on the
// awareness state (awareness.setLocalStateField("user", {name, color})),
// so a raw awareness entry looks like { clientId, user: { name, color } } —
// not { clientId, name, color } flat.
function collaboratorUser(entry: Record<string, unknown>): Record<string, unknown> | null {
  return typeof entry.user === "object" && entry.user !== null
    ? (entry.user as Record<string, unknown>)
    : null
}

function collaboratorName(entry: Record<string, unknown>): string {
  const name = collaboratorUser(entry)?.name
  return typeof name === "string" && name.length > 0 ? name : "?"
}

function collaboratorColor(entry: Record<string, unknown>): string | undefined {
  const color = collaboratorUser(entry)?.color
  return typeof color === "string" ? color : undefined
}

export function SyncHeader() {
  const provider = useHocuspocusProvider()
  const status = useHocuspocusConnectionStatus()
  const users = useHocuspocusAwareness()
  const [snapshotTitle, setSnapshotTitle] = useState("")

  const handleSaveSnapshot = () => {
    const title = snapshotTitle.trim()
    if (!title) return
    saveSnapshot(provider, title)
    setSnapshotTitle("")
  }

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem 1rem",
      }}
    >
      <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>

      <div
        aria-label={`${users.length} online`}
        style={{ display: "flex", gap: "0.25rem" }}
      >
        {users.map((user) => {
          const name = collaboratorName(user)
          return (
            <span
              key={user.clientId}
              title={name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "1.5rem",
                height: "1.5rem",
                borderRadius: "9999px",
                backgroundColor: collaboratorColor(user) ?? "#94a3b8",
                color: "#fff",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {name[0]}
            </span>
          )
        })}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          handleSaveSnapshot()
        }}
        style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}
      >
        <Input
          value={snapshotTitle}
          onChange={(event) => setSnapshotTitle(event.target.value)}
          placeholder="Snapshot title"
          aria-label="Snapshot title"
        />
        <Button type="submit" disabled={!snapshotTitle.trim()}>
          Save snapshot
        </Button>
      </form>
    </header>
  )
}
