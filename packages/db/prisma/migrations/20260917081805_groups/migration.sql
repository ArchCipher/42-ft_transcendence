/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Document` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `DocumentShare` table. If the table is not empty, all the data it contains will be lost.
  - Added the column `groupId` to the `Document` table. It is nullable: a guest
    document has no group, and the hand-written CHECK below keeps groupId and
    guestSessionId mutually exclusive, replacing the ownerId one.

*/
-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_ownerId_fkey";

-- Dropping ownerId would take this CHECK with it; drop it explicitly so the
-- replacement below reads as a deliberate swap rather than a side effect.
ALTER TABLE "Document" DROP CONSTRAINT "Document_exactly_one_owner_check";

-- DropForeignKey
ALTER TABLE "DocumentShare" DROP CONSTRAINT "DocumentShare_documentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentShare" DROP CONSTRAINT "DocumentShare_userId_fkey";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "ownerId",
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "PlatformRole" NOT NULL DEFAULT 'USER';

-- DropTable
DROP TABLE "DocumentShare";

-- DropEnum
DROP TYPE "DocRole";

-- DropEnum
DROP TYPE "OrgRole";

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPrivateSpace" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentGrant" (
    "membershipId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentGrant_pkey" PRIMARY KEY ("membershipId","documentId")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("userAId","userBId")
);

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "DocumentGrant_documentId_idx" ON "DocumentGrant"("documentId");

-- CreateIndex
CREATE INDEX "Friendship_userAId_status_idx" ON "Friendship"("userAId", "status");

-- CreateIndex
CREATE INDEX "Friendship_userBId_status_idx" ON "Friendship"("userBId", "status");

-- CreateIndex
CREATE INDEX "Document_groupId_updatedAt_idx" ON "Document"("groupId", "updatedAt");

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGrant" ADD CONSTRAINT "DocumentGrant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "GroupMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGrant" ADD CONSTRAINT "DocumentGrant_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written below: invariants Prisma cannot express in schema.prisma.
-- ---------------------------------------------------------------------------

-- At most one OWNER per group. A partial index: rows with any other role are
-- not indexed at all, so admins and members stay unlimited.
-- Not deferrable, so ownership transfer must demote the leaver BEFORE
-- promoting the successor, or it raises 23505.
CREATE UNIQUE INDEX "GroupMember_single_owner_per_group"
  ON "GroupMember" ("groupId")
  WHERE "role" = 'OWNER';

-- A document is held by a group, or by a guest session while it is still
-- unclaimed: never both, never neither. Replaces the ownerId check the guest
-- migration wrote. Claiming one must set groupId and clear guestSessionId in
-- the same statement, or this fires mid-transaction.
ALTER TABLE "Document"
  ADD CONSTRAINT "Document_exactly_one_holder_check"
  CHECK (
    ("groupId" IS NOT NULL AND "guestSessionId" IS NULL)
    OR ("groupId" IS NULL AND "guestSessionId" IS NOT NULL)
  );

-- One row per pair. The strict inequality also forbids self-friendship.
ALTER TABLE "Friendship"
  ADD CONSTRAINT "Friendship_canonical_pair"
  CHECK ("userAId" < "userBId");

-- The requester is one of the two sides.
ALTER TABLE "Friendship"
  ADD CONSTRAINT "Friendship_requester_in_pair"
  CHECK ("requestedById" IN ("userAId", "userBId"));
