import "dotenv/config";
import axios from "axios";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  hasSuperlibrarianPermission, kohaDelete, kohaGet,
  kohaGetWithCount, kohaPost, resolvePatron, enrichCheckoutsWithTitles,
  KohaError, KohaConflict,
} from "./kohaClient.js";
import { createSession, destroySession, getSession } from "./sessions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.join(__dirname, "../../web/dist");

const app = express();
const PORT = process.env.PORT || 4001;
const MOBILE_BACKEND = process.env.MOBILE_BACKEND_URL || "http://localhost:4002/api";

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl}`);
  next();
});

const requireAuth = async (req, res, next) => {
  const session = await getSession(req.cookies.admin_session);
  if (!session) return res.status(401).json({ error: "Not authenticated." });
  req.kohaSession = session;
  next();
};

// ─── Auth ────────────────────────────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
  const { userid, password } = req.body || {};
  if (!userid || !password) return res.status(400).json({ error: "userid and password are required." });
  try {
    const patron = await resolvePatron(userid, password);
    const isSuper = await hasSuperlibrarianPermission(patron.patron_id, userid, password);
    if (!isSuper) return res.status(403).json({ error: "This account does not have superlibrarian access." });
    const sessionId = await createSession({ userid, password, patron });
    res.cookie("admin_session", sessionId, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ patron });
  } catch (error) {
    return res.status(error instanceof KohaError ? error.status : 502).json({ error: error.message });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  await destroySession(req.cookies.admin_session);
  res.clearCookie("admin_session");
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => res.json({ patron: req.kohaSession.patron }));

// ─── Stats ───────────────────────────────────────────────────────────────────

app.get("/api/stats", requireAuth, async (req, res) => {
  try {
    const { userid, password } = req.kohaSession;
    const [checkouts, patrons] = await Promise.all([
      kohaGetWithCount("/checkouts", { _per_page: 1 }, userid, password),
      kohaGetWithCount("/patrons",   { _per_page: 1 }, userid, password),
    ]);
    res.json({
      active_checkouts: checkouts.total,
      total_patrons: patrons.total,
    });
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── App status ──────────────────────────────────────────────────────────────

app.get("/api/status", requireAuth, async (req, res) => {
  const { userid, password } = req.kohaSession;
  const ping = async (label, fn) => {
    const t = Date.now();
    try { await fn(); return { label, ok: true, ms: Date.now() - t }; }
    catch (e) { return { label, ok: false, ms: Date.now() - t, error: e.message?.slice(0, 80) }; }
  };

  const checks = await Promise.all([
    ping("Koha REST API", () => kohaGet("/config/smtp_servers", {}, userid, password)),
    ping("Mobile Backend", () => axios.get("http://localhost:4002/api/me", { timeout: 3000 })
      .catch((e) => { if (e.response) return; throw e; })),
    ping("OPAC Catalog", () => axios.get("https://opac.krc.iith.ac.in/api/books/recent?limit=1", { timeout: 5000 })),
    { label: "Admin Panel", ok: true, ms: 0 },
  ]);
  res.json(checks);
});

// ─── Recent checkouts ────────────────────────────────────────────────────────

app.get("/api/recent-checkouts", requireAuth, async (req, res) => {
  try {
    const { userid, password } = req.kohaSession;
    const raw = await kohaGet("/checkouts", { _order_by: "-timestamp", _per_page: 20 }, userid, password);
    const data = await enrichCheckoutsWithTitles(Array.isArray(raw) ? raw : [], userid, password);
    res.json(data);
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── Overdues (Full Koha DB with Patron Metadata & Rich Filters) ───────────────

app.get("/api/overdues", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${MOBILE_BACKEND}/admin/overdues`, { params: req.query });
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: e.message });
  }
});

// ─── Patron search + detail ──────────────────────────────────────────────────

