import { useEffect, useState, useMemo } from "react";
import { getOverdues } from "../api.js";

const fmt = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function Overdues() {
  const [data, setData] = useState({ items: [], total: 0, categories: [], totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  // Filters & Pagination State
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const loadData = (resetPage = false) => {
    setLoading(true);
    setError("");
    const currentPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);

    getOverdues({
      search,
      category,
      severity,
      page: currentPage,
      limit
    })
      .then((res) => {
        if (res && Array.isArray(res.items)) {
          setData(res);
        } else if (Array.isArray(res)) {
          // Fallback if returned as raw array
          setData({ items: res, total: res.length, categories: [], totalPages: 1 });
        } else {
          setData({ items: [], total: 0, categories: [], totalPages: 1 });
        }
      })
      .catch((e) => setError(e.message || "Failed to load overdues."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [page, limit, category, severity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData(true);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const fullRes = await getOverdues({
        search,
        category,
        severity,
        all: "true"
      });

      const list = fullRes?.items || [];
      if (list.length === 0) {
        alert("No overdue records to export.");
        return;
      }

      const headers = [
        "Issue ID",
        "Patron ID",
        "Roll / Card Number",
        "Patron Name",
        "Category Code",
        "Category Name",
        "Email",
        "Phone",
        "Book Title",
        "Author",
        "Accession No (Barcode)",
        "Call Number",
        "Issued Date",
        "Due Date",
        "Days Overdue",
        "Renewals"
      ];

      const csvRows = list.map((c) => [
        c.issue_id,
        c.patron_id,
        `"${(c.cardnumber || "").replace(/"/g, '""')}"`,
        `"${(c.patron_name || "").replace(/"/g, '""')}"`,
        `"${c.categorycode || ""}"`,
        `"${(c.category_name || "").replace(/"/g, '""')}"`,
        `"${c.email || ""}"`,
        `"${c.phone || ""}"`,
        `"${(c.title || "").replace(/"/g, '""')}"`,
        `"${(c.author || "").replace(/"/g, '""')}"`,
        `"${c.barcode || ""}"`,
        `"${c.itemcallnumber || ""}"`,
        `"${fmt(c.issuedate)}"`,
        `"${fmt(c.date_due)}"`,
        c.days_overdue ?? 0,
        c.renewals ?? 0
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `krc_overdues_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Error exporting CSV: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const getSeverityBadge = (days) => {
    if (days >= 365) return { label: `${days}d`, className: "badge red", style: { background: "rgba(220, 38, 38, 0.2)", color: "#b91c1c", fontWeight: 800 } };
    if (days >= 90)  return { label: `${days}d`, className: "badge red", style: { background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", fontWeight: 700 } };
    if (days >= 30)  return { label: `${days}d`, className: "badge red", style: { background: "rgba(249, 115, 22, 0.15)", color: "#ea580c", fontWeight: 600 } };
    return { label: `${days}d`, className: "badge red", style: {} };
  };

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(data.total, page * limit);

  return (
    <div>
      {/* Header Row */}
      <div className="panel-header-row">
        <div>
          <h2 className="panel-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>Overdue Items</span>
            <span style={{ fontSize: 13, background: "rgba(220, 38, 38, 0.1)", color: "var(--accent-red)", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>
              {data.total.toLocaleString()} Overdue Checkouts
            </span>
          </h2>
          <p className="panel-subtitle">
            Comprehensive real-time tracking from Koha with complete borrower profiles and accession identifiers.
          </p>
        </div>

        <div className="panel-actions">
          <button 
            onClick={handleExportCsv} 
            className="btn-emerald"
            disabled={exporting || data.total === 0}
            title="Download full multi-detail CSV of all matching overdues"
          >
            {exporting ? "Generating CSV..." : `📥 Export All (${data.total}) CSV`}
          </button>
          <button onClick={() => loadData()} className="btn-secondary" disabled={loading}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-bar-row">
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, flex: 1, minWidth: "280px" }}>
          <input
            type="text"
            placeholder="Search Roll No, Patron Name, Title, Accession (Barcode), or Call No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-secondary" style={{ padding: "8px 14px" }}>
            Search
          </button>
          {search && (
            <button 
              type="button" 
              onClick={() => { setSearch(""); setPage(1); }} 
              className="btn-secondary"
            >
              Clear
            </button>
          )}
        </form>

        {/* Category Dropdown */}
        <select 
          value={category} 
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        >
          <option value="ALL">All Patron Categories</option>
          {data.categories?.map((cat) => (
            <option key={cat.categorycode} value={cat.categorycode}>
              {cat.description} ({cat.categorycode})
            </option>
          ))}
        </select>

        {/* Severity Dropdown */}
        <select 
          value={severity} 
          onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
        >
          <option value="">All Overdue Periods</option>
          <option value="7d">&gt; 7 Days Overdue</option>
          <option value="30d">&gt; 30 Days Overdue</option>
          <option value="90d">&gt; 90 Days Overdue</option>
          <option value="1y">&gt; 1 Year Overdue</option>
        </select>

        {/* Page Size */}
        <select 
          value={limit} 
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
        >
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>

      {error && <div className="card" style={{ color: "var(--accent-red)", background: "var(--accent-red-bg)", padding: 14 }}>{error}</div>}

      {/* Main Table */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          Loading overdue records from Koha database...
        </div>
      ) : data.items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          No overdue items found matching your filters.
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Overdue</th>
                  <th>Patron Details</th>
                  <th>Category / Role</th>
                  <th>Book Title & Author</th>
                  <th>Accession No.</th>
                  <th>Call No.</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: "center" }}>Renewals</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => {
                  const badge = getSeverityBadge(c.days_overdue || 0);
                  return (
                    <tr key={c.issue_id || `${c.patron_id}-${c.barcode}`}>
                      <td>
                        <span className={badge.className} style={badge.style}>
                          {badge.label}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                          {c.patron_name || "—"}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, fontFamily: "monospace" }}>
                          Roll: <strong style={{ color: "var(--text-primary)" }}>{c.cardnumber || c.patron_id}</strong>
                          <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>(ID: {c.patron_id})</span>
                        </div>
                      </td>

                      <td>
                        <span style={{ 
                          fontSize: 11.5, 
                          background: "var(--bg-card-alt)", 
                          border: "1px solid var(--border-color)", 
                          padding: "3px 8px", 
                          borderRadius: 4, 
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap"
                        }}>
                          {c.category_name || c.categorycode || "General"}
                        </span>
                      </td>

                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.35 }} title={c.title}>
                          {c.title || "Unknown Title"}
                        </div>
                        {c.author && (
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                            {c.author}
                          </div>
                        )}
                      </td>

                      <td>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)", background: "var(--bg-card-alt)", padding: "2px 6px", borderRadius: 4 }}>
                          {c.barcode || "—"}
                        </span>
                      </td>

                      <td style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace" }}>
                        {c.itemcallnumber || "—"}
                      </td>

                      <td style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {fmt(c.issuedate)}
                      </td>

                      <td style={{ color: "var(--accent-red)", fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap" }}>
                        {fmt(c.date_due)}
                      </td>

                      <td style={{ textAlign: "center", fontWeight: 600, color: "var(--text-secondary)" }}>
                        {c.renewals ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing <strong>{startRecord.toLocaleString()}</strong> to <strong>{endRecord.toLocaleString()}</strong> of <strong>{data.total.toLocaleString()}</strong> overdue checkouts
            </div>

            <div className="pagination-controls">
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                title="First Page"
              >
                « First
              </button>
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹ Prev
              </button>

              <span style={{ fontSize: 12.5, fontWeight: 600, padding: "0 8px", color: "var(--text-primary)" }}>
                Page {page} of {data.totalPages || 1}
              </span>

              <button
                className="pagination-btn"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              >
                Next ›
              </button>
              <button
                className="pagination-btn"
                disabled={page >= data.totalPages}
                onClick={() => setPage(data.totalPages)}
                title="Last Page"
              >
                Last »
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
