import type { GroupMemberSummary, GroupSummary } from "@/lib/groups/types";
import { request } from "../request";

// A private space's stored name is a constant never shown: label it here.
export function groupLabel(group: GroupSummary): string {
  return group.isPrivateSpace ? "My private docs" : group.name;
}

const groupUrl = (id: string) => `/api/groups/${encodeURIComponent(id)}`;
const memberUrl = (id: string, userId: string) => `${groupUrl(id)}/members/${encodeURIComponent(userId)}`;

export function listGroups_api(signal?: AbortSignal): Promise<GroupSummary[]> {
  return request<GroupSummary[]>("/api/groups", { signal });
}

export function createGroup_api(name: string): Promise<GroupSummary> {
  return request<GroupSummary>("/api/groups", { method: "POST", body: JSON.stringify({ name }) });
}

export function renameGroup_api(id: string, name: string): Promise<void> {
  return request(groupUrl(id), { method: "PATCH", body: JSON.stringify({ name }) });
}

export function deleteGroup_api(id: string): Promise<void> {
  return request(groupUrl(id), { method: "DELETE" });
}

export function listMembers_api(id: string, signal?: AbortSignal): Promise<GroupMemberSummary[]> {
  return request<GroupMemberSummary[]>(`${groupUrl(id)}/members`, { signal });
}

export function addMember_api(id: string, userId: string): Promise<void> {
  return request(`${groupUrl(id)}/members`, { method: "POST", body: JSON.stringify({ userId }) });
}

// OWNER hands the group over: the caller becomes an admin.
export function setMemberRole_api(id: string, userId: string, role: "OWNER" | "ADMIN" | "MEMBER"): Promise<void> {
  return request(memberUrl(id, userId), { method: "PATCH", body: JSON.stringify({ role }) });
}

// Removes a member, or leaves the group when userId is the caller.
export function removeMember_api(id: string, userId: string): Promise<void> {
  return request(memberUrl(id, userId), { method: "DELETE" });
}
