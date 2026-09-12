"use client";

import { useState } from "react";
import './Dashboard.css';
import AppBackground from "../../components/AppBackground";
import UserMenu from "./UserMenu";
import Navbar from "@/components/Navbar";
import BrandHeader from "@/components/BrandHeader";
import AppPanel from "@/components/AppPanel";
import ControlBar from "./ControlBar";
import DocumentsDashboard from "./DocumentsDashboard";
import { Footer } from "@/components/Footer";

export default function MainPage() {

  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("creation");

  return (
    <AppBackground>
      <Navbar mobileMenu={false}>
        <div className="DashboardNavActions">
          <UserMenu username="Username" />
        </div>
      </Navbar>

      <BrandHeader />

      <div className="MainPage">
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