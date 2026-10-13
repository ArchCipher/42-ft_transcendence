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
  const [filter, setFilter] = useState("all");
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("selectedGroupId") : null);
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
  // by group. Each answer applies on its own; a failure shows an error until the
  // next poll succeeds, over the lists already loaded.
  const loadLists = useCallback(async (signal: AbortSignal) => {
    const [groupResult, documentResult] = await Promise.allSettled([
      listGroups_api(signal),
      listDocuments_api(signal),
    ]);
    if (signal.aborted) return;

    if (groupResult.status === "fulfilled") setGroups(groupResult.value);
    if (documentResult.status === "fulfilled") setDocuments(documentResult.value);
    const failed = groupResult.status === "rejected" || documentResult.status === "rejected";
    setLoadError(failed ? "Failed to refresh your groups and documents." : "");
    setIsLoading(false);
  }, []);
  const cancelPoll = usePoll(loadLists);

  function selectGroup(groupId: string) {
    setSelectedGroupId(groupId);
    sessionStorage.setItem("selectedGroupId", groupId);
  }

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
                filter={filter}
                setFilter={setFilter}
                onHome={() => { setSelectedGroupId(null);
                                sessionStorage.removeItem("selectedGroupId"); }}
              />
            </AppPanel>
          </div>

          <DashboardSidebar
            userId={userId}
            groups={groups}
            selectedGroupId={selectedGroup?.id ?? null}
            onSelectGroup={selectGroup}
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

                <button
                  type="button"
                  className="DashboardSidebarToggle"
                  onClick={() => setSidebarOpen((open) => !open)}
                  aria-label="Toggle sidebar"
                >
                  <Menu size={18} aria-hidden="true" />
                </button>

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
                filter={filter}
                createError={createError && createError.groupId === selectedGroup?.id ? createError.text : ""}
                onCreateDocument={() => void createDocument()}
                isCreatingDocument={isCreatingDocument}
              />
            </div>

          </AppPanel>

        </div>
      </div>
	  <Footer />
    </AppBackground>
  );
}
