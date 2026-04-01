// API service layer for secure communication with the backend.
// Handles CSRF tokens, cookies, and provides typed fetch wrappers.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const INTERNAL_API = process.env.INTERNAL_API_URL || "http://backend:4000/api/v1";

function resolveApiAssetUrl(path) {
  if (!path || typeof path !== "string") return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  if (path.startsWith("/api/")) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${API_BASE}${path}`;
  }
  return `${API_BASE}/${path}`;
}

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

async function requestPasswordReset(email) {
  return clientFetch("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

async function verifyPasswordResetCode(email, code) {
  return clientFetch("/auth/password-reset/verify", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

async function confirmPasswordReset(email, resetToken, newPassword) {
  return clientFetch("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ email, resetToken, newPassword }),
  });
}

// --- Announcements ---
async function getAnnouncements(cookie, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `/announcements${qs ? "?" + qs : ""}`;
  if (typeof window === "undefined") return serverFetch(path, cookie);
  return clientFetch(path);
}

// --- Metrics ---
async function getMetrics(cookie, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `/metrics${qs ? "?" + qs : ""}`;
  if (typeof window === "undefined") return serverFetch(path, cookie);
  return clientFetch(path);
}

// --- Systems ---
async function getSystems(cookie, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `/systems${qs ? "?" + qs : ""}`;
  if (typeof window === "undefined") return serverFetch(path, cookie);
  return clientFetch(path);
}

// --- Team ---
async function getTeam(cookie, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `/team${qs ? "?" + qs : ""}`;
  if (typeof window === "undefined") return serverFetch(path, cookie);
  return clientFetch(path);
}

// --- Documents ---
async function getDocuments(cookie, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `/documents${qs ? "?" + qs : ""}`;
  if (typeof window === "undefined") return serverFetch(path, cookie);
  return clientFetch(path);
}

// --- Admin mutations: Announcements ---
async function createAnnouncement(data) {
  return clientFetch("/announcements", { method: "POST", body: JSON.stringify(data) });
}
async function updateAnnouncement(id, data) {
  return clientFetch(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
async function deleteAnnouncement(id) {
  return clientFetch(`/announcements/${id}`, { method: "DELETE" });
}

// --- Admin mutations: Systems ---
async function createSystem(data) {
  return clientFetch("/systems", { method: "POST", body: JSON.stringify(data) });
}
async function updateSystem(id, data) {
  return clientFetch(`/systems/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
async function deleteSystem(id) {
  return clientFetch(`/systems/${id}`, { method: "DELETE" });
}

// --- Admin mutations: Team ---
async function createTeamMember(data) {
  return clientFetch("/team", {
    method: "POST",
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}
async function updateTeamMember(id, data) {
  return clientFetch(`/team/${id}`, {
    method: "PUT",
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}
async function deleteTeamMember(id) {
  return clientFetch(`/team/${id}`, { method: "DELETE" });
}

// --- Admin mutations: Documents ---
async function uploadDocument(formData) {
  return clientFetch("/documents", { method: "POST", body: formData });
}
async function deleteDocument(id) {
  return clientFetch(`/documents/${id}`, { method: "DELETE" });
}

// --- Admin mutations: Metrics ---
async function createMetric(data) {
  return clientFetch("/metrics", { method: "POST", body: JSON.stringify(data) });
}
async function updateMetric(id, data) {
  return clientFetch(`/metrics/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
async function deleteMetric(id) {
  return clientFetch(`/metrics/${id}`, { method: "DELETE" });
}

module.exports = {
  clientFetch,
  serverFetch,
  resolveApiAssetUrl,
  login,
  logout,
  getMe,
  requestPasswordReset,
  verifyPasswordResetCode,
  confirmPasswordReset,
  getAnnouncements,
  getMetrics,
  getSystems,
  getTeam,
  getDocuments,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  createSystem,
  updateSystem,
  deleteSystem,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  uploadDocument,
  deleteDocument,
  createMetric,
  updateMetric,
  deleteMetric,
};
