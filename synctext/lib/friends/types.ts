export type FriendUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
  online: boolean;
};

export type FriendsResponse = {
  friends: FriendUser[];
  incomingRequests: FriendUser[];
  outgoingRequests: FriendUser[];
};
