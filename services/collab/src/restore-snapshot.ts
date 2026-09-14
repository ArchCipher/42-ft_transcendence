import type { Hocuspocus } from "@hocuspocus/server";
import * as Y from "yjs";
import { saveDocumentState, saveRecoverySnapshot, verifySession } from "./web-api.js";

export class RestoreError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function readSnapshot(state: Uint8Array) {
  const snapshot = new Y.Doc();

  try {
    if (state.length === 0) throw new Error("Empty snapshot");
    Y.applyUpdate(snapshot, state);
    return snapshot;
  } catch {
    snapshot.destroy();
    throw new RestoreError(422, "This snapshot could not be read.");
  }
}

function prepareRestoredState(currentState: Uint8Array, snapshot: Y.Doc) {
  const restoredDocument = new Y.Doc();

  try {
    Y.applyUpdate(restoredDocument, currentState);

    // tiptap stores editor content in 'default'; keep the current metadata
    const content = restoredDocument.getXmlFragment("default");
    const oldContent = snapshot.getXmlFragment("default");
    const restoredNodes = oldContent.toArray().map((node) => {
      if (node instanceof Y.XmlElement || node instanceof Y.XmlText) {
        return node.clone();
      }
      throw new RestoreError(422, "This snapshot contains unsupported content.");
    });

    // these are new edits to the current history, not a merge of old state
    restoredDocument.transact(() => {
      content.delete(0, content.length);
      content.insert(0, restoredNodes);
    });

    return Y.encodeStateAsUpdate(restoredDocument);
  } finally {
    restoredDocument.destroy();
  }
}

async function checkRestoreAccess(documentName: string, tokenHash: string) {
  const session = await verifySession({ documentName, tokenHash });

  if (!session || session.readOnly) {
    throw new RestoreError(403, "You no longer have permission to restore this document.");
  }
}

export async function restoreSnapshot(
  instance: Hocuspocus,
  documentName: string,
  tokenHash: string,
  snapshotState: Uint8Array,
) {
  await checkRestoreAccess(documentName, tokenHash);
  const snapshot = readSnapshot(snapshotState);

  try {
    // a direct connection keeps the live document loaded during the request
    const connection = await instance.openDirectConnection(documentName);

    try {
      const document = connection.document;
      if (!document) throw new Error("Document is unavailable");

      return await document.saveMutex.runExclusive(async () => {
        await checkRestoreAccess(documentName, tokenHash);

        const currentState = Y.encodeStateAsUpdate(document);
        const restoredState = prepareRestoredState(currentState, snapshot);
        const recoverySnapshotId = await saveRecoverySnapshot(documentName, currentState);

        // permission may have changed while the backup was being saved
        await checkRestoreAccess(documentName, tokenHash);

        // finish saving before broadcasting, so a failed save leaves the room alone
        await saveDocumentState(documentName, restoredState);
        Y.applyUpdate(document, restoredState, { source: "local" });

        return recoverySnapshotId;
      });
    } finally {
      await connection.disconnect({ unloadImmediately: false });
    }
  } finally {
    snapshot.destroy();
  }
}
