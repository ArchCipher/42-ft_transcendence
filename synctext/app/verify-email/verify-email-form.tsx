"use client";

import { useEffect, useRef, useState } from "react";

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
    <main>
      {status === "verifying" && <p>Confirming your email...</p>}
      {status === "success" && <p role="status">Your email has been verified.</p>}
      {status === "error" && <p className="FormError" role="alert">{error}</p>}
    </main>
  );
}
