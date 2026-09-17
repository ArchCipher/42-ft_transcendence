import type { GroupRole } from "@synctext/db";

/** One group the caller belongs to. */
export type GroupSummary = {
  id: string;
  /** Carries no meaning for a private space, where it is the same constant for
   *  everyone. Derive what to show from isPrivateSpace instead: a stored name
   *  cannot be translated. */
  name: string;
  isPrivateSpace: boolean;
  /** The caller's own role, so the client can decide what to offer without a
   *  second request. Feed it to canAdminGroup / canOwnGroup. */
  myRole: GroupRole;
  documentCount: number;
};

/** One member of a group. */
export type GroupMemberSummary = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: GroupRole;
  joinedAt: string;
};
