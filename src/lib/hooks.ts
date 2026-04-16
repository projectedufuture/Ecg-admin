"use client";

import useSWR, { SWRConfiguration } from "swr";
import { swrFetcher } from "@/lib/api";

// Generic list response from backend (after unwrapping envelope)
interface ListResponse<T> {
  items: T[];
  _pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function buildQuery(params: Record<string, unknown>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `?${qs}` : "";
}

// ─── Dashboard ───
export function useDashboard(config?: SWRConfiguration) {
  return useSWR("/admin/dashboard", swrFetcher, {
    refreshInterval: 30000,
    ...config,
  });
}

// ─── Users ───
export function useUsers(
  params: { page?: number; limit?: number; search?: string; sort?: string; order?: string; status?: string } = {},
  config?: SWRConfiguration
) {
  const query = buildQuery({ page: params.page || 1, limit: params.limit || 25, ...params });
  return useSWR<ListResponse<Record<string, unknown>>>(`/admin/users${query}`, swrFetcher, config);
}

export function useUser(id: string | null, config?: SWRConfiguration) {
  return useSWR(id ? `/admin/users/${id}` : null, swrFetcher, config);
}

export function useUserSessions(userId: string | null, config?: SWRConfiguration) {
  // Backend listSessions supports ?userId= filter
  return useSWR(
    userId ? `/admin/readings?userId=${userId}&limit=100&sort=startTime&order=desc` : null,
    swrFetcher,
    config
  );
}

// ─── Sessions ───
export function useSessions(
  params: { page?: number; limit?: number; search?: string; sort?: string; order?: string; dataSource?: string; userId?: string } = {},
  config?: SWRConfiguration
) {
  const query = buildQuery({ page: params.page || 1, limit: params.limit || 25, ...params });
  return useSWR<ListResponse<Record<string, unknown>>>(`/admin/readings${query}`, swrFetcher, config);
}

export function useSessionDetail(sessionId: string | null, config?: SWRConfiguration) {
  return useSWR(sessionId ? `/admin/readings/${sessionId}` : null, swrFetcher, config);
}

// ─── Devices ───
export function useDevices(
  params: { page?: number; limit?: number; search?: string; sort?: string; order?: string; licenseStatus?: string } = {},
  config?: SWRConfiguration
) {
  const query = buildQuery({ page: params.page || 1, limit: params.limit || 25, ...params });
  return useSWR<ListResponse<Record<string, unknown>>>(`/admin/devices${query}`, swrFetcher, config);
}

export function useDevice(id: string | null, config?: SWRConfiguration) {
  return useSWR(id ? `/admin/devices/${id}` : null, swrFetcher, config);
}

// ─── Licenses ───
export function useLicenses(
  params: { page?: number; limit?: number; search?: string; sort?: string; order?: string; status?: string } = {},
  config?: SWRConfiguration
) {
  const query = buildQuery({ page: params.page || 1, limit: params.limit || 25, ...params });
  return useSWR<ListResponse<Record<string, unknown>>>(`/admin/licenses${query}`, swrFetcher, config);
}
