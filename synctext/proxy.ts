import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionToken, validateSession } from "@/lib/auth/session"
import { documentAccessForUser } from "@/lib/documents/documents"

// Portal in front of /doc/[id]: checks session + access on this specific
// document, then rewrites to a static page — id-agnostic server-side, since
// all document content and metadata render client-side via Hocuspocus. The
// client recovers the id from the browser's own URL (see sync-editor.tsx),
// which a rewrite never changes.
//
// Single target for now (/doc/edit) — the viewer/editor split lands in the
// next commit. Everyone with any access reaches the same page here, same as
// main's current (unfixed) behavior.
export const config = {
  matcher: ["/doc/:path*"],
}

const INTERNAL_TARGETS = new Set(["/doc/edit"])

// Rewriting to a path with no matching route (no page.tsx anywhere) makes
// Next's own not-found pipeline handle the response — the same, real 404 for
// a fresh load and for a client-side/RSC navigation. A hand-built
// `new NextResponse(null, { status: 404 })` looks fine on a fresh load but
// isn't in the shape the client router expects for a soft navigation, and
// crashes it.
function notFoundResponse(request: NextRequest) {
  return NextResponse.rewrite(new URL("/doc/__not_found__", request.url))
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /doc/edit only exists to be rewritten into below. A rewrite dispatches
  // straight to the app renderer without re-entering proxy, so any request
  // that reaches proxy already pointed at this path came in directly from
  // outside — refuse it.
  if (INTERNAL_TARGETS.has(pathname)) {
    return notFoundResponse(request)
  }

  const id = pathname.split("/").filter(Boolean)[1]
  if (!id) return NextResponse.next()

  const session = await validateSession(await getSessionToken())
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth", request.url))
  }

  const access = await documentAccessForUser(id, session.user.id)
  // No role on this doc: 404, not 403 — don't reveal whether it exists.
  if (!access) {
    return notFoundResponse(request)
  }

  return NextResponse.rewrite(new URL("/doc/edit", request.url))
}
