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
  Minus,
  Percent,
  SignalHigh,
  Sigma,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import TrendChart from "@/components/ui/TrendChart";
import { HrvQuality, HrvReport as HrvReportData, HrvTrend } from "@/types";
import { usePrintMode } from "@/lib/printMode";

/**
 * Renders one session's HRV analysis.
 *
 * Every value comes from the report prop. When the backend reports a non-success
 * status the metric blocks are null and this shows the reason instead — there is
 * no path that renders a card reading "SDNN 0 ms".
 *
 * Colours grade the *confidence in the measurement*, never the HRV value itself:
 * there is deliberately no "good HRV" / "bad HRV" styling anywhere here.
 */

const QUALITY_COLOR: Record<HrvQuality, string> = {
  Good: "#10B981",
  Acceptable: "#10B981",
  Limited: "#F59E0B",
  Insufficient: "#EF4444",
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

// A null from the backend renders as an em dash, never as 0.
const num = (value: number | null | undefined, decimals = 0): string =>
  value === null || value === undefined ? "—" : value.toFixed(decimals);

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 90) return `${Math.round(seconds)} s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

// ── Unavailable state ──────────────────────────────────────────────

function UnavailableState({ report }: { report: HrvReportData }) {
  const q = report.quality;
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
        HRV analysis unavailable
      </h3>
      <p
        className="text-[13px] mt-2 mx-auto leading-relaxed"
        style={{ color: "var(--text-secondary)", maxWidth: 470 }}
      >
        {report.message}
      </p>

      {q.totalIntervals > 0 && (
        <div
          className="grid gap-3 mt-6 mx-auto text-left"
          style={{ maxWidth: 470, gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))" }}
        >
          <Stat label="Intervals" value={String(q.totalIntervals)} />
          <Stat label="Valid NN" value={String(q.validNNIntervals)} />
          <Stat label="Excluded" value={String(q.excludedIntervals)} />
          <Stat label="Artifact" value={num(q.artifactPercentage, 1)} unit="%" />
        </div>
      )}
    </div>
  );
}

// ── Across-session trend ───────────────────────────────────────────

function HrvTrendSection({
  trend,
  currentSessionId,
}: {
  trend: HrvTrend | undefined;
  currentSessionId: string;
}) {
  const points = trend?.points ?? [];

  // A trend needs at least two real sessions; one point is not a trend.
  if (points.length < 2) {
    return (
      <Card title="HRV Trend" icon={LineChart} color="#8B5CF6">
        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
          HRV trend will be available after additional recordings.
          {points.length === 1 && " Only one analysed session exists so far."}
        </p>
      </Card>
    );
  }

  // One point per session, so the x axis is session order rather than elapsed
  // time; the axis is labelled with recording dates instead of durations.
  const x = points.map((_, i) => i);
  const y = points.map((p) => p.rmssdMs);
  const xLabels = points.map((p) =>
    new Date(p.startTime).toLocaleDateString(undefined, { day: "2-digit", month: "short" })
  );
  const currentIndex = points.findIndex((p) => p.sessionId === currentSessionId);

  return (
    <Card
      title="HRV Trend"
      icon={LineChart}
      color="#8B5CF6"
      action={
        <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          RMSSD across {points.length} analysed sessions
        </span>
      }
    >
      <TrendChart
        x={x}
        y={y}
        xLabels={xLabels}
        pointNoun="sessions"
        color="#8B5CF6"
        unit="ms"
        label="RMSSD by session"
      />
      <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {new Date(points[0].startTime).toLocaleDateString()} —{" "}
          {new Date(points[points.length - 1].startTime).toLocaleDateString()}
        </span>
        {currentIndex >= 0 && (
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            This session is #{currentIndex + 1} of {points.length}
          </span>
        )}
      </div>
    </Card>
  );
}

// ── Main report ────────────────────────────────────────────────────

export default function HrvReport({
  report,
  trend,
  trendLoading,
}: {
  report: HrvReportData;
  trend?: HrvTrend;
  trendLoading?: boolean;
}) {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  // Forced open while printing: a PDF must not drop these rows just
  // because the section happened to be collapsed on screen.
  const printing = usePrintMode();
  const technicalExpanded = technicalOpen || printing;

  if (report.status !== "success" || !report.metrics) {
    return <UnavailableState report={report} />;
  }

  const { metrics, quality: q, recording, baseline } = report;

  const offsets = report.timeSeries.map((p) => p.offsetSec);
  const nnValues = report.timeSeries.map((p) => p.nnMs);

  const technicalRows: Array<[string, string]> = [
    ["Recording duration", formatDuration(recording.durationSec)],
    ["Analysis duration", formatDuration(recording.analysisDurationSec)],
    ["Mean NN", `${num(metrics.meanNNMs)} ms`],
    ["Minimum NN", `${num(metrics.minNNMs)} ms`],
    ["Maximum NN", `${num(metrics.maxNNMs)} ms`],
    ["SDNN", `${num(metrics.sdnnMs, 1)} ms`],
    ["RMSSD", `${num(metrics.rmssdMs, 1)} ms`],
    ["pNN50", `${num(metrics.pnn50Percent, 1)} %`],
    ["Total RR intervals", String(q.totalIntervals)],
    ["Valid NN intervals", String(q.validNNIntervals)],
    ["Excluded intervals", String(q.excludedIntervals)],
    ["Artifact percentage", `${num(q.artifactPercentage, 2)} %`],
    ["Successive NN pairs", String(q.successivePairs)],
    ["Pairs skipped across gaps", String(q.successivePairsSkipped)],
    ["HRV confidence", q.status],
    ["ECG signal quality", q.ecgSignalQuality ?? "—"],
    ["Analysed at", report.analysedAt ? new Date(report.analysedAt).toLocaleString() : "—"],
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Summary cards ────────────────────────────────────────── */}
      <div
        className="grid gap-[14px]"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}
      >
        <MetricCard
          icon={Sigma}
          label="SDNN"
          value={`${num(metrics.sdnnMs, 1)} ms`}
          sub="Overall NN variation"
          color="#06B6D4"
        />
        <MetricCard
          icon={Activity}
          label="RMSSD"
          value={`${num(metrics.rmssdMs, 1)} ms`}
          sub="Short-term beat-to-beat change"
          color="#10B981"
        />
        <MetricCard
          icon={Percent}
          label="pNN50"
          value={`${num(metrics.pnn50Percent, 1)}%`}
          sub={`of ${q.successivePairs} successive pairs`}
          color="#8B5CF6"
        />
        <MetricCard
          icon={Gauge}
          label="HRV Quality"
          value={q.status}
          sub={`${num(q.usablePercentage, 1)}% of intervals usable`}
          color={QUALITY_COLOR[q.status]}
        />
      </div>

      {/* ── Recording context ────────────────────────────────────── */}
      <Card title="Recording & Interval Quality" icon={SignalHigh} color={QUALITY_COLOR[q.status]}>
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}
        >
          <Stat label="Recording duration" value={formatDuration(recording.durationSec)} />
          <Stat label="Analysis duration" value={formatDuration(recording.analysisDurationSec)} />
          <Stat
            label="Valid NN intervals"
            value={`${q.validNNIntervals} / ${q.totalIntervals}`}
          />
          <Stat label="Excluded" value={String(q.excludedIntervals)} />
          <Stat label="Artifact" value={num(q.artifactPercentage, 1)} unit="%" />
        </div>
      </Card>

      {/* ── NN interval detail + baseline ────────────────────────── */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
      >
        <Card title="NN Interval Detail" icon={Activity} color="#10B981">
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}
          >
            <Stat label="Minimum NN" value={num(metrics.minNNMs)} unit="ms" />
            <Stat label="Mean NN" value={num(metrics.meanNNMs)} unit="ms" />
            <Stat label="Maximum NN" value={num(metrics.maxNNMs)} unit="ms" />
          </div>
        </Card>

        <Card title="Personal Baseline" icon={Gauge} color="#8B5CF6">
          {baseline.available ? (
            <>
              <div
                className="grid gap-5"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
              >
                <Stat label="Current RMSSD" value={num(metrics.rmssdMs, 1)} unit="ms" />
                <Stat
                  label="Your recent baseline"
                  value={num(baseline.baselineRmssdMs, 1)}
                  unit="ms"
                />
                <div>
                  <div
                    className="text-[11px] uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Change
                  </div>
                  <div
                    className="text-[19px] font-bold mt-1 flex items-center gap-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {baseline.comparison === "in_line" ? (
                      <Minus size={15} style={{ color: "var(--text-muted)" }} />
                    ) : (baseline.rmssdChangePercent ?? 0) > 0 ? (
                      <TrendingUp size={15} style={{ color: "var(--text-muted)" }} />
                    ) : (
                      <TrendingDown size={15} style={{ color: "var(--text-muted)" }} />
                    )}
                    {num(baseline.rmssdChangePercent, 1)}
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      %
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
              Personal baseline not available yet. It becomes available once this user has enough
              earlier analysed recordings to compare against.
            </p>
          )}
        </Card>
      </div>

      {/* ── NN interval trend within this recording ──────────────── */}
      <Card
        title="NN Interval Trend"
        icon={Activity}
        color="#06B6D4"
        action={
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {report.timeSeries.length} accepted intervals
          </span>
        }
      >
        {report.timeSeries.length > 1 ? (
          <TrendChart x={offsets} y={nnValues} color="#06B6D4" unit="ms" label="NN interval" />
        ) : (
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Not enough accepted intervals to draw a trend.
          </p>
        )}
      </Card>

      {/* ── Across-session trend ─────────────────────────────────── */}
      {trendLoading ? (
        <Card title="HRV Trend" icon={LineChart} color="#8B5CF6">
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Loading HRV trend…
          </p>
        </Card>
      ) : (
        <HrvTrendSection trend={trend} currentSessionId={report.sessionId} />
      )}

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
