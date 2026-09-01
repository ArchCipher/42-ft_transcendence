"use client";

import { useEffect, useState } from "react";

import './Dashboard.css';
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import type { DocumentSummary } from "@/lib/documents/documents";
import {
  createDocument_api,
  deleteDocument_api,
  listDocuments_api,
  renameDocument_api,
} from "./document/document";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { Menu } from "@base-ui/react/menu";

export default function MainPage() {

  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("creation"); // to order by creation, name, modification

  return (
    <div className="MainPage">
      <Header />
      <ControlBar
        search={search} setSearch={setSearch}
        order={order} setOrder={setOrder}
      />
      <Dashboard search={search} order={order} />
    </div>
  );
}

// header

function Header() {
  return (
    <header className="Header">
      <div className="Brand">
        <div className="BrandNumber">42</div>

        <div className="BrandText">
          <h1>DON&apos;T PANIC</h1>
          <p>All the documents in the universe</p>
        </div>
      </div>
      <UserName username="Username" />
    </header>
  );
}

type UserNameProps = {
  username: string;
};

function UserName({ username }: UserNameProps) {
  return (
    <div className="UserMenuContainer">
      <Menu.Root modal={false}>
        <Menu.Trigger className="UserMenu">
          <User size={25} />
          <span>{username}</span>
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner sideOffset={8} align="center">
            <Menu.Popup className="UserDropdown">
              <Menu.Item className="UserDropdownItem">
                Profile
              </Menu.Item>

              <Menu.Item className="UserDropdownItem">
                Groups
              </Menu.Item>

              <Menu.Item className="UserDropdownItem">
                Logout
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

// TODO: replace mock data with documents fetched from backend/database.

function FilterBox() {
  return (
    <div className="FilterBox">
      <span>Filtered by</span>

      <select>
        <option>All documents</option>
        <option>Owned by me</option>
        <option>I can edit</option>
        <option>I can only read</option>
      </select>
    </div>
  );
}

function GroupFilter() {
  return (
    <div className="GroupFilter">
      <span>Group</span>

      <select>
        <option>All groups</option>
        <option>Transcendence</option>
        <option>Wu tang Clan</option>
      </select>
    </div>
  );
}

type OrderBoxProps = {
  orderBy: string;
  setOrderBy: (value: string) => void;
};

function OrderBox({ orderBy, setOrderBy }: OrderBoxProps) {
  return (
    <div className="OrderBox">
      <span>Ordered by</span>

      <select
        value={orderBy}
        onChange={(e) => setOrderBy(e.target.value)}
      >
        <option value="creation">Creation date</option>
        <option value="modification">Modification date</option>
        <option value="name">Name</option>
      </select>
    </div>
  );
}

type SearchBoxProps = {
  search: string;
  setSearch: (value: string) => void;
};

function SearchBox({ search, setSearch }: SearchBoxProps) {
  return (
    <div className="SearchBox">
      <input
        type="text"
        placeholder="Search documents..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );
}

type ControlBarProps = {
  search: string;
  setSearch: (value: string) => void;
  order: string;
  setOrder: (value: string) => void;
};

function ControlBar({ search, setSearch, order, setOrder }: ControlBarProps) {
  return (
    <div className="ControlBar">
      <FilterBox />
      <OrderBox orderBy={order} setOrderBy={setOrder} />
      <GroupFilter />
      <SearchBox search={search} setSearch={setSearch} />
    </div>
  );
}


// docs

type DashboardProps = {
  search: string;
  order: string;
};

function Dashboard({ search, order }: DashboardProps) {

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

        {isLoadingDocuments ? <p>Loading documents...</p> : null}

        {documentsError ? <p role="alert">{documentsError}</p> : null}

        {createError ? <p role="alert">{createError}</p> : null}

        {!isLoadingDocuments && !documentsError && documents.length === 0 ? (
          <p>You do not have any documents yet.</p>
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
