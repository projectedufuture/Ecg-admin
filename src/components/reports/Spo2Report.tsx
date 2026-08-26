"use client";

import { Activity, Droplets, Gauge, SignalHigh, TrendingDown } from "lucide-react";
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
import { SignalStability, Spo2EventType, Spo2Report as Spo2ReportData } from "@/types";

/**
 * Renders one session's SpO₂ analysis.
 *
 * Colours grade the measurement's reliability, not the wearer's health: a dip is
 * amber because it needs checking against the signal, not because it is bad news.
 */

const STABILITY_COLOR: Record<SignalStability, string> = {
  Stable: "#10B981",
  "Moderately variable": "#F59E0B",
  Variable: "#F59E0B",
  Unavailable: "#64748B",
};

const EVENT_LABEL: Record<Spo2EventType, string> = {
  possible_desaturation: "Possible desaturation",
  low_saturation_period: "Low saturation period",
  signal_gap: "Signal gap",
};

export default function Spo2Report({ report }: { report: Spo2ReportData }) {
  const c = report.coverage;

  if (report.status !== "success" || !report.summary) {
    return (
      <UnavailableState
        title="SpO₂ analysis unavailable"
        message={report.message}
        noData={report.status === "no_data"}
      >
        {c.totalSamples > 0 && (
          <StatGrid min={95}>
            <Stat label="Readings" value={String(c.totalSamples)} />
            <Stat label="Usable" value={String(c.usableSamples)} />
            <Stat label="Excluded" value={String(c.excludedSamples)} />
            <Stat label="Coverage" value={num(c.coveragePct, 1)} unit="%" />
          </StatGrid>
        )}
      </UnavailableState>
    );
  }

  const s = report.summary;

  const technicalRows: Array<[string, string]> = [
    ["Mean SpO₂", `${num(s.meanPct, 1)} %`],
    ["Median SpO₂", `${num(s.medianPct, 1)} %`],
    ["Minimum SpO₂", `${num(s.minPct, 1)} %`],
    ["Maximum SpO₂", `${num(s.maxPct, 1)} %`],
    ["Standard deviation", `${num(s.sdPct, 2)} %`],
    ["Stability", report.stability],
    ["Desaturations (3% criterion)", String(s.desaturationEvents)],
    ["Desaturations (4% criterion)", String(s.strictDesaturationEvents)],
    ["Recovered desaturations", `${s.recoveredDesaturations} / ${s.desaturationEvents}`],
    ["Low-saturation periods", String(s.lowSaturationPeriods)],
    ["Time below 90%", `${formatDuration(s.timeBelow90Sec)} (${num(s.timeBelow90Percent, 2)}%)`],
    ["Time below 88%", `${formatDuration(s.timeBelow88Sec)} (${num(s.timeBelow88Percent, 2)}%)`],
    ["Readings usable", `${c.usableSamples} / ${c.totalSamples} (${num(c.coveragePct, 1)}%)`],
    ["Analysed duration", formatDuration(c.analysedDurationSec)],
    ["Recording duration", formatDuration(c.recordingDurationSec)],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div
        className="grid gap-[14px]"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}
      >
        <MetricCard
          icon={Droplets}
          label="Average SpO₂"
          value={`${num(s.meanPct, 1)}%`}
          sub={`${num(s.minPct, 1)}–${num(s.maxPct, 1)}% range`}
          color="#06B6D4"
        />
        <MetricCard
          icon={TrendingDown}
          label="Desaturations"
          value={String(s.desaturationEvents)}
          sub={`${s.recoveredDesaturations} recovered to baseline`}
          color={s.desaturationEvents > 0 ? "#F59E0B" : "#10B981"}
        />
        <MetricCard
          icon={Gauge}
          label="Stability"
          value={report.stability}
          sub={`SD ${num(s.sdPct, 2)}%`}
          color={STABILITY_COLOR[report.stability]}
        />
        <MetricCard
          icon={SignalHigh}
          label="Sensor Coverage"
          value={`${num(c.coveragePct, 1)}%`}
          sub={`${c.usableSamples} of ${c.totalSamples} readings`}
          color={(c.coveragePct ?? 0) >= 80 ? "#10B981" : "#F59E0B"}
        />
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
      >
        <Card title="Saturation Levels" icon={Activity} color="#06B6D4">
          <StatGrid min={110}>
            <Stat label="Minimum" value={num(s.minPct, 1)} unit="%" />
            <Stat label="Average" value={num(s.meanPct, 1)} unit="%" />
            <Stat label="Maximum" value={num(s.maxPct, 1)} unit="%" />
          </StatGrid>
        </Card>

        <Card title="Time Below Threshold" icon={TrendingDown} color="#F59E0B">
          <StatGrid min={130}>
            <Stat
              label="Below 90%"
              value={formatDuration(s.timeBelow90Sec)}
              unit={`(${num(s.timeBelow90Percent, 1)}%)`}
            />
            <Stat
              label="Below 88%"
              value={formatDuration(s.timeBelow88Sec)}
              unit={`(${num(s.timeBelow88Percent, 1)}%)`}
            />
          </StatGrid>
        </Card>
      </div>

      <Card
        title="Saturation Trend"
        icon={Droplets}
        color="#06B6D4"
        action={
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {report.series.length} usable readings
          </span>
        }
      >
        {report.series.length > 1 ? (
          <TrendChart
            x={report.series.map((p) => p.offsetSec)}
            y={report.series.map((p) => p.spo2)}
            color="#06B6D4"
            unit="%"
            label="SpO₂"
            pointNoun="readings"
          />
        ) : (
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Not enough usable readings to draw a trend.
          </p>
        )}
      </Card>

      <Card
        title="SpO₂ Events"
        icon={TrendingDown}
        color={report.events.length ? "#F59E0B" : "#10B981"}
        action={
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {report.events.length} {report.events.length === 1 ? "event" : "events"}
          </span>
        }
      >
        {report.events.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            No significant saturation events were detected during the analyzed recording.
          </p>
        ) : (
          <ScrollTable headers={["Time", "Event", "Duration", "Nadir", "Drop", "Recovery"]}>
            {report.events.map((e, i) => (
              <tr key={`${e.eventType}-${i}`}>
                <Td nowrap>{formatOffset(e.startSec)}</Td>
                <Td>
                  <span className="flex items-center gap-[6px]">
                    <span
                      className="rounded-full shrink-0"
                      style={{ width: 7, height: 7, background: "#F59E0B" }}
                    />
                    <span style={{ color: "var(--text-primary)" }}>
                      {EVENT_LABEL[e.eventType]}
                    </span>
                  </span>
                </Td>
                <Td nowrap>{formatDuration(e.durationSec)}</Td>
                <Td nowrap>{num(e.nadirPct, 1)}%</Td>
                <Td nowrap>{e.dropPct !== null ? `${num(e.dropPct, 1)}%` : "—"}</Td>
                <Td nowrap>
                  {e.recovered === null ? (
                    "—"
                  ) : (
                    <span
                      className="inline-flex items-center rounded-full text-[10px] font-semibold"
                      style={{
                        padding: "3px 9px",
                        background: e.recovered
                          ? "rgba(16,185,129,0.14)"
                          : "rgba(139,92,246,0.14)",
                        color: e.recovered ? "#10B981" : "#8B5CF6",
                      }}
                    >
                      {e.recovered ? "Recovered" : "Sensor check"}
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </ScrollTable>
        )}
      </Card>

      <TechnicalDetails rows={technicalRows} summary={report.technicalSummary} />
    </div>
  );
}
