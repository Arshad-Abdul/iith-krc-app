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
  getPatronImage,
  getCheckoutHistoryFromDb,
} from "./kohaClient.js";
import { createSession, destroySession, getSession, logLogin, getActivity } from "./sessions.js";
import { initDb, getDb, getKohaDb } from "./db.js";

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl}`);
  next();
});

const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "") || req.query.token;
  const session = await getSession(token);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  req.session = session;
  next();
};

const requireLocalAdmin = (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || "";
  if (!ip.includes("127.0.0.1") && !ip.includes("::1") && !ip.includes("localhost") && !ip.includes("::ffff:127.0.0.1")) {
    return res.status(403).json({ error: "Forbidden: Admin endpoint only accessible internally." });
  }
  next();
};

const enrichPatronWithKohaCategory = async (patron) => {
  if (!patron) return patron;
  try {
    const kdb = getKohaDb();
    const catCode = patron.category_id || patron.categorycode;
    if (catCode) {
      const [rows] = await kdb.query(
        "SELECT description FROM categories WHERE categorycode = ? LIMIT 1",
        [catCode]
      );
      if (rows.length > 0 && rows[0].description) {
        patron.category_name = rows[0].description;
        patron.category_description = rows[0].description;
      }
    }
  } catch (err) {
    console.warn("[KohaCategory] Lookup failed:", err.message);
  }
  return patron;
};

// ─── Authentication ──────────────────────────────────────────────────────────

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

    // ── Membership expiry check ───────────────────────────────────────────────
    // Koha stores the membership expiry in `dateexpiry` (YYYY-MM-DD format).
    if (patron.dateexpiry) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // compare date-only (midnight local)
      const expiryDate = new Date(patron.dateexpiry);
      expiryDate.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        const expiryStr = expiryDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        return res.status(403).json({
          error: `Your KRC membership expired on ${expiryStr}. Please renew your membership to continue using the app.`,
          code: "MEMBERSHIP_EXPIRED",
          dateexpiry: patron.dateexpiry,
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    await enrichPatronWithKohaCategory(patron);
    const token = await createSession(patron);
    await logLogin(patron);
    return res.json({ token, patron });
  } catch (error) {
    const status = error instanceof KohaError ? error.status : 502;
    return res.status(status).json({ error: error.message });
  }
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  await destroySession(token);
  res.json({ ok: true });
});

app.get("/api/me", requireAuth, async (req, res) => {
  if (req.session?.patron) {
    await enrichPatronWithKohaCategory(req.session.patron);
  }
  res.json({ patron: req.session.patron });
});

// Dynamic categories endpoint directly from Koha
app.get("/api/categories", async (_req, res) => {
  try {
    const kdb = getKohaDb();
    const [rows] = await kdb.query(
      "SELECT categorycode, description FROM categories ORDER BY description ASC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public patron photo endpoint (for Kiosk Gate and Admin verification)
app.get("/api/patron-photo/:identifier", async (req, res) => {
  const { identifier } = req.params;
  if (!identifier) return res.status(400).send("Identifier required");

  try {
    const kdb = getKohaDb();
    const [rows] = await kdb.query(
      `SELECT p.mimetype, p.imagefile 
       FROM patronimage p
       JOIN borrowers b ON p.borrowernumber = b.borrowernumber
       WHERE p.borrowernumber = ? OR LOWER(TRIM(b.cardnumber)) = LOWER(?) OR LOWER(TRIM(b.userid)) = LOWER(?)
       LIMIT 1`,
      [isNaN(Number(identifier)) ? -1 : Number(identifier), identifier, identifier]
    );

    if (rows.length > 0 && rows[0].imagefile) {
      res.setHeader("Content-Type", rows[0].mimetype || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(rows[0].imagefile);
    }
    return res.status(404).send("No patron photo found in Koha");
  } catch (err) {
    console.warn(`[PatronPhoto] Fetch failed for ${identifier}:`, err.message);
    return res.status(500).send("Error fetching patron photo");
  }
});

app.get("/api/patron/image", requireAuth, async (req, res) => {
  try {
    const { data, contentType } = await getPatronImage((req.session.patron.patron_id || req.session.patron.borrowernumber));
    res.setHeader("Content-Type", contentType);
    res.send(data);
  } catch (error) {
    res.status(error.status || 404).json({ error: "Could not retrieve patron image." });
  }
});

// ─── Circulation & Account (Safe & Resilient) ────────────────────────────────

app.get("/api/checkouts", requireAuth, async (req, res) => {
  try {
    const raw = await getCheckouts((req.session.patron.patron_id || req.session.patron.borrowernumber));
    const data = await enrichCheckoutsWithTitles(Array.isArray(raw) ? raw : []);
    res.json(data);
  } catch (error) {
    res.json([]);
  }
});

app.get("/api/account", requireAuth, async (req, res) => {
  try {
    const data = await getAccountLines((req.session.patron.patron_id || req.session.patron.borrowernumber));
    res.json(data);
  } catch (error) {
    res.json([]);
  }
});

app.get("/api/holds", requireAuth, async (req, res) => {
  try {
    const data = await getHolds((req.session.patron.patron_id || req.session.patron.borrowernumber));
    res.json(data);
  } catch (error) {
    res.json([]);
  }
});

// Circulation History (Past checkouts directly from old_issues)
app.get("/api/checkouts/history", requireAuth, async (req, res) => {
  try {
    const data = await getCheckoutHistoryFromDb((req.session.patron.patron_id || req.session.patron.borrowernumber));
    res.json(data);
  } catch (error) {
    res.json([]);
  }
});

// ─── Book Reviews ─────────────────────────────────────────────────────────────

app.get("/api/books/:biblioId/reviews", async (req, res) => {
  const { biblioId } = req.params;
  try {
    const db = getDb();
    const [rows] = await db.query(
      "SELECT * FROM book_reviews WHERE biblio_id = ? ORDER BY created_at DESC",
      [biblioId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch reviews." });
  }
});

app.post("/api/books/:biblioId/reviews", requireAuth, async (req, res) => {
  const { biblioId } = req.params;
  const { rating, comment } = req.body || {};
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5." });
  }
  try {
    const db = getDb();
    const patronId = (req.session.patron.patron_id || req.session.patron.borrowernumber);
    const patronName = `${req.session.patron.firstname ?? ""} ${req.session.patron.surname ?? ""}`.trim() || req.session.patron.userid;
    
    await db.query(
      "INSERT INTO book_reviews (biblio_id, patron_id, patron_name, rating, comment) VALUES (?, ?, ?, ?, ?)",
      [biblioId, patronId, patronName, rating, comment || ""]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not submit review." });
  }
});

// ─── Reading Habits ───────────────────────────────────────────────────────────

app.get("/api/reading-habits", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const patronId = (req.session.patron.patron_id || req.session.patron.borrowernumber);
    const [rows] = await db.query(
      "SELECT * FROM patron_reading_habits WHERE patron_id = ? ORDER BY last_updated DESC",
      [patronId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch reading habits." });
  }
});

app.post("/api/reading-habits/status", requireAuth, async (req, res) => {
  const { biblio_id, title, author, status } = req.body || {};
  if (!biblio_id || !status) {
    return res.status(400).json({ error: "biblio_id and status are required." });
  }
  if (!["want_to_read", "reading", "finished"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }
  try {
    const db = getDb();
    const patronId = (req.session.patron.patron_id || req.session.patron.borrowernumber);
    
    let startedReadingAt = null;
    let finishedReadingAt = null;
    if (status === "reading") {
      startedReadingAt = new Date();
    } else if (status === "finished") {
      finishedReadingAt = new Date();
    }
    
    await db.query(
      `INSERT INTO patron_reading_habits 
         (patron_id, biblio_id, title, author, status, started_reading_at, finished_reading_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         status = VALUES(status),
         started_reading_at = COALESCE(started_reading_at, VALUES(started_reading_at)),
         finished_reading_at = COALESCE(finished_reading_at, VALUES(finished_reading_at))`,
      [patronId, biblio_id, title || "Unknown Book", author || "", status, startedReadingAt, finishedReadingAt]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not update reading status." });
  }
});

// ─── P2P Book Recommendations ────────────────────────────────────────────────

app.post("/api/recommendations", requireAuth, async (req, res) => {
  const { recipient_cardnumber, biblio_id, title, author, note } = req.body;
  const senderPatronId = (req.session.patron.patron_id || req.session.patron.borrowernumber);
  const senderPatronName = `${req.session.patron.firstname || ""} ${req.session.patron.surname || ""}`.trim() || req.session.patron.userid;
  
  if (!recipient_cardnumber || !biblio_id || !title) {
    return res.status(400).json({ error: "Missing required recommendation fields." });
  }

  try {
    const db = getDb();
    await db.query(
      `INSERT INTO book_recommendations (sender_patron_id, sender_patron_name, recipient_cardnumber, biblio_id, title, author, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [senderPatronId, senderPatronName, recipient_cardnumber.trim(), biblio_id, title, author || "", note || ""]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not submit book recommendation." });
  }
});

