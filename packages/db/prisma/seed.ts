import argon2 from "argon2";
import * as Y from "yjs";
import { prisma, OrgRole, DocRole } from "../src/index.js";

// same argon2id config as synctext/lib/auth/password.ts, kept in sync so
// seeded hashes are verifiable by the real login route
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

async function main() {
  const passwordHash = await hashPassword("password123");
  const emailVerifiedAt = new Date(); // skip the email verification flow for these test accounts

  const [zaphod, alice, bob, tim] = await Promise.all([
    prisma.user.create({
      data: {
        email: "zaphod@test.local",
        username: "zaphod",
        passwordHash,
        role: OrgRole.ADMIN,
        emailVerifiedAt,
      },
    }),
    prisma.user.create({
      data: {
        email: "alice@test.local",
        username: "alice",
        passwordHash,
        role: OrgRole.USER,
        emailVerifiedAt,
      },
    }),
    prisma.user.create({
      data: {
        email: "bob@test.local",
        username: "bob",
        passwordHash,
        role: OrgRole.USER,
        emailVerifiedAt,
      },
    }),
    prisma.user.create({
      data: {
        email: "tim@test.local",
        username: "tim",
        passwordHash,
        role: OrgRole.USER,
        emailVerifiedAt,
      },
    }),
  ]);

  const document = await prisma.document.create({
    data: {
      title: "Test Document",
      ystate: testDocumentYState("This is a test document"),
      ownerId: alice.id,
      collab: {
        create: [
          { userId: bob.id, docRole: DocRole.EDITOR },
          { userId: tim.id, docRole: DocRole.VIEWER },
        ],
      },
    },
  });

  console.log("Users:", [zaphod, alice, bob, tim].map((u) => u.username).join(", "));
  console.log("Password for all users: password123");
  console.log("Test document id (NOTE THAT DOWN if needed):", document.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
