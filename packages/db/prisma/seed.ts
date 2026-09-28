import argon2 from "argon2";
import * as Y from "yjs";
import {
  prisma,
  createPrivateSpace,
  PlatformRole,
  GroupRole,
  FriendshipStatus,
} from "../src/index.js";

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
  const passwordHash = await hashPassword("password123");
  const emailVerifiedAt = new Date(); // skip the email verification flow for these test accounts

  const common = { passwordHash, emailVerifiedAt, role: PlatformRole.USER };

  // zaphod is the platform admin and belongs to no shared group: the fixture
  // for a complete outsider, who must get 404 and never 403.
  const zaphod = await createUser({
    email: "zaphod@test.local",
    username: "zaphod",
    ...common,
    role: PlatformRole.ADMIN,
  });
  const alice = await createUser({ email: "alice@test.local", username: "alice", ...common });
  const bob = await createUser({ email: "bob@test.local", username: "bob", ...common });
  const tim = await createUser({ email: "tim@test.local", username: "tim", ...common });

  // Two shared groups. bob is OWNER of one and ADMIN of the other, which proves
  // a role belongs to a group and not to a person. alice is in "synctext" only:
  // she is the fixture for "member here, outsider there".
  const synctext = await prisma.group.create({
    data: {
      name: "synctext",
      members: {
        create: [
          { userId: alice.id, role: GroupRole.OWNER },
          { userId: bob.id, role: GroupRole.ADMIN },
          { userId: tim.id, role: GroupRole.MEMBER },
        ],
      },
    },
    include: { members: true },
  });

  const collab = await prisma.group.create({
    data: {
      name: "collab",
      members: {
        create: [
          { userId: bob.id, role: GroupRole.OWNER },
          { userId: tim.id, role: GroupRole.MEMBER },
        ],
      },
    },
    include: { members: true },
  });

  const membership = (group: typeof synctext, userId: string) => {
    const found = group.members.find((member) => member.userId === userId);
    if (!found) throw new Error(`no membership for ${userId}`);
    return found.id;
  };

  // The four role-by-grant combinations, spread over two documents in the same
  // group so the same three people cover all of them:
  //   doc 1 -> bob is ADMIN without a grant, tim is MEMBER with one
  //   doc 2 -> bob is ADMIN with a grant,    tim is MEMBER without
  const document = await prisma.document.create({
    data: {
      id: "test-document",
      title: "Test Document",
      ystate: testDocumentYState("This is a test document"),
      groupId: synctext.id,
      createdById: alice.id,
      grants: {
        create: [
          { membershipId: membership(synctext, alice.id) },
          { membershipId: membership(synctext, tim.id) },
        ],
      },
    },
  });

  await prisma.document.create({
    data: {
      id: "test-document-2",
      title: "Test Document 2",
      ystate: testDocumentYState("Created by an admin of the group"),
      groupId: synctext.id,
      createdById: bob.id,
      grants: { create: { membershipId: membership(synctext, bob.id) } },
    },
  });

  // In the other group, so alice (not a member) must be refused on it.
  await prisma.document.create({
    data: {
      id: "test-document-3",
      title: "Test Document 3",
      ystate: testDocumentYState("Lives in the collab group"),
      groupId: collab.id,
      createdById: bob.id,
      grants: { create: { membershipId: membership(collab, bob.id) } },
    },
  });

  // Exactly SNAPSHOT_RETENTION_LIMIT snapshots, so the seed sits on the
  // boundary the state route prunes at.
  const snapshotDays = ["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14"];

  await prisma.documentSnapshot.createMany({
    data: snapshotDays.map((day) => ({
      documentId: document.id,
      ystate: testDocumentYState(
        `this is a snapshot from ${day}. you can recover it if you want..`,
      ),
      createdAt: new Date(`${day}T12:00:00Z`),
    })),
  });

  // Friendship rows store the smaller id first (CHECK in the migration). zaphod
  // has no friends: nobody may add him to a group.
  const friends = (requester: { id: string }, other: { id: string }) => {
    const [userAId, userBId] = [requester.id, other.id].sort();
    return {
      userAId,
      userBId,
      requestedById: requester.id,
      status: FriendshipStatus.ACCEPTED,
      respondedAt: new Date(),
    };
  };

  await prisma.friendship.createMany({
    data: [friends(bob, alice), friends(alice, tim)],
  });

  console.log(
    `seeded: 4 users (${[zaphod, alice, bob, tim].map((u) => u.username).join(", ")}), ` +
      `4 private spaces, 2 shared groups, 3 documents, ${snapshotDays.length} snapshots, 2 friendships`,
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
