"use client";

import Link from "next/link";
import { User } from "lucide-react";

import { DisplayText, TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import InputBox from "@/app/components/form/InputBox";
import Image from "next/image";
import { useRef, useState } from "react";
import ConfirmWindow from "@/app/components/feedback/ConfirmWindow";

export default function ProfileForm() {
  const [username, setUsername] = useState("username");
  const [email, setEmail] = useState("email@example.com");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="ProfileBox">
      <h2 className="ProfileTitle">
        <DisplayText>Profile</DisplayText>
      </h2>

      <div className="ProfileAvatar">
        <button
          type="button"
          className="ProfileAvatarButton"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Change profile picture"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Profile avatar"
              width={72}
              height={72}
              className="ProfileAvatarImage"
              unoptimized
            />
          ) : (
            <User size={48} />
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setAvatarUrl(URL.createObjectURL(file));
          }}
        />
      </div>

      <label  htmlFor="profile-username">
        <TechText className="text-xs">Username</TechText>
      </label>

      <InputBox
        id="profile-username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <label htmlFor="profile-email">
        <TechText className="text-xs">Email</TechText>
      </label>

      <InputBox
        id="profile-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Link href="/password-reset">
        <TechText className="text-xs text-[#6fd3ff]">
          Change password
        </TechText>
      </Link>

      <Button href="/dashboard">
        Looks good
      </Button>

      <div className="ProfileDeleteButton">
      <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
        Delete account
      </Button>
      </div>

      {showDeleteConfirm && (
        <ConfirmWindow
          title="Delete account?"
          message="This action cannot be undone."
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            // TODO delete account
          }}
        />
      )}
    </div>
  );
}