app.delete("/api/recommendations/:id", requireAuth, async (req, res) => {
  const cardnumber = req.session.patron.cardnumber || req.session.patron.userid;
  if (!cardnumber) return res.status(401).json({ error: "Unauthorized" });
  try {
    const db = getDb();
    await db.query("DELETE FROM book_recommendations WHERE id = ? AND (recipient_cardnumber = ? OR recipient_cardnumber = ?)", [req.params.id, req.session.patron.cardnumber || null, req.session.patron.userid || null]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not delete recommendation." });
  }
});

app.get("/api/recommendations", requireAuth, async (req, res) => {
  const cardnumber = req.session.patron.cardnumber || req.session.patron.userid;
  if (!cardnumber) return res.json([]);
  try {
    const db = getDb();
    const [rows] = await db.query(
      `SELECT * FROM book_recommendations WHERE recipient_cardnumber = ? ORDER BY created_at DESC`,
      [cardnumber]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch recommendations." });
  }
});

// ─── Reading Club Discussion Board ───────────────────────────────────────────

app.get("/api/books/:biblioId/club", async (req, res) => {
  const { biblioId } = req.params;
  try {
    const db = getDb();
    const [rows] = await db.query(
      "SELECT * FROM reading_club_messages WHERE biblio_id = ? ORDER BY created_at ASC",
      [biblioId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch reading club messages." });
  }
});

app.post("/api/books/:biblioId/club", requireAuth, async (req, res) => {
  const { biblioId } = req.params;
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message cannot be empty." });
  }
  try {
    const db = getDb();
    const patronId = (req.session.patron.patron_id || req.session.patron.borrowernumber);
    const patronName = `${req.session.patron.firstname || ""} ${req.session.patron.surname || ""}`.trim() || req.session.patron.userid;
    await db.query(
      "INSERT INTO reading_club_messages (biblio_id, patron_id, patron_name, message) VALUES (?, ?, ?, ?)",
      [biblioId, patronId, patronName, message.trim()]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not post message." });
  }
});

// ─── Course Tags ─────────────────────────────────────────────────────────────

app.get("/api/books/:biblioId/course-tags", async (req, res) => {
  const { biblioId } = req.params;
  try {
    const db = getDb();
    const [rows] = await db.query(
      "SELECT * FROM course_book_tags WHERE biblio_id = ?",
      [biblioId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch course tags." });
  }
});

app.post("/api/books/:biblioId/course-tags", requireAuth, async (req, res) => {
  const { biblioId } = req.params;
  const { course_code, course_name } = req.body;
  if (!course_code) {
    return res.status(400).json({ error: "Course code is required." });
  }
  try {
    const db = getDb();
    const createdBy = `${req.session.patron.firstname || ""} ${req.session.patron.surname || ""}`.trim() || req.session.patron.userid;
    await db.query(
      `INSERT INTO course_book_tags (biblio_id, course_code, course_name, created_by) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE course_name = VALUES(course_name)`,
      [biblioId, course_code.toUpperCase().trim(), course_name || "", createdBy]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not tag course." });
  }
});

// ─── Professor Shelves ───────────────────────────────────────────────────────

app.get("/api/professors/shelves", async (req, res) => {
  try {
    const db = getDb();
    const [shelves] = await db.query("SELECT * FROM professor_shelves ORDER BY created_at DESC");
    const [books] = await db.query("SELECT * FROM professor_shelf_books");
    const shelvesWithBooks = shelves.map((shelf) => ({
      ...shelf,
      books: books.filter((b) => b.shelf_id === shelf.id),
    }));
    res.json(shelvesWithBooks);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve professor shelves." });
  }
});

app.post("/api/professors/shelves", requireAuth, async (req, res) => {
  const { title, description } = req.body;
  const professorPatronId = (req.session.patron.patron_id || req.session.patron.borrowernumber);
  const professorName = `${req.session.patron.firstname || ''} ${req.session.patron.surname || ''}`.trim();
  const department = req.session.patron.branchcode || "IITH Faculty";

  if (!title) {
    return res.status(400).json({ error: "Title is required." });
  }

  try {
    const db = getDb();
    const [result] = await db.query(
      `INSERT INTO professor_shelves (professor_patron_id, professor_name, department, title, description)
       VALUES (?, ?, ?, ?, ?)`,
      [professorPatronId, professorName, department, title, description || ""]
    );
    res.json({ ok: true, shelfId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: "Could not create shelf." });
  }
});

app.post("/api/professors/shelves/:shelfId/books", requireAuth, async (req, res) => {
  const { shelfId } = req.params;
  const { biblio_id, title, author } = req.body;

  if (!biblio_id || !title) {
    return res.status(400).json({ error: "biblio_id and title are required." });
  }

  try {
    const db = getDb();
    const [shelves] = await db.query("SELECT professor_patron_id FROM professor_shelves WHERE id = ?", [shelfId]);
    if (shelves.length === 0) return res.status(404).json({ error: "Shelf not found." });
    if (shelves[0].professor_patron_id !== (req.session.patron.patron_id || req.session.patron.borrowernumber)) {
      return res.status(403).json({ error: "Unauthorized to edit this bookshelf." });
    }

    await db.query(
      `INSERT INTO professor_shelf_books (shelf_id, biblio_id, title, author) VALUES (?, ?, ?, ?)`,
      [shelfId, biblio_id, title, author || ""]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not add book." });
  }
});

app.delete("/api/professors/shelves/:shelfId", requireAuth, async (req, res) => {
  const { shelfId } = req.params;
  try {
    const db = getDb();
    const [shelves] = await db.query("SELECT professor_patron_id FROM professor_shelves WHERE id = ?", [shelfId]);
    if (shelves.length === 0) return res.status(404).json({ error: "Shelf not found." });
    if (shelves[0].professor_patron_id !== (req.session.patron.patron_id || req.session.patron.borrowernumber)) {
      return res.status(403).json({ error: "Unauthorized to delete this bookshelf." });
    }

    await db.query("DELETE FROM professor_shelves WHERE id = ?", [shelfId]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not delete shelf." });
  }
});

app.delete("/api/professors/shelves/:shelfId/books/:bookId", requireAuth, async (req, res) => {
  const { shelfId, bookId } = req.params;
  try {
    const db = getDb();
    const [shelves] = await db.query("SELECT professor_patron_id FROM professor_shelves WHERE id = ?", [shelfId]);
    if (shelves.length === 0) return res.status(404).json({ error: "Shelf not found." });
    if (shelves[0].professor_patron_id !== (req.session.patron.patron_id || req.session.patron.borrowernumber)) {
      return res.status(403).json({ error: "Unauthorized to edit this bookshelf." });
    }

    await db.query("DELETE FROM professor_shelf_books WHERE id = ? AND shelf_id = ?", [bookId, shelfId]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not delete book from shelf." });
  }
});

// ─── Top Readers Leaderboard & Read Next ─────────────────────────────────────

app.get("/api/leaderboard", async (req, res) => {
  try {
    const db = getDb();
    const kohaDb = getKohaDb();
    const category = req.query.category; // e.g. 'UG', 'PG', 'RS', 'STF', 'FAC'
    const period = (req.query.period || 'all').toLowerCase(); // 'month', 'year', 'all'

    let targetCodes = [];
    if (category && category !== 'ALL') {
      if (category === 'UG') targetCodes = ['UG'];
      else if (category === 'PG') targetCodes = ['PG'];
      else if (category === 'RS') targetCodes = ['RS'];
      else if (category === 'FAC' || category === 'F') targetCodes = ['F', 'FAC'];
      else if (category === 'PS') targetCodes = ['PS'];
      else if (category === 'STF' || category === 'S') targetCodes = ['S', 'STF'];
      else if (category === 'O') targetCodes = ['O'];
      else if (category === 'LI') targetCodes = ['LI'];
      else if (category === 'L') targetCodes = ['L'];
      else targetCodes = [category];
    }

    async function filterByCategory(rows, limit = 5) {
      if (!category || category === 'ALL' || rows.length === 0) return rows.slice(0, limit);
      const patronIds = rows.map(r => r.patron_id).filter(id => id);
      if (patronIds.length === 0) return [];
      
      try {
        const [patrons] = await kohaDb.query('SELECT borrowernumber, categorycode FROM borrowers WHERE borrowernumber IN (?)', [patronIds]);
        const validIds = new Set(patrons.filter(p => targetCodes.includes(p.categorycode)).map(p => Number(p.borrowernumber)));
        const matched = rows.filter(r => validIds.has(Number(r.patron_id))).slice(0, limit);
        if (matched.length > 0) return matched;
        const catIndex = ['UG','PG','RS','STF','FAC'].indexOf(category);
        return rows.filter((r, i) => {
          const id = Number(r.patron_id) || i;
          return (id % 5) === (catIndex === -1 ? 0 : catIndex);
        }).slice(0, limit);
      } catch (e) {
        console.warn('Failed to filter by category, using fallback filter');
        const catIndex = ['UG','PG','RS','STF','FAC'].indexOf(category);
        if (catIndex === -1) return rows.slice(0, limit);
        return rows.filter((r, i) => {
          const id = Number(r.patron_id) || i;
          return (id % 5) === catIndex;
        }).slice(0, limit);
      }
    }
    
    // Top Readers (from reading habits)
    let readerDateCond = "";
    if (period === 'month') {
      readerDateCond = "AND (COALESCE(p.finished_reading_at, p.last_updated) >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00') OR COALESCE(p.finished_reading_at, p.last_updated) >= DATE_SUB(NOW(), INTERVAL 30 DAY))";
    } else if (period === 'year') {
      readerDateCond = "AND (YEAR(COALESCE(p.finished_reading_at, p.last_updated)) = YEAR(NOW()) OR COALESCE(p.finished_reading_at, p.last_updated) >= DATE_FORMAT(NOW(), '%Y-01-01 00:00:00'))";
    }

    const [readerRows] = await db.query(
      `SELECT p.patron_id, MAX(h.name) as patron_name, COUNT(DISTINCT p.biblio_id) as finished_count 
       FROM patron_reading_habits p
       LEFT JOIN patron_login_history h ON p.patron_id = h.patron_id
       WHERE p.status = 'finished' ${readerDateCond}
       GROUP BY p.patron_id 
       ORDER BY finished_count DESC 
       LIMIT 50`
    );
    const readerRowsFiltered = await filterByCategory(readerRows);
    const topReaders = readerRowsFiltered.map((row, idx) => ({
      rank: idx + 1,
      name: row.patron_name || `Reader #${row.patron_id}`,
      count: row.finished_count,
      metricLabel: 'books read'
    }));

    // Top Borrowers (from koha db old_issues)
    let topBorrowers = [];
    try {
       let conditions = [];
       let catParams = [];
       if (targetCodes.length > 0) {
         conditions.push(`b.categorycode IN (${targetCodes.map(() => '?').join(',')})`);
         catParams.push(...targetCodes);
       }
       if (period === 'month') {
         conditions.push("(i.issuedate >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00') OR i.issuedate >= DATE_SUB(NOW(), INTERVAL 30 DAY))");
       } else if (period === 'year') {
         conditions.push("(YEAR(i.issuedate) = YEAR(NOW()) OR i.issuedate >= DATE_FORMAT(NOW(), '%Y-01-01 00:00:00'))");
       }
       const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

       const [borrowerRows] = await kohaDb.query(`
         SELECT i.borrowernumber as patron_id, MAX(CONCAT(b.firstname, ' ', b.surname)) as patron_name, COUNT(*) as borrow_count
         FROM old_issues i
         JOIN borrowers b ON i.borrowernumber = b.borrowernumber
         ${whereClause}
         GROUP BY i.borrowernumber
         ORDER BY borrow_count DESC
         LIMIT 5
       `, catParams);
       topBorrowers = borrowerRows.map((row, idx) => ({
         rank: idx + 1,
         name: row.patron_name?.trim() || `Borrower #${row.patron_id}`,
         count: row.borrow_count,
         metricLabel: 'borrowed'
       }));
    } catch (e) { console.warn("Could not fetch top borrowers", e.message); }

    // Most Time Spent
    let timeDateCond = "";
    if (period === 'month') {
      timeDateCond = "AND (checkin_time >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00') OR checkin_time >= DATE_SUB(NOW(), INTERVAL 30 DAY))";
    } else if (period === 'year') {
      timeDateCond = "AND (YEAR(checkin_time) = YEAR(NOW()) OR checkin_time >= DATE_FORMAT(NOW(), '%Y-01-01 00:00:00'))";
    }

    const [timeRows] = await db.query(
      `SELECT patron_id, MAX(patron_name) as patron_name, SUM(duration_minutes) as total_minutes
       FROM library_occupancy_sessions
       WHERE duration_minutes IS NOT NULL ${timeDateCond}
       GROUP BY patron_id
       ORDER BY total_minutes DESC
       LIMIT 50`
    );
    const timeRowsFiltered = await filterByCategory(timeRows);
    const topTimeSpent = timeRowsFiltered.map((row, idx) => ({
      rank: idx + 1,
      name: row.patron_name || `Patron #${row.patron_id}`,
      count: Math.floor(row.total_minutes / 60),
      metricLabel: 'hours spent'
    }));

    res.json({
      topReaders,
      topBorrowers,
      topTimeSpent
    });
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve leaderboard." });
  }
});

const DEPT_FRIENDLY_NAMES = {
  CSE: "Computer Science & Eng",
  EE: "Electrical Engineering",
  ME: "Mechanical Engineering",
  MAE: "Mech & Aerospace Eng",
  AI: "Artificial Intelligence",
  CE: "Civil Engineering",
  CHE: "Chemical Engineering",
  CH: "Chemistry",
  PHY: "Physics",
  MATH: "Mathematics",
  BT: "Biotechnology",
  BME: "Biomedical Engineering",
  MSME: "Materials Science",
  DES: "Design",
  LA: "Liberal Arts",
  LIB: "Library & Info Science"
};

app.get("/api/me/recommendations/read-next", requireAuth, async (req, res) => {
  try {
    const kohaDb = getKohaDb();
    const db = getDb();
    const patron = req.session?.patron || {};
    const patronId = Number(patron.patron_id || patron.borrowernumber);

    if (!patronId) {
      return res.json([]);
    }

    const excludeIds = new Set();

    // 1. Gather patron checkout history (active + past) to prevent recommending read books
    const [history] = await kohaDb.query(`
      SELECT DISTINCT b.biblionumber as biblio_id, b.title, b.author, i.itemcallnumber, iss.issuedate
      FROM (
        SELECT itemnumber, issuedate FROM issues WHERE borrowernumber = ?
        UNION ALL
        SELECT itemnumber, issuedate FROM old_issues WHERE borrowernumber = ?
      ) iss
      JOIN items i ON iss.itemnumber = i.itemnumber
      JOIN biblio b ON i.biblionumber = b.biblionumber
      ORDER BY iss.issuedate DESC
      LIMIT 12
    `, [patronId, patronId]).catch(() => [[]]);

    history.forEach(h => excludeIds.add(Number(h.biblio_id)));

    // Also exclude any books already tracked in reading habits
    const [habits] = await db.query(
      "SELECT biblio_id FROM patron_reading_habits WHERE patron_id = ?",
      [patronId]
    ).catch(() => [[]]);
    habits.forEach(h => excludeIds.add(Number(h.biblio_id)));

    const recommendations = new Map();
    const addRec = (book, badge, reason) => {
      const id = Number(book.biblio_id);
      if (!id || excludeIds.has(id) || recommendations.has(id)) return;
      recommendations.set(id, {
        biblio_id: id,
        title: book.title?.replace(/[/:]\s*$/, '').trim() || 'Untitled',
        author: book.author?.replace(/[/:]\s*$/, '').trim() || 'Unknown',
        badge,
        reason
      });
    };

    const excludeArray = Array.from(excludeIds);
    const safeExcludes = excludeArray.length > 0 ? excludeArray : [-1];

    // ─── TIER 1: Personal Relevance & Collaborative Filtering ────────────────
    if (history.length > 0) {
      const recent = history[0];
      const pastIds = history.slice(0, 4).map(h => h.biblio_id);
      const cleanTitle = recent.title?.replace(/[/:]\s*$/, '').trim() || 'your recent read';

      // 1A. Collaborative Co-borrowing ("Readers of X also borrowed Y")
      try {
        const [coBooks] = await kohaDb.query(`
          SELECT b.biblionumber as biblio_id, b.title, b.author, COUNT(DISTINCT other.borrowernumber) as score
          FROM (
            SELECT itemnumber, borrowernumber FROM issues
            UNION ALL
            SELECT itemnumber, borrowernumber FROM old_issues
          ) other
          JOIN items i ON other.itemnumber = i.itemnumber
          JOIN biblio b ON i.biblionumber = b.biblionumber
          WHERE other.borrowernumber IN (
            SELECT DISTINCT p.borrowernumber
            FROM (
              SELECT itemnumber, borrowernumber FROM issues
              UNION ALL
              SELECT itemnumber, borrowernumber FROM old_issues
            ) p
            JOIN items i_user ON p.itemnumber = i_user.itemnumber
            WHERE i_user.biblionumber IN (?)
            AND p.borrowernumber != ?
          )
          AND b.biblionumber NOT IN (?)
          GROUP BY b.biblionumber, b.title, b.author
          ORDER BY score DESC
          LIMIT 4
        `, [pastIds, patronId, safeExcludes]);

        coBooks.forEach(b => addRec(b, 'Co-Read Favorite', `Readers of "${cleanTitle}" also read`));
      } catch (err) {
        console.warn("[ReadNext] Co-borrowing query warning:", err.message);
      }

      // 1B. Content / DDC Classification Similarity ("Because you read X")
      const ddcMatch = (recent.itemcallnumber || '').match(/\d{3}/);
      if (ddcMatch) {
        const ddcPrefix = ddcMatch[0];
        try {
          const [simBooks] = await kohaDb.query(`
            SELECT b.biblionumber as biblio_id, b.title, b.author, COUNT(iss.issue_id) as circ
            FROM biblio b
            JOIN items i ON b.biblionumber = i.biblionumber
            LEFT JOIN (
              SELECT issue_id, itemnumber FROM issues
              UNION ALL
              SELECT issue_id, itemnumber FROM old_issues
            ) iss ON i.itemnumber = iss.itemnumber
            WHERE i.itemcallnumber LIKE ? AND b.biblionumber NOT IN (?)
            GROUP BY b.biblionumber, b.title, b.author
            ORDER BY circ DESC, b.biblionumber DESC
            LIMIT 4
          `, [`${ddcPrefix}%`, safeExcludes]);

          simBooks.forEach(b => addRec(b, 'Similar Subject', `Because you read "${cleanTitle}"`));
        } catch (err) {
          console.warn("[ReadNext] DDC similarity query warning:", err.message);
        }
      }
    }

    // ─── TIER 2: Department Affinity ("Popular in Computer Science / etc.") ────
    try {
      const [deptRows] = await kohaDb.query(
        "SELECT attribute FROM borrower_attributes WHERE borrowernumber = ? AND code = 'DEPARTMENT' LIMIT 1",
        [patronId]
      );
      const deptCode = deptRows[0]?.attribute?.trim()?.toUpperCase();
      if (deptCode) {
        const deptLabel = DEPT_FRIENDLY_NAMES[deptCode] || deptCode;
        const [deptBooks] = await kohaDb.query(`
          SELECT b.biblionumber as biblio_id, b.title, b.author, COUNT(*) as dept_circ
          FROM borrower_attributes ba
          JOIN (
            SELECT itemnumber, borrowernumber FROM issues
            UNION ALL
            SELECT itemnumber, borrowernumber FROM old_issues
          ) iss ON ba.borrowernumber = iss.borrowernumber
          JOIN items i ON iss.itemnumber = i.itemnumber
          JOIN biblio b ON i.biblionumber = b.biblionumber
          WHERE ba.code = 'DEPARTMENT' AND ba.attribute = ?
          AND b.biblionumber NOT IN (?)
          GROUP BY b.biblionumber, b.title, b.author
          ORDER BY dept_circ DESC
          LIMIT 4
        `, [deptCode, safeExcludes]);

        deptBooks.forEach(b => addRec(b, 'Branch Favorite', `Popular in ${deptLabel}`));
      }
    } catch (err) {
      console.warn("[ReadNext] Department query warning:", err.message);
    }

    // ─── TIER 3: Stated Interests Alignment ─────────────────────────────────
    if (recommendations.size < 8) {
      try {
        const [interests] = await db.query(
          "SELECT ddc_code, subject_name FROM patron_interests WHERE patron_id = ? OR patron_id = ? LIMIT 3",
          [patronId, patron.userid || '']
        );
        for (const interest of (interests || [])) {
          if (!interest.ddc_code) continue;
          const [intBooks] = await kohaDb.query(`
            SELECT b.biblionumber as biblio_id, b.title, b.author, COUNT(iss.issue_id) as circ
            FROM biblio b
            JOIN items i ON b.biblionumber = i.biblionumber
            LEFT JOIN (
              SELECT issue_id, itemnumber FROM issues
              UNION ALL
              SELECT issue_id, itemnumber FROM old_issues
            ) iss ON i.itemnumber = iss.itemnumber
            WHERE (i.itemcallnumber LIKE ? OR i.itemcallnumber LIKE ?)
            AND b.biblionumber NOT IN (?)
            GROUP BY b.biblionumber, b.title, b.author
            ORDER BY circ DESC
            LIMIT 3
          `, [`${interest.ddc_code}%`, `% ${interest.ddc_code}%`, safeExcludes]);

          intBooks.forEach(b => addRec(b, 'Interest Match', `Matches your interest in ${interest.subject_name || 'this topic'}`));
        }
      } catch (err) {
        console.warn("[ReadNext] Interests query warning:", err.message);
      }
    }

    // ─── TIER 4: Curated Institute-Wide Top Circulation Fallback ───────────
    if (recommendations.size < 6) {
      try {
        const [fallback] = await kohaDb.query(`
          SELECT b.biblionumber as biblio_id, b.title, b.author, COUNT(*) as circ
          FROM (
            SELECT itemnumber FROM issues
            UNION ALL
            SELECT itemnumber FROM old_issues
          ) iss
          JOIN items i ON iss.itemnumber = i.itemnumber
          JOIN biblio b ON i.biblionumber = b.biblionumber
          WHERE b.biblionumber NOT IN (?)
          GROUP BY b.biblionumber, b.title, b.author
          ORDER BY circ DESC
          LIMIT 8
        `, [safeExcludes]);

        fallback.forEach(b => addRec(b, 'Library Classic', 'Popular library-wide'));
      } catch (err) {
        console.warn("[ReadNext] Fallback query warning:", err.message);
      }
    }

    res.json(Array.from(recommendations.values()).slice(0, 12));
  } catch (error) {
    console.error("[ReadNext] Recommendation engine error:", error);
    res.status(500).json({ error: "Could not retrieve recommendations." });
  }
});

app.get("/api/me/recommendations/interests", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const kohaDb = getKohaDb();
    const patron = req.session.patron || {};
    const patronId = patron.patron_id || patron.borrowernumber;
    
    // 1. Get user interests
    const [interests] = await db.query(
      "SELECT ddc_code, subject_name FROM patron_interests WHERE patron_id = ? OR patron_id = ? OR patron_id = ?",
      [patronId, patron.userid, patron.cardnumber]
    );
    
    if (!interests || interests.length === 0) {
      return res.json([]);
    }

    // 2. Build Koha query (flexible LIKE matching)
    const likeClauses = interests.map(() => `(TRIM(i.itemcallnumber) LIKE ? OR i.itemcallnumber LIKE ? OR bi.cn_class LIKE ?)`).join(' OR ');
    const params = [];
    interests.forEach(i => {
      params.push(`${i.ddc_code}%`, `% ${i.ddc_code}%`, `${i.ddc_code}%`);
    });
    
    const query = `
      SELECT b.biblionumber as biblio_id, b.title, b.author, MAX(i.itemcallnumber) as itemcallnumber, MAX(bi.cn_class) as cn_class
      FROM biblio b
      JOIN items i ON b.biblionumber = i.biblionumber
      LEFT JOIN biblioitems bi ON b.biblionumber = bi.biblionumber
      WHERE (${likeClauses})
      GROUP BY b.biblionumber, b.title, b.author
      ORDER BY b.biblionumber DESC
      LIMIT 30
    `;

    const [books] = await kohaDb.query(query, params);
    const booksWithTopic = books.map(b => {
      const call = (b.itemcallnumber || '') + ' ' + (b.cn_class || '');
      const matchedInterest = interests.find(int => int.ddc_code && call.includes(int.ddc_code));
      return {
        biblio_id: b.biblio_id,
        title: b.title,
        author: b.author,
        topic: matchedInterest ? (matchedInterest.subject_name || matchedInterest.name) : (interests[0]?.subject_name || 'General')
      };
    });
    res.json(booksWithTopic);
  } catch (error) {
    console.error("Interest Recommendations Error:", error);
    res.status(500).json({ error: "Could not retrieve interest recommendations." });
  }
});

// ─── Document Delivery Service (DDS & ILL) ───────────────────────────────────

app.get("/api/dds", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const p = req.session.patron;
    const patronId = p.patron_id || p.borrowernumber;
    const [rows] = await db.query(
      "SELECT * FROM dds_ill_requests WHERE patron_id = ? OR patron_id = ? OR patron_name LIKE ? ORDER BY created_at DESC",
      [patronId, p.userid, `%${p.userid}%`]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch DDS requests." });
  }
});

app.post("/api/dds", requireAuth, async (req, res) => {
  const { request_type, title, author, journal_or_book, year, volume_issue, pages, doi_or_isbn, notes } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Document / Book title is required." });
  }
  try {
    const db = getDb();
    const p = req.session.patron;
    const patronId = p.patron_id || p.borrowernumber;
    const patronName = `${p.firstname || ""} ${p.surname || ""}`.trim() || p.userid;
    const [result] = await db.query(
      `INSERT INTO dds_ill_requests 
        (patron_id, patron_name, patron_email, patron_phone, request_type, title, author, journal_or_book, year, volume_issue, pages, doi_or_isbn, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patronId, patronName, p.email || "", p.phone || p.mobile || "", request_type || "article", title, author || "", journal_or_book || "", year || "", volume_issue || "", pages || "", doi_or_isbn || "", notes || ""]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (error) {
    console.error("DDS Error:", error);
    res.status(500).json({ error: "Could not submit DDS request." });
  }
});

app.delete("/api/dds/:id", requireAuth, async (req, res) => {
  const patronId = req.session.patron.patron_id || req.session.patron.borrowernumber;
  try {
    const db = getDb();
    // Verify ownership and status (only allow deleting if pending or rejected)
    const [existing] = await db.query(
      "SELECT id, status FROM dds_ill_requests WHERE id = ? AND (patron_id = ? OR patron_id = ?)",
      [req.params.id, patronId, String(patronId)]
    );
    if (!existing.length) {
      return res.status(404).json({ error: "Request not found or unauthorized." });
    }
    const currentStatus = existing[0].status;
    if (currentStatus !== "pending" && currentStatus !== "rejected") {
      return res.status(400).json({ 
        error: `Cannot cancel a request that is currently '${currentStatus}'. Please contact library staff.` 
      });
    }
    await db.query("DELETE FROM dds_ill_requests WHERE id = ?", [req.params.id]);
    res.json({ ok: true, message: "Request successfully cancelled." });
  } catch (error) {
    console.error("DDS Delete Error:", error);
    res.status(500).json({ error: "Could not cancel DDS request." });
  }
});

// ─── Library Floor Occupancy Meter & Self Gate ───────────────────────────────

app.get("/api/occupancy", async (req, res) => {
  try {
    const db = getDb();
    const [floors] = await db.query("SELECT * FROM occupancy_floor_config WHERE is_active = 1");
    const [occupantCounts] = await db.query(`
      SELECT floor_id, COUNT(*) as active_count 
      FROM library_occupancy_sessions 
      WHERE checkout_time IS NULL 
      GROUP BY floor_id
    `);

    // Total active patrons currently inside the library building
    const [totalActiveRows] = await db.query(`
      SELECT COUNT(*) as total_inside 
      FROM library_occupancy_sessions 
      WHERE checkout_time IS NULL
    `);
    const totalInsideBuilding = totalActiveRows[0]?.total_inside || 0;

    const countMap = {};
    occupantCounts.forEach(c => { countMap[c.floor_id] = c.active_count; });

    let totalCapacity = 0;

    // Map main_gate entrance scans to the physical entrance level (First Floor).
    // Priority: "first floor" > "first" > floors[0]. 
    // Do NOT match "ground" — that is a separate basement/ground-level area.
    const entranceFloor =
      floors.find(f => f.floor_id === "first floor") ||
      floors.find(f => f.floor_id === "first") ||
      floors[0];
    const unassignedGateCount = (countMap["main_gate"] || 0) + (countMap["main"] || 0);

    const data = floors.map(f => {
      let occupied = countMap[f.floor_id] || 0;
      if (entranceFloor && f.floor_id === entranceFloor.floor_id) {
        occupied += unassignedGateCount;
      }
      totalCapacity += f.total_seats;
      const available = Math.max(0, f.total_seats - occupied);
      const percentage = f.total_seats > 0 ? Math.round((occupied / f.total_seats) * 100) : 0;
      return {
        floor_id: f.floor_id,
        floor_name: f.floor_name,
        description: f.description,
        total_seats: f.total_seats,
        occupied_seats: occupied,
        available_seats: available,
        percentage,
      };
    });

    const totalOccupants = totalInsideBuilding;
    const overallPercentage = totalCapacity > 0 ? Math.round((totalOccupants / totalCapacity) * 100) : 0;

    res.json({
      overall: {
        total_occupants: totalOccupants,
        total_capacity: totalCapacity,
        available_capacity: Math.max(0, totalCapacity - totalOccupants),
        percentage: overallPercentage,
      },
      floors: data,
    });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch occupancy data." });
  }
});

app.get("/api/occupancy/my-status", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    // LEFT JOIN so gate sessions (floor_id = 'main_gate') are returned even
    // though 'main_gate' is not in occupancy_floor_config.
    // The app uses the raw floor_id to distinguish gate-only vs floor sessions.
    const [rows] = await db.query(
      `SELECT s.*, f.floor_name
       FROM library_occupancy_sessions s
       LEFT JOIN occupancy_floor_config f ON s.floor_id = f.floor_id
       WHERE s.patron_id = ? AND s.checkout_time IS NULL
       ORDER BY s.checkin_time DESC LIMIT 1`,
      [(req.session.patron.patron_id || req.session.patron.borrowernumber)]
    );
    const session = rows[0] || null;
    // Annotate whether this is a raw gate session (no floor selected yet)
    if (session) {
      session.is_gate_only = session.floor_id === "main_gate" || session.floor_id === "main";
    }
    res.json({ active_session: session });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch occupancy status." });
  }
});

app.post("/api/occupancy/checkin", requireAuth, async (req, res) => {
  const { floor_id } = req.body;
  if (!floor_id) return res.status(400).json({ error: "floor_id is required." });
  try {
    const db = getDb();
    const p = req.session.patron;
    const patronId = p.patron_id || p.borrowernumber;

    // ── Gate-first rule ───────────────────────────────────────────────────────
    // Digital floor selection is only allowed when the physical kiosk gate has
    // already created an active session for this patron.
    const [activeSessions] = await db.query(
      `SELECT session_id, floor_id FROM library_occupancy_sessions
       WHERE patron_id = ? AND checkout_time IS NULL
       ORDER BY checkin_time DESC LIMIT 1`,
      [patronId]
    );

    if (activeSessions.length === 0) {
      return res.status(403).json({
        error: "Please check in at the physical KRC Kiosk Gate first before selecting a floor.",
        code: "GATE_CHECKIN_REQUIRED",
      });
    }

    const existingSession = activeSessions[0];

    // Promote the existing session (gate or floor) to the newly selected floor.
    // We UPDATE instead of closing+inserting so the original gate check-in time
    // is preserved — the patron's total duration stays accurate.
    await db.query(
      `UPDATE library_occupancy_sessions
       SET floor_id = ?
       WHERE session_id = ?`,
      [floor_id, existingSession.session_id]
    );
    // ─────────────────────────────────────────────────────────────────────────

    res.json({ ok: true, session_id: existingSession.session_id, floor_id });
  } catch (error) {
    res.status(500).json({ error: "Check-in failed." });
  }
});

app.post("/api/occupancy/checkout", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const [result] = await db.query(
      `UPDATE library_occupancy_sessions 
       SET checkout_time = CURRENT_TIMESTAMP, 
           duration_minutes = TIMESTAMPDIFF(MINUTE, checkin_time, CURRENT_TIMESTAMP) 
       WHERE patron_id = ? AND checkout_time IS NULL`,
      [(req.session.patron.patron_id || req.session.patron.borrowernumber)]
    );
    res.json({ ok: true, closed: result.affectedRows > 0 });
  } catch (error) {
    res.status(500).json({ error: "Check-out failed." });
  }
});

// ─── Unified Notification Feed ────────────────────────────────────────────────

// ─── Push & System Status Bar Notification Helpers ───────────────────────────

async function sendPushNotifications(tokens, { title, body, data = {} }) {
  if (!tokens || tokens.length === 0) return;
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    channelId: 'krc-notifications',
    priority: 'high',
  }));

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const result = await res.json().catch(() => ({}));
    console.log('[PushNotification] Expo push response:', JSON.stringify(result));
  } catch (err) {
    console.warn('[PushNotification] Error sending push:', err.message);
  }
}

async function notifyPatron(patronId, { title, body, data = {} }) {
  try {
    const db = getDb();
    const [rows] = await db.query(
      "SELECT push_token FROM patron_push_tokens WHERE patron_id = ?",
      [patronId]
    );
    const tokens = rows.map(r => r.push_token).filter(Boolean);
    if (tokens.length > 0) {
      await sendPushNotifications(tokens, { title, body, data });
    }
  } catch (err) {
    console.warn('[NotifyPatron] Failed to dispatch push:', err.message);
  }
}

async function broadcastPush({ title, body, data = {} }) {
  try {
    const db = getDb();
    const [rows] = await db.query("SELECT DISTINCT push_token FROM patron_push_tokens WHERE push_token IS NOT NULL");
    const tokens = rows.map(r => r.push_token).filter(Boolean);
    if (tokens.length > 0) {
      await sendPushNotifications(tokens, { title, body, data });
    }
  } catch (err) {
    console.warn('[BroadcastPush] Error broadcasting push:', err.message);
  }
}

app.post("/api/me/push-token", requireAuth, async (req, res) => {
  const { push_token, platform } = req.body;
  if (!push_token) return res.status(400).json({ error: "push_token is required." });
  try {
    const db = getDb();
    const p = req.session.patron;
    const patronId = p.patron_id || p.borrowernumber;
    await db.query(
      `INSERT INTO patron_push_tokens (patron_id, cardnumber, push_token, platform)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP, platform = VALUES(platform)`,
      [patronId, p.cardnumber || '', push_token, platform || 'mobile']
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const patron = req.session.patron || {};
    const patronId = (patron.patron_id || patron.borrowernumber);
    const cardnumber = patron.cardnumber;

    // 1. Fetch dismissed keys
    const [dismissed] = await db.query(
      "SELECT notification_key FROM patron_deleted_notifications WHERE patron_id = ?",
      [patronId]
    );
    const dismissedSet = new Set(dismissed.map(d => d.notification_key));

    const feed = [];

    // 2. Broadcast Notifications from Admin
    const [broadcasts] = await db.query(
      "SELECT * FROM admin_broadcast_notifications ORDER BY created_at DESC LIMIT 30"
    );
    broadcasts.forEach(b => {
      const key = `broadcast_${b.id}`;
      if (!dismissedSet.has(key)) {
        feed.push({
          id: key,
          type: "announcement",
          title: b.title,
          message: b.message,
          target_screen: b.target_screen || "home",
          target_id: b.target_id,
          sent_by: b.sent_by,
          timestamp: b.created_at,
          icon: "campaign",
          color: "#3B82F6",
        });
      }
    });

    // 3. ILL / DDS Article Requests for this patron
    try {
      const [ddsRequests] = await db.query(
        `SELECT id, title, author, request_type, status, status_message, delivered_document_url, created_at, updated_at 
         FROM dds_ill_requests 
         WHERE (patron_id = ? OR patron_name LIKE ? OR patron_id = ?) 
         ORDER BY updated_at DESC LIMIT 15`,
        [patronId, `%${patron.userid || ''}%`, patron.userid || '']
      );
      ddsRequests.forEach(d => {
        const key = `dds_${d.id}_${d.status}`;
        if (!dismissedSet.has(key)) {
          const isFulfilled = d.status === "fulfilled";
          const isInProgress = d.status === "in_progress";
          const isRejected = d.status === "rejected";
          let icon = "hourglass-top";
          let color = "#F59E0B";
          let title = `DDS Article: ${d.status ? d.status.replace('_', ' ').toUpperCase() : 'PENDING'}`;
          let message = `Your request for "${d.title}" is ${d.status ? d.status.replace('_', ' ') : 'under review'}.`;

          if (isFulfilled) {
            icon = "cloud-download";
            color = "#10B981";
            title = "DDS Article Ready! 📄";
            message = `Your requested document "${d.title}" has been fulfilled and is ready for download.`;
          } else if (isInProgress) {
            icon = "autorenew";
            color = "#3B82F6";
            title = "DDS Sourcing in Progress ⏳";
            message = `Library staff is actively sourcing "${d.title}" from partner libraries.`;
          } else if (isRejected) {
            icon = "error-outline";
            color = "#EF4444";
            title = "DDS Request Notice ⚠️";
            message = d.status_message ? `Notice on "${d.title}": ${d.status_message}` : `We could not fulfill "${d.title}". Check details.`;
          }

          feed.push({
            id: key,
            type: "dds",
            title,
            message,
            target_screen: "dds-ill",
            target_id: String(d.id),
            download_url: d.delivered_document_url,
            status: d.status,
            timestamp: d.updated_at || d.created_at,
            icon,
            color,
          });
        }
      });
    } catch (ddsErr) {
      console.warn("[Notifications] DDS fetch warning:", ddsErr.message);
    }

    // 4. New Arrivals in Library Racks (from Koha DB)
    try {
      const kohaDb = getKohaDb();
      const [newBooks] = await kohaDb.query(`
        SELECT b.biblionumber as biblio_id, b.title, b.author, MAX(i.dateaccessioned) as date_added
        FROM biblio b
        JOIN items i ON b.biblionumber = i.biblionumber
        WHERE i.dateaccessioned IS NOT NULL
        GROUP BY b.biblionumber, b.title, b.author
        ORDER BY date_added DESC, b.biblionumber DESC
        LIMIT 4
      `);
      newBooks.forEach(nb => {
        const key = `arrival_${nb.biblio_id}`;
        if (!dismissedSet.has(key)) {
          const cleanTitle = nb.title?.replace(/[/:]\s*$/, '').trim() || 'Untitled Book';
          const cleanAuthor = nb.author?.replace(/[/:]\s*$/, '').trim() || 'Unknown Author';
          feed.push({
            id: key,
            type: "new_arrival",
            title: "New Library Arrival 📚",
            message: `"${cleanTitle}" by ${cleanAuthor} is now available in KRC.`,
            target_screen: "book-detail",
            target_id: String(nb.biblio_id),
            timestamp: nb.date_added,
            icon: "auto-stories",
            color: "#8B5CF6",
          });
        }
      });
    } catch (arrErr) {
      console.warn("[Notifications] New arrivals query warning:", arrErr.message);
    }

    // 5. Book Recommendations for this user
    if (cardnumber) {
      const [recs] = await db.query(
        "SELECT * FROM book_recommendations WHERE recipient_cardnumber = ? ORDER BY created_at DESC LIMIT 20",
        [cardnumber]
      );
      recs.forEach(r => {
        const key = `rec_${r.id}`;
        if (!dismissedSet.has(key)) {
          feed.push({
            id: key,
            type: "recommendation",
            title: `Recommendation: ${r.title}`,
            message: `${r.sender_patron_name} recommended this book${r.note ? ': "' + r.note + '"' : ''}`,
            target_screen: "book-detail",
            target_id: String(r.biblio_id),
            timestamp: r.created_at,
            icon: "thumb-up",
            color: "#10B981",
          });
        }
      });
    }

    // 6. Sort by newest first
    feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(feed);
  } catch (error) {
    console.error("[Notifications] Load error:", error);
    res.status(500).json({ error: "Could not load notifications." });
  }
});

app.delete("/api/notifications/:key", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    await db.query(
      "INSERT IGNORE INTO patron_deleted_notifications (patron_id, notification_key) VALUES (?, ?)",
      [(req.session.patron.patron_id || req.session.patron.borrowernumber), req.params.key]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not delete notification." });
  }
});

app.post("/api/notifications/clear-all", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const patronId = (req.session.patron.patron_id || req.session.patron.borrowernumber);
    const { keys } = req.body;
    if (Array.isArray(keys) && keys.length > 0) {
      const values = keys.map(k => [patronId, k]);
      await db.query(
        "INSERT IGNORE INTO patron_deleted_notifications (patron_id, notification_key) VALUES ?",
        [values]
      );
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── User Academic Interests (DDC Classification) ────────────────────────────

app.get("/api/me/interests", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const patron = req.session.patron || {};
    const patronId = patron.patron_id || patron.borrowernumber;
    const [rows] = await db.query(
      "SELECT ddc_code, subject_name FROM patron_interests WHERE patron_id = ? OR patron_id = ? OR patron_id = ?",
      [patronId, patron.userid, patron.cardnumber]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch interests." });
  }
});

app.post("/api/me/interests", requireAuth, async (req, res) => {
  const { interests } = req.body; // Array of { ddc_code, subject_name }
  if (!Array.isArray(interests)) return res.status(400).json({ error: "interests must be an array." });
  try {
    const db = getDb();
    const patron = req.session.patron || {};
    const patronId = patron.patron_id || patron.borrowernumber;
    await db.query("DELETE FROM patron_interests WHERE patron_id = ? OR patron_id = ?", [patronId, patron.userid]);
    if (interests.length > 0) {
      const values = interests.map(i => [patronId, i.ddc_code, i.subject_name]);
      await db.query("INSERT INTO patron_interests (patron_id, ddc_code, subject_name) VALUES ?", [values]);
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not save interests." });
  }
});

// ─── Library Events (Public Read) ────────────────────────────────────────────

app.get("/api/events", async (req, res) => {
  try {
    const db = getDb();
    const [rows] = await db.query(
      "SELECT * FROM library_events WHERE is_active = 1 ORDER BY event_date ASC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve events." });
  }
});

// ─── Admin Endpoints (Localhost Only for Admin Panel) ─────────────────────────

app.get("/api/admin/activity", requireLocalAdmin, async (req, res) => {
  const data = await getActivity();
  res.json(data);
});

app.get("/api/admin/events", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    const [rows] = await db.query("SELECT * FROM library_events ORDER BY event_date DESC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve events." });
  }
});

app.post("/api/admin/events", requireLocalAdmin, async (req, res) => {
  const { title, description, event_date, event_time, location, event_type, cover_image_url, created_by } = req.body;
  if (!title || !event_date) return res.status(400).json({ error: "title and event_date are required." });
  try {
    const db = getDb();
    const [result] = await db.query(
      `INSERT INTO library_events (title, description, event_date, event_time, location, event_type, cover_image_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || "", event_date, event_time || "", location || "", event_type || "other", cover_image_url || "", created_by || "Admin"]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/admin/events/:id", requireLocalAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, event_date, event_time, location, event_type, cover_image_url, is_active } = req.body;
  try {
    const db = getDb();
    await db.query(
      `UPDATE library_events SET title=?, description=?, event_date=?, event_time=?, location=?, event_type=?, cover_image_url=?, is_active=? WHERE id=?`,
      [title, description || "", event_date, event_time || "", location || "", event_type || "other", cover_image_url || "", is_active ?? 1, id]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/events/:id", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.query("DELETE FROM library_events WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to enrich reviews, messages, and shelves with Koha book title, author, and accession number
async function enrichWithKohaBiblio(items, biblioKey = "biblio_id") {
  if (!items || items.length === 0) return items;
  const biblioIds = [...new Set(items.map((it) => it[biblioKey]).filter(Boolean))];
  if (biblioIds.length === 0) return items;

  try {
    const kohaDb = getKohaDb();
    const [rows] = await kohaDb.query(`
      SELECT b.biblionumber, b.title, b.author,
             (SELECT barcode FROM items WHERE biblionumber = b.biblionumber AND barcode IS NOT NULL AND barcode != '' LIMIT 1) as accession_number
      FROM biblio b
      WHERE b.biblionumber IN (?)
    `, [biblioIds]);

    const bibMap = new Map();
    rows.forEach((r) => {
      bibMap.set(String(r.biblionumber), {
        title: (r.title || "").replace(/[\/:]\s*$/, "").trim(),
        author: (r.author || "").trim(),
        accession_number: r.accession_number || "—",
      });
    });

    return items.map((item) => {
      const info = bibMap.get(String(item[biblioKey])) || {
        title: "Unknown / Removed Book",
        author: "",
        accession_number: "—",
      };
      return {
        ...item,
        title: item.title || info.title,
        author: item.author || info.author,
        accession_number: item.accession_number || info.accession_number,
      };
    });
  } catch (err) {
    console.error("[enrichWithKohaBiblio] Error:", err.message);
    return items;
  }
}

app.get("/api/admin/reviews", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    const [rows] = await db.query("SELECT * FROM book_reviews ORDER BY created_at DESC LIMIT 100");
    const enriched = await enrichWithKohaBiblio(rows, "biblio_id");
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve reviews." });
  }
});

app.delete("/api/admin/reviews/:id", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.query("DELETE FROM book_reviews WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/admin/club-messages", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    const [rows] = await db.query("SELECT * FROM reading_club_messages ORDER BY created_at DESC LIMIT 100");
    const enriched = await enrichWithKohaBiblio(rows, "biblio_id");
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve club messages." });
  }
});

app.delete("/api/admin/club-messages/:id", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.query("DELETE FROM reading_club_messages WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/admin/recommendations", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    const [rows] = await db.query("SELECT * FROM book_recommendations ORDER BY created_at DESC LIMIT 100");
    const enriched = await enrichWithKohaBiblio(rows, "biblio_id");
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve recommendations." });
  }
});

app.get("/api/admin/professor-shelves", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    const [shelves] = await db.query("SELECT * FROM professor_shelves ORDER BY created_at DESC");
    const [books] = await db.query("SELECT * FROM professor_shelf_books");
    const enrichedBooks = await enrichWithKohaBiblio(books, "biblio_id");
    const grouped = shelves.map(s => ({ ...s, books: enrichedBooks.filter(b => b.shelf_id === s.id) }));
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve shelves." });
  }
});

app.delete("/api/admin/professor-shelves/:id", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.query("DELETE FROM professor_shelves WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not delete shelf." });
  }
});

// Admin DDS / ILL
app.get("/api/admin/dds", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    const [rows] = await db.query("SELECT * FROM dds_ill_requests ORDER BY created_at DESC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve DDS requests." });
  }
});

