import { notFound } from "next/navigation";
import AppBackground from "@/components/AppBackground";
import AppPanel from "@/components/AppPanel";
import BrandHeader from "@/components/BrandHeader";
import { Footer } from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { BodyText } from "@/components/Typography";

const legalDocuments = {
  terms: "Terms",
  privacy: "Privacy",
  cookies: "Cookies",
  accessibility: "Accessibility",
} as const;

type LegalDocument = keyof typeof legalDocuments;

function isLegalDocument(document: string): document is LegalDocument {
  return document in legalDocuments;
}

export function generateStaticParams() {
  return Object.keys(legalDocuments).map((document) => ({ document }));
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;

  if (!isLegalDocument(document)) {
    notFound();
  }

  return (
    <AppBackground>
      <Navbar />
      <BrandHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <AppPanel className="w-full max-w-xl p-8 text-center">
          <BodyText>{legalDocuments[document]}</BodyText>
          <BodyText className="mt-4">Coming soon...</BodyText>
        </AppPanel>
      </main>
      <Footer />
    </AppBackground>
  );
}
