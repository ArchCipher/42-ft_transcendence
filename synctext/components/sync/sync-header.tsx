"use client"

import {
  useHocuspocusAwareness,
  useHocuspocusConnectionStatus,
} from "@hocuspocus/provider-react"
import type { CollabUser } from "@hocuspocus/provider-react"

import { Badge } from "@/components/tiptap-ui-primitive/badge"

const STATUS_VARIANT = {
  connected: "green",
  connecting: "yellow",
  disconnected: "gray",
} as const

// CollaborationCaret stores identity as a nested "user" field on the
// awareness state (awareness.setLocalStateField("user", {name, color})),
// so a raw entry looks like { clientId, user: { name, color } } — CollabUser
// only types the outer shape; the nested "user" content is app-defined, so
// it still needs narrowing here.
function collaboratorIdentity({ user }: CollabUser): { name: string; color: string } {
  const { name, color } = (user && typeof user === "object" ? user : {}) as Record<
    string,
    unknown
  >
  return {
    name: typeof name === "string" && name ? name : "?",
    color: typeof color === "string" ? color : "#94a3b8",
  }
}

export function SyncHeader() {
  const status = useHocuspocusConnectionStatus()
  const users = useHocuspocusAwareness()

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
          const { name, color } = collaboratorIdentity(user)
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
                backgroundColor: color,
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
    </header>
  )
}
