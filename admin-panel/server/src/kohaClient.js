import axios from "axios";

const BASE_URL = process.env.KOHA_API_BASE_URL || "https://opac.krc.iith.ac.in:8080/api/v1";

const client = axios.create({ baseURL: BASE_URL, timeout: 8000 });

export class KohaError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "KohaError";
    this.status = status || 502;
  }
}

export class KohaConflict extends KohaError {
  constructor(message, data) {
    super(message, 409);
    this.name = "KohaConflict";
    this.data = data;
  }
}

const authHeader = (userid, password) => ({
  Authorization: `Basic ${Buffer.from(`${userid}:${password}`).toString("base64")}`,
  Accept: "application/json",
});

const wrap = (error, fallback) => {
  const status = error.response?.status;
  if (status === 409) throw new KohaConflict(error.response?.data?.error || fallback, error.response?.data);
  throw new KohaError(error.response?.data?.error || fallback, status || 502);
};

/**
 * Resolves a staff patron record from their Koha credentials.
 * Tries cardnumber first, then userid.
 */
export const resolvePatron = async (userid, password) => {
  const headers = authHeader(userid, password);
  for (const params of [{ cardnumber: userid }, { userid }]) {
    try {
      const { data } = await client.get("/patrons", { params, headers });
      if (Array.isArray(data) && data.length > 0) return data[0];
    } catch (error) {
      if (error.response?.status === 401) {
        throw new KohaError("Incorrect userid or password.", 401);
      }
    }
  }
  throw new KohaError("Could not resolve patron record from these credentials.", 404);
};

export const hasSuperlibrarianPermission = async (_patronId, userid, password) => {
  try {
    // /config/smtp_servers requires superlibrarian — 200 = yes, 403 = no
    await client.get("/config/smtp_servers", { headers: authHeader(userid, password) });
    return true;
  } catch (error) {
    if ([401, 403].includes(error.response?.status)) return false;
    throw new KohaError("Could not verify staff permissions.", error.response?.status || 502);
  }
};

export const kohaGet = async (path, params, userid, password) => {
  try {
    const { data } = await client.get(path, { params, headers: authHeader(userid, password) });
    return data;
  } catch (error) {
    wrap(error, "Koha request failed.");
  }
};

export const kohaGetWithCount = async (path, params, userid, password) => {
  try {
    const resp = await client.get(path, { params, headers: authHeader(userid, password) });
    return {
      data: resp.data,
      total: parseInt(resp.headers["x-total-count"] ?? "0", 10),
    };
  } catch (error) {
    wrap(error, "Koha request failed.");
  }
};

export const kohaPost = async (path, body, userid, password) => {
  try {
    const { data } = await client.post(path, body, {
      headers: { ...authHeader(userid, password), "Content-Type": "application/json" },
    });
    return data;
  } catch (error) {
    wrap(error, "Koha request failed.");
  }
};

export const kohaDelete = async (path, userid, password) => {
  try {
    await client.delete(path, { headers: authHeader(userid, password) });
    return { ok: true };
  } catch (error) {
    wrap(error, "Koha request failed.");
  }
};
