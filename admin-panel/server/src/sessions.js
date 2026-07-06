import crypto from "crypto";

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const sessions = new Map();

export const createSession = ({ userid, password, patron }) => {
  const id = crypto.randomUUID();
  sessions.set(id, { userid, password, patron, expiresAt: Date.now() + SESSION_TTL_MS });
  return id;
};

export const getSession = (id) => {
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(id);
    return null;
  }
  return session;
};

export const destroySession = (id) => {
  sessions.delete(id);
};