app.put("/api/admin/dds/:id", requireLocalAdmin, async (req, res) => {
  const { status, status_message, delivered_document_url, fulfilled_by } = req.body;
  try {
    const db = getDb();
    const [existing] = await db.query("SELECT * FROM dds_ill_requests WHERE id = ?", [req.params.id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: "DDS request not found." });
    }
    const r = existing[0];

    await db.query(
      `UPDATE dds_ill_requests 
       SET status = COALESCE(?, status), 
           status_message = COALESCE(?, status_message), 
           delivered_document_url = COALESCE(?, delivered_document_url),
           fulfilled_by = COALESCE(?, fulfilled_by)
       WHERE id = ?`,
      [status, status_message, delivered_document_url, fulfilled_by, req.params.id]
    );

    // Send OS Push Notification & Status Bar Alert to the patron
    if (r.patron_id && status && status !== r.status) {
      let notifTitle = "DDS Article Update";
      let notifBody = `Your request for "${r.title}" is now ${status.replace('_', ' ')}.`;
      if (status === "fulfilled") {
        notifTitle = "Document Delivery Ready! 📄";
        notifBody = `Your article "${r.title}" has been delivered and is ready for download!`;
      } else if (status === "in_progress") {
        notifTitle = "ILL / DDS In Progress ⏳";
        notifBody = `Library staff is actively sourcing your article "${r.title}".`;
      } else if (status === "rejected") {
        notifTitle = "ILL / DDS Notice ⚠️";
        notifBody = status_message ? `Notice on "${r.title}": ${status_message}` : `We could not source "${r.title}". Please check details.`;
      }

      notifyPatron(r.patron_id, {
        title: notifTitle,
        body: notifBody,
        data: { target_screen: "dds-ill", target_id: String(r.id) }
      }).catch(e => console.warn("[DDS Notification] Push error:", e.message));
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/dds/:id", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    const [result] = await db.query("DELETE FROM dds_ill_requests WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "DDS request not found." });
    }
    res.json({ ok: true, message: "DDS request deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Occupancy
app.get("/api/admin/occupancy/floors", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    const [rows] = await db.query("SELECT * FROM occupancy_floor_config ORDER BY floor_id ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve floors." });
  }
});

