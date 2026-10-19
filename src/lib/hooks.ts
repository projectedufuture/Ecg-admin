"use client";

import useSWR, { SWRConfiguration } from "swr";
import { swrFetcher } from "@/lib/api";
import {
  EcgRrReport,
  HrvReport,
  HrvTrend,
  RespirationReport,
  RhythmReport,
  Spo2Report,
  TemperatureReport,
  CombinedReport,
} from "@/types";

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
    refreshInterval: 5000,        // poll every 5s for live feel
    revalidateOnFocus: true,      // refresh when user clicks back to tab
    revalidateOnReconnect: true,
    ...config,
  });
}

// ─── Notifications ───
export function useNotifications(
  params: { page?: number; limit?: number; type?: string } = {},
  config?: SWRConfiguration
) {
  const query = buildQuery({ page: params.page || 1, limit: params.limit || 50, ...params });
  return useSWR<ListResponse<Record<string, unknown>>>(`/admin/notifications${query}`, swrFetcher, config);
}

// ─── Summary email schedules ───
export function useSummarySchedules(config?: SWRConfiguration) {
  return useSWR<ListResponse<Record<string, unknown>>>(
    "/admin/summary-schedules",
    swrFetcher,
    { refreshInterval: 30000, ...config }
  );
}

// ─── Support tickets ───
export function useTickets(
  params: { status?: string; priority?: string; category?: string; search?: string } = {},
  config?: SWRConfiguration
) {
  const query = buildQuery({ limit: 100, ...params });
  return useSWR<Record<string, unknown>>(`/admin/tickets${query}`, swrFetcher, {
    refreshInterval: 15000,
    ...config,
  });
}

export function useTicket(id: string | null, config?: SWRConfiguration) {
  return useSWR(id ? `/admin/tickets/${id}` : null, swrFetcher, {
    refreshInterval: 6000,
    ...config,
  });
}

// ─── Alerts ───
export function useAlerts(config?: SWRConfiguration) {
  return useSWR("/admin/alerts", swrFetcher, { refreshInterval: 30000, ...config });
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

// ─── Reports ───
/**
 * ECG/RR analysis for one session.
 *
 * The backend serves a stored analysis, so this is a cheap read; it is not
 * polled on an interval because a finished recording's report does not change.
 */
export function useEcgRrReport(sessionId: string | null, config?: SWRConfiguration) {
  return useSWR<EcgRrReport>(
    sessionId ? `/admin/readings/${sessionId}/reports/ecg-rr` : null,
    swrFetcher,
    { revalidateOnFocus: false, ...config }
  );
}

/**
 * HRV analysis for one session. Computed alongside the ECG/RR analysis from the
 * same validated NN sequence, so this is a cheap read of a stored result.
 */
export function useHrvReport(sessionId: string | null, config?: SWRConfiguration) {
  return useSWR<HrvReport>(
    sessionId ? `/admin/readings/${sessionId}/reports/hrv` : null,
    swrFetcher,
    { revalidateOnFocus: false, ...config }
  );
}

/** The user's HRV across their sessions, for the trend chart. */
export function useHrvTrend(sessionId: string | null, config?: SWRConfiguration) {
  return useSWR<HrvTrend>(
    sessionId ? `/admin/readings/${sessionId}/reports/hrv/trend` : null,
    swrFetcher,
    { revalidateOnFocus: false, ...config }
  );
}

/** Rhythm screening for one session. */
export function useRhythmReport(sessionId: string | null, config?: SWRConfiguration) {
  return useSWR<RhythmReport>(
    sessionId ? `/admin/readings/${sessionId}/reports/rhythm` : null,
    swrFetcher,
    { revalidateOnFocus: false, ...config }
  );
}

/** Respiration estimate for one session. */
export function useRespirationReport(sessionId: string | null, config?: SWRConfiguration) {
  return useSWR<RespirationReport>(
    sessionId ? `/admin/readings/${sessionId}/reports/respiration` : null,
    swrFetcher,
    { revalidateOnFocus: false, ...config }
  );
}

/** SpO₂ analysis for one session. */
export function useSpo2Report(sessionId: string | null, config?: SWRConfiguration) {
  return useSWR<Spo2Report>(
    sessionId ? `/admin/readings/${sessionId}/reports/spo2` : null,
    swrFetcher,
    { revalidateOnFocus: false, ...config }
  );
}

/** Temperature analysis for one session. */
export function useTemperatureReport(sessionId: string | null, config?: SWRConfiguration) {
  return useSWR<TemperatureReport>(
    sessionId ? `/admin/readings/${sessionId}/reports/temperature` : null,
    swrFetcher,
    { revalidateOnFocus: false, ...config }
  );
}

/** Combined cross-signal analysis for one session. */
export function useCombinedReport(sessionId: string | null, config?: SWRConfiguration) {
  return useSWR<CombinedReport>(
    sessionId ? `/admin/readings/${sessionId}/reports/combined` : null,
    swrFetcher,
    { revalidateOnFocus: false, ...config }
  );
}
