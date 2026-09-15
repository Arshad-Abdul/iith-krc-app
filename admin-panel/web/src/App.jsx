import { useEffect, useState } from "react";
import { getMe, login, logout } from "./api.js";
import krcLogo from "./assets/krc-logo.png";
import Dashboard from "./pages/Dashboard.jsx";
import IssueReturn from "./pages/IssueReturn.jsx";
import Login from "./pages/Login.jsx";
import PatronSearch from "./pages/PatronSearch.jsx";
import Overdues from "./pages/Overdues.jsx";
import Catalog from "./pages/Catalog.jsx";
import Events from "./pages/Events.jsx";
import AppContent from "./pages/AppContent.jsx";
import DDSManager from "./pages/DDSManager.jsx";
import OccupancyManager from "./pages/OccupancyManager.jsx";
import BroadcastNotifications from "./pages/BroadcastNotifications.jsx";
import AppDownloads from "./pages/AppDownloads.jsx";
import KioskGate from "./pages/KioskGate.jsx";

export default function App() {
  const getInitialPage = () => {
    const isLocked = localStorage.getItem("krc_kiosk_lock") === "true";
    const hash = window.location.hash || "";
    if (isLocked || hash.startsWith("#/kiosk") || window.location.pathname.includes("/kiosk")) {
      return "kiosk";
    }
    if (hash.startsWith("#/")) {
      const target = hash.slice(2);
      if (target) return target;
    }
    return localStorage.getItem("krc_admin_page") || "dashboard";
  };

  const [patron, setPatron] = useState(null);
  const [page, setPage] = useState(getInitialPage);
  const [isChecking, setIsChecking] = useState(true);
  const [kioskFullscreen, setKioskFullscreen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("krc_admin_theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("krc_admin_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    getMe().then((d) => setPatron(d.patron)).catch(() => {}).finally(() => setIsChecking(false));
  }, []);

  // Trap browser Back / Forward buttons while in Kiosk mode
  useEffect(() => {
    if (page === "kiosk") {
      localStorage.setItem("krc_kiosk_lock", "true");
      if (window.location.hash !== "#/kiosk") {
        window.history.replaceState({ kiosk: true }, "", "#/kiosk");
      }

      const handlePopState = () => {
        if (localStorage.getItem("krc_kiosk_lock") === "true") {
          window.history.pushState({ kiosk: true }, "", "#/kiosk");
          setPage("kiosk");
        }
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [page]);

  useEffect(() => {
    const onHashChange = () => {
      const isLocked = localStorage.getItem("krc_kiosk_lock") === "true";
      const hash = window.location.hash || "";
      if (isLocked || hash.startsWith("#/kiosk") || window.location.pathname.includes("/kiosk")) {
        setPage("kiosk");
        if (window.location.hash !== "#/kiosk") {
          window.history.replaceState({ kiosk: true }, "", "#/kiosk");
        }
      } else if (hash.startsWith("#/")) {
        const target = hash.slice(2);
        if (target) setPage(target);
      } else {
        setPage("dashboard");
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigateTo = (newPage) => {
    setPage(newPage);
    window.location.hash = `#/${newPage}`;
    if (newPage === "kiosk") {
      localStorage.setItem("krc_kiosk_lock", "true");
    } else {
      localStorage.removeItem("krc_kiosk_lock");
      localStorage.setItem("krc_admin_page", newPage);
    }
  };

  const handleExitKiosk = () => {
    localStorage.removeItem("krc_kiosk_lock");
    setKioskFullscreen(false);
    navigateTo("dashboard");
  };

  const handleLogin = async (userid, password) => {
    const d = await login(userid, password);
    setPatron(d.patron);
    const initial = getInitialPage();
    navigateTo(initial);
  };

  const handleLogout = async () => {
    await logout();
    setPatron(null);
  };

  if (isChecking) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!patron) return <Login onLogin={handleLogin} />;

  const showHeader = page !== "kiosk";

  return (
    <div className="app" data-theme={theme}>
      {showHeader && (
        <header className="app-header">
          <div className="header-left">
            <div className="header-logo-wrap">
              <div className="header-logo-badge">
                <img src={krcLogo} alt="KRC Logo" className="header-logo-img" />
              </div>
              <span className="header-logo">Admin Console</span>
            </div>
            <nav className="header-nav">
              <button className={page === "dashboard"     ? "nav-active" : ""} onClick={() => navigateTo("dashboard")}>Dashboard</button>
              <button className={page === "dds"           ? "nav-active" : ""} onClick={() => navigateTo("dds")}>DDS / ILL</button>
              <button className={page === "occupancy"     ? "nav-active" : ""} onClick={() => navigateTo("occupancy")}>Occupancy</button>
              <button className={page === "broadcasts"    ? "nav-active" : ""} onClick={() => navigateTo("broadcasts")}>Broadcasts</button>
              <button className={page === "app-builds"    ? "nav-active" : ""} onClick={() => navigateTo("app-builds")}>App Builds</button>
              <button className={page === "kiosk"         ? "nav-active" : ""} onClick={() => navigateTo("kiosk")}>Kiosk Gate 🔒</button>
              <button className={page === "events"        ? "nav-active" : ""} onClick={() => navigateTo("events")}>Events</button>
              <button className={page === "app-content"   ? "nav-active" : ""} onClick={() => navigateTo("app-content")}>App Content</button>
              <button className={page === "patrons"       ? "nav-active" : ""} onClick={() => navigateTo("patrons")}>Patrons</button>
              <button className={page === "circulation"   ? "nav-active" : ""} onClick={() => navigateTo("circulation")}>Issue / Return</button>
              <button className={page === "overdues"      ? "nav-active" : ""} onClick={() => navigateTo("overdues")}>Overdues</button>
              <button className={page === "catalog"       ? "nav-active" : ""} onClick={() => navigateTo("catalog")}>Catalog</button>
            </nav>
          </div>
          <div className="header-right">
            {/* Theme Toggle Button */}
            <button 
              className="btn-theme-toggle" 
              onClick={toggleTheme}
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
            >
              {theme === "light" ? "Dark Theme" : "Light Theme"}
            </button>

            <span className="header-user">
              {patron.firstname || patron.surname || "Superlibrarian"}
            </span>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 13 }}>
              Sign Out
            </button>
          </div>
        </header>
      )}

      <main className="app-main" style={{ padding: page === "kiosk" ? "20px" : undefined }}>
        {page === "dashboard"     && <Dashboard onNavigate={navigateTo} />}
        {page === "dds"           && <DDSManager />}
        {page === "occupancy"     && <OccupancyManager />}
        {page === "broadcasts"    && <BroadcastNotifications />}
        {page === "app-builds"    && <AppDownloads />}
        {page === "kiosk"         && (
          <KioskGate 
            onExit={handleExitKiosk}
            isFullscreen={kioskFullscreen}
            onToggleFullscreen={() => setKioskFullscreen(!kioskFullscreen)}
          />
        )}
        {page === "events"        && <Events />}
        {page === "app-content"   && <AppContent />}
        {page === "patrons"       && <PatronSearch />}
        {page === "circulation"   && <IssueReturn />}
        {page === "overdues"      && <Overdues />}
        {page === "catalog"       && <Catalog />}
      </main>
    </div>
  );
}
