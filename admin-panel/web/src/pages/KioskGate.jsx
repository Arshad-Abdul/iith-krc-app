import { useRef, useState, useEffect } from "react";
import { kioskScan } from "../api";
import krcLogo from "../assets/krc-logo.png";

export default function KioskGate({ onExit, isFullscreen, onToggleFullscreen }) {
  const [cardnumber, setCardnumber] = useState("");
  const [status, setStatus] = useState(null);
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [recentScans, setRecentScans] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOlderBooks, setShowOlderBooks] = useState(false);
  const inputRef = useRef(null);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDateStr(now.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short", year: "numeric" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Autofocus input
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const refocusInput = () => {
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 120);
  };

  const handleScan = async (e) => {
    e.preventDefault();
    const trimmed = cardnumber.trim();
    if (!trimmed || isProcessing) return;

    setIsProcessing(true);
    try {
      const res = await kioskScan({ cardnumber: trimmed, floor_id: "main_gate" });
      const recentList = res.recent_issued_books || res.issued_books || [];
      const olderList = res.older_issued_books || [];

      const newStatus = {
        type: "success",
        msg: res.message || (res.action === "checkout" ? "Check-out successful." : "Check-in successful."),
        patron: res.patronName,
        action: res.action,
        cardnumber: res.cardnumber || trimmed,
        category: res.category || "Patron",
        department: res.department || "",
        checkinTime: res.checkinTime,
        checkoutTime: res.checkoutTime,
        durationMinutes: res.durationMinutes,
        recent_issued_books: recentList,
        older_issued_books: olderList,
        all_issued_books: res.all_issued_books || [...recentList, ...olderList],
        timestamp: res.timestamp || new Date().toISOString()
      };
      setStatus(newStatus);
      setShowOlderBooks(false);
      setRecentScans(prev => [newStatus, ...prev.slice(0, 6)]);
      setCardnumber("");
    } catch (err) {
      const errStatus = {
        type: "error",
        cardnumber: trimmed,
        msg: err.message || "Patron not found or system error.",
        timestamp: new Date().toISOString()
      };
      setStatus(errStatus);
      setCardnumber("");
    } finally {
      setIsProcessing(false);
      refocusInput();
    }
  };

  const handleExitAttempt = () => {
    const pin = window.prompt("Librarian Staff PIN / Password required to exit Kiosk Mode:\n(Default: 2026)");
    if (!pin) return;
    if (pin.trim() === "2026" || pin.trim() === "libadmin@1234" || pin.trim().toLowerCase() === "c039" || pin.trim().toLowerCase() === "admin") {
      if (onExit) onExit();
    } else {
      alert("Unauthorized: Incorrect Staff PIN. Kiosk terminal remains locked.");
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="kiosk-container">
      {/* Top Bar with Exit and Live Status */}
      <div className="kiosk-top-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onExit && (
            <button
              onClick={handleExitAttempt}
              className="btn-secondary"
              style={{ padding: "5px 12px", fontSize: 12.5 }}
              title="Protected Staff Exit"
            >
              🔒 Exit Kiosk (Staff PIN)
            </button>
          )}
          <span className="kiosk-badge-active">
            <span className="kiosk-radar-dot"></span>
            Gate Sensor Online
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 12.5, color: "var(--text-muted)" }}>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{timeStr}</span> • <span>{dateStr}</span>
          </div>
          <button
            onClick={() => window.open(window.location.origin + window.location.pathname + '#/kiosk', '_blank', 'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes')}
            className="btn-sm"
            title="Open Kiosk Gate in a dedicated standalone window without browser toolbars"
          >
            ↗ Dedicated Window
          </button>
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="btn-sm"
              title="Toggle Fullscreen Gate Display"
            >
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
            </button>
          )}
        </div>
      </div>

      {/* Main Kiosk Terminal Card */}
      <div className="kiosk-terminal-card">
        {/* Centered KRC Logo Badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={{
            background: "#ffffff",
            padding: "8px 20px",
            borderRadius: "10px",
            border: "1.5px solid var(--border-color)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <img 
              src={krcLogo} 
              alt="IIT Hyderabad - Knowledge Resource Centre" 
              style={{ height: "46px", width: "auto", objectFit: "contain", display: "block" }} 
            />
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: 6, 
            background: "var(--bg-card-alt)", 
            border: "1px solid var(--border-color)", 
            padding: "3px 12px", 
            borderRadius: 6, 
            marginBottom: 8 
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-secondary)" }}>
              IIT HYDERABAD • KNOWLEDGE RESOURCE CENTRE
            </span>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
            KRC Access Gate
          </h2>

          <p style={{ color: "var(--text-muted)", fontSize: 13.5, margin: "0 0 10px 0" }}>
            Scan patron ID card or enter roll number to check in or out.
          </p>

          {/* Official Facility Gate Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-surface)", border: "1px solid var(--border-color)", padding: "4px 12px", borderRadius: 20, fontSize: 12, color: "var(--text-secondary)" }}>
            <span>🏛️</span>
            <span>Gate Location: <strong style={{ color: "var(--text-primary)" }}>Knowledge Resource Centre (Main Gate)</strong></span>
          </div>
        </div>

        {/* Scanner Target Area */}
        <form onSubmit={handleScan}>
          <div className="kiosk-scan-target">
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Ready for Scan or Input
              </span>
            </div>

            <input
              ref={inputRef}
              type="text"
              className="kiosk-input-field"
              placeholder="Roll No. / Barcode"
              value={cardnumber}
              onChange={(e) => setCardnumber(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck="false"
              disabled={isProcessing}
            />

            <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 10 }}>
              <button 
                type="submit" 
                className="kiosk-btn-submit"
                disabled={!cardnumber.trim() || isProcessing}
                style={{ minWidth: "120px" }}
              >
                {isProcessing ? "Scanning..." : "Submit"}
              </button>
              {cardnumber && (
                <button
                  type="button"
                  onClick={() => { setCardnumber(""); refocusInput(); }}
                  className="btn-secondary"
                  style={{ borderRadius: 6, padding: "8px 16px" }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Status Notification Card */}
        {status && (
          <div style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 10,
            background: status.type === "success" 
              ? (status.action === "checkin" ? "var(--accent-emerald-bg)" : "var(--bg-card-alt)") 
              : "var(--accent-red-bg)",
            border: `1.5px solid ${status.type === "success" 
              ? (status.action === "checkin" ? "rgba(21, 128, 61, 0.35)" : "var(--border-color)") 
              : "rgba(185, 28, 28, 0.35)"}`,
            boxShadow: "var(--shadow-card)"
          }}>
            {status.type === "success" ? (
              <div>
                {/* Header with Action Badge, Patron Photo, Details and Times */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 16, flexWrap: "wrap", gap: 14 }}>
                  <div className="kiosk-patron-card">
                    {/* Official Koha Patron Photo Box */}
                    <div className="kiosk-photo-box" title="Patron Photo from Koha">
                      <div className="kiosk-photo-fallback">
                        {status.patron ? status.patron.split(' ').map(n => n[0]).join('').substring(0, 2) : 'ID'}
                      </div>
                      <img
                        src={`/krc-admin/api/admin/occupancy/patron-photo/${encodeURIComponent(status.cardnumber || status.borrowernumber)}`}
                        alt={status.patron}
                        className="kiosk-photo-img"
                        onError={(e) => {
                          const fallbackUrl = `/mobile-api/api/patron-photo/${encodeURIComponent(status.cardnumber || status.borrowernumber)}`;
                          if (!e.target.dataset.triedFallback) {
                            e.target.dataset.triedFallback = "true";
                            e.target.src = fallbackUrl;
                          } else {
                            e.target.style.display = 'none';
                          }
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        padding: "3px 10px", 
                        borderRadius: 4, 
                        fontSize: 11.5, 
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        background: status.action === "checkin" ? "rgba(21, 128, 61, 0.18)" : "var(--border-color)",
                        color: status.action === "checkin" ? "var(--accent-emerald)" : "var(--text-primary)",
                        marginBottom: 6
                      }}>
                        {status.action === "checkin" ? "✓ Checked In Successfully" : "✓ Checked Out Successfully"}
                      </div>
                      
                      <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                        {status.patron}
                      </h3>
                      
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                        Roll / Card No: <strong style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>{status.cardnumber}</strong>
                        {status.category && <span> • Category: <strong style={{ color: "var(--text-primary)" }}>{status.category}</strong></span>}
                        {status.department && <span> • Dept: <strong style={{ color: "var(--text-primary)" }}>{status.department}</strong></span>}
                      </div>
                    </div>
                  </div>

                  {/* Timing Box */}
                  <div style={{ textAlign: "right", background: "var(--bg-surface)", padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border-color)", alignSelf: "flex-start" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>
                      {status.action === "checkout" ? "Check-out Recorded" : "Check-in Recorded"}
                    </div>
                    <div style={{ fontSize: 16, color: "var(--text-primary)", fontWeight: 700, fontFamily: "monospace", marginTop: 2 }}>
                      {formatTime(status.timestamp)}
                    </div>
                    {status.action === "checkout" && status.checkinTime && (
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3 }}>
                        Check-in was: {formatTime(status.checkinTime)}
                        {status.durationMinutes !== undefined && (
                          <span style={{ fontWeight: 600, color: "var(--text-primary)", marginLeft: 6 }}>
                            ({status.durationMinutes} min{status.durationMinutes !== 1 ? "s" : ""})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Differentiated Check-In vs Check-Out Experience */}
                {status.action === "checkout" ? (
                  /* ── Security Exit Verification (Check-Out Only) ── */
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                      <h4 style={{ margin: 0, color: "var(--text-primary)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>🛡️ Security Exit Verification</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", textTransform: "none" }}>
                          — Books Issued During This Visit / Today ({status.recent_issued_books?.length || 0})
                        </span>
                      </h4>

                      {status.recent_issued_books && status.recent_issued_books.length > 0 ? (
                        <span style={{ fontSize: 11.5, background: "rgba(220, 38, 38, 0.15)", color: "#b91c1c", border: "1px solid rgba(185, 28, 28, 0.3)", padding: "3px 10px", borderRadius: 4, fontWeight: 800 }}>
                          ⚠️ PLEASE VERIFY BOOK ACCESSION IN HAND
                        </span>
                      ) : (
                        <span style={{ fontSize: 11.5, background: "rgba(21, 128, 61, 0.15)", color: "var(--accent-emerald)", border: "1px solid rgba(21, 128, 61, 0.3)", padding: "3px 10px", borderRadius: 4, fontWeight: 700 }}>
                          ✓ CLEAR TO EXIT — NO BOOKS ISSUED TODAY
                        </span>
                      )}
                    </div>

                    {status.recent_issued_books && status.recent_issued_books.length > 0 ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {status.recent_issued_books.map((book, idx) => {
                          const isOverdue = book.date_due && new Date(book.date_due) < new Date();
                          return (
                            <div key={idx} style={{ 
                              background: "var(--bg-surface)", 
                              padding: "12px 14px", 
                              borderRadius: 8,
                              border: "2px solid #ca8a04",
                              boxShadow: "0 2px 5px rgba(202, 138, 4, 0.08)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 12
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "inline-block", background: "#fef08a", color: "#854d0e", fontSize: 10.5, fontWeight: 800, padding: "1px 7px", borderRadius: 3, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                  Newly Issued Book
                                </div>
                                <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 700, lineHeight: 1.3 }}>
                                  {book.title}
                                </div>
                                <div style={{ display: "flex", gap: 14, marginTop: 5, fontSize: 12, color: "var(--text-secondary)", flexWrap: "wrap" }}>
                                  <span>
                                    Accession No: <strong style={{ fontFamily: "monospace", color: "var(--text-primary)", fontSize: 13, background: "var(--bg-card-alt)", padding: "2px 6px", borderRadius: 4 }}>{book.barcode}</strong>
                                  </span>
                                  {book.itemcallnumber && (
                                    <span>
                                      Call No: <strong style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>{book.itemcallnumber}</strong>
                                    </span>
                                  )}
                                  {book.author && <span>Author: {book.author}</span>}
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 11, color: isOverdue ? "#dc2626" : "var(--text-muted)", fontWeight: isOverdue ? 700 : 500 }}>
                                  Due: {formatDate(book.date_due)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: "14px 16px", 
                        background: "var(--accent-emerald-bg)", 
                        border: "1px solid rgba(21, 128, 61, 0.25)", 
                        borderRadius: 8, 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 12 
                      }}>
                        <span style={{ fontSize: 24, color: "var(--accent-emerald)" }}>✓</span>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--accent-emerald)" }}>
                            Clear to Exit — No books issued during this visit
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                            Patron did not issue any new books from the circulation desk today. Guard can clear exit immediately.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Welcome & Entry Clearance (Check-In Only) ── */
                  <div>
                    <div style={{ 
                      padding: "16px 18px", 
                      background: "var(--accent-emerald-bg)", 
                      border: "1.5px solid rgba(21, 128, 61, 0.3)", 
                      borderRadius: 8, 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 14 
                    }}>
                      <span style={{ fontSize: 28, color: "var(--accent-emerald)" }}>✓</span>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--accent-emerald)" }}>
                          Welcome to KRC — Entry Authorized
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>
                          Check-in recorded successfully. Patron is authorized to enter and access library facilities.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                  {/* Collapsible View for Older Books previously at home */}
                  {status.older_issued_books && status.older_issued_books.length > 0 && (
                    <div style={{ marginTop: 12, borderTop: "1px dashed var(--border-color)", paddingTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => setShowOlderBooks(!showOlderBooks)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          fontSize: 12,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 0",
                          fontWeight: 500
                        }}
                      >
                        <span>{showOlderBooks ? "▼ Hide" : "▶ Show"} older books previously issued at home ({status.older_issued_books.length})</span>
                      </button>

                      {showOlderBooks && (
                        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                          {status.older_issued_books.map((book, idx) => (
                            <div key={idx} style={{ 
                              background: "var(--bg-card-alt)", 
                              padding: "8px 12px", 
                              borderRadius: 6,
                              border: "1px solid var(--border-subtle)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: 12
                            }}>
                              <div>
                                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{book.title}</span>
                                <span style={{ color: "var(--text-muted)", marginLeft: 8, fontFamily: "monospace" }}>[Acc: {book.barcode}]</span>
                              </div>
                              <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                Issued: {book.issuedate ? new Date(book.issuedate).toLocaleDateString("en-IN") : "Past loan"}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
              /* Error State */
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 28 }}>⚠️</span>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", color: "var(--accent-red)", fontSize: 15, fontWeight: 700 }}>
                    Scan Unsuccessful
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)" }}>
                    {status.msg}
                  </p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                    Input scanned: <strong style={{ fontFamily: "monospace" }}>{status.cardnumber}</strong>. Please check roll number or swipe card again.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity Mini Feed */}
      {recentScans.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ fontSize: 12.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: 10 }}>
            Recent Gate Passes
          </h4>
          <div style={{ display: "grid", gap: 8 }}>
            {recentScans.map((s, i) => (
              <div 
                key={i} 
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12.5
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ 
                    padding: "2px 8px", 
                    borderRadius: 4, 
                    fontSize: 10.5, 
                    fontWeight: 700,
                    textTransform: "uppercase",
                    background: s.action === "checkin" ? "var(--accent-emerald-bg)" : "var(--bg-card-alt)",
                    color: s.action === "checkin" ? "var(--accent-emerald)" : "var(--text-primary)",
                    border: `1px solid ${s.action === "checkin" ? "rgba(21, 128, 61, 0.25)" : "var(--border-color)"}`
                  }}>
                    {s.action === "checkin" ? "In" : "Out"}
                  </span>
                  <strong style={{ color: "var(--text-primary)" }}>{s.patron}</strong>
                  <span style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>({s.cardnumber})</span>
                  {s.issued_books?.length > 0 && (
                    <span style={{ color: "var(--accent-blue)", fontSize: 11, fontWeight: 600 }}>
                      📚 {s.issued_books.length} book{s.issued_books.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 11.5 }}>
                  {formatTime(s.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
