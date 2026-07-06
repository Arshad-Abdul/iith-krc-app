import crypto from "crypto";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const sessions = new Map();

const recentLogins = []; // circular buffer, max 100
const MAX_LOGINS = 100;

export const createSession = (patron) => {
  const token = crypto.randomUUID();
  sessions.set(token, { patron, createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
};

export const getSession = (token) => {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
};

export const destroySession = (token) => {
  sessions.delete(token);
};

export const logLogin = (patron) => {
  recentLogins.unshift({
    patron_id: patron.patron_id,
    cardnumber: patron.cardnumber,
    name: `${patron.firstname ?? ""} ${patron.surname ?? ""}`.trim() || patron.userid,
    library_id: patron.library_id,
    ts: new Date().toISOString(),
  });
  if (recentLogins.length > MAX_LOGINS) recentLogins.pop();
};

export const getActivity = () => {
  const now = Date.now();
  const activeSessions = [...sessions.values()].filter((s) => s.expiresAt > now);
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const loginsToday = recentLogins.filter((l) => l.ts >= since24h).length;
  return {
    active_sessions: activeSessions.length,
    logins_today: loginsToday,
    total_logins_tracked: recentLogins.length,
    recent_logins: recentLogins.slice(0, 20),
  };
};
