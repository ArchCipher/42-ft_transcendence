"use client";

import { useState } from "react";

import './Dashboard.css';

function Header() {
  return (
    <header className="Header">
      <div className="Brand">
        <div className="BrandNumber">42</div>

        <div className="BrandText">
          <h1>DON'T PANIC</h1>
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
    <img src="/assets/Gianpic.jpg" alt="Gianluca" />
    <span>Gianluca</span>
  </button>
  );
}

function AddDoc({ onAdd }) {
  return (
    <button className="AddDoc" onClick={onAdd}>
      +
    </button>
  );
}

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

function SearchBox({ search, setSearch }) {
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

function ControlBar({ search, setSearch }) {
  return (
    <div className="ControlBar">
      <FilterBox />
      <OrderBox />
      <GroupFilter />
      <SearchBox search={search} setSearch={setSearch} />
    </div>
  );
}

function DocumentCard({ title, onDelete }) {
  return (
    <div className="DocumentCard">
      <button className="DeleteDoc" onClick={onDelete}>×</button>

      <div className="DocumentIcon">
        <img src="/assets/doc-icon.png"
        alt="Document icon"
        className="DocumentIcon" />
      </div>

      <span className="DocumentTitle">
        { title }
      </span>
    </div>
  );
}

function Dashboard({ search }) {
  
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

  function deleteDocument(id) {
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

