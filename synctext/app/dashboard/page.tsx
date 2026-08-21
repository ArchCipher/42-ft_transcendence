"use client";

import { useState } from "react";

import './Dashboard.css';
import Image from "next/image";

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

type DashboardProps = {
  search: string;
  order: string;
};

function Dashboard({ search, order }: DashboardProps) {
  
  const [documents, setDocuments] = useState([]);

  const [isCreating, setIsCreating] = useState(false); 
  const [newTitle, setNewTitle] = useState("");  // const for naming docs
  const [documentToDelete, setDocumentToDelete] = useState(null); // for deleting docs

  function addDocument(title) {
    const newDocument = {
      id: Date.now(),
      title: title,
      createdAt: Date.now(),
    };

    setDocuments([...documents, newDocument]);
  }

  function deleteDocument(id: number) {
    setDocuments(documents.filter((doc) => doc.id !== id));
  }

  function createDocument() {
    const titleExists = documents.some(                                  // .some
      (doc) => doc.title.toLowerCase() === newTitle.trim().toLowerCase());

    if (titleExists)
      return;

    if (!newTitle.trim())
      return;
    addDocument(newTitle);
    setIsCreating(false); // reset pop-up window
    setNewTitle("");
  }

  function renameDocument(id, newTitle) {      // rename doc
    const titleExists = documents.some(
      (doc) => doc.id !== id &&
        doc.title.toLowerCase() === newTitle.trim().toLowerCase());

    if (titleExists)
      return;
    
    if (!newTitle.trim())
      return;

    setDocuments(documents.map((doc) =>
        doc.id === id ? { ...doc, title: newTitle } : doc));
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
              id={doc.id}
              title={doc.title}
              onDelete={() => setDocumentToDelete(doc.id)}
              onRename={renameDocument}
            />
          ))}

      </main>

      {isCreating && (
        <div className="CreateDocOverlay">
          <div className="CreateDoc">
            <button
              className="CloseCreateDoc"
              onClick={() => {
                setIsCreating(false);
                setNewTitle("");
              }}
            />

            <button
              className="CreateDocButton"
              onClick={createDocument}
            />

            <input
              className="CreateDocTitle"
              type="text"
              placeholder="Document title"
              value={newTitle}
              autoFocus
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createDocument();
                }
              }}
            />

            <select className="CreateDocGroup">
              <option value="">None</option>
              <option value="wu-tang clan">Wu-Tang</option>
              <option value="transcendence">Transcendence</option>
            </select>

          </div>
        </div>
      )}
      {documentToDelete !== null && (
        <div className="DeleteDocOverlay">
          <div className="DeleteDocPopup">

            <button
              className="CloseDeleteDoc"
              onClick={() => setDocumentToDelete(null)}
            />

            <button
              className="ConfirmDeleteDoc"
              autoFocus
              onClick={() => {
                deleteDocument(documentToDelete);
                setDocumentToDelete(null);
              }}
            >
              DELETE
            </button>

          </div>
        </div>
      )}
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

function DocumentCard({ id, title, onDelete, onRename }) {

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  return (
    <div className="DocumentCard">
      <button className="DeleteDoc" onClick={onDelete}>×</button>

      <div className="DocumentIcon">
        <Image
          src="/assets/doc-icon.png"
          alt="Document icon"
          width={90}
          height={90}
          className="DocumentIcon" />
      </div>

      {isEditing ? (
      <input
        className="DocumentTitle"
        value={editedTitle}
        onChange={(e) => setEditedTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (!editedTitle.trim()) {
              setEditedTitle(title);
              setIsEditing(false);
              return;
            }

            onRename(id, editedTitle);
            setIsEditing(false);
          }
        }}
      />
    ) : (
      <span
        className="DocumentTitle"
        onDoubleClick={() => setIsEditing(true)}
      >
        {title}
      </span>
    )}
    </div>
  );
}





