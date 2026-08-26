"use client";

import { useRouter } from "next/navigation";
import {
  Activity,
  ChevronRight,
  Clock,
  Droplets,
  HeartPulse,
  Layers,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";

/**
 * Reports — level 1 of the drilldown.
 *
 * Lists the available report modules. ECG / RR Analysis is implemented and
 * navigates onward to the user list; the rest are declared here as planned so
 * the catalogue reflects the roadmap without pretending the reports exist.
 */

interface ReportModule {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  href: string | null;
}

const MODULES: ReportModule[] = [
  {
    id: "ecg-rr",
    title: "ECG / RR Analysis",
    description:
      "RR intervals, beat-to-beat timing, rhythm regularity and long-RR screening from recorded R peaks.",
    icon: Activity,
    color: "#06B6D4",
    href: "/reports/ecg-rr",
  },
  {
    id: "hrv",
    title: "HRV Analysis",
    description:
      "SDNN, RMSSD and pNN50 from the validated NN intervals. Shown in the session report alongside ECG / RR Analysis.",
    icon: Waves,
    color: "#8B5CF6",
    // Both modules are derived from the same beats and are presented together on
    // one session report, so this opens the same user -> session drilldown.
    href: "/reports/ecg-rr",
  },
  {
    id: "rhythm",
    title: "Rhythm Screening",
    description:
      "Elevated and low heart-rate periods, irregular RR timing and beat-detection quality flags. Shown in the session report.",
    icon: HeartPulse,
    color: "#EF4444",
    href: "/reports/ecg-rr",
  },
  {
    id: "respiration",
    title: "Respiration Rate",
    description:
      "Breathing rate estimated from ECG respiratory modulation, cross-checked against the pulse waveform where available.",
    icon: Wind,
    color: "#06B6D4",
    href: "/reports/ecg-rr",
  },
  {
    id: "spo2",
    title: "SpO₂ Analysis",
    description:
      "Saturation trends, desaturation events with recovery, and time below threshold. Shown in the session report.",
    icon: Droplets,
    color: "#06B6D4",
    href: "/reports/ecg-rr",
  },
  {
    id: "temperature",
    title: "Temperature Analysis",
    description:
      "Skin-surface temperature trends, drift and changes relative to the recording's own baseline.",
    icon: Thermometer,
    color: "#F59E0B",
    href: "/reports/ecg-rr",
  },
  {
    id: "combined",
    title: "Combined Physiological Analysis",
    description:
      "How heart rate, SpO₂ and temperature moved in relation to one another, with the evidence behind each association.",
    icon: Layers,
    color: "#8B5CF6",
    href: "/reports/ecg-rr",
  },
];

export default function ReportsPage() {
  const router = useRouter();

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>
          Reports
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
          View and analyze physiological reports generated from recorded user sessions.
        </p>
      </div>

      <div
        className="grid gap-[14px]"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
      >
        {MODULES.map((module) => {
          const available = module.href !== null;
          return (
            <button
              key={module.id}
              onClick={() => module.href && router.push(module.href)}
              disabled={!available}
              className="rounded-2xl text-left border-none font-sans transition-colors duration-200 relative overflow-hidden"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-clr)",
                padding: "22px 24px",
                cursor: available ? "pointer" : "default",
                opacity: available ? 1 : 0.62,
              }}
              onMouseEnter={(e) => {
                if (available) e.currentTarget.style.borderColor = module.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-clr)";
              }}
            >
              <div
                className="absolute -top-5 -right-5 rounded-full"
                style={{ width: 80, height: 80, background: module.color, opacity: 0.06 }}
              />

              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: `${module.color}18`,
                  }}
                >
                  <module.icon size={18} style={{ color: module.color }} />
                </div>

                {available ? (
                  <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
                ) : (
                  <span
                    className="inline-flex items-center gap-[5px] rounded-full text-[10px] font-bold whitespace-nowrap"
                    style={{
                      padding: "4px 10px",
                      background: "rgba(245,158,11,0.12)",
                      border: "1px solid rgba(245,158,11,0.26)",
                      color: "#F59E0B",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <Clock size={10} />
                    IN PROGRESS
                  </span>
                )}
              </div>

              <div className="text-[15px] font-semibold mt-4" style={{ color: "var(--text-primary)" }}>
                {module.title}
              </div>
              <p
                className="text-[12.5px] mt-[6px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {module.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
