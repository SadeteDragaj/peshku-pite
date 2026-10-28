/* Centralised HTTP client for the REST API.
 *
 * Staff calls send the stored access token and transparently refresh it once
 * on a 401 (access tokens only live 15 minutes – the KDS runs all evening).
 */

const BASE = "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail || `HTTP ${status}`);
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let detail = res.statusText;
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") detail = body.detail;
    else if (Array.isArray(body?.detail)) detail = body.detail.map((d: { msg?: string }) => d.msg).join(", ");
  } catch {
    /* not JSON */
  }
  return new ApiError(res.status, detail);
}

let refreshing: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return false;
  refreshing ??= fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const body = await res.json();
      localStorage.setItem("token", body.access_token);
      localStorage.setItem("refresh_token", body.refresh_token);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401 && retry && token && (await refreshToken())) {
    return request<T>(path, init, false);
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string, headers?: HeadersInit) => request<T>(path, { headers }),
  post: <T>(path: string, body: unknown, headers?: HeadersInit) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), headers }),
  put: <T>(path: string, body: unknown, headers?: HeadersInit) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body), headers }),
  patch: <T>(path: string, body: unknown, headers?: HeadersInit) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), headers }),
  del: <T>(path: string, headers?: HeadersInit) => request<T>(path, { method: "DELETE", headers }),
};

/* ---------------------------------------------------------------- staff auth */

export interface StaffUser {
  id: string;
  email: string;
  role: "customer" | "waiter" | "kitchen" | "admin";
}

export async function login(email: string, password: string): Promise<void> {
  const body = await request<{ access_token: string; refresh_token: string }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false,
  );
  localStorage.setItem("token", body.access_token);
  localStorage.setItem("refresh_token", body.refresh_token);
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
}

export function isLoggedIn() {
  return !!localStorage.getItem("token");
}
