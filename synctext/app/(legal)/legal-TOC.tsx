"use client";

import { usePathname } from "next/navigation";

const tocSections: Record<
  string,
  { label: string; sections: { id: string; title: string }[] }
> = {
  "/terms": {
    label: "Terms of Service",
    sections: [
      { id: "acceptance-of-terms", title: "1. Acceptance of terms" },
      { id: "the-service", title: "2. The Service" },
      { id: "eligibility", title: "3. Eligibility" },
      { id: "accounts", title: "4. Accounts" },
      { id: "acceptable-use", title: "5. Acceptable use" },
      { id: "content-and-ownership", title: "6. Content and ownership" },
      {
        id: "organizations-and-sharing",
        title: "7. Organizations and sharing",
      },
      {
        id: "termination-and-suspension",
        title: "8. Termination and suspension",
      },
      { id: "disclaimer-of-warranties", title: "9. Disclaimer of warranties" },
      { id: "limitation-of-liability", title: "10. Limitation of liability" },
      { id: "changes-to-the-service-and-these-terms", title: "11. Changes" },
      { id: "governing-law", title: "12. Governing law" },
    ],
  },
  "/privacy": {
    label: "Privacy Policy",
    sections: [
      { id: "who-we-are", title: "1. Who we are" },
      { id: "information-we-collect", title: "2. Information we collect" },
      { id: "why-and-how-we-use-your-data", title: "3. Legal bases" },
      { id: "cookies", title: "4. Cookies" },
      { id: "sharing-of-data", title: "5. Sharing of data" },
      {
        id: "international-data-transfers",
        title: "6. International transfers",
      },
      { id: "data-retention-and-deletion", title: "7. Data retention" },
      { id: "security", title: "8. Security" },
      { id: "your-rights", title: "9. Your rights" },
      { id: "children", title: "10. Children" },
      { id: "data-minimisation", title: "11. Data minimisation" },
      { id: "changes-to-this-policy", title: "12. Changes to this policy" },
    ],
  },
  "/cookies": {
    label: "Cookie Policy",
    sections: [
      { id: "what-are-cookies", title: "What are cookies?" },
      { id: "how-synctext-uses-cookies", title: "How synctext uses cookies" },
      { id: "what-we-do-not-do", title: "What we do NOT do" },
      { id: "other-tokens", title: "Other tokens (not cookies)" },
      { id: "your-choices", title: "Your choices" },
      { id: "changes-to-this-policy", title: "Changes to this policy" },
    ],
  },
  "/accessibility": {
    label: "Accessibility",
    sections: [
      { id: "our-commitment", title: "Our commitment" },
      { id: "what-we-have-done", title: "What we have done" },
      { id: "known-limitations", title: "Known limitations" },
    ],
  },
};

export default function LegalTOC() {
  const pathname = usePathname();
  const key = Object.keys(tocSections).find((k) => pathname.startsWith(k));
  if (!key) return null;
  const toc = tocSections[key];

  return (
    <nav className="legal-toc">
      <p className="legal-toc-label">{toc.label}</p>
      <ul>
        {toc.sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`}>{s.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
