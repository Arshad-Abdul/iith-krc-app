import { useEffect, useState } from "react";
import { getRecentCheckouts, getStats } from "../api.js";

const fmt = (dt) => dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const daysUntil = (dt) => dt ? Math.ceil((new Date(dt) - Date.now()) / 86400000) : null;

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getRecentCheckouts()])
      .then(([s, r]) => { setStats(s); setRecent(Array.isArray(r) ? r : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>

      <div className="stat-row">
        <div className="stat-card accent">
          <div className="stat-value">{loading ? "…" : stats?.active_checkouts?.toLocaleString() ?? "—"}</div>
          <div className="stat-label">Active Checkouts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{loading ? "…" : stats?.total_patrons?.toLocaleString() ?? "—"}</div>
          <div className="stat-label">Registered Patrons</div>
        </div>
        <div className="stat-card cta" onClick={() => onNavigate("circulation")} style={{cursor:"pointer"}}>
          <div className="stat-value">⇄</div>
          <div className="stat-label">Issue / Return</div>
        </div>
        <div className="stat-card cta" onClick={() => onNavigate("patrons")} style={{cursor:"pointer"}}>
          <div className="stat-value">🔍</div>
          <div className="stat-label">Search Patron</div>
        </div>
      </div>

      <h3 className="section-title">Recent Checkouts</h3>
      {loading ? <p className="muted">Loading…</p> : recent.length === 0 ? <p className="muted">No data.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Patron ID</th><th>Item ID</th><th>Checked Out</th><th>Due Date</th><th>Status</th></tr></thead>
            <tbody>
              {recent.map((c) => {
                const days = daysUntil(c.due_date);
                const overdue = days !== null && days < 0;
                return (
                  <tr key={c.checkout_id}>
                    <td>{c.patron_id}</td>
                    <td>{c.item_id}</td>
                    <td>{fmt(c.checkout_date)}</td>
                    <td>{fmt(c.due_date)}</td>
                    <td><span className={overdue ? "badge red" : "badge green"}>{overdue ? `Overdue ${Math.abs(days)}d` : `${days}d left`}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
