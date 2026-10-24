import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/student/Sidebar";
import Topbar from "../components/student/Topbar";

export default function StudentLayout() {
  // On small screens the sidebar is a drawer that the Topbar menu button opens
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-background min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="relative pt-16 bg-background min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}