import { prisma as db } from "@synctext/db";
import { hashGuestSessionToken } from "@synctext/shared";
import { NextResponse } from "next/server";

import {
  generateGuestSessionToken,
  getGuestSessionStatus,
  getGuestSessionToken,
  guestEditExpiresAt,
  guestSessionExpiresAt,
  setGuestSessionCookie,
  validateGuestSession,
} from "@/lib/auth/guest-session";
import { clientIp, guestDocumentLimiter, ipKey } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

type GuestDocumentResponse = {
  id: string;
  title: string;
  mode: "EDITABLE" | "READ_ONLY";
  editExpiresAt: string;
  expiresAt: string;
};

function responseForGuestDocument(
  document: { id: string; title: string },
  session: { editExpiresAt: Date; expiresAt: Date },
): GuestDocumentResponse {
  const mode = getGuestSessionStatus(session);

  // validateGuestSession filters expiration first; this narrow keeps the
  // route's public contract honest even if a boundary is crossed mid-request.
  if (mode === "EXPIRED") throw new Error("Expired guest session");

  return {
    id: document.id,
    title: document.title,
    mode,
    editExpiresAt: session.editExpiresAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

// Starts one temporary document for this browser, or resumes its existing
// unexpired guest document. The cookie itself remains opaque to JavaScript.
export async function POST(request: Request) {
  const existing = await validateGuestSession(await getGuestSessionToken());
  if (existing?.document) {
    return NextResponse.json(
      responseForGuestDocument(existing.document, existing),
    );
  }

  // A valid session should normally always have a document. Recover the rare
  // inconsistent row without minting another browser credential or resetting
  // its original deadline.
  if (existing) {
    const document = await db.document.create({
      data: {
        title: "Untitled Document",
        guestSessionId: existing.id,
      },
      select: { id: true, title: true },
    });
    return NextResponse.json(responseForGuestDocument(document, existing));
  }

  const ip = clientIp(request);
  if (!(await guestDocumentLimiter.tryAcquire(ipKey(ip))))
    return NextResponse.json(
      { error: "Too many temporary documents from this network" },
      { status: 429 },
    );

  const token = generateGuestSessionToken();
  const now = new Date();
  const editExpiresAt = guestEditExpiresAt(now);
  const expiresAt = guestSessionExpiresAt(now);

  const guestSession = await db.guestSession.create({
    data: {
      tokenHash: hashGuestSessionToken(token),
      editExpiresAt,
      expiresAt,
      document: {
        create: { title: "Untitled Document" },
      },
    },
    select: {
      editExpiresAt: true,
      expiresAt: true,
      document: { select: { id: true, title: true } },
    },
  });

  if (!guestSession.document) throw new Error("Guest document was not created");

  await setGuestSessionCookie(token);

  return NextResponse.json(
    responseForGuestDocument(guestSession.document, guestSession),
    { status: 201 },
  );
}
