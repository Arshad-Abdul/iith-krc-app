import axios from "axios";
import { getKohaDb } from "./db.js";

const BASE_URL = process.env.KOHA_API_BASE_URL || "https://opac.krc.iith.ac.in:8080/api/v1";
const SERVICE_USERID = process.env.KOHA_SERVICE_USERID || "arshadabdul";
const SERVICE_PASSWORD = process.env.KOHA_SERVICE_PASSWORD || "arshad2025";

const client = axios.create({ baseURL: BASE_URL, timeout: 8000 });

export class KohaError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "KohaError";
    this.status = status || 502;
  }
}

const authHeader = (userid, password) => ({
  Authorization: `Basic ${Buffer.from(`${userid}:${password}`).toString("base64")}`,
});

const serviceHeader = () => authHeader(SERVICE_USERID, SERVICE_PASSWORD);

export const verifyPatronCredentials = async (userid, password) => {
  try {
    await client.get("/patrons", {
      params: { userid },
      headers: authHeader(userid, password),
    });
    return true;
  } catch (error) {
    const status = error.response?.status;
    if (status === 403) {
      return error.response?.data?.required_permissions != null;
    }
    throw new KohaError("Could not reach Koha to verify credentials.", status || 502);
  }
};

export const findPatronByUserid = async (userid) => {
  try {
    for (const params of [{ userid }, { cardnumber: userid }]) {
      const { data } = await client.get("/patrons", { params, headers: serviceHeader() });
      if (Array.isArray(data) && data.length > 0) return data[0];
    }
    return null;
  } catch (error) {
    throw new KohaError(
      "Service account could not look up patron — check its Koha permissions.",
      error.response?.status || 502
    );
  }
};

const serviceGet = async (path, params = {}) => {
  try {
    const headers = { ...serviceHeader(), Accept: "application/json" };
    const { data } = await client.get(path, { params, headers });
    return data;
  } catch (error) {
    throw new KohaError(error.response?.data?.error || "Koha request failed.", error.response?.status || 502);
  }
};

export const getCheckouts = async (patronId) => {
  try {
    const data = await serviceGet(`/patrons/${patronId}/checkouts`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(`[KohaClient] Active checkouts fetch failed for patron ${patronId}:`, error.message);
    return [];
  }
};

export const getAccountLines = async (patronId) => {
  try {
    const data = await serviceGet(`/patrons/${patronId}/account`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(`[KohaClient] Account lines fetch failed for patron ${patronId}:`, error.message);
    return [];
  }
};

export const getHolds = async (patronId) => {
  try {
    const data = await serviceGet(`/patrons/${patronId}/holds`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(`[KohaClient] Holds fetch failed for patron ${patronId}:`, error.message);
    return [];
  }
};

// Past Borrowing History — directly from Koha old_issues table
export const getCheckoutHistoryFromDb = async (patronId) => {
  try {
    const kdb = getKohaDb();
    const [rows] = await kdb.query(`
      SELECT 
        oi.issue_id,
        oi.borrowernumber as patron_id,
        oi.itemnumber as item_id,
        oi.issuedate as checkout_date,
        oi.date_due as due_date,
        oi.returndate as checkin_date,
        oi.renewals_count,
        i.barcode,
        i.itemcallnumber as callnumber,
        b.biblionumber as biblio_id,
        b.title,
        b.author
      FROM old_issues oi
      LEFT JOIN items i ON oi.itemnumber = i.itemnumber
      LEFT JOIN biblio b ON i.biblionumber = b.biblionumber
      WHERE oi.borrowernumber = ?
      ORDER BY oi.returndate DESC
      LIMIT 100
    `, [patronId]);
    return rows;
  } catch (err) {
    console.warn(`[KohaClient] DB old_issues fetch failed for patron ${patronId}:`, err.message);
    return [];
  }
};

const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

export const enrichCheckoutsWithTitles = async (checkouts) => {
  if (!checkouts.length) return checkouts;

  const uniqueItemIds = [...new Set(checkouts.map((c) => c.item_id).filter(Boolean))];
  const itemMap = {};
  for (const batch of chunk(uniqueItemIds, 15)) {
    const results = await Promise.allSettled(batch.map((id) => serviceGet(`/items/${id}`)));
    results.forEach((r, i) => { if (r.status === "fulfilled") itemMap[batch[i]] = r.value; });
  }

  const uniqueBiblioIds = [...new Set(Object.values(itemMap).map((it) => it.biblio_id).filter(Boolean))];
  const biblioMap = {};
  for (const batch of chunk(uniqueBiblioIds, 15)) {
    const results = await Promise.allSettled(batch.map((id) => serviceGet(`/biblios/${id}`)));
    results.forEach((r, i) => { if (r.status === "fulfilled") biblioMap[batch[i]] = r.value; });
  }

  return checkouts.map((c) => {
    const item = itemMap[c.item_id];
    const biblio = item ? biblioMap[item.biblio_id] : null;
    return {
      ...c,
      title: biblio?.title || "Library Item",
      author: biblio?.author || "",
      biblio_id: item?.biblio_id || null,
      barcode: item?.external_id || null,
      callnumber: item?.callnumber || null,
    };
  });
};

// Directly fetch patron photo from Koha database patronimage table (blob)
export const getPatronImage = async (patronId) => {
  try {
    const kdb = getKohaDb();
    const [rows] = await kdb.query(
      "SELECT mimetype, imagefile FROM patronimage WHERE borrowernumber = ? LIMIT 1",
      [patronId]
    );
    if (rows.length > 0 && rows[0].imagefile) {
      return {
        data: rows[0].imagefile,
        contentType: rows[0].mimetype || "image/jpeg",
      };
    }
  } catch (err) {
    console.warn(`[KohaClient] Direct image DB fetch failed for patron ${patronId}:`, err.message);
  }

  // Fallback to HTTP if DB didn't find image
  try {
    const staffBaseUrl = BASE_URL.replace(/\/api\/v1/i, "");
    const response = await axios.get(
      `${staffBaseUrl}/cgi-bin/koha/members/patron-image.pl`,
      {
        params: { borrowernumber: patronId },
        headers: serviceHeader(),
        responseType: "arraybuffer",
        timeout: 4000,
      }
    );
    return { 
      data: response.data, 
      contentType: response.headers["content-type"] || "image/jpeg" 
    };
  } catch (error) {
    throw new KohaError("No patron photo found in Koha.", 404);
  }
};
