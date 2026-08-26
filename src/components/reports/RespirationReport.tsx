"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Gauge,
  Info,
  LineChart,
  Wind,
} from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import TrendChart from "@/components/ui/TrendChart";
import {
  RespirationConfidence,
  RespirationEstimate,
  RespirationReport as RespirationReportData,
} from "@/types";
import { usePrintMode } from "@/lib/printMode";

/**
 * Renders one session's respiration estimate.
 *
 * Both estimator blocks are always shown — each carrying either a rate or the
 * reason it is missing — so a gap is explained rather than left blank. The
 * headline rate is withheld entirely when the two estimators disagree.
 */

const CONFIDENCE_COLOR: Record<RespirationConfidence, string> = {
  High: "#10B981",
  Moderate: "#F59E0B",
  Low: "#F59E0B",
  Unavailable: "#64748B",
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

const num = (value: number | null | undefined, decimals = 0): string =>
  value === null || value === undefined ? "—" : value.toFixed(decimals);

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 90) return `${Math.round(seconds)} s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

/** One estimator's card: its rate, or exactly why it has none. */
function EstimateCard({
  title,
  icon,
  color,
  estimate,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  estimate: RespirationEstimate;
}) {
  return (
    <Card
      title={title}
      icon={icon}
      color={estimate.available ? color : "#64748B"}
      action={
        <span
          className="inline-flex items-center rounded-full text-[10px] font-semibold"
          style={{
            padding: "3px 9px",
            background: estimate.available ? `${color}1F` : "rgba(100,116,139,0.16)",
            color: estimate.available ? color : "#64748B",
          }}
        >
          {estimate.available ? estimate.quality : "Unavailable"}
        </span>
      }
    >
      {estimate.available ? (
        <>
          <div className="text-[26px] font-bold" style={{ color: "var(--text-primary)" }}>
            {num(estimate.rate, 1)}
            <span className="text-[13px] font-medium ml-2" style={{ color: "var(--text-muted)" }}>
              breaths/min
            </span>
          </div>
          <div className="flex gap-5 flex-wrap mt-3">
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {num(estimate.freqHz, 3)} Hz
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              peak {num(estimate.prominence, 1)}× band mean
            </span>
            {estimate.intervalsUsed != null && (
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {estimate.intervalsUsed} NN intervals
              </span>
            )}
            {estimate.samplesUsed != null && (
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {estimate.samplesUsed} samples
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {estimate.detail}
        </p>
      )}
    </Card>
  );
}

// ── Unavailable state ──────────────────────────────────────────────

function UnavailableState({ report }: { report: RespirationReportData }) {
  const isNoData = report.status === "no_data";

  return (
    <div className="flex flex-col gap-4">
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
          Respiration rate unavailable
        </h3>
        <p
          className="text-[13px] mt-2 mx-auto leading-relaxed"
          style={{ color: "var(--text-secondary)", maxWidth: 480 }}
        >
          {report.message}
        </p>
      </div>

      {/* Both estimators are still shown, so the gap is explained. */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
      >
        <EstimateCard
          title="ECG-derived"
          icon={Activity}
          color="#06B6D4"
          estimate={report.ecgEstimate}
        />
        <EstimateCard
          title="PPG-derived"
          icon={Gauge}
          color="#10B981"
          estimate={report.ppgEstimate}
        />
      </div>
    </div>
  );
}

// ── Main report ────────────────────────────────────────────────────

export default function RespirationReport({ report }: { report: RespirationReportData }) {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  // Forced open while printing: a PDF must not drop these rows just
  // because the section happened to be collapsed on screen.
  const printing = usePrintMode();
  const technicalExpanded = technicalOpen || printing;

  const { summary, crossCheck, recording } = report;

  if (report.status !== "success" || summary.respirationRate === null) {
    return <UnavailableState report={report} />;
  }

  const usableTrend = report.trend.filter((p) => p.usable && p.rateBpm !== null);
  const suppressedWindows = report.trend.length - usableTrend.length;

  const technicalRows: Array<[string, string]> = [
    ["Respiration rate", `${num(summary.respirationRate, 1)} breaths/min`],
    ["Confidence", summary.confidence],
    [
      "Derived from",
      summary.basis === "ecg_and_ppg"
        ? "ECG and PPG"
        : summary.basis === "ecg_only"
          ? "ECG only"
          : "PPG only",
    ],
    ["ECG-derived rate", report.ecgEstimate.available ? `${num(report.ecgEstimate.rate, 1)} breaths/min` : "—"],
    ["ECG peak frequency", report.ecgEstimate.available ? `${num(report.ecgEstimate.freqHz, 3)} Hz` : "—"],
    ["ECG peak prominence", report.ecgEstimate.available ? `${num(report.ecgEstimate.prominence, 1)}×` : "—"],
    ["PPG-derived rate", report.ppgEstimate.available ? `${num(report.ppgEstimate.rate, 1)} breaths/min` : "—"],
    ["Cross-check", crossCheck.status ?? "—"],
    ["Estimate difference", crossCheck.difference !== null ? `${num(crossCheck.difference, 1)} breaths/min` : "—"],
    ["Recording duration", formatDuration(recording.durationSec)],
    ["Analysed duration", formatDuration(recording.analysedDurationSec)],
    ["Spectral resolution", `${num(recording.spectralResolutionBpm, 2)} breaths/min`],
    ["Artifact percentage", `${num(recording.artifactPercentage, 2)} %`],
    ["Within resting plausibility band", summary.withinPlausibleRange ? "Yes" : "No"],
    ["Trend windows suppressed", String(suppressedWindows)],
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Summary cards ────────────────────────────────────────── */}
      <div
        className="grid gap-[14px]"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}
      >
        <MetricCard
          icon={Wind}
          label="Respiration Rate"
          value={`${num(summary.respirationRate, 1)}`}
          sub="breaths per minute"
          color="#06B6D4"
        />
        <MetricCard
          icon={Gauge}
          label="Confidence"
          value={summary.confidence}
          sub={crossCheck.status ?? ""}
          color={CONFIDENCE_COLOR[summary.confidence]}
        />
        <MetricCard
          icon={Activity}
          label="ECG-derived"
          value={report.ecgEstimate.available ? `${num(report.ecgEstimate.rate, 1)}` : "—"}
          sub={report.ecgEstimate.available ? "breaths/min" : "unavailable"}
          color="#10B981"
        />
        <MetricCard
          icon={LineChart}
          label="PPG-derived"
          value={report.ppgEstimate.available ? `${num(report.ppgEstimate.rate, 1)}` : "—"}
          sub={report.ppgEstimate.available ? "breaths/min" : "unavailable"}
          color="#8B5CF6"
        />
      </div>

      {/* ── Estimators + cross-check ─────────────────────────────── */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
      >
        <EstimateCard
          title="ECG-derived"
          icon={Activity}
          color="#10B981"
          estimate={report.ecgEstimate}
        />
        <EstimateCard
          title="PPG-derived"
          icon={Gauge}
          color="#8B5CF6"
          estimate={report.ppgEstimate}
        />
      </div>

      <Card title="Cross-check & Recording" icon={Gauge} color="#06B6D4">
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}
        >
          <Stat label="Cross-check" value={crossCheck.status ?? "—"} />
          <Stat
            label="Difference"
            value={crossCheck.difference !== null ? num(crossCheck.difference, 1) : "—"}
            unit={crossCheck.difference !== null ? "br/min" : undefined}
          />
          <Stat label="Analysed" value={formatDuration(recording.analysedDurationSec)} />
          <Stat label="Resolution" value={num(recording.spectralResolutionBpm, 2)} unit="br/min" />
          <Stat label="Artifact" value={num(recording.artifactPercentage, 1)} unit="%" />
        </div>
      </Card>

      {/* ── Trend ────────────────────────────────────────────────── */}
      <Card
        title="Respiration Trend"
        icon={LineChart}
        color="#06B6D4"
        action={
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {usableTrend.length} of {report.trend.length} windows usable
          </span>
        }
      >
        {usableTrend.length > 1 ? (
          <>
            <TrendChart
              x={usableTrend.map((p) => p.midpointSec)}
              y={usableTrend.map((p) => p.rateBpm as number)}
              color="#06B6D4"
              unit="br/min"
              label="Respiration rate"
              pointNoun="windows"
            />
          </>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Not enough reliable windows to draw a respiration trend for this recording.
          </p>
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
