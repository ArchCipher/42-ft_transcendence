import { prisma as db } from "@synctext/db";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import {
  badRequest,
  notFound,
  readJson,
  unauthorized,
} from "@/lib/api/responses";
import type { FriendUser, FriendsResponse } from "@/lib/friends/types";
import { isOnline } from "@/lib/presence";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const userId = session.user.id;
  const friendships = await db.friendship.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      // declined requests remain stored, but do not appear in these lists
      status: { in: ["ACCEPTED", "PENDING"] },
    },
    select: {
      status: true,
      requestedById: true,
      userA: { select: { id: true, username: true, avatarUrl: true, lastSeenAt: true } },
      userB: { select: { id: true, username: true, avatarUrl: true, lastSeenAt: true } },
    },
  });

  const response: FriendsResponse = {
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  };

  for (const friendship of friendships) {
    const other = friendship.userA.id === userId
      ? friendship.userB
      : friendship.userA;
    const otherUser: FriendUser = {
      id: other.id,
      username: other.username,
      avatarUrl: other.avatarUrl,
      online: isOnline(other.lastSeenAt),
    };

    if (friendship.status === "ACCEPTED") {
      response.friends.push(otherUser);
    } else if (friendship.requestedById === userId) {
      response.outgoingRequests.push(otherUser);
    } else {
      response.incomingRequests.push(otherUser);
    }
  }

  response.friends.sort(compareUsernames);
  response.incomingRequests.sort(compareUsernames);
  response.outgoingRequests.sort(compareUsernames);

  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const body = await readJson(request);
  if (
    typeof body !== "object"
    || body === null
    || !("identifier" in body)
    || typeof body.identifier !== "string"
  ) {
    return badRequest("identifier must be a string");
  }

  const identifier = body.identifier.trim().toLowerCase();
  if (!identifier) return badRequest("identifier must not be empty");

  const userId = session.user.id;

  const matchingUsers = await db.user.findMany({
    where: {
      OR: [
        { username: identifier },
        { email: identifier },
      ],
    },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      lastSeenAt: true,
    },
    take: 2,
  });

  if (matchingUsers.length > 1) {
    return badRequest("Identifier is ambiguous");
  }

  const otherUser = matchingUsers[0];
  if (!otherUser) return notFound("User");

  if (otherUser.id === userId) {
    return badRequest("You cannot send a friend request to yourself");
  }

  // Friendship rows always store the smaller user id first.
  const [userAId, userBId] = [userId, otherUser.id].sort();

  const existing = await db.friendship.findUnique({
    where: {
      userAId_userBId: { userAId, userBId },
    },
    select: {
      status: true,
      requestedById: true,
    },
  });

  if (existing?.status === "ACCEPTED") {
    return badRequest("You are already friends");
  }

  if (existing?.status === "PENDING") {
    if (existing.requestedById === userId) {
      return badRequest("Friend request already sent");
    }

    return badRequest("This user already sent you a friend request");
  }

  if (existing?.status === "DECLINED") {
    // requestedById is the previous requester, so the other user is the
    // person who declined. Only that person may start a new request.
    if (existing.requestedById === userId) {
      return badRequest("You cannot send another friend request to this user");
    }

    const updated = await db.friendship.updateMany({
      where: {
        userAId,
        userBId,
        status: "DECLINED",
        requestedById: { not: userId },
      },
      data: {
        status: "PENDING",
        requestedById: userId,
        respondedAt: null,
        createdAt: new Date(),
      },
    });

    // Another request may have changed the row between the read and update.
    if (updated.count !== 1) {
      return badRequest("Friendship changed, please try again");
    }

    return NextResponse.json(toFriendUser(otherUser), { status: 201 });
  }

  try {
    await db.friendship.create({
      data: {
        userAId,
        userBId,
        requestedById: userId,
      },
    });
  } catch (error) {
    // The compound primary key protects against two users creating
    // the same friendship pair at the same time.
    if (isPrismaErrorCode(error, "P2002")) {
      return badRequest("A friendship or friend request already exists");
    }

    throw error;
  }

  return NextResponse.json(toFriendUser(otherUser), { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const body = await readJson(request);
  if (
    typeof body !== "object"
    || body === null
    || !("userId" in body)
    || typeof body.userId !== "string"
    || !("action" in body)
    || (body.action !== "accept" && body.action !== "decline")
  ) {
    return badRequest('userId and action ("accept" or "decline") are required');
  }

  const otherUserId = body.userId.trim();
  if (!otherUserId) return badRequest("userId must not be empty");

  const userId = session.user.id;
  const [userAId, userBId] = [userId, otherUserId].sort();

  const status = body.action === "accept"
    ? "ACCEPTED"
    : "DECLINED";

  const updated = await db.friendship.updateMany({
    where: {
      userAId,
      userBId,
      status: "PENDING",
      // Only the recipient may answer the request.
      requestedById: otherUserId,
    },
    data: {
      status,
      respondedAt: new Date(),
    },
  });

  if (updated.count !== 1) {
    return notFound("Friend request");
  }

  return NextResponse.json({ status });
}

export async function DELETE(request: Request) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const body = await readJson(request);
  if (
    typeof body !== "object"
    || body === null
    || !("userId" in body)
    || typeof body.userId !== "string"
  ) {
    return badRequest("userId must be a string");
  }

  const otherUserId = body.userId.trim();
  if (!otherUserId) return badRequest("userId must not be empty");

  const userId = session.user.id;
  const [userAId, userBId] = [userId, otherUserId].sort();

  const deleted = await db.friendship.deleteMany({
    where: {
      userAId,
      userBId,
      OR: [
        { status: "ACCEPTED" },
        {
          status: "PENDING",
          requestedById: userId,
        },
      ],
    },
  });

  if (deleted.count !== 1) {
    return notFound("Friendship");
  }

  return new NextResponse(null, { status: 204 });
}

function isPrismaErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === code
  );
}

function compareUsernames(firstUser: FriendUser, secondUser: FriendUser) {
  return firstUser.username.localeCompare(secondUser.username);
}

function toFriendUser(user: {
  id: string;
  username: string;
  avatarUrl: string | null;
  lastSeenAt: Date | null;
}): FriendUser {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    online: isOnline(user.lastSeenAt),
  };
}
