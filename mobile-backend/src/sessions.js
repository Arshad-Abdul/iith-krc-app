import crypto from "crypto";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const sessions = new Map();

export const createSession = (patron) => {
  const token = crypto.randomUUID();
  sessions.set(token, { patron, expiresAt: Date.now() + SESSION_TTL_MS });
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
