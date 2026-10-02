"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { FileText } from "lucide-react";
import type { DocumentSummary } from "@/lib/documents/documents";
import { deleteDocument_api, renameDocument_api } from "./document/document";
import "./DocumentsDashboard.css";
import { BodyText, SupportText } from "@/app/components/typography/Typography";
import ConfirmWindow from "@/app/components/feedback/ConfirmWindow";
import PlusButton from "@/app/components/ui/PlusButton";
import ActionMenu, { type ActionItem } from "./ActionMenu";
import EditorsDialog from "./document/EditorsDialog";

function truncateTitle(title: string, limit = 18) {
  return title.length > limit
    ? `${title.slice(0, limit)}...`
    : title;
}

type DashboardProps = {
  userId: string;
  isPrivateSpace: boolean;
  documents: DocumentSummary[];
  setDocuments: Dispatch<SetStateAction<DocumentSummary[]>>;
  isLoading: boolean;
  loadError: string;
  search: string;
  order: string;
  createError: string;
  onCreateDocument: () => void;
  isCreatingDocument: boolean;
};

export default function DocumentsDashboard({ userId,
                                              isPrivateSpace,
                                              documents,
                                              setDocuments,
                                              isLoading,
                                              loadError,
                                              search,
                                              order,
                                              onCreateDocument,
                                              isCreatingDocument,
                                              createError }: DashboardProps) {

  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);// for deleting docs
  const [documentToShare, setDocumentToShare] = useState<DocumentSummary | null>(null);

  const [documentToEdit, setDocumentToEdit] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editError, setEditError] = useState("");
  const router = useRouter();
  const dashboardError = loadError || createError;


  async function deleteDocument(id: string) {
    try {
      await deleteDocument_api(id);

      setDocuments((currentDocuments) =>
        currentDocuments.filter((doc) => doc.id !== id)
      );

      setDocumentToDelete(null);
    } catch {
      console.error("Failed to delete document");
    }
  }

  function openDocument(id: string) {
    router.push(`/doc/${encodeURIComponent(id)}`);
  }

  // A document's "…" menu: empty, so hidden, unless the caller may edit it.
  function documentActions(doc: DocumentSummary): ActionItem[] {
    if (!doc.canEdit) return [];
    return [
      { label: "Rename", onSelect: () => { setDocumentToEdit(doc.id); setEditTitle(doc.title); setEditError(""); } },
      ...(isPrivateSpace ? [] : [{ label: "Manage editors", onSelect: () => setDocumentToShare(doc) }]),
      { label: "Delete", onSelect: () => setDocumentToDelete(doc.id), danger: true },
    ];
  }

async function saveRename(): Promise<boolean> {
  const titleExists = documents.some(
    (doc) =>
      doc.id !== documentToEdit &&
      doc.title.toLowerCase() === editTitle.trim().toLowerCase()
  );

  if (!editTitle.trim()) {
    setEditError("Please enter a document title");
    return false;
  }

  if (titleExists) {
    setEditError("A document with this title already exists");
    return false;
  }

  if (documentToEdit === null) return false;

  setEditError("");

  try {
    const renamedDocument = await renameDocument_api(
      documentToEdit,
      editTitle.trim(),
    );

    setDocuments((currentDocuments) =>
      currentDocuments.map((doc) =>
        doc.id === documentToEdit ? renamedDocument : doc
      )
    );

    setDocumentToEdit(null);
    return true;

  } catch {
    setEditError("Failed to rename the document. Please try again.");
    return false;
  }
}

  return (
    <>

      <main className="Dashboard">

      <PlusButton
        size="tile"
        className="CreateDocumentTile"
        aria-label={isCreatingDocument ? "Creating document" : "Create document"}
        disabled={isCreatingDocument}
        onClick={onCreateDocument}
      />

      {isLoading ? (
        <p className="DashboardStatus">
          <SupportText>Loading documents...</SupportText>
        </p>
      ) : null}

      {dashboardError ? (
        <p className="DashboardError" role="alert">
          <BodyText className="text-[#ff6b6b]">
            {dashboardError}
          </BodyText>
        </p>
      ) : null}

      {!isLoading && !loadError && documents.length === 0 ? (
        <p className="DashboardStatus">
          <BodyText>No documents here yet.</BodyText>
        </p>
      ) : null}

      {!isLoading && !loadError ? documents.filter((doc) =>
          doc.title.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
        if (order == "name")
          return a.title.localeCompare(b.title);
        const dateField = order === "modification" ? "updatedAt" : "createdAt";
        return new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime();
        })
        .map((doc) => (
          <DocumentCard
            key={doc.id}
            title={doc.title}
            onOpen={() => openDocument(doc.id)}
            actions={documentActions(doc)}
            isEditing={documentToEdit === doc.id}
            editTitle={editTitle}
            onEditTitle={setEditTitle}
            onSave={saveRename}
            onCancel={() => {
              setDocumentToEdit(null);
              setEditError("");
            }}
            editError={editError}
          />
        )) : null}

    </main>
    {documentToDelete !== null && (
      <ConfirmWindow
        title="Delete document?"
        message="This action cannot be undone."
        onCancel={() => setDocumentToDelete(null)}
        onConfirm={() => void deleteDocument(documentToDelete)}
      />
    )}
    {documentToShare !== null && (
      <EditorsDialog
        document={documentToShare}
        userId={userId}
        onClose={() => setDocumentToShare(null)}
        onSelfRevoked={() => {
          setDocuments((currentDocuments) =>
            currentDocuments.map((doc) =>
              doc.id === documentToShare.id ? { ...doc, canEdit: false } : doc
            )
          );
          setDocumentToShare(null);
        }}
      />
    )}
  </>
  );
}

type DocumentCardProps = {
  title: string;
  onOpen: () => void;
  actions: ActionItem[];

  isEditing: boolean;
  editTitle: string;
  onEditTitle: (title: string) => void;
  onSave: () => Promise<boolean>;
  onCancel: () => void;
  editError: string;
};

function DocumentCard({ title,
                        onOpen,
                        actions,
                        isEditing,
                        editTitle,
                        onEditTitle,
                        onSave,
                        editError,
                        onCancel }: DocumentCardProps) {

  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  return (
    <div className="DocumentCard">
      <ActionMenu label={`Actions for ${title}`} items={actions} className="DocumentMenuButton" />

      <button
        type="button"
        className="DocumentOpen"
        onClick={onOpen}
        aria-label={`Open ${title}`}
      >
        <FileText className="DocumentIcon" aria-hidden="true" strokeWidth={1.4} />
      </button>

      {isEditing ? (
          <div className="DocumentTitleEdit">
            <input
              ref={inputRef}
              className="DocumentTitleInput"
              value={editTitle}
              maxLength={50}
              autoFocus
              onChange={(e) => onEditTitle(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={async () => {
                if (cancelRef.current) {
                  cancelRef.current = false;
                  return;
                }

                const saved = await onSave();

                if (!saved) {
                  inputRef.current?.focus();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }

                if (e.key === "Escape") {
                  cancelRef.current = true;
                  onCancel();
                }
              }}
            />

            {editError && (
              <span className="DocumentTitleError">
                {editError}
              </span>
            )}
          </div>
        ) : (
        <button
          type="button"
          className="DocumentTitle"
          onClick={onOpen}
          title={title}
        >
          {truncateTitle(title)}
        </button>
      )}
    </div>
  );
}
