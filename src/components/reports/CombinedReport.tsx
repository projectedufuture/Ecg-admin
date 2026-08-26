"use client";

import { Activity, Droplets, HeartPulse, Layers, Link2, Thermometer } from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import TrendChart from "@/components/ui/TrendChart";
import {
  Card,
  ScrollTable,
  Stat,
  StatGrid,
  TechnicalDetails,
  Td,
  UnavailableState,
  formatDuration,
  formatOffset,
  num,
} from "@/components/reports/primitives";
import {
  Association,
  CombinedRelationship,
  CombinedReport as CombinedReportData,
} from "@/types";

/**
 * Renders one session's combined cross-signal analysis.
 *
 * Two things this component is careful about:
 *
 *   1. It shows every pairing, including the ones that could not be described,
 *      with the reason. A missing correlation is informative; a blank is not.
 *   2. It never implies causation. Association strength and direction are
 *      presented as descriptions of the recorded signals, with the shared-motion
 *      confound stated where a reader would otherwise infer physiology.
 */

const ASSOCIATION_COLOR: Record<Association, string> = {
  "No clear association": "#64748B",
  Weak: "#06B6D4",
  Moderate: "#8B5CF6",
  Strong: "#8B5CF6",
  Unavailable: "#64748B",
};

/** Which signals a relationship involves, for the icon row. */
function relationshipIcons(label: string): React.ElementType[] {
  const icons: React.ElementType[] = [];
  if (/heart rate/i.test(label)) icons.push(HeartPulse);
  if (/spo/i.test(label)) icons.push(Droplets);
  if (/temperature/i.test(label)) icons.push(Thermometer);
  return icons;
}

