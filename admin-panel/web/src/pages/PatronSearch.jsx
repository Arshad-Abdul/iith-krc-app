import { useState } from "react";
import { getPatron, searchPatrons } from "../api.js";

const fmt = (dt) => dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const daysUntil = (dt) => dt ? Math.ceil((new Date(dt) - Date.now()) / 86400000) : null;

export default function PatronSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(""); setResults(null); setSelected(null); setDetail(null);
    try { setResults(await searchPatrons(query.trim())); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openPatron = async (patron) => {
    setSelected(patron); setDetail(null); setDetailLoading(true);
    try { setDetail(await getPatron(patron.patron_id)); }
    catch (err) { setError(err.message); }
    finally { setDetailLoading(false); }
  };

  return (
    <div>
      <h2 className="page-title">Patron Search</h2>
      <form className="search-bar" onSubmit={search}>
        <input placeholder="Card number, user ID, name…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="submit" disabled={loading}>Search</button>
      </form>
      {error && <p className="error-msg">{error}</p>}
      {loading && <p className="muted">Searching…</p>}

      {results && !selected && (
        results.length === 0 ? <p className="muted">No patrons found.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Card No.</th><th>Name</th><th>Category</th><th>Email</th><th>Expiry</th><th></th></tr></thead>
              <tbody>
                {results.map((p) => (
                  <tr key={p.patron_id}>
                    <td>{p.cardnumber}</td>
                    <td>{p.surname}{p.firstname ? `, ${p.firstname}` : ""}</td>
                    <td>{p.category_id}</td>
                    <td>{p.email || "—"}</td>
                    <td>{fmt(p.expiry_date)}</td>
                    <td><button className="btn-sm" onClick={() => openPatron(p)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {selected && (
        <div>
          <button className="btn-back" onClick={() => { setSelected(null); setDetail(null); }}>← Back to results</button>
          <div className="patron-header">
            <h3>{selected.surname}{selected.firstname ? `, ${selected.firstname}` : ""}</h3>
            <span className="badge">{selected.cardnumber}</span>
            <span className="badge">{selected.category_id}</span>
            {selected.restricted && <span className="badge red">Restricted</span>}
            {selected.expired && <span className="badge red">Expired</span>}
          </div>
          <div className="patron-meta">
            <span>Email: {selected.email || "—"}</span>
            <span>Phone: {selected.phone || "—"}</span>
            <span>Expiry: {fmt(selected.expiry_date)}</span>
          </div>

          {detailLoading && <p className="muted">Loading account…</p>}
          {detail && (
            <>
              <div className="stat-row small">
                <div className="stat-card"><div className="stat-value">{detail.checkouts?.length ?? 0}</div><div className="stat-label">Checked Out</div></div>
                <div className="stat-card"><div className="stat-value">₹{detail.account?.balance?.toFixed(2) ?? "0.00"}</div><div className="stat-label">Balance</div></div>
              </div>

              {detail.checkouts?.length > 0 && (
                <>
                  <h4 className="section-title">Current Checkouts</h4>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Title</th><th>Checked Out</th><th>Due Date</th><th>Status</th></tr></thead>
                      <tbody>
                        {detail.checkouts.map((c) => {
                          const days = daysUntil(c.due_date);
                          const overdue = days !== null && days < 0;
                          return (
                            <tr key={c.checkout_id}>
                              <td style={{ maxWidth: 280 }}>
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
                </>
              )}

              {detail.account?.outstanding_debits?.lines?.length > 0 && (
                <>
                  <h4 className="section-title">Outstanding Charges</h4>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Type</th><th>Description</th><th>Amount</th></tr></thead>
                      <tbody>
                        {detail.account.outstanding_debits.lines.map((line, i) => (
                          <tr key={i}>
                            <td>{line.debit_type}</td>
                            <td>{line.description || "—"}</td>
                            <td className="amount">₹{parseFloat(line.amount_outstanding || line.amount || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
