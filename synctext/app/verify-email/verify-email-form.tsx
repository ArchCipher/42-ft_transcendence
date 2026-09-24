"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DisplayText, TechText } from "@/app/components/typography/Typography";
import ErrorNote from "../components/form/ErrorNote";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailForm({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [error, setError] = useState(
    token ? "" : "Missing token in verification link",
  );

  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    // calls /api/auth/verify-email and either sets error or success
    async function verify() {
      setStatus("verifying");

      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
        );

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? "Verification failed");
          setStatus("error");
          return;
        }
        setStatus("success");
      } catch {
        setError("Something went wrong. Please try again later");
        setStatus("error");
      }
    }

    verify();
  }, [token]);

  return (
    <section className="AuthForm" aria-live="polite">
      <h1 className="AuthFormTitle">
        <DisplayText>
          {status === "success" ? "You’re verified." : "Confirm your email."}
        </DisplayText>
      </h1>
      {status === "verifying" && (
        <p className="AuthStatus">Confirming your email…</p>
      )}
      {status === "success" && (
        <>
          <p className="AuthStatus" role="status">Your email is confirmed.</p>
          <div className="AuthLinks"><Link href="/auth"><TechText className="text-xs">Continue to log in</TechText></Link></div>
        </>
      )}
      {status === "error" && (
        <>
          <ErrorNote>{error}</ErrorNote>
          <div className="AuthLinks"><Link href="/auth"><TechText className="text-xs">Back to log in</TechText></Link></div>
        </>
      )}
    </section>
  );
}
