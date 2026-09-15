import crypto from "crypto";
import mysql from "mysql2/promise";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days persistent

let db = null;

const getDb = async () => {
  if (!db) {
    db = await mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "krc_app",
      password: process.env.DB_PASSWORD || "KrcApp@iith2026",
      database: process.env.DB_NAME || "krc_mobile_db",
      waitForConnections: true,
      connectionLimit: 10,
    });
    // Create admin_sessions table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id VARCHAR(64) PRIMARY KEY,
        userid VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        patron_data TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }
  return db;
};

// Fallback in-memory map
const memorySessions = new Map();

export const createSession = async ({ userid, password, patron }) => {
  const id = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  memorySessions.set(id, { userid, password, patron, expiresAt });
  try {
    const pool = await getDb();
    await pool.query(
      "INSERT INTO admin_sessions (id, userid, password, patron_data, expires_at) VALUES (?, ?, ?, ?, ?)",
      [id, userid, password, JSON.stringify(patron), expiresAt]
    );
  } catch (e) {
    console.error("[Session] Error persisting admin session:", e.message);
  }
  return id;
};

export const getSession = async (id) => {
  if (!id) return null;

  // 1. Check memory cache first
  const mem = memorySessions.get(id);
  if (mem) {
    if (mem.expiresAt < Date.now()) {
      memorySessions.delete(id);
      return null;
    }
    return mem;
  }

  // 2. Check persistent MySQL database
  try {
    const pool = await getDb();
    const [rows] = await pool.query(
      "SELECT userid, password, patron_data, expires_at FROM admin_sessions WHERE id = ? AND expires_at > ?",
      [id, Date.now()]
    );
    if (rows.length > 0) {
      const row = rows[0];
      const patron = JSON.parse(row.patron_data);
      const sessionObj = { userid: row.userid, password: row.password, patron, expiresAt: Number(row.expires_at) };
      memorySessions.set(id, sessionObj);
      return sessionObj;
    }
  } catch (e) {
    console.error("[Session] Error retrieving admin session from DB:", e.message);
  }
  return null;
};

export const destroySession = async (id) => {
  if (!id) return;
  memorySessions.delete(id);
  try {
    const pool = await getDb();
    await pool.query("DELETE FROM admin_sessions WHERE id = ?", [id]);
  } catch (e) {
    console.error("[Session] Error deleting session from DB:", e.message);
  }
};
