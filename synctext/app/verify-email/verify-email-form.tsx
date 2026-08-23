"use client";

import { useEffect, useRef, useState } from "react";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailForm({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = useState(
    token ? "" : "Missing token in verification link",
  );

  const started = useRef(false);

  useEffect(() => {
	if (!token || started.current) return ;
	started.current = true;

  // calls /api/auth/verify-email and either sets error or calls /dashboard
  async function verify() {
    setStatus("verifying");

    try {
      const res = await fetch(
        `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
      );

	  const data = await res.json().catch(() => null);
      if (!res.ok) {
		setMessage(data?.error ?? "Verification failed");
	    setStatus("error");
        return;
      }
	  setStatus("success");
    } catch {
      setMessage("Something went wrong. Please try again later");
      setStatus("error");
    }
  }

  verify();
  }, [token]);

  return (
    <main>
      <h1>Verify your email address</h1>
	  {status === "verifying" && <p>Confirming your email...</p>}
	  {status === "success" && (
		<>
		<p>Your email has been verified.</p>
		<a href="/auth?verified=1">Continue to login</a>
		</>
		)}
      {status === "error" && (
		<>
		<p className="error">{message}</p>
        <a href="/auth">Back to login</a>
		</>
      )}
    </main>
  );
}
