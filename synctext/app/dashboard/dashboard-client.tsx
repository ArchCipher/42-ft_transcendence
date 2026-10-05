"use client";

import { useCallback, useEffect, useState } from "react";
import { usePoll } from "@/hooks/use-poll";

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
  // Tied to the group it happened in, so it never shows over another one.
  const [createError, setCreateError] = useState<{ groupId: string; text: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // The private space comes first from the API: shown by default, and once the
  // selected group is gone.
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups.at(0);

  // Groups and documents load together, then every 30 s; documents are filtered
  // by group. A failed load shows an error until the next one succeeds.
  const loadLists = useCallback(async (signal: AbortSignal) => {
    try {
      const [groupList, documentList] = await Promise.all([listGroups_api(signal), listDocuments_api(signal)]);
      setGroups(groupList);
      setDocuments(documentList);
      setLoadError("");
    } catch {
      if (!signal.aborted) setLoadError("Failed to load your documents. Please try again.");
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, []);
  const cancelPoll = usePoll(loadLists);

  // After a group action: a deleted or left group drops out, and the selection
  // falls back to the private space on its own.
  async function refreshGroups() {
    cancelPoll();
    setGroups(await listGroups_api());
  }

  // A local change to the documents wins over a poll answer that left before it.
  const updateDocuments: typeof setDocuments = (update) => {
    cancelPoll();
    setDocuments(update);
  };

  async function createDocument() {
    if (isCreatingDocument || !selectedGroup) return;

    const groupId = selectedGroup.id;
    setCreateError(null);
    setIsCreatingDocument(true);

    try {
      const createdDocument = await createDocument_api(groupId);
      router.push(`/doc/${encodeURIComponent(createdDocument.id)}`);
    } catch (error) {
      // The server says why, like every other action.
      setCreateError({
        groupId,
        text: error instanceof Error ? error.message : "Failed to create the document. Please try again.",
      });
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
            onGroupsChanged={refreshGroups}
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
                setDocuments={updateDocuments}
                isLoading={isLoading}
                loadError={loadError}
                search={search}
                order={order}
                createError={createError && createError.groupId === selectedGroup?.id ? createError.text : ""}
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
