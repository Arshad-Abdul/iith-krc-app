import { useState, useEffect } from "react";
import { sendAdminBroadcast, getAdminBroadcasts, deleteAdminBroadcast } from "../api";

const CHEEKY_TEMPLATES = [
  // Category 1: Guilt & FOMO
  {
    category: "guilt",
    categoryLabel: "💔 Guilt & FOMO",
    title: "Books miss you more than your ex 💔",
    message: "480 seats at KRC and not a single one has your name on it today. Come visit before your GPA starts crying!",
    targetScreen: "occupancy",
    tag: "High Engagement 🔥",
  },
  {
    category: "guilt",
    categoryLabel: "💔 Guilt & FOMO",
    title: "Your attendance here is lower than your battery 🪫",
    message: "KRC charging ports and quiet carrels are waiting. Come plug in your laptop and recharge your brain!",
    targetScreen: "occupancy",
    tag: "Student Relatable ⚡",
  },
  {
    category: "guilt",
    categoryLabel: "💔 Guilt & FOMO",
    title: "We saw you on Instagram at 2 AM 👀",
    message: "If you can scroll reels for 3 hours straight, you can read 15 pages of that textbook. See you on the 2nd floor!",
    targetScreen: "home",
    tag: "Sarcastic 🎯",
  },
  {
    category: "guilt",
    categoryLabel: "💔 Guilt & FOMO",
    title: "Everyone is studying except you... probably 🤫",
    message: "1st & 2nd floors have steady seats open right now. Grab your favorite spot before the evening crowd rolls in!",
    targetScreen: "occupancy",
    tag: "FOMO Trigger 👀",
  },

  // Category 2: AC & Hostel Escape
  {
    category: "hostel",
    categoryLabel: "❄️ AC & Hostel Escape",
    title: "Hostel fan making helicopter noises? 🚁",
    message: "KRC chilled air conditioning is 100% free and dead silent. Grab a discussion booth or individual carrel today!",
    targetScreen: "occupancy",
    tag: "Summer Hit ❄️",
  },
  {
    category: "hostel",
    categoryLabel: "❄️ AC & Hostel Escape",
    title: "Free AC + WiFi + Zero roommates 🛋️",
    message: "Why sweat in the hostel room? Come to the 2nd floor silent reading zone. Cozy, cold, and productive.",
    targetScreen: "occupancy",
    tag: "Comfort First ☕",
  },
  {
    category: "hostel",
    categoryLabel: "❄️ AC & Hostel Escape",
    title: "Your bed is a trap. Run to KRC! 🏃💨",
    message: "Scientifically proven: studying in bed leads to a 3-hour accidental nap. Switch to KRC study chairs instead.",
    targetScreen: "occupancy",
    tag: "Productivity 💡",
  },

  // Category 3: Exam Panic & Deadlines
  {
    category: "panic",
    categoryLabel: "⏰ Exam Panic & Deadlines",
    title: "Assignment deadline: 11:59 PM. Panic: 100% ⏰",
    message: "Don't panic (yet). Grab your laptop, head to 3rd floor reading tables, and let the caffeine-driven magic happen!",
    targetScreen: "occupancy",
    tag: "Deadline Mode 🚀",
  },
  {
    category: "panic",
    categoryLabel: "⏰ Exam Panic & Deadlines",
    title: "Midsems are closer than they appear in mirror 🪞",
    message: "Don't wait for the syllabus to give you a heart attack. Reference textbooks and PYQs are available right now.",
    targetScreen: "home",
    tag: "Exam Season 📚",
  },
  {
    category: "panic",
    categoryLabel: "⏰ Exam Panic & Deadlines",
    title: "The 3 AM genius mode is real 🦉",
    message: "Night owls assemble! Ground floor quiet study area is open late with full lighting and fast internet.",
    targetScreen: "occupancy",
    tag: "Night Owl 🌙",
  },

  // Category 4: Overdue & Book Banter
  {
    category: "overdue",
    categoryLabel: "💸 Overdue & Book Banter",
    title: "Return your book or sponsor our staff pizza party 🍕",
    message: "Your issued book is feeling homesick. Bring it back before the overdue fine starts doing push-ups!",
    targetScreen: "profile",
    tag: "Friendly Reminder 💸",
  },
  {
    category: "overdue",
    categoryLabel: "💸 Overdue & Book Banter",
    title: "Your book is wondering where you went 🥺",
    message: "It’s been sitting on your desk under laundry piles for weeks. Return it or renew it in 1-tap on your app!",
    targetScreen: "profile",
    tag: "Emotional Damage 💔",
  },
  {
    category: "overdue",
    categoryLabel: "💸 Overdue & Book Banter",
    title: "That book isn't hostel furniture! 🪑",
    message: "Other batchmates have placed holds on this title. Drop it by the circulation desk or self-return kiosk today.",
    targetScreen: "profile",
    tag: "Circulation Alert 🔄",
  },

  // Category 5: Bestsellers & New Arrivals
  {
    category: "reads",
    categoryLabel: "📖 Bestsellers & Gossip",
    title: "A wild bestseller just appeared! 📚✨",
    message: "Fresh new arrivals just landed on the 1st Floor display racks. Catch them before that one batchmate borrows them all!",
    targetScreen: "home",
    tag: "Fresh Drop 🎁",
  },
  {
    category: "reads",
    categoryLabel: "📖 Bestsellers & Gossip",
    title: "Plot twist: That book was actually amazing 🤯",
    message: "Trending this week on KRC: Check out the most borrowed books by top IIT Hyderabad readers.",
    targetScreen: "home",
    tag: "Trend Alert 📈",
  },
  {
    category: "reads",
    categoryLabel: "📖 Bestsellers & Gossip",
    title: "Stop doom-scrolling. Read 5 pages. 📵",
    message: "Your attention span called: it wants 15 minutes of peaceful reading in a comfortable armchair at KRC.",
    targetScreen: "home",
    tag: "Digital Detox 🧘",
  },
];

