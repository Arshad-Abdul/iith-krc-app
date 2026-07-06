import axios from "axios";

// The existing public IITH webopac backend — read-only catalog discovery
// (search, book detail, covers, new arrivals, most-borrowed). No auth needed;
// this is the same API the public opac.krc.iith.ac.in website itself calls.
const BASE_URL = "https://opac.krc.iith.ac.in/api";

const client = axios.create({ baseURL: BASE_URL, timeout: 8000 });

export class WebOpacError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "WebOpacError";
    this.status = status;
  }
}

const handle = (error, fallback) => {
  throw new WebOpacError(error.response?.data?.error || fallback, error.response?.status);
};

export const coverUrl = (biblioId) => `${BASE_URL}/books/${biblioId}/cover`;

export const getRecentBooks = async (limit = 50) => {
  try {
    const { data } = await client.get("/books/recent", { params: { limit } });
    return data.books ?? [];
  } catch (error) {
    return handle(error, "Could not load new arrivals.");
  }
};

export const getMostBorrowedThisMonth = async (limit = 20) => {
  try {
    const { data } = await client.get("/books/most-borrowed-this-month", { params: { limit } });
    return data.books ?? [];
  } catch (error) {
    return handle(error, "Could not load trending books.");
  }
};

export const searchBooks = async (query, { type, limit = 20 } = {}) => {
  try {
    const { data } = await client.post("/search", { query, type, limit });
    return data; // { books, total, facets, didYouMean, autoApplied, originalQuery }
  } catch (error) {
    return handle(error, "Search failed.");
  }
};

export const getBookDetail = async (biblioId) => {
  try {
    const { data } = await client.get(`/books/${biblioId}`);
    return data;
  } catch (error) {
    return handle(error, "Could not load book details.");
  }
};

export const getSubjects = async () => {
  try {
    const { data } = await client.get("/subjects");
    return data.subjects ?? [];
  } catch (error) {
    return handle(error, "Could not load subjects.");
  }
};

export const getSubjectBooks = async (subjectKey, limit = 4) => {
  try {
    const { data } = await client.get(`/subjects/${subjectKey}/books`, { params: { limit } });
    return data.books ?? [];
  } catch (error) {
    return handle(error, "Could not load subject books.");
  }
};
