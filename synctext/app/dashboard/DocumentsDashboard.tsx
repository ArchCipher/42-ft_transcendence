"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { FileText, Plus } from "lucide-react";
import type { DocumentSummary } from "@/lib/documents/documents";
import { deleteDocument_api, renameDocument_api } from "./document/document";
import "./DocumentsDashboard.css";
import { BodyText, SupportText } from "@/app/components/typography/Typography";
import ConfirmWindow from "@/app/components/feedback/ConfirmWindow";
import ActionMenu, { type ActionItem } from "./ActionMenu";
import EditorsDialog from "./document/EditorsDialog";
import Button from "../components/ui/Button";

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
  filter: string;
};

export default function DocumentsDashboard({ userId,
                                              isPrivateSpace,
                                              documents,
                                              setDocuments,
                                              isLoading,
                                              loadError,
                                              search,
                                              order,
                                              filter,
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
//      { label: "Rename", onSelect: () => { setDocumentToEdit(doc.id); setEditTitle(doc.title); setEditError(""); } },
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

      <Button variant="outline" className="DocumentCreate"
      onClick={onCreateDocument}
      disabled={isCreatingDocument}
      aria-label={isCreatingDocument ? "Creating document" : "Create document"}
      >
      <Plus size={16} aria-hidden="true" />
      <span>New document</span>
      </Button>

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

      <ul className="DocumentList">
      {!isLoading ? documents.filter((doc) => {
        if (filter === "created") return doc.createdBy?.id === userId;
        if (filter === "edit") return doc.canEdit;
        if (filter === "read") return !doc.canEdit;
          return true;
        }).filter((doc) =>
          doc.title.toLowerCase().includes(search.toLowerCase())
        ).sort((a, b) => {
        if (order == "name")
          return a.title.localeCompare(b.title);
        const dateField = order === "modification" ? "updatedAt" : "createdAt";
        return new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime();
        })
        .map((doc) => (
        <li key={doc.id}>
          <DocumentCard
            title={doc.title}
            owner={doc.createdBy?.username ?? null}
            updatedAt={doc.updatedAt}
            onOpen={() => openDocument(doc.id)}
            actions={documentActions(doc)}
            canEdit={doc.canEdit}
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
        </li>
        )) : null}
    </ul>
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
  owner: string | null;
  updatedAt: string;
  canEdit: boolean;
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
                        owner,
                        updatedAt,
                        canEdit,
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
  const dateLabel = updatedAt ? updatedAt.slice(0, 10) : "";

  return (
    <div className={`DocumentCard ${canEdit ? "" : "DocumentCardReadOnly"}`}>

      <button
        type="button"
        className="DocumentIconButton"
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
          {title}
        </button>
      )}
    {!isEditing && (
      <>
        {owner && <span className="DocumentMeta DocumentMetaOwner">{owner}</span>}
        {dateLabel && <span className="DocumentMeta DocumentMetaDate">{dateLabel}</span>}
      </>
    )}
    {actions.length > 0 ? (
     <ActionMenu label={`Actions for ${title}`} items={actions} className="DocumentMenuButton" />
    ) : (
      <span className="DocumentMenuButton" aria-hidden="true"/>
    )}
    </div>
  );
}
