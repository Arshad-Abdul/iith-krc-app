import { useState } from "react";
import { getCoverUrl, searchCatalog } from "../api.js";

const fmt = (dt) => dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;

export default function Catalog() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(""); setResults(null); setSelected(null);
    try {
      const data = await searchCatalog(query.trim(), 30);
      setResults(data.books ?? []);
    } catch (err) {
      setError(err.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">Catalog Search</h2>

      <form className="search-bar" onSubmit={search}>
        <input
          placeholder="Title, author, ISBN, subject…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>Search</button>
      </form>

      {error && <p className="error-msg">{error}</p>}
      {loading && <p className="muted">Searching catalog…</p>}

      {selected && (
        <div className="book-detail-panel">
          <button className="btn-back" onClick={() => setSelected(null)}>← Back to results</button>
          <div className="book-detail-header">
            <img
              src={getCoverUrl(selected.biblio_id)}
              alt=""
              className="book-detail-cover"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <div>
              <h3 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 6 }}>{selected.title}</h3>
              {selected.author && <p style={{ color: "#94a3b8", marginBottom: 6 }}>{selected.author}</p>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selected.isbn && <span className="badge">{selected.isbn}</span>}
                {selected.copyrightdate && <span className="badge">{selected.copyrightdate}</span>}
                {selected.item_count != null && (
                  <span className="badge green">{selected.item_count} cop{selected.item_count !== 1 ? "ies" : "y"}</span>
                )}
              </div>
              {selected.notes && <p style={{ marginTop: 12, fontSize: 13, color: "#94a3b8", maxWidth: 500 }}>{selected.notes}</p>}
            </div>
          </div>

          {(selected.items ?? []).length > 0 && (
            <>
              <h4 className="section-title">Holdings ({selected.items.length})</h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Call No.</th><th>Location</th><th>Barcode</th><th>Accession</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {selected.items.map((it, i) => (
                      <tr key={i}>
                        <td>{it.call_number || "—"}</td>
                        <td>{[it.location, it.holdingbranch].filter(Boolean).join(" · ") || "—"}</td>
                        <td style={{ fontSize: 12, color: "#94a3b8" }}>{it.barcode || "—"}</td>
                        <td style={{ fontSize: 12 }}>{fmt(it.dateaccessioned) || "—"}</td>
                        <td>
                          <span className={it.status === "Available" ? "badge green" : "badge red"}>
                            {it.status || "Unknown"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {!selected && results && (
        results.length === 0
          ? <p className="muted">No books found for "{query}".</p>
          : (
            <div className="catalog-grid">
              {results.map((b) => (
                <div key={b.biblio_id} className="catalog-card" onClick={() => setSelected(b)}>
                  <img
                    src={getCoverUrl(b.biblio_id)}
                    alt=""
                    className="catalog-cover"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                  <div className="catalog-info">
                    <div className="catalog-title">{b.title}</div>
                    {b.author && <div className="catalog-author">{b.author}</div>}
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      {b.item_count != null && (
                        <span className={`badge ${b.item_count > 0 ? "green" : "red"}`}>
                          {b.item_count} cop{b.item_count !== 1 ? "ies" : "y"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
      )}
    </div>
  );
}
