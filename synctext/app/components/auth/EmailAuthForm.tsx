"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "@/app/auth/api";
import Button from "@/app/components/ui/Button";
import Field from "@/app/components/form/Field";
import { DisplayText, TechText } from "@/app/components/typography/Typography";
import ErrorNote from "@/app/components/form/ErrorNote";
import { emailRequestSchema } from "@/lib/auth/validation";

/*
Single-field "send an email to this address" form.

forgot-password, resend-verification and any future address-only auth endpoint
are the same component with different copy and endpoints: one email Field, one
submit Button, one Back link, and the same field-error/transport-error split.
*/

type EmailAuthFormProps = {
  endpoint: string;
  title: string;
  submitLabel: string;
  pendingLabel?: string;
  successPath: string;
};

export default function EmailAuthForm({
  endpoint,
  title,
  submitLabel,
  pendingLabel = "Sending...",
  successPath,
}: EmailAuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    setFieldErrors({});
	const parsed = emailRequestSchema.safeParse({ email });

    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;

      setFieldErrors({
        email: fields.email?.[0],
      });

      return;
    }
    setLoading(true);

    try {
      const { ok, fields, error } = await authPost(endpoint, { email });

      if (!ok) {
        if (fields) setFieldErrors({ email: fields.email?.[0] });
        else setError(error ?? FALLBACK);
        return;
      }

      router.push(successPath);
    } catch {
      setError(FALLBACK);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="AuthForm"
      onSubmit={async (e) => {
        e.preventDefault(); // don't reload the page
        await handleSubmit(); // handle it with JS
      }}
    >
      <h1 className="AuthFormTitle">
        <DisplayText>{title}</DisplayText>
      </h1>

      <Field
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        error={fieldErrors.email}
        autoComplete="email"
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button className="AuthSubmitButton" type="submit" disabled={loading}>
        {loading ? pendingLabel : submitLabel}
      </Button>
      <div className="AuthLinks AuthSingleLink">
        <Link href="/auth">
          <TechText className="text-xs">Back to log in</TechText>
        </Link>
      </div>
    </form>
  );
}
