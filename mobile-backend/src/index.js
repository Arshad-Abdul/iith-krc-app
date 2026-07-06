import "dotenv/config";
import cors from "cors";
import express from "express";
import {
  KohaError,
  enrichCheckoutsWithTitles,
  findPatronByUserid,
  getAccountLines,
  getCheckouts,
  getHolds,
  verifyPatronCredentials,
} from "./kohaClient.js";
import { createSession, destroySession, getSession, logLogin, getActivity } from "./sessions.js";

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl}`);
  next();
});

const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  req.session = session;
  next();
};

app.post("/api/auth/login", async (req, res) => {
  const { userid, password } = req.body || {};
  if (!userid || !password) {
    return res.status(400).json({ error: "userid and password are required." });
  }

  try {
    const isValid = await verifyPatronCredentials(userid, password);
    if (!isValid) {
      return res.status(401).json({ error: "Incorrect userid or password." });
    }

    const patron = await findPatronByUserid(userid);
    if (!patron) {
      return res.status(404).json({
        error: "Login correct, but the service account could not find your patron record.",
      });
    }

    const token = createSession(patron);
    logLogin(patron);
    return res.json({ token, patron });
  } catch (error) {
    const status = error instanceof KohaError ? error.status : 502;
    return res.status(status).json({ error: error.message });
  }
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  destroySession(token);
  res.json({ ok: true });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ patron: req.session.patron });
});

app.get("/api/checkouts", requireAuth, async (req, res) => {
  try {
    const raw = await getCheckouts(req.session.patron.patron_id);
    const data = await enrichCheckoutsWithTitles(Array.isArray(raw) ? raw : []);
    res.json(data);
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message });
  }
});

app.get("/api/account", requireAuth, async (req, res) => {
  try {
    const data = await getAccountLines(req.session.patron.patron_id);
    res.json(data);
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message });
  }
});

app.get("/api/holds", requireAuth, async (req, res) => {
  try {
    const data = await getHolds(req.session.patron.patron_id);
    res.json(data);
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message });
  }
});

// Only accessible from localhost — used by admin panel server
app.get("/api/admin/activity", (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || "";
  if (!ip.includes("127.0.0.1") && !ip.includes("::1") && !ip.includes("localhost")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(getActivity());
});

app.listen(PORT, () => {
  console.log(`KRC mobile backend listening on http://localhost:${PORT}`);
});
