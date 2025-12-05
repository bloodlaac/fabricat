const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL?.replace(/\/$/, "") ||
  API_BASE_URL.replace(/^http/i, (match) => (match.toLowerCase() === "https" ? "wss" : "ws"));

async function request(path, { method = "GET", body, token, headers } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = isJson ? payload?.detail || payload : payload;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item?.msg || JSON.stringify(item)).join("; ")
          : detail?.message || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.detail = detail;
    throw error;
  }

  return payload;
}

export async function registerUser({ nickname, password, icon }) {
  return request("/auth/register", {
    method: "POST",
    body: { nickname, password, icon },
  });
}

export async function loginUser({ nickname, password }) {
  return request("/auth/login", {
    method: "POST",
    body: { nickname, password },
  });
}

export async function refreshToken({ token }) {
  return request("/auth/refresh", {
    method: "POST",
    token,
  });
}

export async function fetchRecentGames({ token, limit = 10 }) {
  return request(`/history/games/me?limit=${limit}`, {
    method: "GET",
    token,
  });
}

export function buildWsUrl(token) {
  const separator = WS_BASE_URL.endsWith("/") ? "" : "/";
  const url = `${WS_BASE_URL}${separator}ws/game`;
  const query = new URLSearchParams({ token });
  return `${url}?${query.toString()}`;
}

export { API_BASE_URL, WS_BASE_URL };
