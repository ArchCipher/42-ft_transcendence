-- A temporary guest session owns exactly one unclaimed document. Raw browser
-- tokens are never persisted; tokenHash stores their SHA-256 digest.
CREATE TABLE "GuestSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "editExpiresAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Document" ALTER COLUMN "ownerId" DROP NOT NULL;
ALTER TABLE "Document" ADD COLUMN "guestSessionId" TEXT;

CREATE UNIQUE INDEX "GuestSession_tokenHash_key" ON "GuestSession"("tokenHash");
CREATE INDEX "GuestSession_expiresAt_idx" ON "GuestSession"("expiresAt");
CREATE INDEX "GuestSession_editExpiresAt_idx" ON "GuestSession"("editExpiresAt");
CREATE UNIQUE INDEX "Document_guestSessionId_key" ON "Document"("guestSessionId");

-- A document must be owned by either a registered user or a guest session,
-- never both and never neither.
ALTER TABLE "Document" ADD CONSTRAINT "Document_exactly_one_owner_check"
CHECK (
    ("ownerId" IS NOT NULL AND "guestSessionId" IS NULL)
    OR ("ownerId" IS NULL AND "guestSessionId" IS NOT NULL)
);

-- Deleting an expired/unclaimed GuestSession deletes its temporary document.
ALTER TABLE "Document" ADD CONSTRAINT "Document_guestSessionId_fkey"
FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
