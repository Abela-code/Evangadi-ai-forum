import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import styles from "./Layout.module.css";
import { useState } from "react";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function toggleSidebar() {
    setSidebarOpen((open) => !open);
  }

  return (
    <div className={styles.appLayout}>
      <Sidebar isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          className={styles.sidebarOverlay}
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={styles.appMain}>
        <Navbar
          isMenuOpen={sidebarOpen}
          onMenuToggle={toggleSidebar}
          onNotificationsOpen={() => setSidebarOpen(false)}
        />

        <main className={styles.pageContent}>
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
