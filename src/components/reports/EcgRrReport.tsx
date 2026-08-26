"use client";

import { useState } from "react";
import {
  Activity,
  HeartPulse,
  Timer,
  Waves,
  SignalHigh,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  FileText,
} from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import TrendChart from "@/components/ui/TrendChart";
import {
  BeatToBeatVariation,
  EcgRrEvent,
  EcgRrEventType,
  EcgRrReport as EcgRrReportData,
  EcgSignalQualityStatus,
  RrRegularity,
} from "@/types";
import { usePrintMode } from "@/lib/printMode";

/**
 * Renders one session's ECG/RR analysis.
 *
 * Every value shown comes from the report prop. There are no defaults, no
 * fallbacks to zero and no locally computed statistics: when the backend marks a
 * recording unavailable this component shows the reason instead of a report.
 */

// ── Presentation maps ──────────────────────────────────────────────
// These colour the *algorithmic result*, not a clinical judgement — amber and
// red mean "look at this" / "could not analyse", never "unhealthy".

const REGULARITY_COLOR: Record<RrRegularity, string> = {
  Regular: "#10B981",
  "Mostly Regular": "#10B981",
  Variable: "#F59E0B",
  "Highly Variable": "#F59E0B",
  Unavailable: "#EF4444",
};

const VARIATION_COLOR: Record<BeatToBeatVariation, string> = {
  Low: "#10B981",
  Moderate: "#F59E0B",
  High: "#F59E0B",
  Unavailable: "#EF4444",
};

const QUALITY_COLOR: Record<EcgSignalQualityStatus, string> = {
  Good: "#10B981",
  Fair: "#10B981",
  Limited: "#F59E0B",
  Poor: "#EF4444",
  Unavailable: "#EF4444",
};

/** Human-readable event names. Non-diagnostic, matching the backend wording. */
const EVENT_LABEL: Record<EcgRrEventType, string> = {
  possible_long_rr: "Possible prolonged RR interval",
  rr_irregularity: "RR irregularity",
  possible_missed_beat: "Possible missed beat detection",
  possible_double_detection: "Possible double detection",
  signal_quality_drop: "Signal quality drop",
};

/** What a reviewer should do with the event, not what it means clinically. */
const EVENT_STATUS: Record<EcgRrEventType, { text: string; color: string }> = {
  possible_long_rr: { text: "Review", color: "#F59E0B" },
  rr_irregularity: { text: "Observed", color: "#06B6D4" },
  possible_missed_beat: { text: "Signal review", color: "#8B5CF6" },
  possible_double_detection: { text: "Signal review", color: "#8B5CF6" },
  signal_quality_drop: { text: "Excluded", color: "#64748B" },
};

// ── Small shared pieces ────────────────────────────────────────────

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

/** A labelled statistic. `value` is pre-formatted by the caller. */
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

function StatusRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-[10px]"
      style={{ borderBottom: "1px solid var(--border-clr)" }}
    >
      <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color }}>
        <span
          className="rounded-full shrink-0"
          style={{ width: 8, height: 8, background: color }}
          aria-hidden
        />
        {value}
      </span>
    </div>
  );
}

// ── Formatting helpers ─────────────────────────────────────────────
// A null from the backend renders as an em dash. It never becomes 0.

const num = (value: number | null | undefined, decimals = 0): string =>
  value === null || value === undefined ? "—" : value.toFixed(decimals);

