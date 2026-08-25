import type { DocumentSummary } from "@/lib/documents/documents";

export async function createDocument(): Promise<DocumentSummary> {
  const response = await fetch("/api/documents", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to create document");
  }

  return response.json();
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch("/api/documents", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to list documents");
  }

  return response.json();
}

export async function getDocument(id: string): Promise<DocumentSummary> {
  const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch document");
  }

  return response.json();
}

export async function renameDocument(
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

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete document");
  }
}
