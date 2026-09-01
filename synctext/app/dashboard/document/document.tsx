import type { DocumentSummary } from "@/lib/documents/documents";

export async function createDocument_api(): Promise<DocumentSummary> {
  const response = await fetch("/api/documents", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to create document");
  }

  return response.json();
}

export async function listDocuments_api(
  signal?: AbortSignal,
): Promise<DocumentSummary[]> {
  const response = await fetch("/api/documents", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to list documents");
  }

  return response.json();
}

export async function getDocument_api(id: string): Promise<DocumentSummary> {
  const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch document");
  }

  return response.json();
}

export async function renameDocument_api(
  id: string,
  title: string,
): Promise<DocumentSummary> {
  const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error("Failed to rename document");
  }

  return response.json();
}

export async function deleteDocument_api(id: string): Promise<void> {
  const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete document");
  }
}