export default function BroadcastNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetScreen, setTargetScreen] = useState("occupancy");
  const [targetId, setTargetId] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [recentBroadcasts, setRecentBroadcasts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [previewDevice, setPreviewDevice] = useState("android"); // android or ios

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await getAdminBroadcasts();
      setRecentBroadcasts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Could not load broadcasts history:", e.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const applyTemplate = (t) => {
    setTitle(t.title);
    setMessage(t.message);
    setTargetScreen(t.targetScreen || "occupancy");
    setTargetId(t.targetId || "");
    setStatus({
      type: "info",
      msg: `Loaded preset: "${t.title}". Feel free to customize or send!`,
    });
  };

  const handleSurpriseMe = () => {
    const random = CHEEKY_TEMPLATES[Math.floor(Math.random() * CHEEKY_TEMPLATES.length)];
    applyTemplate(random);
  };

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
      setStatus({
        type: "success",
        msg: "🚀 Cheeky push notification blasted successfully to all student & staff mobile devices!",
      });
      setTitle("");
      setMessage("");
      setTargetId("");
      loadHistory();
    } catch (err) {
      setStatus({ type: "error", msg: err.message || "Could not broadcast notification." });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this broadcast notification from the mobile app feed?")) return;
    try {
      await deleteAdminBroadcast(id);
      loadHistory();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredTemplates =
    activeCategory === "all"
      ? CHEEKY_TEMPLATES
      : CHEEKY_TEMPLATES.filter((t) => t.category === activeCategory);

  const getCheekinessScore = () => {
    const len = title.length + message.length;
    if (len === 0) return { label: "Waiting for inspiration...", color: "var(--text-muted)", score: "0%" };
    if (title.includes("ex") || title.includes("pizza") || title.includes("fan") || title.includes("bed") || title.includes("scrolling")) {
      return { label: "🔥 Maximum Zomato Cheekiness (Viral Quality)", color: "#f59e0b", score: "98%" };
    }
    if (title.includes("💔") || title.includes("🥺") || title.includes("👀") || title.includes("❄️")) {
      return { label: "🌶️ Witty & Punchy (High Open Rate)", color: "#10b981", score: "85%" };
    }
    return { label: "👍 Good Clear Notice", color: "#3b82f6", score: "65%" };
  };

  const cheekiness = getCheekinessScore();

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Header Banner */}
      <div className="panel-header-row" style={{ marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: "28px" }}>🍕</span>
            <h2 className="panel-title" style={{ fontSize: "22px" }}>
              Cheeky Push Notifications Studio
            </h2>
            <span className="badge-emerald" style={{ fontSize: "11px", fontWeight: "700" }}>
              Zomato-Style Witty Alerts
            </span>
          </div>
          <p className="panel-subtitle">
            Publish witty, humorous push notifications to students&apos; lock screens to drive library visits, beat hostel heat, and make reading fun.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={handleSurpriseMe}
            className="btn-gold"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#ffffff",
              border: "none",
              boxShadow: "0 2px 10px rgba(245, 158, 11, 0.3)",
              fontWeight: "700",
              padding: "9px 18px",
            }}
          >
            <span>🎲</span> Surprise Me (Random Witty)
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {status && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "13.5px",
            fontWeight: "600",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background:
              status.type === "success"
                ? "rgba(16, 185, 129, 0.15)"
                : status.type === "info"
                ? "rgba(59, 130, 246, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${
              status.type === "success"
                ? "rgba(16, 185, 129, 0.4)"
                : status.type === "info"
                ? "rgba(59, 130, 246, 0.4)"
                : "rgba(239, 68, 68, 0.4)"
            }`,
            color:
              status.type === "success" ? "#34d399" : status.type === "info" ? "#60a5fa" : "#f87171",
          }}
        >
          <span>{status.msg}</span>
          <button
            onClick={() => setStatus(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split-Screen Workspace */}
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "24px", alignItems: "start" }}>
        
        {/* LEFT COLUMN: Notification Composer & Templates */}
        <div>
          {/* Notification Form Card */}
          <div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>✍️</span> Compose Notification
              </h3>
              <div style={{ fontSize: "12px", color: cheekiness.color, fontWeight: "700" }}>
                {cheekiness.label}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="form-label" style={{ fontWeight: "700" }}>Catchy Notification Title *</label>
                  <span style={{ fontSize: "11px", color: title.length > 50 ? "#f87171" : "var(--text-muted)" }}>
                    {title.length}/60 chars (Keep short for lock screen)
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Books miss you more than your ex 💔"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  style={{ fontSize: "14.5px", fontWeight: "600", padding: "10px 14px" }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="form-label" style={{ fontWeight: "700" }}>Cheeky Message Body *</label>
                  <span style={{ fontSize: "11px", color: message.length > 140 ? "#f87171" : "var(--text-muted)" }}>
                    {message.length}/180 chars
                  </span>
                </div>
                <textarea
                  rows="3"
                  placeholder="e.g. 480 seats at KRC and not a single one has your name on it today. Come visit before your GPA cries!"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="form-textarea"
                  style={{ fontSize: "13.5px", lineHeight: "1.5", padding: "10px 14px" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: targetScreen === "book-detail" ? "1fr 1fr" : "1fr", gap: "14px", marginBottom: "20px" }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: "600" }}>Tap Action (Where Should It Open?)</label>
                  <select
                    value={targetScreen}
                    onChange={(e) => setTargetScreen(e.target.value)}
                    className="form-select"
                    style={{ padding: "9px 12px" }}
                  >
                    <option value="occupancy">🏛️ Live Floor Occupancy & Gate</option>
                    <option value="home">🏠 App Home Dashboard & New Books</option>
                    <option value="profile">👤 Patron Due Dates & Renewals</option>
                    <option value="dds-ill">📄 Document Delivery (DDS / ILL)</option>
                    <option value="book-detail">📖 Specific Book Detail (Biblio ID)</option>
                  </select>
                </div>

                {targetScreen === "book-detail" && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: "600" }}>Target Book Biblio ID *</label>
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

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Audience: <strong style={{ color: "var(--text-primary)" }}>All Registered App Users</strong>
                </div>

                <button
                  type="submit"
                  disabled={sending || !title.trim() || !message.trim()}
                  className="btn-emerald"
                  style={{
                    padding: "10px 22px",
                    fontWeight: "700",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {sending ? (
                    "Blasting Push Notification..."
                  ) : (
                    <>
                      <span>🚀</span> Blast Notification Now
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Inspiration Gallery: Zomato Cheeky Presets */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <h4 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>💡</span> Zomato Inspiration Library
                </h4>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                  Click &apos;Use This&apos; on any template below to load it into your composer.
                </p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px", marginBottom: "14px" }}>
              {[
                { id: "all", label: "🌟 All (15)" },
                { id: "guilt", label: "💔 Guilt & FOMO" },
                { id: "hostel", label: "❄️ AC & Hostel" },
                { id: "panic", label: "⏰ Exam Panic" },
                { id: "overdue", label: "💸 Overdue Banter" },
                { id: "reads", label: "📖 Bestsellers" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: activeCategory === c.id ? "700" : "500",
                    background: activeCategory === c.id ? "var(--accent-primary)" : "var(--bg-card-alt)",
                    color: activeCategory === c.id ? "#ffffff" : "var(--text-secondary)",
                    border: `1px solid ${activeCategory === c.id ? "var(--accent-primary)" : "var(--border-color)"}`,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Template Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
              {filteredTemplates.map((t, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: "var(--bg-card-alt)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "14px",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#f59e0b", background: "rgba(245, 158, 11, 0.1)", padding: "2px 8px", borderRadius: "6px" }}>
                        {t.tag}
                      </span>
                      <strong style={{ fontSize: "13.5px", color: "var(--text-primary)" }}>{t.title}</strong>
                    </div>
                    <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: 0, lineHeight: "1.4" }}>
                      {t.message}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="btn-secondary"
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                      background: "var(--bg-surface)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Use This ➔
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Realistic Live Smartphone Mockup Preview */}
        <div>
          <div className="card" style={{ padding: "24px", position: "sticky", top: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                <span>📱</span> Live Lock-Screen Preview
              </h3>
              <div style={{ display: "flex", background: "var(--bg-card-alt)", borderRadius: "8px", padding: "2px", border: "1px solid var(--border-color)" }}>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("android")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11.5px",
                    fontWeight: previewDevice === "android" ? "700" : "500",
                    background: previewDevice === "android" ? "var(--bg-surface)" : "transparent",
                    color: previewDevice === "android" ? "var(--text-primary)" : "var(--text-muted)",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Android
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("ios")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11.5px",
                    fontWeight: previewDevice === "ios" ? "700" : "500",
                    background: previewDevice === "ios" ? "var(--bg-surface)" : "transparent",
                    color: previewDevice === "ios" ? "var(--text-primary)" : "var(--text-muted)",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  iPhone
                </button>
              </div>
            </div>

            {/* Smartphone Graphic Shell */}
            <div
              style={{
                background: previewDevice === "android" ? "#121824" : "#0f172a",
                borderRadius: "28px",
                padding: "24px 18px 36px 18px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.1)",
                color: "#ffffff",
                minHeight: "440px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Phone Speaker Notch / Dynamic Island */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <div
                  style={{
                    width: previewDevice === "ios" ? "90px" : "12px",
                    height: previewDevice === "ios" ? "20px" : "12px",
                    background: "#000000",
                    borderRadius: previewDevice === "ios" ? "12px" : "50%",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
              </div>

              {/* Lockscreen Time */}
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{ fontSize: "40px", fontWeight: "300", letterSpacing: "-0.04em", lineHeight: "1" }}>
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "4px", fontWeight: "500" }}>
                  {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                </div>
              </div>

              {/* THE PUSH NOTIFICATION BANNER */}
              <div
                style={{
                  background: previewDevice === "android" ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.18)",
                  backdropFilter: "blur(20px)",
                  borderRadius: previewDevice === "android" ? "16px" : "20px",
                  padding: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Notification App Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: "900",
                        color: "#ffffff",
                      }}
                    >
                      K
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.02em", color: "rgba(255,255,255,0.9)" }}>
                      KRC LIBRARY
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>now</span>
                </div>

                {/* Title */}
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", marginBottom: "4px", lineHeight: "1.3" }}>
                  {title || "Your cheeky headline will appear here 🚀"}
                </div>

                {/* Body */}
                <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.85)", lineHeight: "1.4" }}>
                  {message || "Type in the composer or pick a template from the Zomato inspiration library to preview how students see it on their phones."}
                </div>

                {/* Bottom Action Pill */}
                <div
                  style={{
                    marginTop: "12px",
                    paddingTop: "10px",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#34d399", fontWeight: "700", display: "flex", alignItems: "center", gap: 4 }}>
                    <span>➔</span> Tap to open {targetScreen === "occupancy" ? "Live Occupancy" : targetScreen === "profile" ? "Due Dates" : targetScreen === "dds-ill" ? "DDS Portal" : "Library App"}
                  </span>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>Slide to open</span>
                </div>
              </div>

              {/* Hint below phone */}
              <div style={{ marginTop: "auto", paddingTop: "20px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                  Delivers directly to Android & iOS lock screens via Expo Push Service
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Sent Broadcasts History */}
      <div className="card" style={{ marginTop: "32px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>📜</span> Sent Broadcast History ({recentBroadcasts.length})
            </h3>
            <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
              History of alerts published to the student mobile app feed.
            </p>
          </div>
          <button onClick={loadHistory} className="btn-secondary" style={{ padding: "5px 12px", fontSize: "12px" }}>
            ↻ Refresh Log
          </button>
        </div>

        {loadingHistory ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>Loading history...</div>
        ) : recentBroadcasts.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
            No broadcasts sent yet. Use the composer above to blast your first cheeky notification!
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "22%" }}>Notification Title</th>
                  <th>Message Body</th>
                  <th style={{ width: "12%" }}>Target Screen</th>
                  <th style={{ width: "15%" }}>Sent By</th>
                  <th style={{ width: "14%" }}>Sent Date</th>
                  <th style={{ width: "8%", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentBroadcasts.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong style={{ color: "var(--text-primary)", fontSize: "13px" }}>{b.title}</strong>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "12.5px", lineHeight: "1.4" }}>
                      {b.message}
                    </td>
                    <td>
                      <span className="badge-blue" style={{ fontSize: "11px" }}>
                        {b.target_screen || "home"}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {b.sent_by || "Staff"}
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {new Date(b.created_at).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="btn-danger"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        title="Delete from mobile notification center"
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
      </div>
    </div>
  );
}
