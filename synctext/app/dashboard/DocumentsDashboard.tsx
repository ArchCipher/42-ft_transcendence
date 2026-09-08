"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";

import type { DocumentSummary } from "@/lib/documents/documents";
import { createDocument_api, deleteDocument_api, listDocuments_api, renameDocument_api } from "./document/document";
import "./DocumentsDashboard.css";
import { BodyText, SupportText } from "@/components/Typography";

type DashboardProps = {
  search: string;
  order: string;
};

export default function Dashboard({ search, order }: DashboardProps) {

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [documentsError, setDocumentsError] = useState("");

  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);// for deleting docs
  const [createError, setCreateError] = useState("");

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

  async function createDocument() {
      if (isCreatingDocument) return;

      setCreateError("");
      setIsCreatingDocument(true);
      try {
        const createdDocument = await createDocument_api();
        router.push(`/doc/${encodeURIComponent(createdDocument.id)}`);
      } catch {
        setCreateError("Failed to create the document. Please try again.");
      } finally {
        setIsCreatingDocument(false);
      }
    }

  function openDocument(id: string) {
    router.push(`/doc/${encodeURIComponent(id)}`);
  }

  async function saveRename() {
    const titleExists = documents.some(
      (doc) =>
        doc.id !== documentToEdit &&
        doc.title.toLowerCase() === editTitle.trim().toLowerCase()
    );

    if (!editTitle.trim()) {
      setEditError("Please enter a document title");
      return;
    }

    if (titleExists) {
      setEditError("A document with this title already exists");
      return;
    }

    if (documentToEdit === null) return;

    setEditError("");

    try {
      const renamedDocument = await renameDocument_api(
        documentToEdit,
        editTitle,
      );

      setDocuments((currentDocuments) =>
        currentDocuments.map((doc) =>
          doc.id === documentToEdit ? renamedDocument : doc
        )
      );

      setDocumentToEdit(null);
    } catch {
      setEditError("Failed to rename the document. Please try again.");
    }
  }

  return (
    <>
      <main className="Dashboard">

        <AddDoc
          onAdd={() => void createDocument()}
          disabled={isCreatingDocument}
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
          <p><BodyText>You do not have any documents yet.</BodyText></p>
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
            />
          )) : null}

      </main>

      <Dialog.Root
        open={documentToEdit !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDocumentToEdit(null);
            setEditError("");
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="CreateDocOverlay" />

          <Dialog.Popup className="CreateDoc">
            <Dialog.Title>Edit document</Dialog.Title>

            <input
              id="edit-document-title"
              className="CreateDocTitle"
              type="text"
              value={editTitle}
              autoComplete="off"
              autoFocus
              onFocus={(e) => e.target.select()}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveRename();
                }
              }}
              aria-describedby={editError ? "edit-doc-error" : undefined}
            />

            {editError && (
              <p className="CreateDocError" id="edit-doc-error">
                {editError}
              </p>
            )}

            <button
              className="CreateDocButton"
              onClick={saveRename}
            >
              Save changes
            </button>

            <div className="LedStrip" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={documentToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDocumentToDelete(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="DeleteDocOverlay" />

          <Dialog.Popup className="DeleteDocPopup">
          <Dialog.Title>Are you sure?</Dialog.Title>

          <Dialog.Description className="DeleteDocMessage">
            Think deep!
          </Dialog.Description>

          <button
            className="ConfirmDeleteDoc"
            autoFocus
            onClick={() => {
              if (documentToDelete !== null) {
                void deleteDocument(documentToDelete);
              }
            }}
          >
            DELETE
          </button>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}


type AddDocProps = {
  onAdd: () => void;
  disabled: boolean;
};

function AddDoc({ onAdd, disabled }: AddDocProps) {
  return (
    <button
      type="button"
      className="AddDoc"
      onClick={onAdd}
      disabled={disabled}
      aria-label={disabled ? "Creating document" : "Create document"}
    >
      +
    </button>
  );
}


type DocumentCardProps = {
  title: string;
  onOpen: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
};

function DocumentCard({ title, onOpen, onDelete, onEdit }: DocumentCardProps) {
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

      <span
        className="DocumentTitle"
        onDoubleClick={onEdit}
      >
        {title}
      </span>
    </div>
  );
}