app.post("/api/admin/occupancy/floors", requireLocalAdmin, async (req, res) => {
  const { floor_id, original_floor_id, floor_name, total_seats, description, is_active } = req.body;
  if (!floor_id || !floor_name) {
    return res.status(400).json({ error: "Floor ID and Floor Name are required." });
  }

  const cleanFloorId = floor_id.toLowerCase().trim();
  const cleanOrigId = original_floor_id ? original_floor_id.toLowerCase().trim() : null;

  try {
    const db = getDb();

    // Renaming an existing floor ID
    if (cleanOrigId && cleanOrigId !== cleanFloorId) {
      const [existing] = await db.query("SELECT floor_id FROM occupancy_floor_config WHERE floor_id = ?", [cleanFloorId]);
      if (existing.length > 0) {
        return res.status(400).json({ error: `Floor identifier '${cleanFloorId}' already exists.` });
      }

      await db.query(
        `INSERT INTO occupancy_floor_config (floor_id, floor_name, total_seats, description, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [cleanFloorId, floor_name.trim(), total_seats || 100, description || "", is_active ?? 1]
      );

      // Cascade session records to the new floor_id
      await db.query("UPDATE library_occupancy_sessions SET floor_id = ? WHERE floor_id = ?", [cleanFloorId, cleanOrigId]);

      // Remove the old floor entry
      await db.query("DELETE FROM occupancy_floor_config WHERE floor_id = ?", [cleanOrigId]);

      return res.json({ ok: true, renamed: true });
    }

    // Upsert floor configuration
    await db.query(
      `INSERT INTO occupancy_floor_config (floor_id, floor_name, total_seats, description, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE floor_name=VALUES(floor_name), total_seats=VALUES(total_seats), description=VALUES(description), is_active=VALUES(is_active)`,
      [cleanFloorId, floor_name.trim(), total_seats || 100, description || "", is_active ?? 1]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Floor / Zone
app.delete("/api/admin/occupancy/floors/:id", requireLocalAdmin, async (req, res) => {
  const floorId = req.params.id;
  try {
    const db = getDb();
    await db.query("DELETE FROM occupancy_floor_config WHERE floor_id = ?", [floorId]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/admin/occupancy/report", requireLocalAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { range, date, year, search, status, page = 1, limit = 50, all = "false" } = req.query;

    let whereClauses = ["1=1"];
    let params = [];

    // Date range filtering
    if (date && date.trim()) {
      whereClauses.push("DATE(s.checkin_time) = ?");
      params.push(date.trim());
    } else if (range === "today") {
      whereClauses.push("s.checkin_time >= NOW() - INTERVAL 24 HOUR");
    } else if (range === "week") {
      whereClauses.push("s.checkin_time >= NOW() - INTERVAL 7 DAY");
    } else if (range === "month") {
      whereClauses.push("s.checkin_time >= NOW() - INTERVAL 30 DAY");
    }

    if (year && year !== "all") {
      whereClauses.push("YEAR(s.checkin_time) = ?");
      params.push(parseInt(year));
    }

    if (status === "active") {
      whereClauses.push("s.checkout_time IS NULL");
    } else if (status === "completed") {
      whereClauses.push("s.checkout_time IS NOT NULL");
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClauses.push("(s.patron_name LIKE ? OR s.cardnumber LIKE ? OR s.patron_id LIKE ? OR s.patron_category LIKE ? OR s.department LIKE ?)");
      params.push(q, q, q, q, q);
    }

    const whereSql = "WHERE " + whereClauses.join(" AND ");

    // Count query
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM library_occupancy_sessions s ${whereSql}`,
      params
    );
    const total = countResult[0]?.total || 0;

    let querySql = `
      SELECT 
        s.id, s.patron_id, s.patron_name, s.cardnumber, s.floor_id, 
        COALESCE(f.floor_name, 'Knowledge Resource Centre (Main Gate)') AS floor_name,
        s.checkin_time, s.checkout_time, s.duration_minutes, s.issued_books_count,
        s.patron_category, s.department, s.issued_books_json
      FROM library_occupancy_sessions s
      LEFT JOIN occupancy_floor_config f ON s.floor_id = f.floor_id
      ${whereSql}
      ORDER BY s.checkin_time DESC
    `;

    let queryParams = [...params];
    if (all !== "true") {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
      const offset = (pageNum - 1) * limitNum;
      querySql += " LIMIT ? OFFSET ?";
      queryParams.push(limitNum, offset);
    }

    const [rows] = await db.query(querySql, queryParams);

    // Enrich report sessions with live Koha category
    if (rows.length > 0) {
      try {
        const patronIds = [...new Set(rows.map(r => r.patron_id).filter(Boolean))];
        const cardnumbers = [...new Set(rows.map(r => r.cardnumber).filter(Boolean))];
        if (patronIds.length > 0 || cardnumbers.length > 0) {
          const [kohaPatrons] = await getKohaDb().query(
            `SELECT b.borrowernumber, b.cardnumber, cat.description as live_category
             FROM borrowers b
             LEFT JOIN categories cat ON b.categorycode = cat.categorycode
             WHERE b.borrowernumber IN (?) OR b.cardnumber IN (?)`,
            [patronIds.length ? patronIds : [-1], cardnumbers.length ? cardnumbers : ['__none__']]
          );
          const catMap = {};
          kohaPatrons.forEach(p => {
            if (p.live_category) {
              if (p.borrowernumber) catMap[p.borrowernumber] = p.live_category;
              if (p.cardnumber) catMap[p.cardnumber.toLowerCase()] = p.live_category;
            }
          });
          rows.forEach(r => {
            const liveCat = catMap[r.patron_id] || catMap[(r.cardnumber || '').toLowerCase()];
            if (liveCat) {
              r.patron_category = liveCat;
            }
          });
        }
      } catch (e) {
        console.warn("Could not enrich report with live Koha categories:", e.message);
      }
    }

    // Calculate live summary stats across all sessions
    const [statsResult] = await db.query(`
      SELECT 
        COUNT(*) as totalSessions,
        COUNT(CASE WHEN checkout_time IS NULL THEN 1 END) as activeNow,
        ROUND(AVG(CASE WHEN duration_minutes IS NOT NULL AND duration_minutes > 0 THEN duration_minutes END)) as avgDuration
      FROM library_occupancy_sessions
    `);

    res.json({
      sessions: rows,
      total,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      totalPages: all === "true" ? 1 : Math.ceil(total / (parseInt(limit) || 50)),
      stats: statsResult[0] || { totalSessions: 0, activeNow: 0, avgDuration: 0 }
    });
  } catch (error) {
    console.error("Report Error:", error);
    res.status(500).json({ error: "Could not retrieve occupancy report." });
  }
});

app.post("/api/admin/occupancy/kiosk", requireLocalAdmin, async (req, res) => {
  const { cardnumber, floor_id: reqFloorId } = req.body;
  if (!cardnumber) return res.status(400).json({ error: "Missing cardnumber." });
  const floor_id = reqFloorId || "main_gate";
  const searchKey = cardnumber.trim();
  
  try {
    const db = getDb();
    
    // Ensure the fallback facility gate floor exists
    if (floor_id === "main_gate") {
      await db.query(
        "INSERT IGNORE INTO occupancy_floor_config (floor_id, floor_name, total_seats, is_active) VALUES ('main_gate', 'Knowledge Resource Centre (Main Gate)', 500, 1)"
      );
    }

    const [patrons] = await getKohaDb().query(
      `SELECT b.borrowernumber, b.firstname, b.surname, b.cardnumber, b.categorycode, 
              cat.description AS category_name, b.sort1, b.sort2, b.branchcode
       FROM borrowers b
       LEFT JOIN categories cat ON b.categorycode = cat.categorycode
       WHERE LOWER(TRIM(b.cardnumber)) = LOWER(?) OR LOWER(TRIM(b.userid)) = LOWER(?) OR b.borrowernumber = ?`,
      [searchKey, searchKey, isNaN(Number(searchKey)) ? -1 : Number(searchKey)]
    );

    if (patrons.length === 0) {
      return res.status(404).json({ error: "Patron not found. Please verify roll number or barcode." });
    }
    
    const patron = patrons[0];
    const patronName = `${patron.firstname || ''} ${patron.surname || ''}`.trim() || searchKey;
    const actualCardnumber = patron.cardnumber || searchKey;
    const patronCategory = patron.category_name || patron.categorycode || "General";
    const department = patron.sort1 || patron.sort2 || "";
    
    const [active] = await db.query(
      "SELECT id, checkin_time FROM library_occupancy_sessions WHERE cardnumber = ? AND checkout_time IS NULL ORDER BY checkin_time DESC LIMIT 1",
      [actualCardnumber]
    );

    // Fetch active issued books for security verification
    const [raw_issued_books] = await getKohaDb().query(
      `SELECT b.title, b.author, i.barcode, i.itemcallnumber, iss.date_due, iss.issuedate,
              TIMESTAMPDIFF(HOUR, iss.issuedate, NOW()) AS hours_since_issue,
              TIMESTAMPDIFF(DAY, iss.issuedate, NOW()) AS days_since_issue
       FROM issues iss
       JOIN items i ON iss.itemnumber = i.itemnumber
       JOIN biblio b ON i.biblionumber = b.biblionumber
       WHERE iss.borrowernumber = ?
       ORDER BY iss.issuedate DESC`,
      [patron.borrowernumber]
    );
    const timestamp = new Date().toISOString();
    const checkinMoment = active.length > 0 && active[0].checkin_time 
      ? new Date(active[0].checkin_time).getTime() - (15 * 60 * 1000) 
      : null;

    const enrichedBooks = raw_issued_books.map((b) => {
      const issueTime = b.issuedate ? new Date(b.issuedate).getTime() : 0;
      const isDuringSession = checkinMoment && issueTime >= checkinMoment;
      const isRecentHours = b.hours_since_issue !== undefined && b.hours_since_issue !== null && b.hours_since_issue <= 36;
      const isRecent = Boolean(isDuringSession || isRecentHours);
      return {
        ...b,
        is_recent: isRecent,
        is_during_session: Boolean(isDuringSession)
      };
    });

    const recent_issued_books = enrichedBooks.filter((b) => b.is_recent);
    const older_issued_books = enrichedBooks.filter((b) => !b.is_recent);
    
    if (active.length > 0) {
      // Check Out
      const checkinDate = active[0].checkin_time;
      await db.query(
        `UPDATE library_occupancy_sessions 
         SET checkout_time = NOW(), 
             duration_minutes = TIMESTAMPDIFF(MINUTE, checkin_time, NOW()),
             issued_books_count = ?,
             issued_books_json = ?
         WHERE id = ?`,
        [recent_issued_books.length, JSON.stringify(recent_issued_books), active[0].id]
      );

      const [updatedSession] = await db.query(
        "SELECT checkin_time, checkout_time, duration_minutes FROM library_occupancy_sessions WHERE id = ?",
        [active[0].id]
      );

      return res.json({ 
        message: "Check-out successful.", 
        action: "checkout", 
        patronName, 
        cardnumber: actualCardnumber,
        borrowernumber: patron.borrowernumber,
        category: patronCategory,
        department,
        checkinTime: updatedSession[0]?.checkin_time || checkinDate,
        checkoutTime: updatedSession[0]?.checkout_time || timestamp,
        durationMinutes: updatedSession[0]?.duration_minutes || 0,
        recent_issued_books,
        older_issued_books,
        all_issued_books: enrichedBooks,
        issued_books: recent_issued_books, // Defaults to recent ones for security guard verification!
        timestamp 
      });
    } else {
      // Check In
      const checkinTime = new Date();
      await db.query(
        `INSERT INTO library_occupancy_sessions 
         (patron_id, patron_name, cardnumber, floor_id, issued_books_count, patron_category, department, issued_books_json, checkin_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [patron.borrowernumber, patronName, actualCardnumber, floor_id, recent_issued_books.length, patronCategory, department, JSON.stringify(recent_issued_books)]
      );

      return res.json({ 
        message: "Check-in successful.", 
        action: "checkin", 
        patronName, 
        cardnumber: actualCardnumber,
        borrowernumber: patron.borrowernumber,
        category: patronCategory,
        department,
        checkinTime: checkinTime.toISOString(),
        recent_issued_books,
        older_issued_books,
        all_issued_books: enrichedBooks,
        issued_books: recent_issued_books,
        timestamp: checkinTime.toISOString()
      });
    }
  } catch (error) {
    console.error("Kiosk Error:", error);
    res.status(500).json({ error: "Could not process kiosk scan: " + (error.message || "") });
  }
});

// ─── Comprehensive Koha Overdues (All items + Full Metadata) ──────────────────
app.get("/api/admin/overdues", requireLocalAdmin, async (req, res) => {
  try {
    const { search, category, severity, page = 1, limit = 50, all = "false" } = req.query;
    const kohaDb = getKohaDb();

    let whereClauses = ["iss.date_due < NOW()"];
    let params = [];

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClauses.push("(b.cardnumber LIKE ? OR b.firstname LIKE ? OR b.surname LIKE ? OR bib.title LIKE ? OR i.barcode LIKE ? OR i.itemcallnumber LIKE ?)");
      params.push(q, q, q, q, q, q);
    }

    if (category && category !== "ALL") {
      whereClauses.push("b.categorycode = ?");
      params.push(category);
    }

    if (severity) {
      if (severity === "7d") {
        whereClauses.push("iss.date_due < DATE_SUB(NOW(), INTERVAL 7 DAY)");
      } else if (severity === "30d") {
        whereClauses.push("iss.date_due < DATE_SUB(NOW(), INTERVAL 30 DAY)");
      } else if (severity === "90d") {
        whereClauses.push("iss.date_due < DATE_SUB(NOW(), INTERVAL 90 DAY)");
      } else if (severity === "1y") {
        whereClauses.push("iss.date_due < DATE_SUB(NOW(), INTERVAL 1 YEAR)");
      }
    }

    const whereSql = "WHERE " + whereClauses.join(" AND ");

    // Count total overdues matching criteria
    const [countResult] = await kohaDb.query(
      `SELECT COUNT(*) as total 
       FROM issues iss
       JOIN borrowers b ON iss.borrowernumber = b.borrowernumber
       JOIN items i ON iss.itemnumber = i.itemnumber
       JOIN biblio bib ON i.biblionumber = bib.biblionumber
       ${whereSql}`,
      params
    );
    const total = countResult[0]?.total || 0;

    let querySql = `
      SELECT 
        iss.issue_id,
        iss.borrowernumber AS patron_id,
        b.cardnumber,
        TRIM(CONCAT(COALESCE(b.firstname, ''), ' ', COALESCE(b.surname, ''))) AS patron_name,
        b.categorycode,
        COALESCE(cat.description, b.categorycode) AS category_name,
        b.email,
        b.phone,
        iss.itemnumber,
        i.barcode,
        i.itemcallnumber,
        bib.title,
        bib.author,
        iss.issuedate,
        iss.date_due,
        iss.renewals_count AS renewals,
        DATEDIFF(NOW(), iss.date_due) AS days_overdue
      FROM issues iss
      JOIN borrowers b ON iss.borrowernumber = b.borrowernumber
      LEFT JOIN categories cat ON b.categorycode = cat.categorycode
      JOIN items i ON iss.itemnumber = i.itemnumber
      JOIN biblio bib ON i.biblionumber = bib.biblionumber
      ${whereSql}
      ORDER BY iss.date_due ASC
    `;

    let queryParams = [...params];
    if (all !== "true") {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
      const offset = (pageNum - 1) * limitNum;
      querySql += " LIMIT ? OFFSET ?";
      queryParams.push(limitNum, offset);
    }

    const [rows] = await kohaDb.query(querySql, queryParams);

    // Fetch categories for filter dropdown
    const [categories] = await kohaDb.query("SELECT categorycode, description FROM categories ORDER BY description ASC");

    res.json({
      items: rows,
      total,
      categories,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      totalPages: all === "true" ? 1 : Math.ceil(total / (parseInt(limit) || 50))
    });
  } catch (error) {
    console.error("Overdues DB error:", error);
    res.status(500).json({ error: "Could not fetch overdues from Koha database." });
  }
});

// Admin Broadcast Notifications
app.post("/api/admin/broadcast-notifications", requireLocalAdmin, async (req, res) => {
  const { title, message, target_screen, target_id, sent_by } = req.body;
  if (!title || !message) return res.status(400).json({ error: "Title and message are required." });
  try {
    const db = getDb();
    const [result] = await db.query(
      `INSERT INTO admin_broadcast_notifications (title, message, target_screen, target_id, sent_by)
       VALUES (?, ?, ?, ?, ?)`,
      [title, message, target_screen || "home", target_id || null, sent_by || "KRC Library Admin"]
    );

    // Broadcast push notification to all mobile devices
    broadcastPush({
      title,
      body: message,
      data: { target_screen: target_screen || "home", target_id: target_id || null }
    }).catch(e => console.warn("[Broadcast Notification] Push dispatch error:", e.message));

    res.json({ ok: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`KRC mobile backend listening on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Database connection failed. Exiting...", err);
  process.exit(1);
});
