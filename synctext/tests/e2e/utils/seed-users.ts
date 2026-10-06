/*
Thin wrapper so specs import one short path.

The fixture data itself lives in packages/db/prisma/seed-data.ts and is shared
with the database seed - do not duplicate credentials here.
*/
export {
  SEED_PASSWORD,
  SEED_USERS,
  SEED_GROUPS,
  SEED_DOCUMENTS,
  SEED_SNAPSHOT_DAYS,
  SEED_FRIENDSHIPS,
} from "../../../../packages/db/prisma/seed-data";

import {
  SEED_PASSWORD,
  SEED_USERS,
  type SeedUserName,
} from "../../../../packages/db/prisma/seed-data";

export type { SeedUserName };

export type SeedUser = { email: string; username: string; password: string };

export function seedUser(name: SeedUserName): SeedUser {
  return { ...SEED_USERS[name], password: SEED_PASSWORD };
}

export function seedEmail(name: SeedUserName): string {
  return SEED_USERS[name].email;
}
