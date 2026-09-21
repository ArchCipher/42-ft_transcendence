export const FALLBACK = "Something went wrong. Please try again";

type AuthResult = {
  ok: boolean;
  fields?: Record<string, string[]>;
  error?: string;
  redirectTo?: string;
};
export async function authPost(url: string, body: object): Promise<AuthResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return {
    ok: res.ok,
    fields: data?.fields,
    error: data?.error,
    redirectTo: typeof data?.redirectTo === "string" ? data.redirectTo : undefined,
  };
}