function formatClock(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString();
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

// ── Unavailable state ──────────────────────────────────────────────

/**
 * Shown when the backend could not produce a report. The beat accounting is
 * still displayed, because it is what explains the outcome.
 */
function UnavailableState({ report }: { report: EcgRrReportData }) {
  const { signalQuality: sq } = report;
  const isNoData = report.unavailableReason === "no_data";

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
        ECG/RR analysis unavailable
      </h3>
      <p
        className="text-[13px] mt-2 mx-auto leading-relaxed"
        style={{ color: "var(--text-secondary)", maxWidth: 460 }}
      >
        {report.unavailableMessage}
      </p>

      {sq.beatsDetected > 0 && (
        <div
          className="grid gap-3 mt-6 mx-auto text-left"
          style={{
            maxWidth: 460,
            // 4 x 100px + 3 gaps fits inside maxWidth, so the beat accounting
            // stays on one row on desktop and wraps cleanly when narrower.
            gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))",
          }}
        >
          <Stat label="Beats detected" value={String(sq.beatsDetected)} />
          <Stat label="Valid beats" value={String(sq.validBeats)} />
          <Stat label="Invalid beats" value={String(sq.invalidBeats)} />
          <Stat label="Usable" value={num(sq.usablePercentage, 1)} unit="%" />
        </div>
      )}
    </div>
  );
}

// ── Main report ────────────────────────────────────────────────────

