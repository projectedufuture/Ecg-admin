const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "ecgapi-production-9f69.up.railway.app";

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

async function refreshTokenRequest(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/admin/token/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.accessToken) {
      accessToken = data.accessToken;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !skipAuth) {
    const refreshed = await refreshTokenRequest();
    if (refreshed && accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
      res = await fetch(`${BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
        credentials: "include",
      });
    } else {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError("Session expired", 401);
    }
  }

  if (!res.ok) {
    let errorMsg = `API error: ${res.status}`;
    try {
      const body = await res.json();
      errorMsg = body.error || errorMsg;
    } catch { /* ignore */ }
    throw new ApiError(errorMsg, res.status);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/csv")) {
    return (await res.text()) as unknown as T;
  }

  const json = await res.json();

  if (json.success === false) {
    throw new ApiError(json.error || "Request failed", res.status);
  }

  return json as T;
}

/**
 * SWR fetcher - unwraps backend { success, data, error, pagination } envelope.
 * Returns the data field. If pagination exists, attaches it as _pagination.
 */
export async function swrFetcher<T = unknown>(endpoint: string): Promise<T> {
  const json = await apiFetch<Record<string, unknown>>(endpoint);

  if ("data" in json && json.data !== undefined) {
    if (Array.isArray(json.data)) {
      const result: Record<string, unknown> = { items: json.data };
      if ("pagination" in json) result._pagination = json.pagination;
      return result as unknown as T;
    }
    if (typeof json.data === "object" && json.data !== null) {
      const result = { ...(json.data as object) };
      if ("pagination" in json) (result as Record<string, unknown>)._pagination = json.pagination;
      return result as unknown as T;
    }
    return json.data as T;
  }

  return json as unknown as T;
}

export async function downloadExport(type: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${BASE_URL}/admin/export/${type}`, {
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    const refreshed = await refreshTokenRequest();
    if (!refreshed) {
      window.location.href = "/login";
      return;
    }
    headers["Authorization"] = `Bearer ${accessToken}`;
    res = await fetch(`${BASE_URL}/admin/export/${type}`, {
      headers,
      credentials: "include",
    });
  }

  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}_export.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T = unknown>(endpoint: string) => apiFetch<T>(endpoint),
  post: <T = unknown>(endpoint: string, body: unknown) =>
    apiFetch<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: <T = unknown>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
};
