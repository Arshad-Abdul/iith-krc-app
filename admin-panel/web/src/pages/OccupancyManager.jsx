import { useEffect, useState, useMemo } from "react";
import { getAdminOccupancyFloors, saveAdminOccupancyFloor, deleteAdminOccupancyFloor, getAdminOccupancyReport } from "../api";

export default function OccupancyManager() {
  const [floors, setFloors] = useState([]);
  const [reportData, setReportData] = useState({ sessions: [], total: 0, totalPages: 1, stats: { totalSessions: 0, activeNow: 0, avgDuration: 0 } });
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview, report
  const [editingFloor, setEditingFloor] = useState(null);
  const [floorId, setFloorId] = useState("");
  const [floorName, setFloorName] = useState("");
  const [totalSeats, setTotalSeats] = useState(100);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  // Filters for Detailed Report
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, completed
  const [rangeFilter, setRangeFilter] = useState("all"); // all, today, week, month, custom
  const [customDate, setCustomDate] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [timezone, setTimezone] = useState("local"); // local, utc
  const [exporting, setExporting] = useState(false);

  const loadFloors = async () => {
    try {
      const fData = await getAdminOccupancyFloors();
      setFloors(Array.isArray(fData) ? fData : []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadReport = async (resetPage = false) => {
    setReportLoading(true);
    const targetPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);

    try {
      const params = {
        search: searchQuery.trim(),
        status: statusFilter,
        range: rangeFilter === "custom" ? "" : rangeFilter,
        date: rangeFilter === "custom" ? customDate : "",
        year: yearFilter,
        page: targetPage,
        limit
      };

      const res = await getAdminOccupancyReport(params);
      if (res && Array.isArray(res.sessions)) {
        setReportData(res);
      } else if (Array.isArray(res)) {
        // Fallback for flat array response
        setReportData({
          sessions: res,
          total: res.length,
          totalPages: 1,
          stats: {
            totalSessions: res.length,
            activeNow: res.filter(r => !r.checkout_time).length,
            avgDuration: 0
          }
        });
      }
    } catch (e) {
      console.error("Report error:", e);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadFloors(), loadReport()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      loadReport();
    }
  }, [page, limit, statusFilter, rangeFilter, customDate, yearFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadReport(true);
  };

  const openFloorModal = (f = null) => {
    if (f) {
      setEditingFloor(f);
      setFloorId(f.floor_id);
      setFloorName(f.floor_name);
      setTotalSeats(f.total_seats);
      setDescription(f.description || "");
    } else {
      setEditingFloor({});
      setFloorId("");
      setFloorName("");
      setTotalSeats(50);
      setDescription("");
    }
  };

  const handleSaveFloor = async (e) => {
    e.preventDefault();
    if (!floorId || !floorName) return alert("Floor ID and Floor Name are required.");
    setSaving(true);
    try {
      await saveAdminOccupancyFloor({
        floor_id: floorId.toLowerCase().trim(),
        original_floor_id: editingFloor?.floor_id || null,
        floor_name: floorName.trim(),
        total_seats: Number(totalSeats),
        description: description.trim(),
        is_active: 1,
      });
      setEditingFloor(null);
      loadFloors();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFloor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete zone "${name}" (${id})? This will remove this floor from the live occupancy display and mobile app.`)) return;
    try {
      await deleteAdminOccupancyFloor(id);
      setEditingFloor(null);
      loadFloors();
    } catch (err) {
      alert(err.message || "Failed to delete floor.");
    }
  };

  const parseBooks = (json) => {
    if (!json) return [];
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const exportDetailedCsv = async () => {
    setExporting(true);
    try {
      const fullRes = await getAdminOccupancyReport({
        search: searchQuery.trim(),
        status: statusFilter,
        range: rangeFilter === "custom" ? "" : rangeFilter,
        date: rangeFilter === "custom" ? customDate : "",
        year: yearFilter,
        all: "true"
      });

      const list = fullRes?.sessions || reportData.sessions || [];
      if (list.length === 0) return alert("No gate check-in sessions match your current filters to export.");

      const headers = [
        "Session ID",
        "Patron ID",
        "Roll / Card Number",
        "Patron Name",
        "Category / Role",
        "Department",
        "Gate Location",
        "Check-in Time",
        "Check-out Time",
        "Status",
        "Duration (Mins)",
        "Books in Hand Count",
        "Books in Hand Details"
      ];

      const csvRows = list.map((r) => {
        const isAct = !r.checkout_time;
        const books = parseBooks(r.issued_books_json);
        const booksStr = books.map(b => `${b.title || 'Book'} [Acc: ${b.barcode || '—'}, Call: ${b.itemcallnumber || '—'}]`).join("; ");

        return [
          r.id,
          r.patron_id,
          `"${(r.cardnumber || "").replace(/"/g, '""')}"`,
          `"${(r.patron_name || "").replace(/"/g, '""')}"`,
          `"${(r.patron_category || "").replace(/"/g, '""')}"`,
          `"${(r.department || "").replace(/"/g, '""')}"`,
          `"${(r.floor_name || "").replace(/"/g, '""')}"`,
          `"${r.checkin_time}"`,
          r.checkout_time ? `"${r.checkout_time}"` : '"In Library"',
          isAct ? "ACTIVE" : "COMPLETED",
          r.duration_minutes ?? "",
          r.issued_books_count || books.length || 0,
          `"${booksStr.replace(/"/g, '""')}"`
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `krc_gate_occupancy_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Error exporting report: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const stats = reportData.stats || { totalSessions: 0, activeNow: 0, avgDuration: 0 };
  const startRec = (page - 1) * limit + 1;
  const endRec = Math.min(reportData.total, page * limit);

  return (
    <div>
      {/* Header Row */}
      <div className="panel-header-row">
        <div>
          <h2 className="panel-title">KRC Occupancy & Gate Terminal Management</h2>
          <p className="panel-subtitle">
            Physical entrance gate verification, reading floor capacities, and comprehensive patron visit history.
          </p>
        </div>
        <div className="panel-actions">
          <button 
            onClick={exportDetailedCsv} 
            className="btn-emerald"
            disabled={exporting || reportData.total === 0}
          >
            {exporting ? "Generating CSV..." : `📥 Export Detailed CSV (${reportData.total})`}
          </button>
          <button onClick={() => { loadFloors(); loadReport(); }} className="btn-secondary" disabled={reportLoading}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="sub-nav-tabs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`sub-nav-tab ${activeTab === "overview" ? "active" : ""}`}
        >
          Floor Capacities & Zone Setup
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`sub-nav-tab ${activeTab === "report" ? "active" : ""}`}
        >
          Detailed Gate Reports & Visits ({reportData.total.toLocaleString()})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading occupancy data...</div>
      ) : activeTab === "overview" ? (
        /* Tab 1: Floor Capacities & Zone Setup */
        <div>
          {/* Main Gate Facility Banner */}
          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", marginBottom: "20px", background: "var(--bg-card-alt)", border: "1.5px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: "32px" }}>🏛️</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
                    Knowledge Resource Centre — Main Entry Gate
                  </h4>
                  <span className="badge-blue" style={{ fontSize: "11px" }}>Koha Library Facility</span>
                  <span className="badge-green" style={{ fontSize: "11px" }}>Online</span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>
                  Primary physical entrance terminal for patron roll number and barcode scanning. Configured exclusively by administrators.
                </p>
              </div>
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>Facility Code: IITHLIB</span>
            </div>
          </div>

          <div className="panel-header-row" style={{ marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "var(--text-primary)" }}>
                Configured Reading Floors & Zones
              </h3>
              <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                Zones available for students on the mobile app to view live seat occupancy and check in at desks.
              </p>
            </div>
            <button onClick={() => openFloorModal(null)} className="btn-gold">
              + Add New Floor / Zone
            </button>
          </div>

          <div className="floors-grid">
            {floors.map((f) => (
              <div key={f.floor_id} className="floor-card-item">
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <h4 className="floor-card-title">{f.floor_name}</h4>
                    <span className="badge-blue" style={{ fontFamily: "monospace" }}>{f.floor_id}</span>
                  </div>
                  <p className="floor-card-desc">{f.description || "General study and browsing area."}</p>
                </div>

                <div className="floor-card-bottom">
                  <div>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Capacity: </span>
                    <strong style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: "700" }}>{f.total_seats} Seats</strong>
                  </div>
                  <button onClick={() => openFloorModal(f)} className="btn-secondary" style={{ padding: "4px 10px", fontSize: "12px" }}>
                    Edit Capacity & Zone
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Tab 2: Detailed Gate Reports & Analytics View */
        <div>
          {/* Summary Metric Cards */}
          <div className="stat-row" style={{ marginBottom: "20px" }}>
            <div className="stat-card accent">
              <div className="stat-value">{stats.activeNow ?? 0}</div>
              <div className="stat-label">Currently Inside Library</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{(stats.totalSessions ?? 0).toLocaleString()}</div>
              <div className="stat-label">Total Recorded Visits</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {stats.avgDuration ?? 0} <span style={{ fontSize: "14px", fontWeight: "normal" }}>mins</span>
              </div>
              <div className="stat-label">Avg. Visit Duration</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: "18px" }}>KRC Main Gate</div>
              <div className="stat-label">Primary Entry Point</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar-row">
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, flex: 1, minWidth: "260px" }}>
              <input
                type="text"
                placeholder="Search Patron Name, Roll No / Card No, Dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn-secondary" style={{ padding: "8px 14px" }}>
                Search
              </button>
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => { setSearchQuery(""); setPage(1); }} 
                  className="btn-secondary"
                >
                  Clear
                </button>
              )}
            </form>

            {/* Date Range Selector */}
            <select value={rangeFilter} onChange={(e) => { setRangeFilter(e.target.value); setPage(1); }}>
              <option value="all">All Time</option>
              <option value="today">Past 24 Hours (Today)</option>
              <option value="week">Past 7 Days (Week)</option>
              <option value="month">Past 30 Days (Month)</option>
              <option value="custom">Specific Date Picker 📅</option>
            </select>

            {/* Specific Date Picker when custom is selected */}
            {rangeFilter === "custom" && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => { setCustomDate(e.target.value); setPage(1); }}
                style={{ minWidth: "140px" }}
              />
            )}

            {/* Year Filter */}
            <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}>
              <option value="all">All Years</option>
              <option value="2026">Year 2026</option>
              <option value="2025">Year 2025</option>
              <option value="2024">Year 2024</option>
            </select>

            {/* Status Filter */}
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">All Statuses</option>
              <option value="active">Active Inside Library</option>
              <option value="completed">Completed / Checked Out</option>
            </select>

            {/* Rows Per Page */}
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              <option value={15}>15 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>

            {/* Timezone Switcher */}
            <div style={{ display: "flex", alignItems: "center", background: "var(--bg-card-alt)", borderRadius: "8px", padding: "4px", border: "1.5px solid var(--border-color)" }}>
              <button 
                onClick={() => setTimezone("local")} 
                style={{ 
                  padding: "5px 10px", 
                  background: timezone === "local" ? "var(--btn-primary-bg)" : "transparent",
                  color: timezone === "local" ? "var(--btn-primary-text)" : "var(--text-muted)",
                  border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "600" 
                }}>IST (Local)</button>
              <button 
                onClick={() => setTimezone("utc")} 
                style={{ 
                  padding: "5px 10px", 
                  background: timezone === "utc" ? "var(--btn-primary-bg)" : "transparent",
                  color: timezone === "utc" ? "var(--btn-primary-text)" : "var(--text-muted)",
                  border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "600" 
                }}>UTC</button>
            </div>
          </div>

          {/* Detailed Table */}
          {reportLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              Filtering gate sessions...
            </div>
          ) : reportData.sessions.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              No gate check-in sessions match your filters.
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 65 }}>Session</th>
                      <th>Patron Details</th>
                      <th>Category / Dept</th>
                      <th>Gate Location</th>
                      <th style={{ textAlign: "center" }}>Books in Hand</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Status</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.sessions.map((r) => {
                      const isAct = !r.checkout_time;
                      const books = parseBooks(r.issued_books_json);
                      const isExpanded = expandedSessionId === r.id;

                      return (
                        <>
                          <tr key={r.id}>
                            <td style={{ fontFamily: "monospace", color: "var(--text-muted)", fontWeight: 600 }}>
                              #{r.id}
                            </td>

                            <td>
                              <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                                {r.patron_name}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, fontFamily: "monospace" }}>
                                Roll: <strong style={{ color: "var(--text-primary)" }}>{r.cardnumber || `ID: ${r.patron_id}`}</strong>
                              </div>
                            </td>

                            <td>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                                {r.patron_category || "General"}
                              </div>
                              {r.department && (
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                                  {r.department}
                                </div>
                              )}
                            </td>

                            <td>
                              <span style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 600 }}>
                                {r.floor_name || "Knowledge Resource Centre (Main Gate)"}
                              </span>
                            </td>

                            <td style={{ textAlign: "center" }}>
                              {books.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setExpandedSessionId(isExpanded ? null : r.id)}
                                  className="btn-sm"
                                  style={{ 
                                    background: isExpanded ? "var(--btn-primary-bg)" : "var(--accent-blue-bg)", 
                                    color: isExpanded ? "var(--btn-primary-text)" : "var(--text-primary)",
                                    border: "1px solid var(--border-color)",
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    fontWeight: 700,
                                    fontSize: "11.5px",
                                    cursor: "pointer"
                                  }}
                                  title="Click to view borrowed books"
                                >
                                  📚 {books.length} Book{books.length !== 1 ? "s" : ""} {isExpanded ? "▲" : "▼"}
                                </button>
                              ) : (
                                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>0</span>
                              )}
                            </td>

                            <td style={{ color: "var(--text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                              {r.checkin_time ? (
                                timezone === "local"
                                  ? new Date(r.checkin_time).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                                  : new Date(r.checkin_time).toISOString().replace("T", " ").substring(0, 16) + " UTC"
                              ) : "—"}
                            </td>

                            <td style={{ color: "var(--text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                              {r.checkout_time ? (
                                timezone === "local"
                                  ? new Date(r.checkout_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                                  : new Date(r.checkout_time).toISOString().substring(11, 16) + " UTC"
                              ) : (
                                <span className="badge-green">IN LIBRARY</span>
                              )}
                            </td>

                            <td>
                              {isAct ? (
                                <span className="badge-green">ACTIVE</span>
                              ) : (
                                <span className="badge-blue">COMPLETED</span>
                              )}
                            </td>

                            <td style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 12.5, whiteSpace: "nowrap" }}>
                              {r.duration_minutes !== null && r.duration_minutes !== undefined
                                ? `${r.duration_minutes} min${r.duration_minutes !== 1 ? "s" : ""}`
                                : (isAct ? "In Progress" : "—")}
                            </td>
                          </tr>

                          {/* Expandable row showing books in hand during this session */}
                          {isExpanded && books.length > 0 && (
                            <tr style={{ background: "var(--bg-card-alt)" }}>
                              <td colSpan={9} style={{ padding: "12px 20px" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-secondary)", marginBottom: 8 }}>
                                  Books Issued to {r.patron_name} during this Gate Session:
                                </div>
                                <div style={{ display: "grid", gap: 6 }}>
                                  {books.map((b, bIdx) => (
                                    <div 
                                      key={bIdx}
                                      style={{
                                        background: "var(--bg-surface)",
                                        border: "1px solid var(--border-color)",
                                        borderRadius: 6,
                                        padding: "8px 12px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        fontSize: 12.5
                                      }}
                                    >
                                      <div>
                                        <strong style={{ color: "var(--text-primary)" }}>{b.title}</strong>
                                        {b.author && <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>by {b.author}</span>}
                                      </div>
                                      <div style={{ display: "flex", gap: 14, fontFamily: "monospace", fontSize: 11.5 }}>
                                        <span>Accession: <strong style={{ color: "var(--text-primary)" }}>{b.barcode}</strong></span>
                                        {b.itemcallnumber && <span>Call No: <strong style={{ color: "var(--text-primary)" }}>{b.itemcallnumber}</strong></span>}
                                        {b.date_due && <span>Due: {new Date(b.date_due).toLocaleDateString("en-IN")}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Toolbar */}
              <div className="pagination-bar">
                <div className="pagination-info">
                  Showing <strong>{startRec.toLocaleString()}</strong> to <strong>{endRec.toLocaleString()}</strong> of <strong>{reportData.total.toLocaleString()}</strong> gate sessions
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
                    Page {page} of {reportData.totalPages || 1}
                  </span>

                  <button
                    className="pagination-btn"
                    disabled={page >= reportData.totalPages}
                    onClick={() => setPage((p) => Math.min(reportData.totalPages, p + 1))}
                  >
                    Next ›
                  </button>
                  <button
                    className="pagination-btn"
                    disabled={page >= reportData.totalPages}
                    onClick={() => setPage(reportData.totalPages)}
                    title="Last Page"
                  >
                    Last »
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Edit Floor Modal */}
      {editingFloor && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingFloor.floor_id ? `Configure ${editingFloor.floor_name}` : "Add New Library Floor"}
              </h3>
              <button onClick={() => setEditingFloor(null)} className="modal-close">✕</button>
            </div>

            <form onSubmit={handleSaveFloor}>
              {(() => {
                const trimmedFloorId = floorId.toLowerCase().trim();
                const conflictingFloor = floors.find(
                  (f) => f.floor_id.toLowerCase().trim() === trimmedFloorId && f.floor_id.toLowerCase().trim() !== (editingFloor?.floor_id || '').toLowerCase().trim()
                );

                return (
                  <>
                    <div className="form-group">
                      <label className="form-label">Floor Identifier (ID) *</label>
                      <input
                        type="text"
                        placeholder="e.g. third, mezzanine, rooftop"
                        value={floorId}
                        onChange={(e) => setFloorId(e.target.value)}
                        className="form-input"
                        style={conflictingFloor ? { borderColor: "var(--accent-red)" } : {}}
                      />
                      {conflictingFloor ? (
                        <span style={{ fontSize: 12, color: "var(--accent-red)", marginTop: 6, display: "block", fontWeight: 600 }}>
                          ⚠️ Identifier "{floorId.trim()}" is already assigned to "{conflictingFloor.floor_name}". Please choose a different unique ID.
                        </span>
                      ) : editingFloor.floor_id ? (
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                          Note: Changing this ID will update all historical check-in sessions to the new ID.
                        </span>
                      ) : null}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Floor Display Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. 3rd Floor (Silent Study Hall)"
                        value={floorName}
                        onChange={(e) => setFloorName(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Total Available Seats *</label>
                      <input
                        type="number"
                        min="1"
                        max="2000"
                        value={totalSeats}
                        onChange={(e) => setTotalSeats(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description / Amenities</label>
                      <textarea
                        rows="2"
                        placeholder="e.g. Carrels, charging ports, reference stacks..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="form-textarea"
                      />
                    </div>

                    <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        {editingFloor.floor_id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFloor(editingFloor.floor_id, editingFloor.floor_name)}
                            className="btn-secondary"
                            style={{ color: "var(--accent-red)", borderColor: "rgba(220, 38, 38, 0.3)", padding: "7px 14px", fontSize: 12.5 }}
                          >
                            🗑️ Delete Zone
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" onClick={() => setEditingFloor(null)} className="btn-secondary">
                          Cancel
                        </button>
                        <button type="submit" disabled={saving || !!conflictingFloor} className="btn-gold">
                          {saving ? "Saving..." : "Save Floor"}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
