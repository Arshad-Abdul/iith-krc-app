import { useState } from "react";
import { sendAdminBroadcast } from "../api";

export default function BroadcastNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetScreen, setTargetScreen] = useState("home");
  const [targetId, setTargetId] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      return alert("Title and Message are required.");
    }
    setSending(true);
    setStatus(null);
    try {
      await sendAdminBroadcast({
        title: title.trim(),
        message: message.trim(),
        target_screen: targetScreen,
        target_id: targetId.trim() || null,
      });
      setStatus({ type: "success", msg: "Broadcast notification sent successfully to all mobile app patrons!" });
      setTitle("");
      setMessage("");
      setTargetId("");
    } catch (err) {
      setStatus({ type: "error", msg: err.message || "Could not broadcast notification." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: "780px" }}>
      <div className="panel-header-row">
        <div>
          <h2 className="panel-title">Send Broadcast & Push Notifications</h2>
          <p className="panel-subtitle">Publish instant library alerts, holiday reminders, or book spotlights directly to students' mobile app notification center.</p>
        </div>
      </div>

      {status && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "13px",
            fontWeight: "600",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: status.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${status.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
            color: status.type === "success" ? "#34d399" : "#f87171",
          }}
        >
          <span>{status.msg}</span>
          <button onClick={() => setStatus(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}>
            Dismiss
          </button>
        </div>
      )}

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Notification Title *</label>
            <input
              type="text"
              placeholder="e.g. Extended Library Hours during Mid-Sem Exams"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Message Body *</label>
            <textarea
              rows="4"
              placeholder="e.g. KRC 1st & 2nd floors will remain open 24x7 from Oct 10 to Oct 25 with full air-conditioning and discussion cubicles."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="form-textarea"
              required
            />
          </div>

          <div className="form-group horizontal">
            <div style={{ flex: 1 }}>
              <label className="form-label">Action on Tap (Target Screen)</label>
              <select
                value={targetScreen}
                onChange={(e) => setTargetScreen(e.target.value)}
                className="form-select"
              >
                <option value="home">Open App Dashboard (Home)</option>
                <option value="occupancy">Open Live Occupancy & Gate</option>
                <option value="dds-ill">Open Document Delivery (DDS)</option>
                <option value="profile">Open Patron Account & Due Dates</option>
                <option value="book-detail">Open Specific Book Detail</option>
              </select>
            </div>

            {targetScreen === "book-detail" && (
              <div style={{ flex: 1 }}>
                <label className="form-label">Target Book Biblio ID *</label>
                <input
                  type="text"
                  placeholder="e.g. 12045"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #334155" }}>
            <button
              type="submit"
              disabled={sending}
              className="btn-gold"
            >
              {sending ? "Sending..." : "🚀 Broadcast to All Mobile Users"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
