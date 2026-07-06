import { useEffect, useState } from "react";
import { getOverdues } from "../api.js";

const fmt = (dt) => dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const daysOverdue = (dt) => dt ? Math.abs(Math.ceil((new Date(dt) - Date.now()) / 86400000)) : 0;

export default function Overdues() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    getOverdues()
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const severity = (days) => {
    if (days > 30) return "badge red";
    if (days > 7)  return "badge red";
    return "badge";
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Overdue Items</h2>
        <button className="search-bar" style={{ all: "unset", padding: "6px 16px", background: "#334155", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#f8fafc" }} onClick={load}>
          ↻ Refresh
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}
      {loading && <p className="muted">Loading overdues…</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="muted">No overdue items found.</p>
      )}

      {!loading && rows.length > 0 && (
        <>
          <p className="muted" style={{ marginBottom: 12 }}>{rows.length} overdue item{rows.length !== 1 ? "s" : ""}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Days Overdue</th>
                  <th>Patron ID</th>
                  <th>Title</th>
                  <th>Call No.</th>
                  <th>Due Date</th>
                  <th>Renewals</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const days = daysOverdue(c.due_date);
                  return (
                    <tr key={c.checkout_id}>
                      <td>
                        <span className={severity(days)} style={days > 30 ? { background: "rgba(248,113,113,.2)", color: "#f87171", fontWeight: 700 } : {}}>
                          {days}d
                        </span>
                      </td>
                      <td>{c.patron_id}</td>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontWeight: 500 }}>{c.title || `Item #${c.item_id}`}</div>
                        {c.author && <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.author}</div>}
                      </td>
                      <td style={{ fontSize: 12, color: "#94a3b8" }}>{c.callnumber || "—"}</td>
                      <td style={{ color: "#f87171" }}>{fmt(c.due_date)}</td>
                      <td style={{ textAlign: "center" }}>{c.renewals_count ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
