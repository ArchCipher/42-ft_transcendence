import type { Prisma } from "@synctext/db";

const SNAPSHOT_RETENTION_LIMIT = 5;

// callers lock the document row so saving and pruning happen one at a time
export async function createDocumentSnapshot(
  tx: Prisma.TransactionClient,
  documentId: string,
  state: Uint8Array,
) {
  const snapshot = await tx.documentSnapshot.create({
    data: {
      documentId,
      ystate: Buffer.from(state),
    },
    select: { id: true, createdAt: true },
  });

  // always keep the snapshot we just saved, even when timestamps tie
  const snapshotsToDelete = await tx.documentSnapshot.findMany({
    where: { documentId, id: { not: snapshot.id } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: SNAPSHOT_RETENTION_LIMIT - 1,
    select: { id: true },
  });

  if (snapshotsToDelete.length > 0) {
    await tx.documentSnapshot.deleteMany({
      where: {
        documentId,
        id: { in: snapshotsToDelete.map((oldSnapshot) => oldSnapshot.id) },
      },
    });
  }

  return snapshot;
}
