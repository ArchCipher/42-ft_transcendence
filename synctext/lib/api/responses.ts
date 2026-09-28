import { NextResponse } from "next/server";

// Shared refusals. Outsiders get 404 rather than 403 so they cannot learn that
// a group or document exists; 403 is only for members who lack the right.
export const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export const forbidden = () =>
  NextResponse.json({ error: "Forbidden" }, { status: 403 });

export const notFound = (what = "Resource") =>
  NextResponse.json({ error: `${what} not found` }, { status: 404 });

export const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

export const conflict = (message: string) =>
  NextResponse.json({ error: message }, { status: 409 });

// Reads a JSON body, returning null when it is absent or malformed.
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Reads a group { name }, trimmed, 1 to 120 characters, or null.
export function readName(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("name" in body)) return null;
  if (typeof body.name !== "string") return null;

  const name = body.name.trim();
  return name.length > 0 && name.length <= 120 ? name : null;
}
