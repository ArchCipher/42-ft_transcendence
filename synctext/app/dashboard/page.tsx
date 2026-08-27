"use client";

import { useState } from "react";

import './Dashboard.css';
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";

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
      <UserName />
    </header>
  );
}

function UserName () {
  return (
    <button className="UserMenu">
    <Image
      src="/assets/Gianpic.jpg"
      alt="Gianluca"
      width={48}
      height={48}
    />
    <span>Gianluca</span>
  </button>
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

function OrderBox({ orderBy, setOrderBy }) {
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

type Document = {
  id: number;
  title: string;
  createdAt: number;
  group: string;
};

type DashboardProps = {
  search: string;
  order: string;
};

function Dashboard({ search, order }: DashboardProps) {
  
 const [documents, setDocuments] = useState<Document[]>([]);

  const [isCreating, setIsCreating] = useState(false); 
  const [newTitle, setNewTitle] = useState("");  // const for naming docs
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);// for deleting docs
  const [createError, setCreateError] = useState("");

  const [documentToEdit, setDocumentToEdit] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editError, setEditError] = useState("");
  const [newGroup, setNewGroup] = useState("none");
  const [editGroup, setEditGroup] = useState("none");

  function addDocument(title: string, group: string) {
    const newDocument = {
      id: Date.now(),
      title: title,
      createdAt: Date.now(),
      group,
    };

    setDocuments([...documents, newDocument]);
  }

  function deleteDocument(id: number) {
    setDocuments(documents.filter((doc) => doc.id !== id));
  }

  function createDocument() {
    const titleExists = documents.some(                                  // .some
      (doc) => doc.title.toLowerCase() === newTitle.trim().toLowerCase());

    if (!newTitle.trim()) {
      setCreateError("Please enter a document title");
      return;
    }

    if (titleExists) {
      setCreateError("A document with this title already exists");
      return;
    }

    setCreateError("");
    addDocument(newTitle, newGroup);
    setIsCreating(false); // reset pop-up window
    setNewTitle("");
  }

  function saveRename() {
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

    setDocuments(documents.map((doc) =>
      doc.id === documentToEdit
        ? { ...doc, title: editTitle, group: editGroup } : doc
    ));

    setDocumentToEdit(null);
    setEditError("");
  }

  return (
    <>
      <main className="Dashboard">             

        <AddDoc onAdd={() => setIsCreating(true)} />

        {documents.filter((doc) =>
            doc.title.toLowerCase().includes(search.toLowerCase()))
          .sort((a, b) => {
          if (order == "name")
            return a.title.localeCompare(b.title);
          return b.createdAt - a.createdAt;
          })
          .map((doc) => (
            <DocumentCard
              key={doc.id}
              title={doc.title}
              onDelete={() => setDocumentToDelete(doc.id)}
              onEdit={() => {
                setDocumentToEdit(doc.id);
                setEditTitle(doc.title);
                setEditGroup(doc.group);
                setEditError("");
              }}
            />
          ))}

      </main>

      <Dialog.Root
        open={isCreating}
        onOpenChange={setIsCreating}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="CreateDocOverlay" />

          <Dialog.Popup className="CreateDoc">
            <Dialog.Title>Create document</Dialog.Title>

            <input
              id="document-title"
              className="CreateDocTitle"
              type="text"
              placeholder="Title"
              autoComplete="off"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createDocument();
                }
              }}
              aria-describedby={createError ? "create-doc-error" : undefined}
            />

            {createError && (
              <p className="CreateDocError" id="create-doc-error">
                {createError}
              </p>
            )}

            <div className="CreateDocGroup">
              <label htmlFor="document-group">Group:</label>

              <select
                id="document-group"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
              >
                <option value="none">None</option>
                <option value="wu-tang clan">Wu-Tang</option>
                <option value="transcendence">Transcendence</option>
              </select>
            </div>

            <button
              className="CreateDocButton"
              onClick={createDocument}
            >
              Add to the Guide
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

            <div className="CreateDocGroup">
              <label htmlFor="edit-document-group">Group:</label>

              <select
                id="edit-document-group"
                value={editGroup}
                onChange={(e) => setEditGroup(e.target.value)}
              >
                <option value="none">None</option>
                <option value="wu-tang clan">Wu-Tang</option>
                <option value="transcendence">Transcendence</option>
              </select>
            </div>

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
                deleteDocument(documentToDelete);
                setDocumentToDelete(null);
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
};

function AddDoc({ onAdd }: AddDocProps) {
  return (
    <button type="button" className="AddDoc" onClick={onAdd}>
      +
    </button>
  );
}

function DocumentCard({ title, onDelete, onEdit }) {
  return (
    <div className="DocumentCard">
      <button className="DeleteDoc" onClick={onDelete}>×</button>

      <div className="DocumentIcon">
        <Image
          src="/assets/doc-icon.png"
          alt="Document icon"
          width={90}
          height={90}
          className="DocumentIcon"
        />
      </div>

      <span
        className="DocumentTitle"
        onDoubleClick={onEdit}
      >
        {title}
      </span>
    </div>
  );
}





