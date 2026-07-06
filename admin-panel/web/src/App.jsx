import { useEffect, useState } from "react";
import { getMe, login, logout } from "./api.js";
import Dashboard from "./pages/Dashboard.jsx";
import IssueReturn from "./pages/IssueReturn.jsx";
import Login from "./pages/Login.jsx";
import PatronSearch from "./pages/PatronSearch.jsx";

export default function App() {
  const [patron, setPatron] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    getMe().then((d) => setPatron(d.patron)).catch(() => {}).finally(() => setIsChecking(false));
  }, []);

  const handleLogin = async (userid, password) => {
    const d = await login(userid, password);
    setPatron(d.patron);
    setPage("dashboard");
  };

  const handleLogout = async () => {
    await logout();
    setPatron(null);
  };

  if (isChecking) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!patron) return <Login onLogin={handleLogin} />;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">KRC Admin</span>
          <nav className="header-nav">
            <button className={page === "dashboard" ? "nav-active" : ""} onClick={() => setPage("dashboard")}>Dashboard</button>
            <button className={page === "patrons" ? "nav-active" : ""} onClick={() => setPage("patrons")}>Patrons</button>
            <button className={page === "circulation" ? "nav-active" : ""} onClick={() => setPage("circulation")}>Issue / Return</button>
          </nav>
        </div>
        <div className="header-right">
          <span className="header-user">{patron.surname || patron.userid}</span>
          <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      <main className="app-main">
        {page === "dashboard"    && <Dashboard onNavigate={setPage} />}
        {page === "patrons"      && <PatronSearch />}
        {page === "circulation"  && <IssueReturn />}
      </main>
    </div>
  );
}
