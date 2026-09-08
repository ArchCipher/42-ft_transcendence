import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@synctext/shared/constants";

/*
Default-deny proxy
Everything except the explicit allowlist below requires a session cookie.
*/

const PUBLIC_PREFIXES = [
  "/", // homepage
  "/auth", // login page
  "/register",
  "/verify-email",
  "/forgot-password",
  "/password-reset",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some((prefix) =>
    prefix === "/"
      ? pathname === "/"
      : pathname === prefix || pathname.startsWith(prefix + "/"),
  );
  if (isPublic) return NextResponse.next();

  const session = request.cookies.has(SESSION_COOKIE_NAME);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/*
Run on everything except framework/asset paths and next internals.
API routes are excluded from the matcher as they enforce their own auth via
validateSession / isAuthorized -> must return 401 not redirect to /auth.

Note: Matcher excludes static/framework assets and image optimization.
*/
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|api).*)"],
};
