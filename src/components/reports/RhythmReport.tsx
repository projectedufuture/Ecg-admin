"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Gauge,
  HeartPulse,
  Info,
  SignalHigh,
  Waves,
} from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import { RhythmEventType, RhythmPattern, RhythmReport as RhythmReportData } from "@/types";
import { usePrintMode } from "@/lib/printMode";

/**
 * Renders one session's rhythm screening.
 *
 * Every value comes from the report prop; on a non-success status the summary
 * blocks are null and the reason is shown instead of zero-filled cards.
 *
 * Status dots grade the ALGORITHMIC result, never health: "Regular" is green
 * because the timing was consistent, not because the heart is healthy.
 */

const PATTERN_COLOR: Record<RhythmPattern, string> = {
  Regular: "#10B981",
  "Mostly Regular": "#10B981",
  Variable: "#F59E0B",
  "Highly Variable": "#F59E0B",
  Unavailable: "#64748B",
};

const EVENT_LABEL: Record<RhythmEventType, string> = {
  elevated_heart_rate: "Elevated heart-rate period",
  low_heart_rate: "Low heart-rate period",
  irregular_rr_period: "Irregular RR timing",
  possible_long_rr: "Possible prolonged RR interval",
  possible_missed_beat: "Possible missed beat",
  possible_double_detection: "Possible double detection",
  signal_quality_drop: "Signal quality drop",
};

const EVENT_COLOR: Record<RhythmEventType, string> = {
  elevated_heart_rate: "#F59E0B",
  low_heart_rate: "#06B6D4",
  irregular_rr_period: "#F59E0B",
  possible_long_rr: "#F59E0B",
  possible_missed_beat: "#8B5CF6",
  possible_double_detection: "#8B5CF6",
  signal_quality_drop: "#64748B",
};

// ── Shared pieces ──────────────────────────────────────────────────

