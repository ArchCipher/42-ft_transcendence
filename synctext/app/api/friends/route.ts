import { prisma as db } from "@synctext/db";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { unauthorized } from "@/lib/api/responses";
import type { FriendUser, FriendsResponse } from "@/lib/friends/types";
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
      userA: { select: { id: true, username: true, avatarUrl: true } },
      userB: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  const response: FriendsResponse = {
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  };

  for (const friendship of friendships) {
    const otherUser = friendship.userA.id === userId
      ? friendship.userB
      : friendship.userA;

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

function compareUsernames(firstUser: FriendUser, secondUser: FriendUser) {
  return firstUser.username.localeCompare(secondUser.username);
}
