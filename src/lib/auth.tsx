"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Admin } from "@/types";
import { setAccessToken, getAccessToken, api } from "./api";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

interface AuthState {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateAdmin: (admin: Admin) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    admin: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const inactivityTimer = useRef<ReturnType<typeof setTimeout>>();

  // Reset inactivity timer on user activity
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      // Auto-logout after 30 minutes of inactivity
      setAccessToken(null);
      sessionStorage.removeItem("ecg_admin");
      sessionStorage.removeItem("ecg_token");
      setState({ admin: null, isAuthenticated: false, isLoading: false });
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }, INACTIVITY_TIMEOUT);
  }, []);

  // Listen for user activity events
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [state.isAuthenticated, resetInactivityTimer]);

  // On mount: try to restore session from sessionStorage, then attempt silent refresh
  useEffect(() => {
    const stored = sessionStorage.getItem("ecg_admin");
    const storedToken = sessionStorage.getItem("ecg_token");
    if (stored && storedToken) {
      try {
        const admin = JSON.parse(stored) as Admin;
        setAccessToken(storedToken);
        setState({ admin, isAuthenticated: true, isLoading: false });
      } catch {
        setState({ admin: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      setState({ admin: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!email || !password) {
        throw new Error("Please enter both email and password.");
      }

      // POST to backend /admin/login
      const response = await api.post<{
        success: boolean;
        accessToken: string;
        admin: Admin;
        error: string | null;
      }>("/admin/login", { email, password });

      if (!response.accessToken || !response.admin) {
        throw new Error(response.error || "Login failed");
      }

      setAccessToken(response.accessToken);
      sessionStorage.setItem("ecg_admin", JSON.stringify(response.admin));
      sessionStorage.setItem("ecg_token", response.accessToken);
      setState({ admin: response.admin, isAuthenticated: true, isLoading: false });
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/admin/logout", {});
    } catch {
      // Ignore errors on logout
    }
    setAccessToken(null);
    sessionStorage.removeItem("ecg_admin");
    sessionStorage.removeItem("ecg_token");
    setState({ admin: null, isAuthenticated: false, isLoading: false });
    router.push("/login");
  }, [router]);

  const updateAdmin = useCallback((admin: Admin) => {
    sessionStorage.setItem("ecg_admin", JSON.stringify(admin));
    setState((prev) => ({ ...prev, admin }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