function Card({
  title,
  icon: Icon,
  color,
  children,
  action,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}
    >
      <div
        className="flex items-center justify-between gap-3 flex-wrap"
        style={{ padding: "18px 24px 12px" }}
      >
        <div className="flex items-center gap-[10px]">
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18` }}
          >
            <Icon size={17} style={{ color }} />
          </div>
          <h3 className="text-[15px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>
            {title}
          </h3>
        </div>
        {action}
      </div>
      <div style={{ padding: "0 24px 22px" }}>{children}</div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-[19px] font-bold mt-1" style={{ color: "var(--text-primary)" }}>
        {value}
        {unit && (
          <span className="text-[12px] font-medium ml-1" style={{ color: "var(--text-muted)" }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// Null renders as an em dash, never as 0.
const num = (value: number | null | undefined, decimals = 0): string =>
  value === null || value === undefined ? "—" : value.toFixed(decimals);

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 90) return `${Math.round(seconds)} s`;
  const mins = Math.floor(seconds / 60);
  return `${mins}m ${Math.round(seconds % 60)}s`;
}

function formatClock(startTime: string, offsetSec: number | null): string {
  if (offsetSec === null) return "—";
  const t = new Date(new Date(startTime).getTime() + offsetSec * 1000);
  return Number.isNaN(t.getTime()) ? "—" : t.toLocaleTimeString();
}

// ── Unavailable state ──────────────────────────────────────────────

function UnavailableState({ report }: { report: RhythmReportData }) {
  const q = report.signalQuality;
  const isNoData = report.status === "no_data";

  return (
    <div
      className="rounded-2xl text-center"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-clr)",
        padding: "40px 28px",
      }}
    >
      <div
        className="flex items-center justify-center mx-auto"
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: isNoData ? "rgba(100,116,139,0.12)" : "rgba(245,158,11,0.12)",
          border: `1px solid ${isNoData ? "rgba(100,116,139,0.25)" : "rgba(245,158,11,0.28)"}`,
        }}
      >
        {isNoData ? (
          <Info size={28} style={{ color: "#64748B" }} />
        ) : (
          <AlertTriangle size={28} style={{ color: "#F59E0B" }} />
        )}
      </div>

      <h3 className="text-[17px] font-bold mt-5" style={{ color: "var(--text-primary)" }}>
        Rhythm screening unavailable
      </h3>
      <p
        className="text-[13px] mt-2 mx-auto leading-relaxed"
        style={{ color: "var(--text-secondary)", maxWidth: 470 }}
      >
        {report.message}
      </p>

      {q.beatsDetected > 0 && (
        <div
          className="grid gap-3 mt-6 mx-auto text-left"
          style={{ maxWidth: 470, gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))" }}
        >
          <Stat label="Detected" value={String(q.beatsDetected)} />
          <Stat label="Valid" value={String(q.validBeats)} />
          <Stat label="Invalid" value={String(q.invalidBeats)} />
          <Stat label="Usable" value={num(q.usablePercentage, 1)} unit="%" />
        </div>
      )}
    </div>
  );
}

// ── Main report ────────────────────────────────────────────────────

export default function RhythmReport({ report }: { report: RhythmReportData }) {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  // Forced open while printing: a PDF must not drop these rows just
  // because the section happened to be collapsed on screen.
  const printing = usePrintMode();
  const technicalExpanded = technicalOpen || printing;

  if (report.status !== "success" || !report.summary || !report.screening) {
    return <UnavailableState report={report} />;
  }

  const { summary, screening, signalQuality: q } = report;
  const patternColor = PATTERN_COLOR[summary.rhythmPattern] ?? "#64748B";

  const screeningRows: Array<[string, number, string]> = [
    ["Elevated HR periods", screening.elevatedHRPeriods, "#F59E0B"],
    ["Low HR periods", screening.lowHRPeriods, "#06B6D4"],
    ["Irregular RR periods", screening.irregularRRPeriods, "#F59E0B"],
    ["Possible long RR events", screening.possibleLongRREvents, "#F59E0B"],
  ];

  const technicalRows: Array<[string, string]> = [
    ["Rhythm pattern", summary.rhythmPattern],
    ["Classification confidence", num(summary.classificationConfidence, 2)],
    ["RR coefficient of variation", `${num(summary.rrCvPercent, 2)} %`],
    ["Average HR", `${num(summary.averageHR)} BPM`],
    ["Minimum HR", `${num(summary.minimumHR)} BPM`],
    ["Maximum HR", `${num(summary.maximumHR)} BPM`],
    ["Analysed beats", String(summary.analysedBeats)],
    ["Recording duration", formatDuration(summary.recordingDurationSec)],
    ["Elevated HR periods", String(screening.elevatedHRPeriods)],
    ["Low HR periods", String(screening.lowHRPeriods)],
    ["Irregular RR periods", String(screening.irregularRRPeriods)],
    ["Possible long RR", String(screening.possibleLongRREvents)],
    ["Possible missed beats", String(screening.possibleMissedBeats)],
    ["Possible double detections", String(screening.possibleDoubleDetections)],
    ["Signal quality", q.status],
    ["Usable beats", `${q.validBeats} / ${q.beatsDetected} (${num(q.usablePercentage, 1)}%)`],
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Summary cards ────────────────────────────────────────── */}
      <div
        className="grid gap-[14px]"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}
      >
        <MetricCard
          icon={Waves}
          label="Rhythm Pattern"
          value={summary.rhythmPattern}
          sub={`confidence ${num(summary.classificationConfidence, 2)}`}
          color={patternColor}
        />
        <MetricCard
          icon={HeartPulse}
          label="Average Heart Rate"
          value={`${num(summary.averageHR)} BPM`}
          sub={`${num(summary.minimumHR)}–${num(summary.maximumHR)} BPM range`}
          color="#EF4444"
        />
        <MetricCard
          icon={Activity}
          label="Screening Periods"
          value={String(
            screening.elevatedHRPeriods +
              screening.lowHRPeriods +
              screening.irregularRRPeriods
          )}
          sub="HR and RR observations"
          color="#F59E0B"
        />
        <MetricCard
          icon={SignalHigh}
          label="ECG Quality"
          value={q.status}
          sub={`${num(q.usablePercentage, 1)}% usable`}
          color={q.status === "Good" ? "#10B981" : q.status === "Fair" ? "#F59E0B" : "#EF4444"}
        />
      </div>

      {/* ── Screening counts ─────────────────────────────────────── */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
      >
        <Card title="Screening Results" icon={Gauge} color={patternColor}>
          <div className="flex flex-col">
            {screeningRows.map(([label, value, color]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 py-[9px]"
                style={{ borderBottom: "1px solid var(--border-clr)" }}
              >
                <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  {label}
                </span>
                <span className="flex items-center gap-[6px]">
                  <span
                    className="rounded-full shrink-0"
                    style={{
                      width: 7,
                      height: 7,
                      background: value > 0 ? color : "#10B981",
                    }}
                  />
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {value}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Heart Rate" icon={HeartPulse} color="#EF4444">
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}
          >
            <Stat label="Minimum" value={num(summary.minimumHR)} unit="BPM" />
            <Stat label="Average" value={num(summary.averageHR)} unit="BPM" />
            <Stat label="Maximum" value={num(summary.maximumHR)} unit="BPM" />
          </div>
        </Card>
      </div>

      {/* ── Event timeline ───────────────────────────────────────── */}
      <Card
        title="Rhythm Events"
        icon={AlertTriangle}
        color={report.events.length ? "#F59E0B" : "#10B981"}
        action={
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {report.events.length} {report.events.length === 1 ? "event" : "events"}
          </span>
        }
      >
        {report.events.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            No significant rhythm events were detected during the analyzed recording.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  {["Time", "Event", "Duration", "Detail", "Status"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] uppercase tracking-wide font-semibold py-2 px-2"
                      style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-clr)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.events.map((event, i) => (
                  <tr key={`${event.eventType}-${i}`}>
                    <td
                      className="text-[12.5px] py-[10px] px-2 whitespace-nowrap"
                      style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-clr)" }}
                    >
                      {event.timestamp
                        ? new Date(event.timestamp).toLocaleTimeString()
                        : formatClock(report.startTime, event.startSec)}
                    </td>
                    <td
                      className="text-[12.5px] py-[10px] px-2"
                      style={{ borderBottom: "1px solid var(--border-clr)" }}
                    >
                      <span className="flex items-center gap-[6px]">
                        <span
                          className="rounded-full shrink-0"
                          style={{ width: 7, height: 7, background: EVENT_COLOR[event.eventType] }}
                        />
                        <span style={{ color: "var(--text-primary)" }}>
                          {EVENT_LABEL[event.eventType]}
                        </span>
                      </span>
                    </td>
                    <td
                      className="text-[12.5px] py-[10px] px-2 whitespace-nowrap"
                      style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-clr)" }}
                    >
                      {formatDuration(event.durationSec)}
                    </td>
                    <td
                      className="text-[12.5px] py-[10px] px-2 whitespace-nowrap"
                      style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-clr)" }}
                    >
                      {event.heartRateBpm !== null
                        ? `${event.heartRateBpm} BPM peak`
                        : event.cvPercent !== null
                          ? `${event.cvPercent}% variation`
                          : event.rrValue !== null
                            ? `${event.rrValue} ms`
                            : "—"}
                    </td>
                    <td
                      className="text-[12.5px] py-[10px] px-2 whitespace-nowrap"
                      style={{ borderBottom: "1px solid var(--border-clr)" }}
                    >
                      <span
                        className="inline-flex items-center rounded-full text-[10px] font-semibold"
                        style={{
                          padding: "3px 9px",
                          background: event.requiresQualityReview
                            ? "rgba(139,92,246,0.14)"
                            : "rgba(245,158,11,0.14)",
                          color: event.requiresQualityReview ? "#8B5CF6" : "#F59E0B",
                        }}
                      >
                        {event.requiresQualityReview
                          ? "Signal review"
                          : event.requiresContext
                            ? "Needs context"
                            : "Review"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Technical details ────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}
      >
        <button
          onClick={() => setTechnicalOpen((open) => !open)}
          aria-expanded={technicalOpen}
          className="flex items-center justify-between gap-3 w-full border-none font-sans text-left"
          style={{ padding: "18px 24px", background: "transparent", cursor: "pointer" }}
        >
          <span className="flex items-center gap-[10px]">
            <span
              className="flex items-center justify-center shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(100,116,139,0.14)",
              }}
            >
              <FileText size={17} style={{ color: "#64748B" }} />
            </span>
            <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Technical Details
            </span>
          </span>
          {technicalExpanded ? (
            <ChevronDown size={18} style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
          )}
        </button>

        {technicalExpanded && (
          <div style={{ padding: "0 24px 22px" }}>
            <div
              className="grid gap-x-6"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
            >
              {technicalRows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 py-[9px]"
                  style={{ borderBottom: "1px solid var(--border-clr)" }}
                >
                  <span className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                    {label}
                  </span>
                  <span
                    className="text-[12.5px] font-semibold text-right"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {report.technicalSummary && (
              <p
                className="text-[12px] mt-5 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {report.technicalSummary}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
