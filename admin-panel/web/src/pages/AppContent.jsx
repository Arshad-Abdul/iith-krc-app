import { useEffect, useState } from "react";
import {
  getReviews, deleteReview,
  getClubMessages, deleteClubMessage,
  getRecommendations,
  getProfessorShelves, deleteProfessorShelf
} from "../api.js";

export default function AppContent() {
  const [tab, setTab] = useState("reviews");
  const [reviews, setReviews] = useState([]);
  const [clubMsgs, setClubMsgs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = () => {
    setLoading(true);
    setError("");
    Promise.allSettled([
      getReviews(),
      getClubMessages(),
      getRecommendations(),
      getProfessorShelves(),
    ]).then(([revRes, clubRes, recRes, shelfRes]) => {
      if (revRes.status === "fulfilled") setReviews(Array.isArray(revRes.value) ? revRes.value : []);
      if (clubRes.status === "fulfilled") setClubMsgs(Array.isArray(clubRes.value) ? clubRes.value : []);
      if (recRes.status === "fulfilled") setRecommendations(Array.isArray(recRes.value) ? recRes.value : []);
      if (shelfRes.status === "fulfilled") setShelves(Array.isArray(shelfRes.value) ? shelfRes.value : []);
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  const handleDeleteReview = async (id, patronName) => {
    if (!window.confirm(`Delete review from ${patronName}?`)) return;
    try {
      await deleteReview(id);
      setSuccessMsg("Review removed.");
      loadData();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteClubMsg = async (id) => {
    if (!window.confirm("Delete this reading club comment?")) return;
    try {
      await deleteClubMessage(id);
      setSuccessMsg("Message deleted.");
      loadData();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteShelf = async (id, title) => {
    if (!window.confirm(`Delete professor shelf "${title}" and all its books?`)) return;
    try {
      await deleteProfessorShelf(id);
      setSuccessMsg("Shelf deleted.");
      loadData();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Mobile App Content & Moderation</h2>
          <p className="muted" style={{ marginTop: 4 }}>Monitor student reviews, reading clubs, peer recommendations, and faculty shelves.</p>
        </div>
        <button
          onClick={loadData}
          style={{ all: "unset", padding: "8px 16px", background: "#334155", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#f8fafc" }}
        >
          ↻ Refresh
        </button>
      </div>

      {successMsg && (
        <div style={{ padding: "10px 16px", background: "rgba(74,222,128,.15)", border: "1px solid #4ade80", borderRadius: 8, color: "#4ade80", marginBottom: 16 }}>
          {successMsg}
        </div>
      )}
      {error && <p className="error-msg">{error}</p>}

      {/* Sub tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
        <button
          onClick={() => setTab("reviews")}
          style={{
            padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "600",
            background: tab === "reviews" ? "var(--btn-gold-bg)" : "var(--bg-surface)",
            color: tab === "reviews" ? "var(--btn-gold-text)" : "var(--text-secondary)",
            border: tab === "reviews" ? "none" : "1px solid var(--border-color)"
          }}
        >
          ⭐ Book Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setTab("club")}
          style={{
            padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "600",
            background: tab === "club" ? "var(--btn-gold-bg)" : "var(--bg-surface)",
            color: tab === "club" ? "var(--btn-gold-text)" : "var(--text-secondary)",
            border: tab === "club" ? "none" : "1px solid var(--border-color)"
          }}
        >
          💬 Reading Club Chat ({clubMsgs.length})
        </button>
        <button
          onClick={() => setTab("recommendations")}
          style={{
            padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "600",
            background: tab === "recommendations" ? "var(--btn-gold-bg)" : "var(--bg-surface)",
            color: tab === "recommendations" ? "var(--btn-gold-text)" : "var(--text-secondary)",
            border: tab === "recommendations" ? "none" : "1px solid var(--border-color)"
          }}
        >
          🤝 Recommendations ({recommendations.length})
        </button>
        <button
          onClick={() => setTab("shelves")}
          style={{
            padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "600",
            background: tab === "shelves" ? "var(--btn-gold-bg)" : "var(--bg-surface)",
            color: tab === "shelves" ? "var(--btn-gold-text)" : "var(--text-secondary)",
            border: tab === "shelves" ? "none" : "1px solid var(--border-color)"
          }}
        >
          🎓 Professor Shelves ({shelves.length})
        </button>
      </div>

      {loading && <p className="muted">Loading data…</p>}

      {/* Tab: Reviews */}
      {!loading && tab === "reviews" && (
        reviews.length === 0 ? (
          <p className="muted">No student reviews submitted yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Student / Patron</th>
                  <th>Book Information</th>
                  <th>Review / Comment</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="badge" style={{ background: "rgba(212,160,23,.2)", color: "#d4a017" }}>
                        {"★".repeat(r.rating || 5)}{"☆".repeat(5 - (r.rating || 5))} ({r.rating}/5)
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.patron_name} <span className="muted" style={{ fontSize: 11 }}>#{r.patron_id}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.title || `Biblio #${r.biblio_id}`}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                        {r.accession_number && r.accession_number !== "—" && (
                          <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--accent-gold)", background: "var(--bg-card-alt)", padding: "1px 5px", borderRadius: 4, border: "1px solid var(--border-color)" }}>
                            Acc: {r.accession_number}
                          </span>
                        )}
                        <span className="muted" style={{ fontSize: 11 }}>Biblio #{r.biblio_id}</span>
                        {r.author && <span className="muted" style={{ fontSize: 11 }}>• by {r.author}</span>}
                      </div>
                    </td>
                    <td style={{ maxWidth: 350 }}>{r.comment || "—"}</td>
                    <td className="muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn-sm"
                        style={{ color: "#f87171", borderColor: "rgba(248,113,113,.3)" }}
                        onClick={() => handleDeleteReview(r.id, r.patron_name)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Tab: Reading Club */}
      {!loading && tab === "club" && (
        clubMsgs.length === 0 ? (
          <p className="muted">No reading club discussions yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Book Information</th>
                  <th>Sender</th>
                  <th>Message</th>
                  <th>Sent At</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {clubMsgs.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.title || `Biblio #${m.biblio_id}`}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                        {m.accession_number && m.accession_number !== "—" && (
                          <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--accent-gold)", background: "var(--bg-card-alt)", padding: "1px 5px", borderRadius: 4, border: "1px solid var(--border-color)" }}>
                            Acc: {m.accession_number}
                          </span>
                        )}
                        <span className="muted" style={{ fontSize: 11 }}>Biblio #{m.biblio_id}</span>
                        {m.author && <span className="muted" style={{ fontSize: 11 }}>• by {m.author}</span>}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{m.patron_name} <span className="muted" style={{ fontSize: 11 }}>#{m.patron_id}</span></td>
                    <td style={{ maxWidth: 400 }}>{m.message}</td>
                    <td className="muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                      {m.created_at ? new Date(m.created_at).toLocaleString("en-IN") : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn-sm"
                        style={{ color: "#f87171", borderColor: "rgba(248,113,113,.3)" }}
                        onClick={() => handleDeleteClubMsg(m.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Tab: Recommendations */}
      {!loading && tab === "recommendations" && (
        recommendations.length === 0 ? (
          <p className="muted">No peer-to-peer recommendations sent yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>From (Sender)</th>
                  <th>To (Recipient Card)</th>
                  <th>Recommended Book</th>
                  <th>Note / Message</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec) => (
                  <tr key={rec.id}>
                    <td style={{ fontWeight: 600 }}>{rec.sender_patron_name}</td>
                    <td><code>{rec.recipient_cardnumber}</code></td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{rec.title}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                        {rec.accession_number && rec.accession_number !== "—" && (
                          <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--accent-gold)", background: "var(--bg-card-alt)", padding: "1px 5px", borderRadius: 4, border: "1px solid var(--border-color)" }}>
                            Acc: {rec.accession_number}
                          </span>
                        )}
                        {rec.author && <span className="muted" style={{ fontSize: 11 }}>by {rec.author}</span>}
                      </div>
                    </td>
                    <td style={{ maxWidth: 300 }}>{rec.note || "—"}</td>
                    <td className="muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                      {rec.created_at ? new Date(rec.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Tab: Professor Shelves */}
      {!loading && tab === "shelves" && (
        shelves.length === 0 ? (
          <p className="muted">No professor bookshelves created yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {shelves.map((s) => (
              <div key={s.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 18, boxShadow: "var(--shadow-card)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: "bold", color: "var(--accent-gold)", margin: 0 }}>{s.title}</h4>
                    <span className="badge" style={{ marginTop: 4 }}>{s.department || "Faculty"}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteShelf(s.id, s.title)}
                    className="btn-sm"
                    style={{ color: "var(--accent-red)", borderColor: "rgba(220, 38, 38, .3)", padding: "2px 8px" }}
                  >
                    Delete
                  </button>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Prof. {s.professor_name} <span className="muted">#{s.professor_patron_id}</span>
                </div>
                {s.description && <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{s.description}</p>}
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                    Recommended Books ({s.books?.length || 0})
                  </div>
                  {s.books?.length > 0 ? (
                    <ul style={{ paddingLeft: 16, fontSize: 12, color: "var(--text-primary)" }}>
                      {s.books.map((b) => (
                        <li key={b.id} style={{ marginBottom: 4 }}>
                          <strong>{b.title}</strong>
                          {b.accession_number && b.accession_number !== "—" && (
                            <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--accent-gold)", marginLeft: 6 }}>
                              (Acc: {b.accession_number})
                            </span>
                          )}
                          {b.author && <span className="muted" style={{ marginLeft: 4 }}>by {b.author}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="muted" style={{ fontSize: 12 }}>No books added to this shelf yet.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
