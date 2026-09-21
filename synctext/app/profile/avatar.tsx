"use client";

import { useState, useRef, type ChangeEvent } from "react";
import Image from "next/image";

import styles from "./Profile.module.css";
import { TechText } from "@/app/components/typography/Typography";
import type { Status } from "./profile-client";

const FALLBACK = "Something went wrong. Please try again.";

type AvatarProps = {
  initialAvatarUrl: string | null;
  username: string;
  onStatus: (status: Status) => void;
};

export default function Avatar({
  initialAvatarUrl,
  username,
  onStatus,
}: AvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialLetter = (username[0] ?? "?").toUpperCase();

  async function saveAvatar(next: string | null) {
    setAvatarBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: next }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        onStatus({ kind: "error", text: data?.error ?? FALLBACK });
        return;
      }

      setAvatarUrl(next);
      onStatus({
        kind: "saved",
        text: next ? "Avatar updated." : "Avatar removed.",
      });
    } catch {
      onStatus({ kind: "error", text: FALLBACK });
    } finally {
      setAvatarBusy(false);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onStatus({ kind: "error", text: "Please choose an image." });
      return;
    }
    if (file.size > 1_500_000) {
      onStatus({ kind: "error", text: "Image too large (max 1.5 MB)." });
      return;
    }

    onStatus(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (dataUrl) void saveAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className={styles.avatarWrap}>
      <button
        type="button"
        className={styles.avatar}
        onClick={() => setShowAvatarMenu((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={showAvatarMenu}
        aria-label="Change your avatar"
        disabled={avatarBusy}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={72}
            height={72}
            className={styles.avatarImg}
            unoptimized
          />
        ) : (
          <span className={styles.avatarInitial}>{initialLetter}</span>
        )}
        <span className={styles.avatarOverlay} aria-hidden="true">
          Change
        </span>
      </button>

      {showAvatarMenu && (
        <>
          <div
            className={styles.avatarMenuBackdrop}
            onClick={() => setShowAvatarMenu(false)}
          />
          <div
            className={styles.avatarMenu}
            role="menu"
            aria-label="Avatar options"
          >
            <button
              type="button"
              role="menuitem"
              className={styles.avatarMenuItem}
              onClick={() => {
                setShowAvatarMenu(false);
                fileInputRef.current?.click();
              }}
            >
              <TechText className="text-xs">Upload image</TechText>
            </button>
            {avatarUrl && (
              <button
                type="button"
                role="menuitem"
                className={styles.avatarMenuItem}
                onClick={() => {
                  setShowAvatarMenu(false);
                  void saveAvatar(null);
                }}
              >
                <TechText className="text-xs">Remove avatar</TechText>
              </button>
            )}
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className={styles.fileInput}
        onChange={handleChange}
      />
    </div>
  );
}
