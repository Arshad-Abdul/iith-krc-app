import { useEffect, useState } from "react";
import { getCoverUrl, getNewArrivals, getRecentCheckouts, getStats, getStatus } from "../api.js";

const fmt = (dt) => dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDate = (dt) => dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const daysUntil = (dt) => dt ? Math.ceil((new Date(dt) - Date.now()) / 86400000) : null;

function StatusCard({ services, loading }) {
  return (
    <div className="status-card">
      <div className="status-card-title">System Status</div>
      <div className="status-list">
        {loading ? <span className="muted">Checking…</span> : services.map((s) => (
          <div key={s.label} className="status-item">
            <span className={`status-dot ${s.ok ? "green" : "red"}`} />
            <span className="status-label">{s.label}</span>
            <span className="status-ms">{s.ok ? `${s.ms}ms` : s.error || "down"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [services, setServices] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getRecentCheckouts()])
      .then(([s, r]) => { setStats(s); setRecent(Array.isArray(r) ? r : []); })
      .catch(() => {})
      .finally(() => setLoading(false));

    getStatus()
      .then((d) => setServices(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setStatusLoading(false));

    getNewArrivals(12)
      .then(setArrivals)
      .catch(() => {});
  }, []);

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>

      <div className="dashboard-top">
        <div style={{ flex: 1 }}>
          <div className="stat-row">
            <div className="stat-card accent">
              <div className="stat-value">{loading ? "…" : stats?.active_checkouts?.toLocaleString() ?? "—"}</div>
              <div className="stat-label">Active Checkouts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{loading ? "…" : stats?.total_patrons?.toLocaleString() ?? "—"}</div>
              <div className="stat-label">Registered Patrons</div>
            </div>
            <div className="stat-card cta" onClick={() => onNavigate("circulation")} style={{ cursor: "pointer" }}>
              <div className="stat-value">⇄</div>
              <div className="stat-label">Issue / Return</div>
            </div>
            <div className="stat-card cta" onClick={() => onNavigate("overdues")} style={{ cursor: "pointer" }}>
              <div className="stat-value">⚠</div>
              <div className="stat-label">View Overdues</div>
            </div>
          </div>
        </div>
        <StatusCard services={services} loading={statusLoading} />
      </div>

      {arrivals.length > 0 && (
        <>
          <h3 className="section-title">New Arrivals</h3>
          <div className="arrivals-grid">
            {arrivals.map((b) => (
              <div key={b.biblio_id} className="arrival-card">
                <img
                  src={getCoverUrl(b.biblio_id)}
                  alt=""
                  className="arrival-cover"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
                <div className="arrival-info">
                  <div className="arrival-title" title={b.title}>{b.title}</div>
                  {b.author && <div className="arrival-author">{b.author}</div>}
                  {b.accession_date && <div className="arrival-date">{fmtDate(b.accession_date)}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="section-title">Recent Checkouts</h3>
      {loading ? <p className="muted">Loading…</p> : recent.length === 0 ? <p className="muted">No data.</p> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Patron</th><th>Title</th><th>Checked Out</th><th>Due Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {recent.map((c) => {
                const days = daysUntil(c.due_date);
                const overdue = days !== null && days < 0;
                return (
                  <tr key={c.checkout_id}>
                    <td>{c.patron_id}</td>
                    <td style={{ maxWidth: 260 }}>
                      <div style={{ fontWeight: 500 }}>{c.title || `Item #${c.item_id}`}</div>
                      {c.author && <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.author}</div>}
                    </td>
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
