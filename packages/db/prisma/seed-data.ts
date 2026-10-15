/*
Fixture data for the E2E suite and the database seed.

Both packages/db/prisma/seed.ts and synctext/tests/e2e import this file, so a
credential exists in exactly one place. Keep it free of imports and side
effects: seed.ts runs it on every `npm run seed`, and Playwright transpiles it
into the test bundle.

Why the E2E suite logs in as seeded users instead of registering:
REGISTER_LIMIT allows 5 signups per hour per IP (synctext/lib/auth/rate-limit.ts),
so a suite that registers a user per test locks itself out. Seeded users are
already email-verified (emailVerifiedAt), so they skip the Mailpit flow.

All seeded users share SEED_PASSWORD. Do not reuse these credentials anywhere
outside local development.
*/
export const SEED_PASSWORD = "password123";

export type SeedUserName = "zaphod" | "alice" | "bob" | "tim";

export const SEED_USERS = {
  // platform admin, member of no shared group and no friends:
  // the fixture for a complete outsider, who must get 404 and never 403.
  zaphod: { email: "zaphod@test.local", username: "zaphod", role: "ADMIN" },
  alice: { email: "alice@test.local", username: "alice", role: "USER" },
  bob: { email: "bob@test.local", username: "bob", role: "USER" },
  tim: { email: "tim@test.local", username: "tim", role: "USER" },
} as const satisfies Record<SeedUserName, { email: string; username: string; role: "ADMIN" | "USER" }>;

// A role belongs to a group and not to a person: bob is ADMIN in one group and
// OWNER in the other, alice is in "synctext" only ("member here, outsider there").
export const SEED_GROUPS = {
  synctext: {
    name: "synctext",
    members: { alice: "OWNER", bob: "ADMIN", tim: "MEMBER" },
  },
  collab: {
    name: "collab",
    members: { bob: "OWNER", tim: "MEMBER" },
  },
} as const;

// The four role-by-grant combinations, spread over documents in the same group:
//   test-document   -> bob is ADMIN without a grant, tim is MEMBER with one
//   test-document-2 -> bob is ADMIN with a grant,    tim is MEMBER without
export const SEED_DOCUMENTS = [
  {
    id: "test-document",
    title: "Test Document",
    text: "This is a test document",
    group: "synctext",
    createdBy: "alice",
    granted: ["alice", "tim"],
  },
  {
    id: "test-document-2",
    title: "Test Document 2",
    text: "Created by an admin of the group",
    group: "synctext",
    createdBy: "bob",
    granted: ["bob"],
  },
  {
    // Lives in the collab group, so alice (not a member) must be refused on it.
    id: "test-document-3",
    title: "Test Document 3",
    text: "Lives in the collab group",
    group: "collab",
    createdBy: "bob",
    granted: ["bob"],
  },
] as const;

// Exactly SNAPSHOT_RETENTION_LIMIT snapshots, so the seed sits on the boundary
// the state route prunes at.
export const SEED_SNAPSHOT_DAYS = [
  "2026-09-10",
  "2026-09-11",
  "2026-09-12",
  "2026-09-13",
  "2026-09-14",
] as const;

// Friendship rows store the smaller id first (CHECK in the migration).
// zaphod has no friends: nobody may add him to a group.
export const SEED_FRIENDSHIPS = [
  { requester: "bob", other: "alice" },
  { requester: "alice", other: "tim" },
] as const;
