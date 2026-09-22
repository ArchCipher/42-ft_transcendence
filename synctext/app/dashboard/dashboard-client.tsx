"use client";

import { useEffect, useState } from "react";

import "./Dashboard.css";
import { useRouter } from "next/navigation";
import AppBackground from "@/app/components/background/AppBackground";
import Navbar from "@/app/components/navigation/Navbar";
import UserMenu from "./UserMenu";
import BrandHeader from "@/app/components/header/BrandHeader";
import ControlBar from "./ControlBar";
import AppPanel from "@/app/components/layout/AppPanel";
import { Footer } from "@/app/components/footer/Footer";
import DocumentsDashboard from "./DocumentsDashboard";
import DashboardSidebar from "./side-panel/DashboardSidebar";
import { TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import { createDocument_api } from "./document/document";
import { Menu } from "lucide-react";

export type UserProps = {
  username: string;
};

type SelectedGroup = {
    id: string;
    name: string;
  } | null;

export default function DashboardClient({ username }: UserProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("creation"); // to order by creation, name, modification
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup>(null);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [createError, setCreateError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function createDocument() {
    if (isCreatingDocument) return;

    setCreateError("");
    setIsCreatingDocument(true);

    try {
      const createdDocument = await createDocument_api();
      router.push(`/doc/${encodeURIComponent(createdDocument.id)}`);
    } catch {
      setCreateError("Failed to create the document. Please try again.");
    } finally {
      setIsCreatingDocument(false);
    }
  }

  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) router.refresh();
    }

    window.addEventListener("pageshow", handlePageShow);

    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  return (
    <AppBackground>
      <Navbar mobileMenu={false}>
        <div className="DashboardNavActions">
          <UserMenu username={username} />
        </div>
      </Navbar>

      <BrandHeader />

      <div className="DashboardPage">
        <div className="DashboardLayout">

          <div className="DashboardControls">
            <AppPanel className="DashboardControlsPanel">
              <ControlBar
                search={search}
                setSearch={setSearch}
                order={order}
                setOrder={setOrder}
                onHome={() => setSelectedGroup(null)}
              />
            </AppPanel>
          </div>

          <DashboardSidebar
            selectedGroup={selectedGroup}
            onSelectGroup={setSelectedGroup}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {sidebarOpen && (
            <button
              type="button"
              className="DashboardSidebarBackdrop"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <AppPanel className="DashboardPanel">

            <div className="DashboardFixedBar">
              <div className="DashboardFixedBarInner">

                <TechText className="DashboardViewTitle">
                  {selectedGroup?.name ?? "Mother Ship"}
                </TechText>

                <Button
                  variant="outline"
                  compact
                  className="DashboardSidebarToggle"
                  onClick={() => setSidebarOpen((open) => !open)}
                >
                  <Menu size={18} />
                </Button>

              </div>
            </div>

            <div className="DashboardScrollArea">
              <DocumentsDashboard
                search={search}
                order={order}
                createError={createError}
                onCreateDocument={() => void createDocument()}
                isCreatingDocument={isCreatingDocument}
              />
            </div>

          </AppPanel>

        </div>

        <Footer />
      </div>
    </AppBackground>
  );
}
