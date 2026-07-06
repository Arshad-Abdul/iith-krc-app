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

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl}`);
  next();
});

const requireAuth = (req, res, next) => {
  const session = getSession(req.cookies.admin_session);
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
    const sessionId = createSession({ userid, password, patron });
    res.cookie("admin_session", sessionId, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 1000 });
    return res.json({ patron });
  } catch (error) {
    return res.status(error instanceof KohaError ? error.status : 502).json({ error: error.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  destroySession(req.cookies.admin_session);
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

// ─── Overdues ─────────────────────────────────────────────────────────────────

app.get("/api/overdues", requireAuth, async (req, res) => {
  try {
    const { userid, password } = req.kohaSession;
    const now = new Date().toISOString();
    const overdues = [];
    let page = 1;
    while (overdues.length < 200) {
      const data = await kohaGet("/checkouts", {
        _order_by: "due_date", _per_page: 100, _page: page,
      }, userid, password);
      if (!Array.isArray(data) || data.length === 0) break;
      const od = data.filter((c) => c.due_date && c.due_date < now);
      overdues.push(...od);
      if (data.some((c) => !c.due_date || c.due_date >= now)) break;
      if (data.length < 100) break;
      page++;
    }
    const enriched = await enrichCheckoutsWithTitles(overdues.slice(0, 200), userid, password);
    res.json(enriched);
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message });
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

// ─── Static files (built Vite app) ───────────────────────────────────────────

app.use(express.static(WEB_DIST));
app.get("*", (_req, res) => res.sendFile(path.join(WEB_DIST, "index.html")));

app.listen(PORT, () => console.log(`KRC admin panel listening on http://localhost:${PORT}`));
