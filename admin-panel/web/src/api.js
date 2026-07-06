const BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || "http://localhost:4001/api";

const req = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
};

export const login = (userid, password) => req("/auth/login", { method: "POST", body: JSON.stringify({ userid, password }) });
export const logout = () => req("/auth/logout", { method: "POST" });
export const getMe = () => req("/auth/me");

export const getStats = () => req("/stats");
export const getRecentCheckouts = () => req("/recent-checkouts");

export const searchPatrons = (q) => req(`/patrons/search?q=${encodeURIComponent(q)}`);
export const getPatron = (id) => req(`/patrons/${id}`);

export const issueBook = (barcode, patronId) =>
  req("/issue", { method: "POST", body: JSON.stringify({ barcode, patronId }) });
export const returnBook = (barcode) =>
  req("/return", { method: "POST", body: JSON.stringify({ barcode }) });
