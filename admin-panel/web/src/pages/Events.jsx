import { useEffect, useState } from "react";
import { getEvents, createEvent, updateEvent, deleteEvent } from "../api.js";

const EVENT_TYPES = [
  { id: "seminar", label: "Seminar" },
  { id: "exhibition", label: "Exhibition" },
  { id: "workshop", label: "Workshop" },
  { id: "talk", label: "Author Talk / Lecture" },
  { id: "other", label: "Other Event" },
];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    location: "",
    event_type: "seminar",
    cover_image_url: "",
    is_active: 1,
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    getEvents()
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      event_date: new Date().toISOString().slice(0, 10),
      event_time: "10:00 AM - 1:00 PM",
      location: "KRC Knowledge Resource Centre",
      event_type: "seminar",
      cover_image_url: "",
      is_active: 1,
    });
    setModalOpen(true);
  };

  const openEditModal = (ev) => {
    setEditingEvent(ev);
    setFormData({
      title: ev.title || "",
      description: ev.description || "",
      event_date: ev.event_date ? new Date(ev.event_date).toISOString().slice(0, 10) : "",
      event_time: ev.event_time || "",
      location: ev.location || "",
      event_type: ev.event_type || "seminar",
      cover_image_url: ev.cover_image_url || "",
      is_active: ev.is_active ? 1 : 0,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.event_date) {
      alert("Title and Event Date are required.");
      return;
    }
    setSaving(true);
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, formData);
        setSuccessMsg("Event updated successfully!");
      } else {
        await createEvent(formData);
        setSuccessMsg("Event created and published to mobile app!");
      }
      setModalOpen(false);
      load();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the event "${title}"?`)) return;
    try {
      await deleteEvent(id);
      setSuccessMsg("Event deleted.");
      load();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleActive = async (ev) => {
    try {
      await updateEvent(ev.id, { ...ev, is_active: ev.is_active ? 0 : 1 });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Library Events & Exhibitions</h2>
          <p className="muted" style={{ marginTop: 4 }}>Manage announcements, exhibitions, and workshops displayed in the KRC Mobile App.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={load}
            style={{ all: "unset", padding: "8px 16px", background: "#334155", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#f8fafc" }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={openCreateModal}
            style={{ all: "unset", padding: "8px 18px", background: "#d4a017", color: "#0f172a", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}
          >
            + Add New Event
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: "10px 16px", background: "rgba(74,222,128,.15)", border: "1px solid #4ade80", borderRadius: 8, color: "#4ade80", marginBottom: 16 }}>
          {successMsg}
        </div>
      )}
      {error && <p className="error-msg">{error}</p>}
      {loading && <p className="muted">Loading library events…</p>}

      {!loading && !error && events.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border-color)", boxShadow: "var(--shadow-card)" }}>
          <p style={{ fontSize: 16, marginBottom: 16, color: "var(--text-secondary)" }}>No library events currently published.</p>
          <button
            onClick={openCreateModal}
            className="btn-gold"
          >
            + Create First Event
          </button>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Type</th>
                <th>Event Title</th>
                <th>Date & Time</th>
                <th>Location</th>
                <th>Created By</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <span
                      onClick={() => toggleActive(ev)}
                      style={{ cursor: "pointer" }}
                      className={ev.is_active ? "badge green" : "badge red"}
                      title="Click to toggle active status"
                    >
                      {ev.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{ textTransform: "capitalize" }}>
                      {ev.event_type || "other"}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#f8fafc" }}>{ev.title}</div>
                    {ev.description && (
                      <div className="muted" style={{ fontSize: 11, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.description}
                      </div>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div>{ev.event_date ? new Date(ev.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{ev.event_time || ""}</div>
                  </td>
                  <td style={{ fontSize: 12, color: "#cbd5e1" }}>{ev.location || "KRC IITH"}</td>
                  <td style={{ fontSize: 11, color: "#94a3b8" }}>{ev.created_by || "Admin"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      className="btn-sm"
                      style={{ marginRight: 6 }}
                      onClick={() => openEditModal(ev)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-sm"
                      style={{ color: "#f87171", borderColor: "rgba(248,113,113,.4)" }}
                      onClick={() => handleDelete(ev.id, ev.title)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingEvent ? "Edit Library Event" : "Create New Library Event"}
              </h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="form-label">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Annual Book Fair 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Event Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description for mobile app users..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="form-label">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Timing</label>
                  <input
                    type="text"
                    placeholder="e.g., 10:00 AM - 4:00 PM"
                    value={formData.event_time}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="form-label">Event Category</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="form-select"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Location / Venue</label>
                  <input
                    type="text"
                    placeholder="e.g., KRC 1st Floor Reading Hall"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Cover / Banner Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={formData.cover_image_url}
                  onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.is_active === 1}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                  style={{ width: 16, height: 16, accentColor: "var(--accent-gold)" }}
                />
                <label htmlFor="isActiveToggle" style={{ fontSize: 13, color: "var(--text-primary)", cursor: "pointer", fontWeight: 600 }}>
                  Active (visible on KRC Mobile App immediately)
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-gold"
                >
                  {saving ? "Saving…" : editingEvent ? "Save Changes" : "Publish Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
