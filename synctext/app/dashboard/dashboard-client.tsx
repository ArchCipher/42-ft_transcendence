"use client";

import { useEffect, useState } from "react";

import "./Dashboard.css";
import { useRouter } from "next/navigation";
import AppBackground from "@/app/components/background/AppBackground";
import ControlBar from "./ControlBar";
import AppPanel from "@/app/components/layout/AppPanel";
import { Footer } from "@/app/components/footer/Footer";
import DocumentsDashboard from "./DocumentsDashboard";
import DashboardSidebar from "./side-panel/DashboardSidebar";
import { TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import { createDocument_api, listDocuments_api } from "./document/document";
import { groupLabel, listGroups_api } from "./group/group";
import { Menu } from "lucide-react";
import UserNavbar from "../components/navigation/UserNavbar";
import type { DocumentSummary } from "@/lib/documents/documents";
import type { GroupSummary } from "@/lib/groups/types";

type UserProps = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

export default function DashboardClient({ userId, username, avatarUrl }: UserProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("creation"); // to order by creation, name, modification
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [createError, setCreateError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // The private space comes first from the API: shown by default, and once the
  // selected group is gone.
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups.at(0);

  // Groups and documents load together; documents are then filtered by group.
  useEffect(() => {
    const controller = new AbortController();

    Promise.all([listGroups_api(controller.signal), listDocuments_api(controller.signal)])
      .then(([groupList, documentList]) => {
        setGroups(groupList);
        setDocuments(documentList);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError("Failed to load your documents. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  async function createDocument() {
    if (isCreatingDocument || !selectedGroup) return;

    setCreateError("");
    setIsCreatingDocument(true);

    try {
      const createdDocument = await createDocument_api(selectedGroup.id);
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
	  <UserNavbar username={username} avatarUrl={avatarUrl}/>

      <div className="DashboardPage">
        <div className="DashboardLayout">

          <div className="DashboardControls">
            <AppPanel className="DashboardControlsPanel">
              <ControlBar
                search={search}
                setSearch={setSearch}
                order={order}
                setOrder={setOrder}
                onHome={() => setSelectedGroupId(null)}
              />
            </AppPanel>
          </div>

          <DashboardSidebar
            userId={userId}
            groups={groups}
            selectedGroupId={selectedGroup?.id ?? null}
            onSelectGroup={setSelectedGroupId}
            isOpen={sidebarOpen}
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
                  {selectedGroup ? groupLabel(selectedGroup) : ""}
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
                userId={userId}
                isPrivateSpace={selectedGroup?.isPrivateSpace ?? true}
                documents={documents.filter((doc) => doc.groupId === selectedGroup?.id)}
                setDocuments={setDocuments}
                isLoading={isLoading}
                loadError={loadError}
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
