import axios from "axios";

const BASE_URL = process.env.KOHA_API_BASE_URL || "https://opac.krc.iith.ac.in:8080/api/v1";
const SERVICE_USERID = process.env.KOHA_SERVICE_USERID;
const SERVICE_PASSWORD = process.env.KOHA_SERVICE_PASSWORD;

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

/**
 * Verifies a patron's own credentials are correct, without needing any
 * staff permission. Koha's REST API checks authentication (is the password
 * right?) before authorization (does this account have permission for this
 * endpoint?), but both outcomes below render as HTTP 403 with the same
 * exception class (Koha::Exceptions::Authorization::Unauthorized) — the only
 * way to tell them apart is the response body:
 *   - wrong credentials:        {"error": "Invalid password", "required_permissions": null}
 *   - correct, lacks permission: {"error": "Authorization failure...", "required_permissions": {...}}
 * A non-null `required_permissions` means the password was correct.
 */
export const verifyPatronCredentials = async (userid, password) => {
  try {
    await client.get("/patrons", {
      params: { userid },
      headers: authHeader(userid, password),
    });
    return true; // this account happens to also have staff permission
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
    // Koha's /biblios (and some other) endpoints 406 without an explicit Accept header.
    const headers = { ...serviceHeader(), Accept: "application/json" };
    const { data } = await client.get(path, { params, headers });
    return data;
  } catch (error) {
    throw new KohaError(error.response?.data?.error || "Koha request failed.", error.response?.status || 502);
  }
};

export const getCheckouts = (patronId) => serviceGet(`/patrons/${patronId}/checkouts`);
export const getAccountLines = (patronId) => serviceGet(`/patrons/${patronId}/account`);
export const getHolds = (patronId) => serviceGet(`/patrons/${patronId}/holds`);