export default function EcgRrReport({ report }: { report: EcgRrReportData }) {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  // Forced open while printing: a PDF must not drop these rows just
  // because the section happened to be collapsed on screen.
  const printing = usePrintMode();
  const technicalExpanded = technicalOpen || printing;

  const sq = report.signalQuality;

  if (!report.available || !report.summary || !report.rhythm) {
    return <UnavailableState report={report} />;
  }

  const { summary, rhythm, series } = report;

  const offsets = series.map((p) => p.offsetSec);
  const hrValues = series.map((p) => p.hr);
  const rrValues = series.map((p) => p.rr);

  const technicalRows: Array<[string, string]> = [
    ["Mean RR", `${num(summary.meanRR)} ms`],
    ["Min RR", `${num(summary.minRR)} ms`],
    ["Max RR", `${num(summary.maxRR)} ms`],
    ["RR SD", `${num(summary.rrSD, 1)} ms`],
    ["RR CV", `${num(summary.rrCVPercent, 2)} %`],
    ["Mean HR", `${num(summary.meanHR)} BPM`],
    ["Min HR", `${num(summary.minHR)} BPM`],
    ["Max HR", `${num(summary.maxHR)} BPM`],
    ["Mean absolute RR difference", `${num(rhythm.meanAbsRrDifferenceMs, 1)} ms`],
    ["Maximum RR difference", `${num(rhythm.maxAbsRrDifferenceMs)} ms`],
    ["Beat-to-beat variation", rhythm.beatToBeatVariation],
    ["RR timing description", rhythm.regularity],
    ["Beats detected", String(summary.beatsDetected)],
    ["Valid beats", String(summary.validBeats)],
    ["Invalid beats", String(summary.invalidBeats)],
    ["Usable percentage", `${num(summary.usablePercentage, 2)} %`],
    ["Possible long RR events", String(rhythm.longRREvents)],
    ["Signal quality", sq.status],
    ["Recording duration", formatDuration(report.recordingDurationSec)],
    ["Analysed at", report.analysedAt ? new Date(report.analysedAt).toLocaleString() : "—"],
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Summary cards (PART 18) ─────────────────────────────── */}
      <div
        className="grid gap-[14px]"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}
      >
        <MetricCard
          icon={HeartPulse}
          label="Average Heart Rate"
          value={`${num(summary.meanHR)} BPM`}
          sub={`${num(summary.minHR)}–${num(summary.maxHR)} BPM range`}
          color="#06B6D4"
        />
        <MetricCard
          icon={Timer}
          label="Average RR Interval"
          value={`${num(summary.meanRR)} ms`}
          sub={`${num(summary.minRR)}–${num(summary.maxRR)} ms range`}
          color="#10B981"
        />
        <MetricCard
          icon={Waves}
          label="Rhythm Pattern"
          value={rhythm.regularity}
          sub={`${rhythm.beatToBeatVariation} beat-to-beat variation`}
          color={REGULARITY_COLOR[rhythm.regularity]}
        />
        <MetricCard
          icon={SignalHigh}
          label="ECG Quality"
          value={sq.status}
          sub={`${num(sq.usablePercentage, 1)}% usable`}
          color={QUALITY_COLOR[sq.status]}
        />
      </div>

      {/* ── RR interval analysis (PART 19) ──────────────────────── */}
      <Card title="RR Interval Analysis" icon={Timer} color="#10B981">
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
        >
          <Stat label="Minimum RR" value={num(summary.minRR)} unit="ms" />
          <Stat label="Average RR" value={num(summary.meanRR)} unit="ms" />
          <Stat label="Maximum RR" value={num(summary.maxRR)} unit="ms" />
          <Stat label="RR SD" value={num(summary.rrSD, 1)} unit="ms" />
          <Stat label="RR CV" value={num(summary.rrCVPercent, 2)} unit="%" />
        </div>
      </Card>

      {/* ── Heart rate (PART 3) ─────────────────────────────────── */}
      <Card title="Heart Rate" icon={HeartPulse} color="#06B6D4">
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
        >
          <Stat label="Minimum" value={num(summary.minHR)} unit="BPM" />
          <Stat label="Average" value={num(summary.meanHR)} unit="BPM" />
          <Stat label="Maximum" value={num(summary.maxHR)} unit="BPM" />
        </div>
      </Card>

      {/* ── Beat-to-beat analysis (PART 9) ──────────────────────── */}
      <Card title="Beat-to-Beat Analysis" icon={Activity} color="#F59E0B">
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
        >
          <Stat
            label="Mean abs. difference"
            value={num(rhythm.meanAbsRrDifferenceMs, 1)}
            unit="ms"
          />
          <Stat
            label="Maximum difference"
            value={num(rhythm.maxAbsRrDifferenceMs)}
            unit="ms"
          />
          <div>
            <div
              className="text-[11px] uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Variation
            </div>
            <div
              className="text-[19px] font-bold mt-1 flex items-center gap-[7px]"
              style={{ color: "var(--text-primary)" }}
            >
              <span
                className="rounded-full shrink-0"
                style={{
                  width: 8,
                  height: 8,
                  background: VARIATION_COLOR[rhythm.beatToBeatVariation],
                }}
              />
              {rhythm.beatToBeatVariation}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Trend charts (PART 20, PART 21) ─────────────────────── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Card title="Heart Rate Trend" icon={Activity} color="#06B6D4">
          {series.length > 1 ? (
            <TrendChart x={offsets} y={hrValues} color="#06B6D4" unit="BPM" label="Heart rate" />
          ) : (
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              Not enough analysable intervals to draw a trend.
            </p>
          )}
        </Card>
        <Card title="RR Interval Trend" icon={Timer} color="#10B981">
          {series.length > 1 ? (
            <TrendChart x={offsets} y={rrValues} color="#10B981" unit="ms" label="RR interval" />
          ) : (
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              Not enough analysable intervals to draw a trend.
            </p>
          )}
        </Card>
      </div>

      {/* ── Rhythm screening + signal quality (PART 22, PART 24) ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        {/* Named "RR Timing Pattern", not "Rhythm Screening": the page now has a
            dedicated Rhythm Screening section, and two different things sharing
            one name on the same page reads as a duplicate. This card describes
            the recording's RR timing; that section does the screening. */}
        <Card title="RR Timing Pattern" icon={Waves} color="#8B5CF6">
          <StatusRow
            label="Rhythm pattern"
            value={rhythm.regularity}
            color={REGULARITY_COLOR[rhythm.regularity]}
          />
          <StatusRow
            label="Beat-to-beat variation"
            value={rhythm.beatToBeatVariation}
            color={VARIATION_COLOR[rhythm.beatToBeatVariation]}
          />
          <StatusRow
            label="Possible long RR events"
            value={rhythm.longRREvents}
            color={rhythm.longRREvents > 0 ? "#F59E0B" : "#10B981"}
          />
        </Card>

        <Card title="ECG Signal Quality" icon={SignalHigh} color={QUALITY_COLOR[sq.status]}>
          <StatusRow label="Overall quality" value={sq.status} color={QUALITY_COLOR[sq.status]} />
          <div
            className="grid gap-4 mt-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}
          >
            <Stat label="Detected" value={String(sq.beatsDetected)} />
            <Stat label="Valid" value={String(sq.validBeats)} />
            <Stat label="Invalid" value={String(sq.invalidBeats)} />
            <Stat label="Usable" value={num(sq.usablePercentage, 1)} unit="%" />
          </div>
        </Card>
      </div>

      {/* ── Event timeline (PART 23) ────────────────────────────── */}
      <Card
        title="ECG/RR Events"
        icon={AlertTriangle}
        color="#F59E0B"
        action={
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {report.events.length} {report.events.length === 1 ? "event" : "events"}
          </span>
        }
      >
        {report.events.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            No significant ECG/RR events were detected during the analyzed recording.
          </p>
        ) : (
          // The table scrolls inside its own container so narrow screens never
          // scroll the whole page sideways.
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" style={{ borderCollapse: "collapse", minWidth: 620 }}>
              <thead>
                <tr>
                  {["Time", "Event", "RR", "Duration", "Quality", "Status"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] uppercase tracking-wide font-semibold whitespace-nowrap"
                      style={{
                        color: "var(--text-muted)",
                        padding: "0 12px 10px 0",
                        borderBottom: "1px solid var(--border-clr)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.events.map((event: EcgRrEvent, i: number) => {
                  const status = EVENT_STATUS[event.eventType];
                  return (
                    <tr key={`${event.rPeakTimestamp ?? i}-${event.eventType}`}>
                      <td
                        className="whitespace-nowrap"
                        style={{
                          padding: "11px 12px 11px 0",
                          borderBottom: "1px solid var(--border-clr)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {formatClock(event.timestamp)}
                      </td>
                      <td
                        style={{
                          padding: "11px 12px 11px 0",
                          borderBottom: "1px solid var(--border-clr)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {EVENT_LABEL[event.eventType]}
                      </td>
                      <td
                        className="whitespace-nowrap"
                        style={{
                          padding: "11px 12px 11px 0",
                          borderBottom: "1px solid var(--border-clr)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {event.rrValue === null ? "—" : `${event.rrValue} ms`}
                      </td>
                      <td
                        className="whitespace-nowrap"
                        style={{
                          padding: "11px 12px 11px 0",
                          borderBottom: "1px solid var(--border-clr)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {event.durationMs === null ? "—" : `${event.durationMs} ms`}
                      </td>
                      <td
                        style={{
                          padding: "11px 12px 11px 0",
                          borderBottom: "1px solid var(--border-clr)",
                        }}
                      >
                        <code
                          className="text-[11px] rounded whitespace-nowrap"
                          style={{
                            color: "#8B5CF6",
                            background: "rgba(139,92,246,0.14)",
                            padding: "2px 7px",
                          }}
                        >
                          {event.quality}
                        </code>
                      </td>
                      <td
                        style={{
                          padding: "11px 12px 11px 0",
                          borderBottom: "1px solid var(--border-clr)",
                        }}
                      >
                        <span
                          className="text-[11px] font-semibold rounded-full whitespace-nowrap"
                          style={{
                            color: status.color,
                            background: `${status.color}1F`,
                            padding: "3px 10px",
                          }}
                        >
                          {status.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Technical details (PART 26) ─────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}
      >
        <button
          onClick={() => setTechnicalOpen((open) => !open)}
          aria-expanded={technicalOpen}
          className="flex items-center justify-between gap-3 w-full border-none font-sans text-left"
          style={{
            padding: "18px 24px",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <span className="flex items-center gap-[10px]">
            <span
              className="flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(100,116,139,0.14)" }}
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
