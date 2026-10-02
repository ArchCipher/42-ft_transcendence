import { createPrivateSpace, type Prisma } from "@synctext/db";

export async function createUserWithPrivateSpace(
  tx: Prisma.TransactionClient,
  data: Prisma.UserCreateInput,
): Promise<string> {
  const { id } = await tx.user.create({ data, select: { id: true } });
  await createPrivateSpace(tx, id);
  return id;
}
