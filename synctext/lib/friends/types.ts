export type FriendUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

export type FriendsResponse = {
  friends: FriendUser[];
  incomingRequests: FriendUser[];
  outgoingRequests: FriendUser[];
};