function RelationshipRow({ r }: { r: CombinedRelationship }) {
  const icons = relationshipIcons(r.label);

  return (
    <div
      className="rounded-xl"
      style={{
        padding: "14px 16px",
        background: "var(--bg-input)",
        border: "1px solid var(--border-clr)",
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="flex items-center gap-[8px]">
          <span className="flex items-center gap-[3px]">
            {icons.map((Icon, i) => (
              <Icon key={i} size={14} style={{ color: "var(--text-muted)" }} />
            ))}
          </span>
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            {r.label}
          </span>
        </span>

        {r.available ? (
          <span
            className="inline-flex items-center rounded-full text-[10px] font-bold"
            style={{
              padding: "4px 10px",
              background: `${ASSOCIATION_COLOR[r.association]}22`,
              color: ASSOCIATION_COLOR[r.association],
            }}
          >
            {r.association}
          </span>
        ) : (
          <span
            className="inline-flex items-center rounded-full text-[10px] font-bold"
            style={{
              padding: "4px 10px",
              background: "rgba(100,116,139,0.16)",
              color: "#64748B",
            }}
          >
            Not described
          </span>
        )}
      </div>

      {r.available ? (
        <>
          <div className="flex gap-6 flex-wrap mt-3">
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              r = <strong style={{ color: "var(--text-primary)" }}>{num(r.r, 3)}</strong>
            </span>
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              r² = {num(r.rSquared, 3)}
            </span>
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              {r.direction}
            </span>
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              {r.pairs} synchronised pairs over {formatDuration(r.spanSec)}
            </span>
          </div>
        </>
      ) : (
        <p className="text-[12px] mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {r.detail}
        </p>
      )}
    </div>
  );
}

export default function CombinedReport({ report }: { report: CombinedReportData }) {
  const c = report.coverage;

  // Relationships are shown even on a non-success status: their reasons are
  // what explain the outcome.
  const relationships = report.relationships ?? [];

  if (report.status !== "success") {
    return (
      <UnavailableState
        title="Combined analysis unavailable"
        message={report.message}
        noData={report.status === "no_data"}
      >
        {relationships.length > 0 && (
          <div className="flex flex-col gap-3">
            {relationships.map((r) => (
              <RelationshipRow key={r.label} r={r} />
            ))}
          </div>
        )}
      </UnavailableState>
    );
  }

  const described = relationships.filter((r) => r.available);
  const strongest = described.reduce<CombinedRelationship | null>(
    (best, r) =>
      best === null || Math.abs(r.r ?? 0) > Math.abs(best.r ?? 0) ? r : best,
    null
  );

  const technicalRows: Array<[string, string]> = [
    ["Reading rows", String(c.rows)],
    ["Heart rate present", `${c.hrPresent} rows`],
    ["SpO₂ present", `${c.spo2Present} rows`],
    ["Temperature present", `${c.tempPresent} rows`],
    ["Analysed duration", formatDuration(c.analysedDurationSec)],
    ["Recording duration", formatDuration(c.recordingDurationSec)],
    ["Relationships described", `${described.length} of ${relationships.length}`],
    ["Concurrent findings", String(report.concurrentEvents.length)],
    ...relationships.map(
      (r): [string, string] => [
        r.label,
        r.available
          ? `r ${num(r.r, 3)} · ${r.association} · ${r.pairs} pairs`
          : `not described (${r.reason})`,
      ]
    ),
  ];

  // The aligned chart: HR is the most complete signal, so it anchors the plot.
  const hrPoints = report.series.filter((p) => p.hr !== null);
  const spo2Points = report.series.filter((p) => p.spo2 !== null);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="grid gap-[14px]"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}
      >
        <MetricCard
          icon={Link2}
          label="Strongest Association"
          value={strongest ? strongest.association : "—"}
          sub={strongest ? strongest.label : "none described"}
          color={strongest ? ASSOCIATION_COLOR[strongest.association] : "#64748B"}
        />
        <MetricCard
          icon={Layers}
          label="Pairings Described"
          value={`${described.length} / ${relationships.length}`}
          sub="signal combinations"
          color="#8B5CF6"
        />
        <MetricCard
          icon={Activity}
          label="Concurrent Findings"
          value={String(report.concurrentEvents.length)}
          sub="multi-signal moments"
          color={report.concurrentEvents.length > 0 ? "#F59E0B" : "#10B981"}
        />
        <MetricCard
          icon={HeartPulse}
          label="Synchronised Rows"
          value={String(c.rows)}
          sub={formatDuration(c.analysedDurationSec)}
          color="#06B6D4"
        />
      </div>

      <Card
        title="Signal Relationships"
        icon={Link2}
        color="#8B5CF6"
        action={
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            Pearson correlation
          </span>
        }
      >
        <div className="flex flex-col gap-3">
          {relationships.map((r) => (
            <RelationshipRow key={r.label} r={r} />
          ))}
        </div>
      </Card>

      <Card title="Signal Availability" icon={Layers} color="#06B6D4">
        <StatGrid min={130}>
          <Stat label="Reading rows" value={String(c.rows)} />
          <Stat label="Heart rate" value={String(c.hrPresent)} unit="rows" />
          <Stat label="SpO₂" value={String(c.spo2Present)} unit="rows" />
          <Stat label="Temperature" value={String(c.tempPresent)} unit="rows" />
        </StatGrid>
      </Card>

      {(hrPoints.length > 1 || spo2Points.length > 1) && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
        >
          {hrPoints.length > 1 && (
            <Card title="Heart Rate (aligned)" icon={HeartPulse} color="#EF4444">
              <TrendChart
                x={hrPoints.map((p) => p.offsetSec)}
                y={hrPoints.map((p) => p.hr as number)}
                color="#EF4444"
                unit="BPM"
                label="Heart rate"
                pointNoun="rows"
              />
            </Card>
          )}
          {spo2Points.length > 1 && (
            <Card title="SpO₂ (aligned)" icon={Droplets} color="#06B6D4">
              <TrendChart
                x={spo2Points.map((p) => p.offsetSec)}
                y={spo2Points.map((p) => p.spo2 as number)}
                color="#06B6D4"
                unit="%"
                label="SpO2"
                pointNoun="rows"
              />
            </Card>
          )}
        </div>
      )}

      <Card
        title="Concurrent Findings"
        icon={Activity}
        color={report.concurrentEvents.length ? "#F59E0B" : "#10B981"}
        action={
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {report.concurrentEvents.length}{" "}
            {report.concurrentEvents.length === 1 ? "moment" : "moments"}
          </span>
        }
      >
        {report.concurrentEvents.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            No moments had findings in more than one measurement at the same time.
          </p>
        ) : (
          <ScrollTable headers={["Time", "Signals", "What overlapped"]} minWidth={560}>
            {report.concurrentEvents.map((e, i) => (
              <tr key={`${e.startSec}-${i}`}>
                <Td nowrap>{formatOffset(e.startSec)}</Td>
                <Td nowrap>
                  <span className="flex items-center gap-[5px]">
                    {e.signals.includes("heart_rate") && (
                      <HeartPulse size={13} style={{ color: "#EF4444" }} />
                    )}
                    {e.signals.includes("spo2") && (
                      <Droplets size={13} style={{ color: "#06B6D4" }} />
                    )}
                    {e.signals.includes("temperature") && (
                      <Thermometer size={13} style={{ color: "#F59E0B" }} />
                    )}
                  </span>
                </Td>
                <Td>{e.description}</Td>
              </tr>
            ))}
          </ScrollTable>
        )}
      </Card>

      <TechnicalDetails rows={technicalRows} summary={report.technicalSummary} />
    </div>
  );
}
