const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = atob(padded);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function normalizeScopePart(value) {
  if (!value) return "";
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_.@-]/g, "_");
}

function resolveScopeFromToken(token, scopeHint = "") {
  if (!token) return "guest";
  const payload = decodeJwtPayload(token);
  const claimScope = payload?.sub || payload?.email || payload?.userId || payload?.uid || "";
  const resolved = normalizeScopePart(claimScope || scopeHint);
  return resolved || "authed";
}

let authToken = sessionStorage.getItem("workflow_ui_token") || "";
let authScope = resolveScopeFromToken(authToken);

export function setAuthToken(token, scopeHint = "") {
  authToken = token || "";
  authScope = resolveScopeFromToken(authToken, scopeHint);
  if (authToken) sessionStorage.setItem("workflow_ui_token", authToken);
  else sessionStorage.removeItem("workflow_ui_token");
}

export function getAuthToken() {
  return authToken;
}

export function getAuthScope() {
  return authScope;
}

function toQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

async function request(path, options = {}) {
  const { method = "GET", body, headers = {}, auth = false } = options;

  const mergedHeaders = { ...headers };
  if (auth && authToken) mergedHeaders.Authorization = `Bearer ${authToken}`;

  let payload = body;
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    mergedHeaders["Content-Type"] = mergedHeaders["Content-Type"] || "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { method, headers: mergedHeaders, body: payload });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const message =
      (isJson && (data.message || data.error || data.code)) ||
      (typeof data === "string" && data) ||
      `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const apiBaseUrl = API_BASE_URL;

export const authApi = {
  signup: (body) => request("/auth/signup", { method: "POST", body }),
  login: async (body) => {
    const res = await request("/auth/login", { method: "POST", body });
    const token = res.token || res.jwt || res.accessToken || "";
    if (token) setAuthToken(token, body?.email || "");
    return res;
  },
  setPassword: (body) => request("/auth/set-password", { method: "POST", auth: true, body }),
  linkPassword: (body) => request("/auth/link-password", { method: "POST", body }),
};

export const workflowApi = {
  create: (body) => request("/api/workflows", { method: "POST", auth: true, body }),
  list: () => request("/api/workflows", { auth: true }),
  get: (id) => request(`/api/workflows/${id}`, { auth: true }),
  update: (id, body) => request(`/api/workflows/${id}`, { method: "PUT", auth: true, body }),
  activate: (id) => request(`/api/workflows/${id}/activate`, { method: "POST", auth: true }),
  deactivate: (id) => request(`/api/workflows/${id}/deactivate`, { method: "POST", auth: true }),
  runs: (workflowId) => request(`/api/workflows/${workflowId}/runs`, { auth: true }),
};

export const runApi = {
  get: (runId) => request(`/api/runs/${runId}`, { auth: true }),
  steps: (runId) => request(`/api/runs/${runId}/steps`, { auth: true }),
};

export const pluginApi = {
  listPublic: () => request("/plugins"),
  list: () => request("/api/plugins", { auth: true }),
  get: (id) => request(`/api/plugins/${id}`, { auth: true }),
  create: (body) => request("/api/plugins", { method: "POST", auth: true, body }),
  update: (id, body) => request(`/api/plugins/${id}`, { method: "PUT", auth: true, body }),
  remove: (id) => request(`/api/plugins/${id}`, { method: "DELETE", auth: true }),
};

export const templateApi = {
  list: (includeInactive = false) => request(`/api/templates${toQuery({ includeInactive })}`, { auth: true }),
  get: (id) => request(`/api/templates/${id}`, { auth: true }),
  create: (body) => request("/api/templates", { method: "POST", auth: true, body }),
  update: (id, body) => request(`/api/templates/${id}`, { method: "PUT", auth: true, body }),
  remove: (id) => request(`/api/templates/${id}`, { method: "DELETE", auth: true }),
  instantiate: (id, body) => request(`/api/templates/${id}/instantiate`, { method: "POST", auth: true, body }),
};

export const teamApi = {
  create: (body) => request("/api/teams", { method: "POST", auth: true, body }),
  list: () => request("/api/teams", { auth: true }),
  members: (teamId) => request(`/api/teams/${teamId}/members`, { auth: true }),
  invite: (teamId, body) => request(`/api/teams/${teamId}/invite`, { method: "POST", auth: true, body }),
  acceptInvite: (teamId, inviteId) => request(`/api/teams/${teamId}/invites/${inviteId}/accept`, { method: "POST", auth: true }),
};

export const keyApi = {
  create: (teamId, body) => request(`/api/teams/${teamId}/keys`, { method: "POST", auth: true, body }),
  list: (teamId) => request(`/api/teams/${teamId}/keys`, { auth: true }),
  revoke: (teamId, keyId) => request(`/api/teams/${teamId}/keys/${keyId}/revoke`, { method: "POST", auth: true }),
};

export const hookApi = {
  trigger: (workflowId, body, idempotencyKey) =>
    request(`/hooks/${workflowId}`, {
      method: "POST",
      body,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    }),
  callback: (correlationId, body) => request(`/hooks/callback/${correlationId}`, { method: "POST", body }),
};

export const debugApi = {
  verify: () => request("/api/debug/verify", { auth: true }),
  headers: () => request("/api/debug/headers"),
  home: () => request("/"),
};

export const actuatorApi = {
  health: () => request("/actuator/health"),
  info: () => request("/actuator/info"),
  prometheus: () => request("/actuator/prometheus"),
};
