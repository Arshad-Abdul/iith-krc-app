const BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || "http://localhost:4001/api";
const OPAC_URL = "https://opac.krc.iith.ac.in/api";

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

const opac = async (path) => {
  const res = await fetch(`${OPAC_URL}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `OPAC request failed (${res.status})`);
  return data;
};

export const login = (userid, password) => req("/auth/login", { method: "POST", body: JSON.stringify({ userid, password }) });
export const logout = () => req("/auth/logout", { method: "POST" });
export const getMe = () => req("/auth/me");

export const getStats = () => req("/stats");
export const getStatus = () => req("/status");
export const getRecentCheckouts = () => req("/recent-checkouts");
export const getOverdues = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, v);
  });
  const qs = query.toString();
  return req(`/overdues${qs ? `?${qs}` : ""}`);
};

export const searchPatrons = (q) => req(`/patrons/search?q=${encodeURIComponent(q)}`);
export const getPatron = (id) => req(`/patrons/${id}`);

export const issueBook = (barcode, patronId) =>
  req("/issue", { method: "POST", body: JSON.stringify({ barcode, patronId }) });
export const returnBook = (barcode) =>
  req("/return", { method: "POST", body: JSON.stringify({ barcode }) });

// Catalog — calls webopac API directly (same domain, no CORS)
export const searchCatalog = (query, limit = 20) =>
  fetch(`${OPAC_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit }),
  }).then((r) => r.json());

export const getAppActivity = () => req("/app-activity");

export const getNewArrivals = (limit = 24) =>
  opac(`/books/recent?limit=${limit}`).then((d) => d.books ?? []);

export const getCoverUrl = (biblioId) => `${OPAC_URL}/books/${biblioId}/cover`;

// Events
export const getEvents = () => req("/events");
export const createEvent = (data) => req("/events", { method: "POST", body: JSON.stringify(data) });
export const updateEvent = (id, data) => req(`/events/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteEvent = (id) => req(`/events/${id}`, { method: "DELETE" });

// App Moderation & Content
export const getReviews = () => req("/admin/reviews");
export const deleteReview = (id) => req(`/admin/reviews/${id}`, { method: "DELETE" });

export const getClubMessages = () => req("/admin/club-messages");
export const deleteClubMessage = (id) => req(`/admin/club-messages/${id}`, { method: "DELETE" });

export const getRecommendations = () => req("/admin/recommendations");
export const getProfessorShelves = () => req("/admin/professor-shelves");
export const deleteProfessorShelf = (id) => req(`/admin/professor-shelves/${id}`, { method: "DELETE" });
// Document Delivery & Inter-Library Loan (DDS & ILL)
export const getAdminDds = () => req("/admin/dds");
export const updateAdminDds = (id, data) => req(`/admin/dds/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteAdminDds = (id) => req(`/admin/dds/${id}`, { method: "DELETE" });

// Floor Occupancy Management
export const getAdminOccupancyFloors = () => req("/admin/occupancy/floors");
export const saveAdminOccupancyFloor = (data) => req("/admin/occupancy/floors", { method: "POST", body: JSON.stringify(data) });
export const deleteAdminOccupancyFloor = (id) => req(`/admin/occupancy/floors/${id}`, { method: "DELETE" });
export const getAdminOccupancyReport = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, v);
  });
  const qs = query.toString();
  return req(`/admin/occupancy/report${qs ? `?${qs}` : ""}`);
};
export const kioskScan = (data) => req("/admin/occupancy/kiosk", { method: "POST", body: JSON.stringify(data) });

// Broadcast Notifications
export const sendAdminBroadcast = (data) => req("/admin/broadcast-notifications", { method: "POST", body: JSON.stringify(data) });

