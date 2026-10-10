"use client";

import { TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import { House } from "lucide-react";
import InputBox from "@/app/components/form/InputBox";
import SelectBox from "@/app/components/form/SelectBox";
import "./ControlBar.css";

type FilterBoxProps = {
  filter: string;
  setFilter: (value: string) => void;
};

function FilterBox({ filter, setFilter }: FilterBoxProps) {

  return (
    <div className="FilterBox">
      <TechText className="ControlBarLabel text-white/70">
        Filter by:
      </TechText>

      <div className="ControlSelect">
        <SelectBox
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All documents" },
            { value: "created", label: "Created by me" },
            { value: "edit", label: "Can edit" },
            { value: "read", label: "Read only" },
          ]}
        />
      </div>
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
      <TechText className="ControlBarLabel text-white/70">
        Order by:
      </TechText>

      <div className="ControlSelect">
        <SelectBox
          value={orderBy}
          onChange={setOrderBy}
          options={[
            { value: "creation", label: "Created date" },
            { value: "modification", label: "Modified date" },
            { value: "name", label: "Name" },
          ]}
        />
      </div>
    </div>
  );
}

type SearchBoxProps = {
  search: string;
  setSearch: (value: string) => void;
};

function DocumentSearch({ search, setSearch }: SearchBoxProps) {
  return (
    <div className="SearchBox">
      <InputBox
        type="search"
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
  onHome: () => void;
  filter: string;
  setFilter: (value: string) => void;
};

export default function ControlBar({ search, setSearch, order, setOrder, filter, setFilter, onHome }: ControlBarProps) {
  return (
    <div className="ControlBar">
      <Button
        variant="outline"
        compact
        className="ControlBarHome"
        onClick={onHome}
        aria-label="Go to dashboard home"
      >
        <House size={18} aria-hidden="true" />
      </Button>

      <FilterBox filter={filter} setFilter={setFilter} />
      <OrderBox orderBy={order} setOrderBy={setOrder} />
      <DocumentSearch search={search} setSearch={setSearch}/>
    </div>
  );
}
