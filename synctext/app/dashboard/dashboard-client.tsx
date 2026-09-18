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
import { TechText } from "@/components/Typography";
import { createDocument_api } from "./document/document";
import { House } from "lucide-react";
import Button from "@/components/Button";

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
            <ControlBar
              search={search}
              setSearch={setSearch}
              order={order}
              setOrder={setOrder}
            />
          </div>

          <DashboardSidebar
            selectedGroup={selectedGroup}
            onSelectGroup={setSelectedGroup}
          />

          <AppPanel className="DashboardPanel">

            <div className="DashboardFixedBar">
              <div className="DashboardFixedBarInner">

                <Button
                  variant="outline"
                  compact
                  className="DashboardHomeButton"
                  onClick={() => setSelectedGroup(null)}
                >
                  <House size={18} />
                </Button>

                <TechText className="DashboardViewTitle">
                  {selectedGroup?.name ?? "Mother Ship"}
                </TechText>

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
