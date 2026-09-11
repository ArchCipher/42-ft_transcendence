"use client";

import { useState } from "react";
import './Dashboard.css';
import AppBackground from "../../components/AppBackground";
import UserMenu from "./UserMenu";
import Navbar from "@/components/Navbar";
import BrandHeader from "@/components/BrandHeader";
import AppPanel from "@/components/AppPanel";
import Button from "@/components/Button";
import ControlBar from "./ControlBar";
import DocumentsDashboard from "./DocumentsDashboard";
import { Footer } from "@/components/Footer";

export default function MainPage() {

  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("creation"); // to order by creation, name, modification

  return (
    <AppBackground>
      <Navbar>
        <div className="DashboardNavActions">
          <Button variant="primary">
            Groups
          </Button>

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

// TODO: replace mock data with documents fetched from backend/database.