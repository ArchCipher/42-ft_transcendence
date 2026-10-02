import type { DocumentEditorSummary, DocumentSummary } from "@/lib/documents/documents";
import { request } from "../request";

export function createDocument_api(groupId: string): Promise<DocumentSummary> {
  return request<DocumentSummary>("/api/documents", {
    method: "POST",
    body: JSON.stringify({ groupId }),
  });
}

const documentUrl = (id: string) => `/api/documents/${encodeURIComponent(id)}`;

export function listDocuments_api(signal?: AbortSignal): Promise<DocumentSummary[]> {
  return request<DocumentSummary[]>("/api/documents", { signal });
}

export function renameDocument_api(id: string, title: string): Promise<DocumentSummary> {
  return request<DocumentSummary>(documentUrl(id), {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteDocument_api(id: string): Promise<void> {
  const response = await fetch(documentUrl(id), {
    method: "DELETE",
  });

  // avoid double click firing a new delete
  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to delete document");
  }
}

export function listEditors_api(id: string): Promise<DocumentEditorSummary[]> {
  return request<DocumentEditorSummary[]>(`${documentUrl(id)}/grants`);
}

// Grant (PUT) or revoke (DELETE) edit rights on one document.
export function setEditor_api(id: string, userId: string, canEdit: boolean): Promise<void> {
  return request(`${documentUrl(id)}/grants/${encodeURIComponent(userId)}`, {
    method: canEdit ? "PUT" : "DELETE",
  });
}
