import axios from "axios";
import Constants from "expo-constants";

const BASE_URL =
  Constants.expoConfig?.extra?.mobileBackendBaseUrl ?? "http://localhost:4002/api";

const client = axios.create({ baseURL: BASE_URL, timeout: 8000 });

export class KohaApiError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message);
    this.name = "KohaApiError";
    this.status = status;
    this.cause = cause;
  }
}

const handle = (error, fallbackMessage) => {
  const status = error.response?.status;
  throw new KohaApiError(error.response?.data?.error || fallbackMessage, { status, cause: error });
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

export const login = async (userid, password) => {
  try {
    const { data } = await client.post("/auth/login", { userid, password });
    return data; // { token, patron }
  } catch (error) {
    return handle(error, "Login failed.");
  }
};

export const logout = async (token) => {
  try {
    await client.post("/auth/logout", {}, { headers: authHeader(token) });
  } catch {
    // best-effort — local session is cleared regardless
  }
};

export const getCheckouts = async (token) => {
  try {
    const { data } = await client.get("/checkouts", { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not load checkouts.");
  }
};

export const getAccountLines = async (token) => {
  try {
    const { data } = await client.get("/account", { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not load account/fines.");
  }
};

export const getHolds = async (token) => {
  try {
    const { data } = await client.get("/holds", { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not load holds.");
  }
};
