// API service layer for secure communication with the backend.
// Handles CSRF tokens, cookies, and provides typed fetch wrappers.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const INTERNAL_API = process.env.INTERNAL_API_URL || "http://backend:4000/api/v1";

// Client-side fetch (browser) -- includes cookies and CSRF token
async function clientFetch(path, options = {}) {
  const csrfToken = getCsrfToken();
  const headers = {
    ...options.headers,
  };

  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  // Do not set Content-Type for FormData (multipart uploads)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // Only redirect to login on 401 for state-changing requests (admin actions)
  if (res.status === 401) {
    const method = (options.method || "GET").toUpperCase();
    if (method !== "GET" && typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return res.json();
}

// Server-side fetch (SSR via getServerSideProps) -- forwards cookies from incoming request
async function serverFetch(path, cookie) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) {
    headers["Cookie"] = cookie;
  }

  const res = await fetch(`${INTERNAL_API}${path}`, { headers });
  return res.json();
}

// Read CSRF token from cookie (browser only)
function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

// --- Auth ---
async function login(email, password) {
  return clientFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

async function logout() {
  return clientFetch("/auth/logout", { method: "POST" });
}

async function getMe(cookie) {
  if (cookie) {
    return serverFetch("/auth/me", cookie);
  }
  return clientFetch("/auth/me");
}

// --- Announcements ---
async function getAnnouncements(cookie, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `/announcements${qs ? "?" + qs : ""}`;
  if (cookie) return serverFetch(path, cookie);
  return clientFetch(path);
}

// --- Metrics ---
async function getMetrics(cookie, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `/metrics${qs ? "?" + qs : ""}`;
  if (cookie) return serverFetch(path, cookie);
  return clientFetch(path);
}

// --- Systems ---
async function getSystems(cookie, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `/systems${qs ? "?" + qs : ""}`;
  if (cookie) return serverFetch(path, cookie);
  return clientFetch(path);
}

// --- Team ---
async function getTeam(cookie, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `/team${qs ? "?" + qs : ""}`;
  if (cookie) return serverFetch(path, cookie);
  return clientFetch(path);
}

// --- Documents ---
async function getDocuments(cookie, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `/documents${qs ? "?" + qs : ""}`;
  if (cookie) return serverFetch(path, cookie);
  return clientFetch(path);
}

module.exports = {
  clientFetch,
  serverFetch,
  login,
  logout,
  getMe,
  getAnnouncements,
  getMetrics,
  getSystems,
  getTeam,
  getDocuments,
};
