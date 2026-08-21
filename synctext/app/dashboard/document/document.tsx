//import { DocumentSummary } from "@/lib/documents/documents";


export async function createDocument() {
  const response = await fetch("/api/documents", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to create document");
  }

  return response.json();
}

//modify return value to contain items from my type?
export async function listDocuments() {
  const response = await fetch("/api/documents", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to list documents");
  }

  return response.json();
}

export async function getDocument(id: string) {
  const response = await fetch(`api/documents/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch document");
  }

  return response.json();
}

// TODO: Add list, get, rename, delete, and access-checking actions.
