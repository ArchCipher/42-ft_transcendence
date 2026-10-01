import type { GroupSummary } from "@/lib/groups/types";
import { request } from "../request";

// A private space's stored name is a constant never shown: label it here.
export function groupLabel(group: GroupSummary): string {
  return group.isPrivateSpace ? "My private docs" : group.name;
}

export function listGroups_api(signal?: AbortSignal): Promise<GroupSummary[]> {
  return request<GroupSummary[]>("/api/groups", { signal });
}
