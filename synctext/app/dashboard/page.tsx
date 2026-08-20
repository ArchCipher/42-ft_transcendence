"use client";

import { useState } from "react";

import './Dashboard.css';
import Image from "next/image";

export default function MainPage() {

  const [search, setSearch] = useState("");

  return (
    <div className="MainPage">
      <Header />
      <ControlBar search={search} setSearch={setSearch} />
      <Dashboard search={search} />
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
        <option>Audio Team</option>
      </select>
    </div>
  );
}

function OrderBox() {
  return (
    <div className="OrderBox">
      <span>Ordered by</span>

      <select>
        <option>Name</option>
        <option>Modification date</option>
        <option>Creation date</option>
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

function ControlBar({ search, setSearch }: SearchBoxProps) {
  return (
    <div className="ControlBar">
      <FilterBox />
      <OrderBox />
      <GroupFilter />
      <SearchBox search={search} setSearch={setSearch} />
    </div>
  );
}


// docs

type DashboardProps = {
  search: string;
};

function Dashboard({ search }: DashboardProps) {
  
  const [documents, setDocuments] = useState([
    { id: 1, title: "Document 1" },
    { id: 2, title: "Document 2" },
  ]);

  function addDocument() {
    const newDocument = {
      id: Date.now(),
      title: "Untitled document",
    };

    setDocuments([...documents, newDocument]);
  }

  function deleteDocument(id: number) {
    setDocuments(documents.filter((doc) => doc.id !== id));
  }

  return (
    <main className="Dashboard">
      {documents
        .filter((doc) =>
          doc.title.toLowerCase().includes(search.toLowerCase())
        )
        .map((doc) => (
          <DocumentCard
            key={doc.id}
            title={doc.title}
            onDelete={() => deleteDocument(doc.id)}
          />
        ))}
          <AddDoc onAdd={addDocument} />
    </main>
  );
}


type AddDocProps = {
  onAdd: () => void;
};

function AddDoc({ onAdd }: AddDocProps) {
  return (
    <button className="AddDoc" onClick={onAdd}>
      +
    </button>
  );
}


type DocumentCardProps = {
  title: string;
  onDelete: () => void;
};

function DocumentCard({ title, onDelete }: DocumentCardProps) {
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

      <span className="DocumentTitle">
        { title }
      </span>
    </div>
  );
}





