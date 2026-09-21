const NAMES = ["Bob", "Alice", "Tom", "Jean", "Tim"]

export const COLORS = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#a855f7",
]

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

// Mocked local-collaborator identity: real auth isn't wired up yet, so each
// tab gets a random name/color instead of one shared literal. Cached at
// module scope rather than in sessionStorage: browsers clone sessionStorage
// into a duplicated tab, which made two "different" collaborators show the
// same identity — module state doesn't survive a refresh, but does stay
// distinct when a tab is duplicated to simulate a second collaborator,
// which matters more for this mock.
let cachedUser: { name: string; color: string } | null = null

export function getLocalUser(): { name: string; color: string } {
  if (typeof window === "undefined") {
    return { name: "Guest", color: "#94a3b8" }
  }

  if (!cachedUser) {
    cachedUser = {
      name: randomFrom(NAMES),
      color: randomFrom(COLORS),
    }
  }

  return cachedUser
}

// Deterministic color from a stable user id, so the same person keeps the same color across sessions.
export function identityFromUser(user: { id: string; username: string }): { name: string; color: string } {
  const hash = [...user.id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return { name: user.username, color: COLORS[hash % COLORS.length] }
}

// Guests do not have user profiles. Keep their collaboration cursor color
// stable for the temporary session without exposing any token-derived value.
export function identityFromGuestSession(session: { id: string }): { name: string; color: string } {
  const hash = [...session.id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return { name: "Guest", color: COLORS[hash % COLORS.length] }
}
