"use client";

import { useEffect, useState } from "react";

import "./Dashboard.css";
import { useRouter } from "next/navigation";
import AppBackground from "@/components/AppBackground";
import Navbar from "@/components/Navbar";
import UserMenu from "./UserMenu";
import BrandHeader from "@/components/BrandHeader";
import ControlBar from "./ControlBar";
import AppPanel from "@/components/AppPanel";
import { Footer } from "@/components/Footer";
import DocumentsDashboard from "./DocumentsDashboard";

export type UserProps = {
  username: string;
};

export default function DashboardClient({ username }: UserProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("creation"); // to order by creation, name, modification

  // cache shouldn't show the dashboard page. It should always run requireSession()
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
        <ControlBar
          search={search}
          setSearch={setSearch}
          order={order}
          setOrder={setOrder}
        />

        <AppPanel className="DashboardPanel">
          <DocumentsDashboard search={search} order={order} />
        </AppPanel>
        <Footer />
      </div>
    </AppBackground>
  );
}
