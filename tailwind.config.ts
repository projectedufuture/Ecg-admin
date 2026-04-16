import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ecg: {
          bg: "#0B0F19",
          surface: "#111827",
          "surface-hover": "#1a2236",
          card: "#151d2e",
          "card-border": "#1e293b",
          sidebar: "#0d1321",
          "sidebar-active": "rgba(6,182,212,0.08)",
          accent: "#06B6D4",
          "accent-soft": "rgba(6,182,212,0.15)",
          green: "#10B981",
          "green-soft": "rgba(16,185,129,0.12)",
          red: "#EF4444",
          "red-soft": "rgba(239,68,68,0.12)",
          amber: "#F59E0B",
          "amber-soft": "rgba(245,158,11,0.12)",
          purple: "#8B5CF6",
          "purple-soft": "rgba(139,92,246,0.12)",
          rose: "#F43F5E",
          "rose-soft": "rgba(244,63,94,0.12)",
          text: "#F1F5F9",
          "text-sec": "#94A3B8",
          "text-mut": "#64748B",
          divider: "#1e293b",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
