import argon2 from "argon2";
import * as Y from "yjs";
import {
  prisma,
  createPrivateSpace,
  PlatformRole,
  GroupRole,
  FriendshipStatus,
} from "../src/index.js";
import {
  SEED_PASSWORD,
  SEED_USERS,
  SEED_GROUPS,
  SEED_DOCUMENTS,
  SEED_SNAPSHOT_DAYS,
  SEED_FRIENDSHIPS,
  type SeedUserName,
} from "./seed-data.js";

// Keep the Argon2id config aligned with synctext/lib/auth/password.ts
// so seeded passwords use the same hashing policy as real user passwords.
// argon2.verify() reads the parameters from the encoded hash itself.
// TODO: just one location instead
async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

// builds a Y.Doc update containing a single paragraph, matching the
// "default" xml fragment the Collaboration extension reads (see
// synctext/components/sync/sync-editor.tsx)
function testDocumentYState(text: string): Uint8Array<ArrayBuffer> {
  const ydoc = new Y.Doc();
  const fragment = ydoc.getXmlFragment("default");

  const paragraph = new Y.XmlElement("paragraph");
  const content = new Y.XmlText();
  content.insert(0, text);
  paragraph.insert(0, [content]);
  fragment.insert(0, [paragraph]);

  // cast needed: TS types Uint8Array's buffer as ArrayBufferLike (which
  // includes SharedArrayBuffer), while Prisma's Bytes type wants ArrayBuffer
  return Y.encodeStateAsUpdate(ydoc) as Uint8Array<ArrayBuffer>;
}

// Mirrors what registration must do: a user is unusable without a private
// space to create documents in.
async function createUser(data: {
  email: string;
  username: string;
  passwordHash: string;
  role: PlatformRole;
  emailVerifiedAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data });
    await createPrivateSpace(tx, user.id);
    return user;
  });
}

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const emailVerifiedAt = new Date(); // skip the email verification flow for these test accounts

  const users = {} as Record<SeedUserName, { id: string }>;
  for (const [name, { email, username, role }] of Object.entries(SEED_USERS)) {
    users[name as SeedUserName] = await createUser({
      email,
      username,
      passwordHash,
      emailVerifiedAt,
      role: role as PlatformRole,
    });
  }

  // A role belongs to a group and not to a person. alice is in "synctext" only:
  // she is the fixture for "member here, outsider there".
  type SeededGroup = { id: string; members: { id: string; userId: string }[] };
  const groups = {} as Record<keyof typeof SEED_GROUPS, SeededGroup>;
  for (const [key, group] of Object.entries(SEED_GROUPS)) {
    groups[key as keyof typeof SEED_GROUPS] = await prisma.group.create({
      data: {
        name: group.name,
        members: {
          create: Object.entries(group.members).map(([name, role]) => ({
            userId: users[name as SeedUserName].id,
            role: role as GroupRole,
          })),
        },
      },
      include: { members: true },
    });
  }

  const membership = (group: SeededGroup, name: SeedUserName) => {
    const found = group.members.find((member) => member.userId === users[name].id);
    if (!found) throw new Error(`no membership for ${name}`);
    return found.id;
  };

  for (const doc of SEED_DOCUMENTS) {
    const group = groups[doc.group];
    await prisma.document.create({
      data: {
        id: doc.id,
        title: doc.title,
        ystate: testDocumentYState(doc.text),
        groupId: group.id,
        createdById: users[doc.createdBy].id,
        grants: {
          create: doc.granted.map((name) => ({ membershipId: membership(group, name as SeedUserName) })),
        },
      },
    });
  }

  // Exactly SNAPSHOT_RETENTION_LIMIT snapshots, so the seed sits on the
  // boundary the state route prunes at.
  await prisma.documentSnapshot.createMany({
    data: SEED_SNAPSHOT_DAYS.map((day) => ({
      documentId: SEED_DOCUMENTS[0].id,
      ystate: testDocumentYState(
        `this is a snapshot from ${day}. you can recover it if you want..`,
      ),
      createdAt: new Date(`${day}T12:00:00Z`),
    })),
  });

  // Friendship rows store the smaller id first (CHECK in the migration). zaphod
  // has no friends: nobody may add him to a group.
  await prisma.friendship.createMany({
    data: SEED_FRIENDSHIPS.map(({ requester, other }) => {
      const requesterId = users[requester].id;
      const otherId = users[other].id;
      const [userAId, userBId] = [requesterId, otherId].sort();
      return {
        userAId,
        userBId,
        requestedById: requesterId,
        status: FriendshipStatus.ACCEPTED,
        respondedAt: new Date(),
      };
    }),
  });

  console.log(
    `seeded: ${Object.keys(SEED_USERS).length} users (${Object.values(SEED_USERS)
      .map((u) => u.username)
      .join(", ")}), ` +
      `${Object.keys(SEED_USERS).length} private spaces, ${Object.keys(SEED_GROUPS).length} shared groups, ` +
      `${SEED_DOCUMENTS.length} documents, ${SEED_SNAPSHOT_DAYS.length} snapshots, ` +
      `${SEED_FRIENDSHIPS.length} friendships`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
