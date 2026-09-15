import crypto from "crypto";
import { getDb } from "./db.js";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// In-memory fallback (used only when DB is unreachable)
const _memSessions = new Map();

export const createSession = async (patron) => {
  const token = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  try {
    const db = getDb();
    await db.query(
      "INSERT INTO krc_sessions (token, patron_json, created_at, expires_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE patron_json=VALUES(patron_json), expires_at=VALUES(expires_at)",
      [token, JSON.stringify(patron), now, expiresAt]
    );
  } catch (err) {
    console.error("[Sessions] DB write failed, falling back to memory:", err.message);
    _memSessions.set(token, { patron, createdAt: now, expiresAt });
  }
  return token;
};

export const getSession = async (token) => {
  if (!token) return null;
  const mem = _memSessions.get(token);
  if (mem) {
    if (mem.expiresAt < Date.now()) { _memSessions.delete(token); return null; }
    return mem;
  }
  try {
    const db = getDb();
    const now = Date.now();
    if (Math.random() < 0.01) {
      db.query("DELETE FROM krc_sessions WHERE expires_at < ?", [now]).catch(() => {});
    }
    const [rows] = await db.query(
      "SELECT patron_json, expires_at FROM krc_sessions WHERE token = ?",
      [token]
    );
    if (!rows.length) return null;
    const row = rows[0];
    if (row.expires_at < now) {
      db.query("DELETE FROM krc_sessions WHERE token = ?", [token]).catch(() => {});
      return null;
    }
    return { patron: JSON.parse(row.patron_json), expiresAt: row.expires_at };
  } catch (err) {
    console.error("[Sessions] DB read failed:", err.message);
    return null;
  }
};

export const destroySession = async (token) => {
  _memSessions.delete(token);
  try {
    const db = getDb();
    await db.query("DELETE FROM krc_sessions WHERE token = ?", [token]);
  } catch (err) {
    console.error("[Sessions] DB delete failed:", err.message);
  }
};

export const logLogin = async (patron) => {
  const patronName = `${patron.firstname ?? ""} ${patron.surname ?? ""}`.trim() || patron.userid;
  try {
    const db = getDb();
    await db.query(
      "INSERT INTO patron_login_history (patron_id, cardnumber, name, library_id) VALUES (?, ?, ?, ?)",
      [patron.patron_id, patron.cardnumber || "", patronName, patron.branchcode || patron.library_id || "IITHLIB"]
    );
  } catch (err) {
    console.error("[Sessions] Could not log patron login:", err.message);
  }
};

export const getActivity = async () => {
  try {
    const db = getDb();
    const now = Date.now();

    // 1. Active sessions count from persistent krc_sessions table
    const [activeRows] = await db.query(
      "SELECT COUNT(*) as active_count FROM krc_sessions WHERE expires_at > ?",
      [now]
    );

    // 2. Logins today count
    const [todayRows] = await db.query(
      "SELECT COUNT(*) as today_count FROM patron_login_history WHERE created_at >= CURDATE()"
    );

    // 3. Total tracked logins count
    const [totalRows] = await db.query(
      "SELECT COUNT(*) as total_count FROM patron_login_history"
    );

    // 4. Recent logins list (up to 1000 logins for admin analysis)
    const [recentRows] = await db.query(
      "SELECT patron_id, cardnumber, name, library_id, created_at as ts FROM patron_login_history ORDER BY created_at DESC LIMIT 1000"
    );

    return {
      active_sessions: activeRows[0]?.active_count || 0,
      logins_today: todayRows[0]?.today_count || 0,
      total_logins_tracked: totalRows[0]?.total_count || 0,
      recent_logins: recentRows.map((r) => ({
        patron_id: r.patron_id,
        cardnumber: r.cardnumber,
        name: r.name,
        library_id: r.library_id,
        ts: r.ts,
      })),
    };
  } catch (err) {
    console.error("[Sessions] Error fetching activity:", err.message);
    return { active_sessions: 0, logins_today: 0, total_logins_tracked: 0, recent_logins: [] };
  }
};
