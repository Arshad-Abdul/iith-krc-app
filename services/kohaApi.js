import axios from "axios";
import Constants from "expo-constants";
import { clearSession, getSession } from "./session";

export { getSession, clearSession };

const BASE_URL =
  Constants.expoConfig?.extra?.mobileBackendBaseUrl || "https://opac.krc.iith.ac.in/mobile-api/api";

const client = axios.create({ 
  baseURL: BASE_URL, 
  timeout: 8000,
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      await clearSession();
    }
    return Promise.reject(error);
  }
);

export class KohaApiError extends Error {
  constructor(message, { status, code, cause } = {}) {
    super(message);
    this.name = "KohaApiError";
    this.status = status;
    this.code = code || null;
    this.cause = cause;
  }
}

const handle = (error, fallbackMessage) => {
  const status = error.response?.status;
  const data = error.response?.data || {};
  throw new KohaApiError(data.error || fallbackMessage, { status, code: data.code, cause: error });
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

export const getMe = async (token) => {
  try {
    const { data } = await client.get("/me", { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not verify session.");
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

export const getCheckoutHistory = async (token) => {
  try {
    const { data } = await client.get("/checkouts/history", { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not load checkout history.");
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

export const getReadingHabits = async (token) => {
  try {
    const { data } = await client.get("/reading-habits", { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not load reading habits.");
  }
};

export const updateReadingStatus = async (token, { biblio_id, title, author, status }) => {
  try {
    const { data } = await client.post(
      "/reading-habits/status",
      { biblio_id, title, author, status },
      { headers: authHeader(token) }
    );
    return data;
  } catch (error) {
    return handle(error, "Could not update reading status.");
  }
};

export const getBookReviews = async (biblioId) => {
  try {
    const { data } = await client.get(`/books/${biblioId}/reviews`);
    return data;
  } catch (error) {
    return handle(error, "Could not load book reviews.");
  }
};

export const submitBookReview = async (token, biblioId, { rating, comment }) => {
  try {
    const { data } = await client.post(
      `/books/${biblioId}/reviews`,
      { rating, comment },
      { headers: authHeader(token) }
    );
    return data;
  } catch (error) {
    return handle(error, "Could not submit book review.");
  }
};

export const getPatronImageUrl = (token) => {
  return `${BASE_URL}/patron/image${token ? `?token=${token}` : ''}`;
};

export const recommendBook = async (token, recipient_cardnumber, { biblio_id, title, author, note }) => {
  try {
    const { data } = await client.post(
      `/recommendations`,
      { recipient_cardnumber, biblio_id, title, author, note },
      { headers: authHeader(token) }
    );
    return data;
  } catch (error) {
    return handle(error, "Could not submit recommendation.");
  }
};

export const getRecommendations = async (token) => {
  try {
    const { data } = await client.get(`/recommendations`, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not load recommendations.");
  }
};

export const deleteRecommendation = async (token, id) => {
  try {
    const { data } = await client.delete(`/recommendations/${id}`, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not delete recommendation.");
  }
};

export const getBookClubMessages = async (biblioId) => {
  try {
    const { data } = await client.get(`/books/${biblioId}/club`);
    return data;
  } catch (error) {
    return handle(error, "Could not load reading club messages.");
  }
};

export const postBookClubMessage = async (token, biblioId, message) => {
  try {
    const { data } = await client.post(
      `/books/${biblioId}/club`,
      { message },
      { headers: authHeader(token) }
    );
    return data;
  } catch (error) {
    return handle(error, "Could not post message to reading club.");
  }
};

export const getBookCourseTags = async (biblioId) => {
  try {
    const { data } = await client.get(`/books/${biblioId}/course-tags`);
    return data;
  } catch (error) {
    return handle(error, "Could not load course tags.");
  }
};

export const addBookCourseTag = async (token, biblioId, { course_code, course_name }) => {
  try {
    const { data } = await client.post(
      `/books/${biblioId}/course-tags`,
      { course_code, course_name },
      { headers: authHeader(token) }
    );
    return data;
  } catch (error) {
    return handle(error, "Could not add course tag.");
  }
};

export const getProfessorShelves = async () => {
  try {
    const { data } = await client.get("/professors/shelves");
    return data;
  } catch (error) {
    return handle(error, "Could not load bookshelves.");
  }
};

export const createProfessorShelf = async (token, { title, description }) => {
  try {
    const { data } = await client.post(
      "/professors/shelves",
      { title, description },
      { headers: authHeader(token) }
    );
    return data;
  } catch (error) {
    return handle(error, "Could not create bookshelf.");
  }
};

export const addBookToProfessorShelf = async (token, shelfId, { biblio_id, title, author }) => {
  try {
    const { data } = await client.post(
      `/professors/shelves/${shelfId}/books`,
      { biblio_id, title, author },
      { headers: authHeader(token) }
    );
    return data;
  } catch (error) {
    return handle(error, "Could not add book to bookshelf.");
  }
};

export const deleteBookFromProfessorShelf = async (token, shelfId, bookId) => {
  try {
    const { data } = await client.delete(`/professors/shelves/${shelfId}/books/${bookId}`, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not delete book from bookshelf.");
  }
};

export const deleteProfessorShelf = async (token, shelfId) => {
  try {
    const { data } = await client.delete(`/professors/shelves/${shelfId}`, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not delete bookshelf.");
  }
};

export const getLeaderboard = async (category = 'ALL', period = 'all') => {
  try {
    const { data } = await client.get(`/leaderboard?category=${category}&period=${period}`);
    return data;
  } catch (error) {
    return handle(error, "Could not load leaderboard.");
  }
};

export const getReadNextRecommendations = async (token) => {
  try {
    const { data } = await client.get("/me/recommendations/read-next", { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not load departmental recommendations.");
  }
};

export const getInterestRecommendations = async (token) => {
  try {
    const { data } = await client.get("/me/recommendations/interests", { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not load interest recommendations.");
  }
};

export const getEvents = async () => {
  try {
    const { data } = await client.get("/events");
    return data;
  } catch (error) {
    return handle(error, "Could not load library events.");
  }
};

// ─── Unified Notifications ───────────────────────────────────────────────────

export const getNotifications = async (token) => {
  try {
    const { data } = await client.get("/notifications", { headers: authHeader(token) });
    return data;
  } catch (error) {
    return [];
  }
};

export const deleteNotification = async (token, notificationKey) => {
  try {
    const { data } = await client.delete(`/notifications/${notificationKey}`, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not delete notification.");
  }
};

export const clearAllNotifications = async (token, keys) => {
  try {
    const { data } = await client.post("/notifications/clear-all", { keys }, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not clear all notifications.");
  }
};

export const registerPushToken = async (token, push_token, platform) => {
  try {
    const { data } = await client.post("/me/push-token", { push_token, platform }, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return null;
  }
};

// ─── Academic Interests (DDC) ────────────────────────────────────────────────

export const getInterests = async (token) => {
  try {
    const { data } = await client.get("/me/interests", { headers: authHeader(token) });
    return data;
  } catch (error) {
    return [];
  }
};

export const saveInterests = async (token, interests) => {
  try {
    const { data } = await client.post("/me/interests", { interests }, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not save interests.");
  }
};

// ─── Document Delivery Service (DDS & ILL) ───────────────────────────────────

export const getDdsRequests = async (token) => {
  try {
    const { data } = await client.get(`/dds?t=${Date.now()}`, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return [];
  }
};

export const submitDdsRequest = async (token, ddsData) => {
  try {
    const { data } = await client.post("/dds", ddsData, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not submit DDS request.");
  }
};

export const deleteDdsRequest = async (token, id) => {
  try {
    const { data } = await client.delete(`/dds/${id}`, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Could not cancel DDS request.");
  }
};

// ─── Live Floor Occupancy & Gate ─────────────────────────────────────────────

export const getOccupancy = async () => {
  try {
    const { data } = await client.get("/occupancy");
    return data;
  } catch (error) {
    return { overall: { total_occupants: 0, total_capacity: 520, available_capacity: 520, percentage: 0 }, floors: [] };
  }
};

export const getMyOccupancyStatus = async (token) => {
  try {
    const { data } = await client.get("/occupancy/my-status", { headers: authHeader(token) });
    return data;
  } catch (error) {
    return { active_session: null };
  }
};

export const checkInOccupancy = async (token, floorId) => {
  try {
    const { data } = await client.post("/occupancy/checkin", { floor_id: floorId }, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Check-in failed.");
  }
};

export const checkOutOccupancy = async (token) => {
  try {
    const { data } = await client.post("/occupancy/checkout", {}, { headers: authHeader(token) });
    return data;
  } catch (error) {
    return handle(error, "Check-out failed.");
  }
};


