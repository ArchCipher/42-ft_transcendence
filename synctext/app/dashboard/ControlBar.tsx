"use client";

import Box from "@/app/components/form/Box";
import { TechText } from "@/app/components/typography/Typography";
import "./ControlBar.css";

function FilterBox() {
  return (
    <div className="FilterBox">
      <TechText className="text-sm text-white/70">
        Filtered by
      </TechText>

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
      <TechText className="text-sm text-white/70">
        Groups
      </TechText>

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
      <TechText className="text-sm text-white/70">
        Ordered by
      </TechText>

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
      <Box
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

export default function ControlBar({ search, setSearch, order, setOrder }: ControlBarProps) {
  return (
    <div className="ControlBar">
      <FilterBox />
      <OrderBox orderBy={order} setOrderBy={setOrder} />
      <GroupFilter />
      <SearchBox search={search} setSearch={setSearch} />
    </div>
  );
}