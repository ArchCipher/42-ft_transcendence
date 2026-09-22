"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import Box from "@/app/components/form/Box";
import styles from "./SelectBox.module.css";

type SelectBoxProps = {
  value: string;
  options: {
    value: string;
    label: string;
  }[];
  onChange: (value: string) => void;
};

export default function SelectBox({
  value,
  options,
  onChange,
}: SelectBoxProps) {
  const [open, setOpen] = useState(false);

  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selected = options.find(
    (option) => option.value === value
  );

  return (
    <div ref={selectRef} className={styles.select}>
      <Box>
        <button
          type="button"
          className={styles.button}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {selected?.label}
          <ChevronDown size={16} />
        </button>
      </Box>

      {open && (
        <div className={styles.menu}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={styles.option}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}