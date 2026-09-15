import { useEffect, useState } from "react";
import { getAdminDds, updateAdminDds, deleteAdminDds } from "../api";

export default function DDSManager() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [status, setStatus] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [updating, setUpdating] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    try {
      const data = await getAdminDds();
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openUpdateModal = (r) => {
    setSelectedReq(r);
    setStatus(r.status || "pending");
    setStatusMsg(r.status_message || "");
    setDocUrl(r.delivered_document_url || "");
  };

  const handleDelete = async (id, title) => {
    const cleanTitle = (title || `Request #${id}`).trim();
    if (!window.confirm(`Are you sure you want to permanently delete request #${id} ("${cleanTitle}")?`)) {
      return;
    }
    try {
      await deleteAdminDds(id);
      load();
    } catch (err) {
      alert(err.message || "Failed to delete request.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    setUpdating(true);
    try {
      await updateAdminDds(selectedReq.id, {
        status,
        status_message: statusMsg,
        delivered_document_url: docUrl,
      });
      setSelectedReq(null);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const filtered = requests.filter((r) => {
    if (filterType !== "all" && r.status !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (r.title || "").toLowerCase().includes(q) ||
        (r.patron_name || "").toLowerCase().includes(q) ||
        (r.author || "").toLowerCase().includes(q) ||
        (r.doi_or_isbn || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadgeClass = (s) => {
    switch (s) {
      case "fulfilled": return "badge-green";
      case "requested_from_partner": return "badge-purple";
      case "in_review": return "badge-blue";
      case "rejected": return "badge-red";
      default: return "badge-amber";
    }
  };

  const exportDetailedDdsCsv = () => {
    if (filtered.length === 0) return alert("No DDS/ILL requests to export for the current filters.");
    const headers = [
      "Request ID",
      "Patron ID",
      "Patron Name",
      "Patron Email",
      "Patron Phone",
      "Request Type",
      "Title",
      "Author",
      "Journal / Book Source",
      "Year",
      "Volume / Issue",
      "Pages",
      "DOI / ISBN",
      "Status",
      "Staff Note",
      "Delivered Document URL",
      "Date Requested",
    ];
    const rows = filtered.map((r) => [
      r.id,
      r.patron_id,
      `"${(r.patron_name || '').replace(/"/g, '""')}"`,
      `"${r.patron_email || ''}"`,
      `"${r.patron_phone || ''}"`,
      r.request_type,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${(r.author || '').replace(/"/g, '""')}"`,
      `"${(r.journal_or_book || '').replace(/"/g, '""')}"`,
      r.year || "",
      `"${r.volume_issue || ''}"`,
      `"${r.pages || ''}"`,
      `"${r.doi_or_isbn || ''}"`,
      r.status,
      `"${(r.status_message || '').replace(/"/g, '""')}"`,
      `"${r.delivered_document_url || ''}"`,
      `"${r.created_at}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `krc_dds_ill_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="panel-header-row">
        <div>
          <h2 className="panel-title">Document Delivery & Inter-Library Loan (DDS & ILL)</h2>
          <p className="panel-subtitle">Manage article & book requests from students/faculty, verify citations, and deliver PDF/links directly to their app.</p>
        </div>
        <div className="panel-actions">
          <button onClick={exportDetailedDdsCsv} className="btn-emerald">
            📥 Export Detailed DDS Report (CSV)
          </button>
          <button onClick={load} className="btn-secondary">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar-row">
        <input
          type="text"
          placeholder="Search by title, patron name, DOI/ISBN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ minWidth: "280px" }}
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Statuses ({requests.length})</option>
          <option value="pending">Pending</option>
          <option value="in_review">In Review</option>
          <option value="requested_from_partner">Requested from Partner (IITs/DELCON)</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading DDS requests...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          No DDS / ILL requests match your filter.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Patron Details</th>
                <th>Type</th>
                <th>Title & Source</th>
                <th>Status</th>
                <th>Date Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontFamily: "monospace", color: "#94a3b8" }}>#{r.id}</td>
                  <td>
                    <div style={{ fontWeight: "600", color: "#f8fafc" }}>{r.patron_name}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{r.patron_email || r.patron_phone || `ID: ${r.patron_id}`}</div>
                  </td>
                  <td>
                    <span className="badge" style={{ textTransform: "uppercase" }}>
                      {r.request_type?.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ maxWidth: "340px" }}>
                    <div style={{ fontWeight: "600", color: "#f8fafc" }}>{r.title}</div>
                    {r.author && <div style={{ fontSize: "11px", color: "#94a3b8" }}>Author: {r.author}</div>}
                    {r.journal_or_book && (
                      <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
                        {r.journal_or_book} {r.year && `(${r.year})`} {r.volume_issue} {r.pages && `pp. ${r.pages}`}
                      </div>
                    )}
                    {r.doi_or_isbn && <div style={{ fontSize: "11px", color: "#d4a017", fontFamily: "monospace" }}>DOI/ISBN: {r.doi_or_isbn}</div>}
                    {r.delivered_document_url && (
                      <div style={{ marginTop: "4px" }}>
                        <a href={r.delivered_document_url} target="_blank" rel="noreferrer" style={{ color: "#34d399", fontSize: "11px", textDecoration: "underline" }}>
                          📄 View Delivered Document
                        </a>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(r.status)}>
                      {r.status?.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", color: "#94a3b8" }}>
                    {new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button onClick={() => openUpdateModal(r)} className="btn-gold" style={{ padding: "6px 12px", fontSize: "12px" }}>
                      Update / Deliver
                    </button>
                    <button onClick={() => handleDelete(r.id, r.title)} className="btn-danger" style={{ padding: "6px 10px", fontSize: "12px", marginLeft: "6px" }} title="Permanently delete request">
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Update / Deliver Modal */}
      {selectedReq && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Update Request #{selectedReq.id}</h3>
              <button onClick={() => setSelectedReq(null)} className="modal-close">✕</button>
            </div>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "16px" }}>
              {selectedReq.title} — <strong>{selectedReq.patron_name}</strong>
            </p>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Fulfillment Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-select">
                  <option value="pending">Pending</option>
                  <option value="in_review">In Review (Verifying with KRC holdings)</option>
                  <option value="requested_from_partner">Requested from Partner Institute (IITB / IITM / DELCON)</option>
                  <option value="fulfilled">Fulfilled (Document Attached)</option>
                  <option value="rejected">Rejected (Not available / Citation invalid)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Delivered Document URL / PDF Link</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/... or https://doi.org/..."
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Staff Note / Message to Patron</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Document procured from IIT Bombay library. Download link is ready."
                  value={statusMsg}
                  onChange={(e) => setStatusMsg(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedReq.id;
                    const title = selectedReq.title;
                    setSelectedReq(null);
                    handleDelete(id, title);
                  }}
                  className="btn-danger"
                  style={{ padding: "8px 14px", fontSize: "13px" }}
                >
                  🗑️ Delete Request
                </button>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => setSelectedReq(null)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={updating} className="btn-gold">
                    {updating ? "Saving..." : "Save & Notify Patron"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
