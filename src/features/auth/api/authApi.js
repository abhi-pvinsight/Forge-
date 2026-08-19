import { API_BASE_URL } from "../../electrical/pv/pv-design/api/apiConfig";

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function authFetch(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await readJson(response);
  if (!response.ok || data.success === false) {
    const message = data.error || `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export function signInApi(email, password) {
  return authFetch("/api/auth/sign-in", {
    method: "POST",
    body: { email, password },
  });
}

export function signUpApi({ fullName, email, department, vertical, password }) {
  const payload = {
    full_name: fullName,
    email,
    password,
    department,
    vertical,
  };

  return authFetch("/api/auth/sign-up", {
    method: "POST",
    body: payload,
  });
}

export function refreshSessionApi(refreshToken) {
  return authFetch("/api/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

export function fetchCurrentUserApi(accessToken) {
  return authFetch("/api/auth/me", {
    token: accessToken,
  });
}

export function forgotPasswordApi(email) {
  return authFetch("/api/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}
