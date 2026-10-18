const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1").replace(/\/$/, "");

export const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem("orbit-session") || "null");
  } catch {
    return null;
  }
};

export const saveSession = (session) => {
  localStorage.setItem("orbit-session", JSON.stringify(session));
};

export const clearSession = () => localStorage.removeItem("orbit-session");

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Can’t reach the server. Check that the backend is running.");
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Request failed (${response.status})`);
  }
  return payload;
}

export async function refreshSession(session) {
  const response = await apiRequest("/users/refresh-token", {
    method: "POST",
    body: { refreshToken: session.refreshToken },
  });
  return {
    user: session.user,
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  };
}

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
