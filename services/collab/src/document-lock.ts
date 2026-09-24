import type { Connection } from "@hocuspocus/server";

const releaseFunctions = new WeakMap<Connection, () => void>();

export async function lockDocument(connection: Connection) {
  // incoming edits share the autosave lock so restore can work without overlap
  const release = await connection.document.saveMutex.acquire();
  releaseFunctions.set(connection, release);
}

export function unlockDocument(connection: Connection) {
  const release = releaseFunctions.get(connection);
  if (!release) return;

  releaseFunctions.delete(connection);
  release();
}
