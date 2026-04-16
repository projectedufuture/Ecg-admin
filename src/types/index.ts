export type AdminRole = "super_admin" | "client_admin";

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  clientId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  registeredDate: string;
  lastActive: string;
  status: "active" | "inactive";
  deviceId: string | null;
  sessions: number;
}

export interface Device {
  id: string;
  userId: string | null;
  userName: string;
  lastSeen: string;
  firmware: string;
  hardwareVersion: string;
  licenseStatus: "active" | "inactive" | "expired";
  batteryLevel: number;
}

export interface Session {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  deviceId: string;
  startTime: string;
  endTime: string;
  duration: number;
  dataPoints: number;
  dataSource: "live" | "stored" | "mixed";
  avgTemp: string;
  avgHR: number;
  minHR: number;
  maxHR: number;
}

export interface License {
  id: string;
  licenseKey: string;
  deviceId: string;
  clientId: string;
  status: "active" | "inactive" | "expired";
  activationDate: string;
  expiryDate: string;
}

export interface Reading {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: string;
  ecgValue: number;
  temperatureCelsius: number;
  deviceId: string;
}

export interface DashboardMetrics {
  totalUsers: number;
  totalSessions: number;
  activeDevices: number;
  totalDevices: number;
  activeLicenses: number;
  systemHealth: "green" | "yellow" | "red";
}

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}
