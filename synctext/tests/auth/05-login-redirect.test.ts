import { describe, it, expect } from "vitest";

// Mirrors the guard applied in synctext/app/auth/login-form.tsx:
//
//   const safe = redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
//     ? redirectTo
//     : "/dashboard";
//   router.push(safe);
//
// Kept inline (no React/Next import) so it runs in a plain node test env.
function safeRedirect(redirectTo: string | undefined | null): string {
  return redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : "/dashboard";
}

describe("login redirect guard (open-redirect prevention)", () => {
  it("keeps the default dashboard fallback", () => {
    expect(safeRedirect(undefined)).toBe("/dashboard");
    expect(safeRedirect(null)).toBe("/dashboard");
  });

  it("allows local paths", () => {
    expect(safeRedirect("/dashboard")).toBe("/dashboard");
    expect(safeRedirect("/doc/abc123")).toBe("/doc/abc123");
    expect(safeRedirect("/doc/a%20b")).toBe("/doc/a%20b");
  });

  it("blocks protocol-relative URLs (//host)", () => {
    expect(safeRedirect("//evil.com")).toBe("/dashboard");
    expect(safeRedirect("///evil.com")).toBe("/dashboard");
  });

  it("blocks absolute external URLs", () => {
    expect(safeRedirect("https://evil.com")).toBe("/dashboard");
    expect(safeRedirect("http://evil.com/phish")).toBe("/dashboard");
  });

  it("blocks backslash-host tricks", () => {
    expect(safeRedirect("\\evil.com")).toBe("/dashboard");
  });
});
