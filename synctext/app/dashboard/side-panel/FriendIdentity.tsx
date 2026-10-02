import type { FriendUser } from "@/lib/friends/types";

type FriendIdentityProps = {
  // No presence light when online is unknown, as for document editors.
  friend: Pick<FriendUser, "username" | "avatarUrl"> & { online?: boolean };
  compact?: boolean;
};

export default function FriendIdentity({ friend, compact = false }: FriendIdentityProps) {
  const initial = friend.username.charAt(0).toUpperCase();

  return (
    <div className={`FriendIdentity ${compact ? "FriendIdentityCompact" : ""}`}>
      <span className="FriendAvatar" aria-hidden="true">
        {friend.avatarUrl ? (
          // Avatar URLs are user-provided and are not constrained to Next Image hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={friend.avatarUrl} alt="" />
        ) : initial}
      </span>
      {friend.online !== undefined && (
        <span className={`FriendStatus ${friend.online ? "FriendOnline" : "FriendOffline"}`} aria-label={friend.online ? "Online" : "Offline"} role="img" />
      )}
      <span className="FriendIdentityName">{friend.username}</span>
    </div>
  );
}
