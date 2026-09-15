import { useEffect, useState, useMemo } from "react";
import { getAppActivity, getCoverUrl, getNewArrivals, getRecentCheckouts, getStats, getStatus } from "../api.js";

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
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);

  // Login Activity Filter, Search & Pagination State
  const [loginSearch, setLoginSearch] = useState("");
  const [loginDateFilter, setLoginDateFilter] = useState("all");
  const [loginYearFilter, setLoginYearFilter] = useState("all");
  const [customDateFilter, setCustomDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const loadData = () => {
    Promise.all([getStats(), getRecentCheckouts()])
      .then(([s, r]) => { setStats(s); setRecent(Array.isArray(r) ? r : []); })
      .catch((e) => console.error("Stats err:", e))
      .finally(() => setLoading(false));

    getStatus().then(setServices).catch(() => {}).finally(() => setStatusLoading(false));
    getNewArrivals().then((d) => setArrivals(Array.isArray(d) ? d : [])).catch(() => {});
    getAppActivity().then(setActivity).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const rawLogins = activity?.recent_logins || [];

  // Dynamically extract available years from login timestamps
  const availableYears = useMemo(() => {
    const set = new Set();
    rawLogins.forEach((l) => {
      if (l.ts) {
        const yr = new Date(l.ts).getFullYear();
        if (!isNaN(yr)) set.add(yr);
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [rawLogins]);

  // Filter Logins by search query, year, and date
  const filteredLogins = useMemo(() => {
    return rawLogins.filter((l) => {
      const loginDate = new Date(l.ts);
      const loginTime = loginDate.getTime();
      const now = Date.now();

      // 1. Year Filter
      if (loginYearFilter !== "all") {
        if (loginDate.getFullYear() !== Number(loginYearFilter)) return false;
      }

      // 2. Custom Specific Date Filter (YYYY-MM-DD)
      if (customDateFilter) {
        const itemDateStr = loginDate.toISOString().slice(0, 10);
        if (itemDateStr !== customDateFilter) return false;
      }

      // 3. Quick Relative Date Filter
      if (loginDateFilter !== "all") {
        if (loginDateFilter === "today") {
          const midnight = new Date().setHours(0, 0, 0, 0);
          if (loginTime < midnight) return false;
        } else if (loginDateFilter === "7d") {
          if (loginTime < now - 7 * 86400000) return false;
        } else if (loginDateFilter === "30d") {
          if (loginTime < now - 30 * 86400000) return false;
        }
      }

      // 4. Search Query Filter
      if (loginSearch.trim()) {
        const q = loginSearch.toLowerCase().trim();
        const name = (l.name || "").toLowerCase();
        const card = (l.cardnumber || "").toLowerCase();
        const patronId = String(l.patron_id || "");
        const branch = (l.library_id || "").toLowerCase();
        return name.includes(q) || card.includes(q) || patronId.includes(q) || branch.includes(q);
      }
      return true;
    });
  }, [rawLogins, loginYearFilter, customDateFilter, loginDateFilter, loginSearch]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [loginSearch, loginDateFilter, loginYearFilter, customDateFilter, pageSize]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLogins.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLogins.length);
  const paginatedLogins = filteredLogins.slice(startIndex, endIndex);

  const exportLoginsCsv = () => {
    if (filteredLogins.length === 0) return alert("No login records match the current filters.");
    const headers = ["Patron ID", "Patron Name", "Card / Roll No", "Branch / Library", "Login Timestamp"];
    const rows = filteredLogins.map((l) => [
      l.patron_id,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${l.cardnumber || ''}"`,
      `"${l.library_id || ''}"`,
      `"${l.ts}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `krc_patron_logins_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

      {activity && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Library App Activity & Logins</h3>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={exportLoginsCsv} className="btn-emerald" style={{ padding: "6px 14px", fontSize: 13 }}>
                📥 Export Logins (CSV)
              </button>
              <button onClick={loadData} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 13 }}>
                ↻ Refresh
              </button>
            </div>
          </div>

          <div className="stat-row" style={{ marginBottom: 16 }}>
            <div className="stat-card accent">
              <div className="stat-value">{activity.active_sessions}</div>
              <div className="stat-label">Active Logged-in Devices</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{activity.logins_today}</div>
              <div className="stat-label">Logins Today</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{activity.total_logins_tracked}</div>
              <div className="stat-label">Total Logins Recorded</div>
            </div>
          </div>

          {/* Search, Year, Date and Pagination Filter Bar */}
          <div className="filter-bar-row" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <input
              type="text"
              placeholder="🔍 Search by patron name, card / roll no, or ID..."
              value={loginSearch}
              onChange={(e) => setLoginSearch(e.target.value)}
              style={{ flex: 1, minWidth: 240 }}
            />

            {/* Year Dropdown Filter */}
            <select
              value={loginYearFilter}
              onChange={(e) => setLoginYearFilter(e.target.value)}
              style={{ minWidth: 120 }}
              title="Filter by Year"
            >
              <option value="all">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>Year {yr}</option>
              ))}
            </select>

            {/* Quick Relative Date Range */}
            <select
              value={loginDateFilter}
              onChange={(e) => {
                setLoginDateFilter(e.target.value);
                if (e.target.value !== "all") setCustomDateFilter("");
              }}
              style={{ minWidth: 150 }}
              title="Filter by Date Range"
            >
              <option value="all">All Recorded Dates</option>
              <option value="today">Today Only</option>
              <option value="7d">Past 7 Days</option>
              <option value="30d">Past 30 Days</option>
            </select>

            {/* Specific Date Picker */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="date"
                value={customDateFilter}
                onChange={(e) => {
                  setCustomDateFilter(e.target.value);
                  if (e.target.value) setLoginDateFilter("all");
                }}
                style={{ padding: "8px 10px", fontSize: 13 }}
                title="Filter by Specific Date"
              />
              {customDateFilter && (
                <button
                  onClick={() => setCustomDateFilter("")}
                  className="btn-secondary"
                  style={{ padding: "6px 10px", fontSize: 12 }}
                  title="Clear Specific Date"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Page Size Selector */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ minWidth: 110 }}
              title="Rows per page"
            >
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>

          {filteredLogins.length > 0 ? (
            <div className="table-wrap" style={{ marginBottom: 28 }}>
              <table>
                <thead>
                  <tr>
                    <th>Patron Name</th>
                    <th>Card / Roll No.</th>
                    <th>Patron ID</th>
                    <th>Branch</th>
                    <th>Login Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogins.map((l, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{l.name || `Patron #${l.patron_id}`}</td>
                      <td style={{ color: "var(--accent-gold)", fontFamily: "monospace", fontWeight: 600 }}>{l.cardnumber || "—"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>#{l.patron_id}</td>
                      <td style={{ color: "var(--text-muted)" }}>{l.library_id || "IITHLIB"}</td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {new Date(l.ts).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table Footer with Pagination Controls */}
              <div style={{
                padding: "10px 16px",
                fontSize: 12,
                color: "var(--text-muted)",
                borderTop: "1px solid var(--border-color)",
                background: "var(--bg-card-alt)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12
              }}>
                <div>
                  Showing {startIndex + 1}–{endIndex} of {filteredLogins.length} filtered logins
                  {filteredLogins.length < (activity.total_logins_tracked || 0) && (
                    <span> (out of {activity.total_logins_tracked} total tracked)</span>
                  )}
                </div>

                {totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setCurrentPage(1)}
                      disabled={validCurrentPage <= 1}
                      style={{ padding: "4px 8px", fontSize: 12, opacity: validCurrentPage <= 1 ? 0.5 : 1 }}
                      title="First Page"
                    >
                      « First
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={validCurrentPage <= 1}
                      style={{ padding: "4px 8px", fontSize: 12, opacity: validCurrentPage <= 1 ? 0.5 : 1 }}
                      title="Previous Page"
                    >
                      ‹ Prev
                    </button>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", padding: "0 6px" }}>
                      Page {validCurrentPage} of {totalPages}
                    </span>
                    <button
                      className="btn-secondary"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={validCurrentPage >= totalPages}
                      style={{ padding: "4px 8px", fontSize: 12, opacity: validCurrentPage >= totalPages ? 0.5 : 1 }}
                      title="Next Page"
                    >
                      Next ›
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={validCurrentPage >= totalPages}
                      style={{ padding: "4px 8px", fontSize: 12, opacity: validCurrentPage >= totalPages ? 0.5 : 1 }}
                      title="Last Page"
                    >
                      Last »
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, marginBottom: 28 }}>
              No login records matched your search, year, or date filters.
            </div>
          )}
        </>
      )}

      {arrivals.length > 0 && (
        <>
          <h3 className="section-title">New Arrivals</h3>
          <div className="arrivals-grid">
            {arrivals.map((b) => (
              <div key={b.biblio_id} className="arrival-card">
                <div className="arrival-cover-wrap">
                  <img
                    src={getCoverUrl(b.biblio_id)}
                    alt={b.title || "Book Cover"}
                    className="arrival-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = "flex";
                      }
                    }}
                  />
                  <div className="arrival-placeholder" style={{ display: "none" }}>
                    📖
                  </div>
                </div>
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