app.get("/api/patrons/search", requireAuth, async (req, res) => {
  try {
    const { userid, password } = req.kohaSession;
    const q = req.query.q || "";
    const results = [];
    for (const param of [{ cardnumber: q }, { userid: q }, { surname: q }, { firstname: q }]) {
      try {
        const data = await kohaGet("/patrons", { ...param, _per_page: 10 }, userid, password);
        if (Array.isArray(data)) results.push(...data);
      } catch {}
    }
    const seen = new Set();
    const unique = results.filter((p) => { if (seen.has(p.patron_id)) return false; seen.add(p.patron_id); return true; });
    res.json(unique.slice(0, 20));
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

app.get("/api/patrons/:id", requireAuth, async (req, res) => {
  try {
    const { userid, password } = req.kohaSession;
    const [patron, rawCheckouts, account] = await Promise.all([
      kohaGet(`/patrons/${req.params.id}`, {}, userid, password),
      kohaGet(`/patrons/${req.params.id}/checkouts`, { _order_by: "-checkout_date", _per_page: 50 }, userid, password),
      kohaGet(`/patrons/${req.params.id}/account`, {}, userid, password),
    ]);
    const checkouts = await enrichCheckoutsWithTitles(Array.isArray(rawCheckouts) ? rawCheckouts : [], userid, password);
    res.json({ patron, checkouts, account });
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── Circulation: issue ───────────────────────────────────────────────────────

app.post("/api/issue", requireAuth, async (req, res) => {
  const { barcode, patronId } = req.body || {};
  if (!barcode || !patronId) return res.status(400).json({ error: "barcode and patronId are required." });
  try {
    const { userid, password } = req.kohaSession;
    const items = await kohaGet("/items", { q: JSON.stringify({ barcode }) }, userid, password);
    if (!Array.isArray(items) || items.length === 0) return res.status(404).json({ error: `Item with barcode "${barcode}" not found.` });
    const item = items[0];
    const checkout = await kohaPost("/checkouts", { patron_id: Number(patronId), item_id: item.item_id }, userid, password);
    res.json({ checkout, item });
  } catch (e) {
    if (e instanceof KohaConflict) return res.status(409).json({ error: e.message, details: e.data });
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── Circulation: return ──────────────────────────────────────────────────────

app.post("/api/return", requireAuth, async (req, res) => {
  const { barcode } = req.body || {};
  if (!barcode) return res.status(400).json({ error: "barcode is required." });
  try {
    const { userid, password } = req.kohaSession;
    const items = await kohaGet("/items", { q: JSON.stringify({ barcode }) }, userid, password);
    if (!Array.isArray(items) || items.length === 0) return res.status(404).json({ error: `Item with barcode "${barcode}" not found.` });
    const item = items[0];
    const checkouts = await kohaGet("/checkouts", { item_id: item.item_id, _per_page: 1 }, userid, password);
    if (!Array.isArray(checkouts) || checkouts.length === 0) return res.status(404).json({ error: `No active checkout found for barcode "${barcode}".` });
    const checkout = checkouts[0];
    await kohaDelete(`/checkouts/${checkout.checkout_id}`, userid, password);
    res.json({ ok: true, checkout, item });
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── App activity & Content Management (proxied from mobile-backend) ──────────

app.get("/api/app-activity", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${MOBILE_BACKEND}/admin/activity`, { timeout: 3000 });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "Could not reach mobile backend." });
  }
});

// Events
app.get("/api/events", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${MOBILE_BACKEND}/admin/events`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.post("/api/events", requireAuth, async (req, res) => {
  try {
    const staffName = `${req.kohaSession.patron?.firstname || ""} ${req.kohaSession.patron?.surname || ""}`.trim() || req.kohaSession.userid;
    const { data } = await axios.post(`${MOBILE_BACKEND}/admin/events`, { ...req.body, created_by: staffName });
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.response?.data?.error || e.message });
  }
});

app.put("/api/events/:id", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.put(`${MOBILE_BACKEND}/admin/events/${req.params.id}`, req.body);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.response?.data?.error || e.message });
  }
});

app.delete("/api/events/:id", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.delete(`${MOBILE_BACKEND}/admin/events/${req.params.id}`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.response?.data?.error || e.message });
  }
});

// App Content: Reviews, Clubs, Recommendations, Shelves
app.get("/api/admin/reviews", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${MOBILE_BACKEND}/admin/reviews`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.delete("/api/admin/reviews/:id", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.delete(`${MOBILE_BACKEND}/admin/reviews/${req.params.id}`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.get("/api/admin/club-messages", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${MOBILE_BACKEND}/admin/club-messages`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.delete("/api/admin/club-messages/:id", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.delete(`${MOBILE_BACKEND}/admin/club-messages/${req.params.id}`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.get("/api/admin/recommendations", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${MOBILE_BACKEND}/admin/recommendations`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.get("/api/admin/professor-shelves", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${MOBILE_BACKEND}/admin/professor-shelves`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// Admin DDS / ILL
app.get("/api/admin/dds", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${MOBILE_BACKEND}/admin/dds`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.put("/api/admin/dds/:id", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.put(`${MOBILE_BACKEND}/admin/dds/${req.params.id}`, req.body);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.delete("/api/admin/dds/:id", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.delete(`${MOBILE_BACKEND}/admin/dds/${req.params.id}`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// Admin Occupancy
app.get("/api/admin/occupancy/floors", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${MOBILE_BACKEND}/admin/occupancy/floors`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.response?.data?.error || e.message });
  }
});

app.post("/api/admin/occupancy/floors", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.post(`${MOBILE_BACKEND}/admin/occupancy/floors`, req.body);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.response?.data?.error || e.message });
  }
});

app.delete("/api/admin/occupancy/floors/:id", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.delete(`${MOBILE_BACKEND}/admin/occupancy/floors/${req.params.id}`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.response?.data?.error || e.message });
  }
});

app.get("/api/admin/occupancy/report", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${MOBILE_BACKEND}/admin/occupancy/report`, { params: req.query });
    res.json(data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to get occupancy report." });
  }
});

app.post("/api/admin/occupancy/kiosk", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.post(`${MOBILE_BACKEND}/admin/occupancy/kiosk`, req.body);
    res.json(data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to scan kiosk." });
  }
});

// Stream patron photo from Koha via mobile-backend
app.get("/api/admin/occupancy/patron-photo/:identifier", async (req, res) => {
  try {
    const response = await axios.get(
      `${MOBILE_BACKEND}/patron-photo/${encodeURIComponent(req.params.identifier)}`,
      {
        responseType: "arraybuffer",
        validateStatus: (status) => status < 500
      }
    );
    if (response.status === 200) {
      res.setHeader("Content-Type", response.headers["content-type"] || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(response.data);
    }
    return res.status(response.status).send(response.data);
  } catch (e) {
    return res.status(404).send("Photo not found");
  }
});

// Admin Broadcast Notifications
app.post("/api/admin/broadcast-notifications", requireAuth, async (req, res) => {
  try {
    const { data } = await axios.post(`${MOBILE_BACKEND}/admin/broadcast-notifications`, {
      ...req.body,
      sent_by: `${req.kohaSession.patron?.firstname || ''} ${req.kohaSession.patron?.surname || ''}`.trim() || 'Library Staff',
    });
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ─── Static files (built Vite app) ───────────────────────────────────────────

app.use(express.static(WEB_DIST));
app.get("*", (_req, res) => res.sendFile(path.join(WEB_DIST, "index.html")));

app.listen(PORT, () => console.log(`KRC admin panel listening on http://localhost:${PORT}`));

