import { prisma as db } from "@synctext/db";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  readJson,
  readName,
  unauthorized,
} from "@/lib/api/responses";
import { canOwnGroup, requireGroupRole } from "@/lib/permissions";
import { deleteGroup, renameGroup } from "@/lib/groups/groups";
import { NextResponse } from "next/server";

/*
API Response contracts: /api/groups/[id]

  PATCH { name }                     canOwnGroup
        -> 200 { id, name }
        -> 400 { error }             name empty or over 120 chars
        -> 401 { error }
        -> 403 { error }             member, but not the owner
        -> 404 { error }             caller is not a member of this group
        -> 409 { error }             a private space cannot be renamed

  DELETE                             canOwnGroup; its documents go with it
        -> 204
        -> 401 { error }
        -> 403 { error }
        -> 404 { error }
        -> 409 { error }             a private space cannot be deleted
*/

// Rename a shared group. Owner only.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const name = readName(await readJson(request));
  if (!name) return badRequest("Name must be between 1 and 120 characters");

  const { id } = await params;
  const role = await requireGroupRole(db, session.user.id, id);
  if (!role) return notFound("Group");
  if (!canOwnGroup(role)) return forbidden();

  if (!(await renameGroup(db, id, name))) {
    return conflict("A private space cannot be renamed");
  }

  return NextResponse.json({ id, name });
}

// Delete a shared group with all its documents. Owner only.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const role = await requireGroupRole(db, session.user.id, id);
  if (!role) return notFound("Group");
  if (!canOwnGroup(role)) return forbidden();

  if (!(await deleteGroup(db, id))) {
    return conflict("A private space cannot be deleted");
  }

  return new NextResponse(null, { status: 204 });
}
