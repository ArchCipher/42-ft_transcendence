"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DocumentSummary } from "@/lib/documents/documents";
import { deleteDocument_api, listDocuments_api, renameDocument_api } from "./document/document";
import "./DocumentsDashboard.css";
import { BodyText, SupportText } from "@/app/components/typography/Typography";
import ConfirmWindow from "@/app/components/feedback/ConfirmWindow";
import PlusButton from "@/components/PlusButton";

function truncateTitle(title: string, limit = 18) {
  return title.length > limit
    ? `${title.slice(0, limit)}...`
    : title;
}

type DashboardProps = {
  search: string;
  order: string;
  createError: string;
  onCreateDocument: () => void;
  isCreatingDocument: boolean;
};

export default function DocumentsDashboard({ search,
                                              order,
                                              onCreateDocument,
                                              isCreatingDocument,
                                              createError }: DashboardProps) {

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [documentsError, setDocumentsError] = useState("");

  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);// for deleting docs

  const [documentToEdit, setDocumentToEdit] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editError, setEditError] = useState("");
  const router = useRouter();
  const dashboardError = documentsError || createError;

  useEffect(() => {
    const controller = new AbortController();

    async function loadDocuments() {
      try {
        setIsLoadingDocuments(true);
        setDocumentsError("");

        const listedDocuments = await listDocuments_api(controller.signal);
        setDocuments(listedDocuments);
      } catch {
        if (!controller.signal.aborted) {
          setDocumentsError("Failed to load your documents. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingDocuments(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      controller.abort();
    };
  }, []);



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
        aria-label={isCreatingDocument ? "Creating document" : "Create document"}
        disabled={isCreatingDocument}
        onClick={onCreateDocument}
      />

      {isLoadingDocuments ? (
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

      {!isLoadingDocuments && !documentsError && documents.length === 0 ? (
        <p className="DashboardStatus">
          <BodyText>You do not have any documents yet.</BodyText>
        </p>
      ) : null}

      {!isLoadingDocuments && !documentsError ? documents.filter((doc) =>
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
            onDelete={doc.canDelete
              ? () => setDocumentToDelete(doc.id)
              : undefined}
            onEdit={doc.canRename ? () => {
              setDocumentToEdit(doc.id);
              setEditTitle(doc.title);
              setEditError("");
            } : undefined}
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
  </>
  );
}

type DocumentCardProps = {
  title: string;
  onOpen: () => void;
  onDelete?: () => void;
  onEdit?: () => void;

  isEditing: boolean;
  editTitle: string;
  onEditTitle: (title: string) => void;
  onSave: () => Promise<boolean>;
  onCancel: () => void;
  editError: string;
};

function DocumentCard({ title,
                        onOpen,
                        onDelete,
                        onEdit,
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
      {onDelete ? (
        <button className="DeleteDoc" onClick={onDelete}>×</button>
      ) : null}

      <button
        type="button"
        className="DocumentOpen"
        onClick={onOpen}
        aria-label={`Open ${title}`}
      >
        <Image
          src="/assets/doc-icon.png"
          alt="Document icon"
          width={90}
          height={90}
          className="DocumentIcon"
        />
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
        <span
          className="DocumentTitle"
          onClick={onEdit}
          title={title}
        >
          {truncateTitle(title)}
        </span>
      )}
    </div>
  );
}