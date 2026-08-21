
export async function createDocument() {
  const response = await fetch("/api/newdoc", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to create document");
  }

  return response.json();
}


// TODO: Add list, get, rename, delete, and access-checking actions.
