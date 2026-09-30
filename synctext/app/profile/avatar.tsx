"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Menu } from "@base-ui/react/menu";

import { TechText } from "@/app/components/typography/Typography";
import styles from "./Profile.module.css";
import "@/app/components/navigation/NavMenu.css";
import type { Status } from "./profile-client";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
} from "@synctext/shared/constants";

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
  const router = useRouter();

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
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
      router.refresh();
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
    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
      onStatus({
        kind: "error",
        text: `Use one of: ${AVATAR_MIME_TYPES.join(", ")}`,
      });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      onStatus({
        kind: "error",
        text: `Image too large (max ${Math.round(AVATAR_MAX_BYTES / 1024)} KB).`,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (dataUrl) {
        onStatus(null);
        void saveAvatar(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className={styles.avatarWrap}>
      <Menu.Root modal={false}>
        <Menu.Trigger
          className={styles.avatar}
          aria-label="Change your avatar"
          disabled={avatarBusy}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              fill
              sizes="72px"
              className={styles.avatarImg}
              unoptimized
            />
          ) : (
            <span className={styles.avatarInitial}>{initialLetter}</span>
          )}
          <span className={styles.avatarOverlay} aria-hidden="true">
            Change
          </span>
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner className="NavMenuPositioner" align="end">
            <Menu.Popup className="NavMenuPanel" aria-label="Avatar options">
              <Menu.Item
                className="NavMenuItem"
                onClick={() => fileInputRef.current?.click()}
              >
                <TechText className="text-sm max-[900px]:text-xs">
                  Upload image
                </TechText>
              </Menu.Item>
              {avatarUrl && (
                <Menu.Item
                  className="NavMenuItem"
                  onClick={() => void saveAvatar(null)}
                >
                  <TechText className="text-sm max-[900px]:text-xs">
                    Remove avatar
                  </TechText>
                </Menu.Item>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

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
