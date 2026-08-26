"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Gauge,
  Minus,
  SignalHigh,
  Thermometer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
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
  SignalStability,
  TemperatureEventType,
  TemperatureReport as TemperatureReportData,
  TemperatureTrend,
} from "@/types";

/**
 * Renders one session's temperature analysis.
 *
 * The regime banner is the most important element here: a garment thermistor
 * reads skin, not core, and a reader who assumes otherwise would misread ~31 °C
 * as dangerous. Nothing in this component grades a temperature as high or low.
 */

const TREND_ICON: Record<TemperatureTrend, LucideIcon> = {
  Rising: TrendingUp,
  Falling: TrendingDown,
  Stable: Minus,
  Unavailable: Minus,
};

const STABILITY_COLOR: Record<SignalStability, string> = {
  Stable: "#10B981",
  "Moderately variable": "#F59E0B",
  Variable: "#F59E0B",
  Unavailable: "#64748B",
};

const EVENT_LABEL: Record<TemperatureEventType, string> = {
  relative_elevation: "Warmer than baseline",
  relative_depression: "Cooler than baseline",
};

export default function TemperatureReport({ report }: { report: TemperatureReportData }) {
  const c = report.coverage;

  if (report.status !== "success" || !report.summary) {
    return (
      <UnavailableState
        title="Temperature analysis unavailable"
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
  const TrendIcon = TREND_ICON[report.trend];

  const technicalRows: Array<[string, string]> = [
    ["Measurement regime", report.regime],
    ["Mean temperature", `${num(s.meanC, 2)} °C`],
    ["Median temperature", `${num(s.medianC, 2)} °C`],
    ["Minimum", `${num(s.minC, 2)} °C`],
    ["Maximum", `${num(s.maxC, 2)} °C`],
    ["Standard deviation", `${num(s.sdC, 3)} °C`],
    ["Start level", `${num(s.startC, 2)} °C`],
    ["End level", `${num(s.endC, 2)} °C`],
    ["Total change", `${num(s.totalChangeC, 2)} °C`],
    ["Drift", `${num(s.driftCPerMin, 3)} °C/min`],
    ["Trend", report.trend],
    ["Stability", report.stability],
    ["Warmer periods", String(s.elevationEvents)],
    ["Cooler periods", String(s.depressionEvents)],
    ["Readings usable", `${c.usableSamples} / ${c.totalSamples} (${num(c.coveragePct, 1)}%)`],
    ["Analysed duration", formatDuration(c.analysedDurationSec)],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div
        className="grid gap-[14px]"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}
      >
        <MetricCard
          icon={Thermometer}
          label="Average Temperature"
          value={`${num(s.meanC, 1)} °C`}
          sub={`${num(s.minC, 1)}–${num(s.maxC, 1)} °C range`}
          color="#F59E0B"
        />
        <MetricCard
          icon={TrendIcon}
          label="Trend"
          value={report.trend}
          sub={`${num(s.totalChangeC, 2)} °C over the recording`}
          color="#06B6D4"
        />
        <MetricCard
          icon={Gauge}
          label="Stability"
          value={report.stability}
          sub={`SD ${num(s.sdC, 3)} °C`}
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
        <Card title="Temperature Levels" icon={Activity} color="#F59E0B">
          <StatGrid min={110}>
            <Stat label="Minimum" value={num(s.minC, 2)} unit="°C" />
            <Stat label="Average" value={num(s.meanC, 2)} unit="°C" />
            <Stat label="Maximum" value={num(s.maxC, 2)} unit="°C" />
          </StatGrid>
        </Card>

        <Card title="Change Over the Recording" icon={TrendIcon} color="#06B6D4">
          <StatGrid min={110}>
            <Stat label="Start" value={num(s.startC, 2)} unit="°C" />
            <Stat label="End" value={num(s.endC, 2)} unit="°C" />
            <Stat label="Change" value={num(s.totalChangeC, 2)} unit="°C" />
            <Stat label="Drift" value={num(s.driftCPerMin, 3)} unit="°C/min" />
          </StatGrid>
        </Card>
      </div>

      <Card
        title="Temperature Trend"
        icon={Thermometer}
        color="#F59E0B"
        action={
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {report.series.length} usable readings
          </span>
        }
      >
        {report.series.length > 1 ? (
          <TrendChart
            x={report.series.map((p) => p.offsetSec)}
            y={report.series.map((p) => p.tempC)}
            color="#F59E0B"
            unit="°C"
            label="Temperature"
            pointNoun="readings"
          />
        ) : (
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Not enough usable readings to draw a trend.
          </p>
        )}
      </Card>

      <Card
        title="Temperature Events"
        icon={Activity}
        color={report.events.length ? "#F59E0B" : "#10B981"}
        action={
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {report.events.length} {report.events.length === 1 ? "event" : "events"}
          </span>
        }
      >
        {report.events.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            No sustained temperature changes were detected during the analyzed recording.
          </p>
        ) : (
          <>
            <ScrollTable headers={["Time", "Event", "Duration", "Baseline", "Peak", "Change"]}>
              {report.events.map((e, i) => (
                <tr key={`${e.eventType}-${i}`}>
                  <Td nowrap>{formatOffset(e.startSec)}</Td>
                  <Td>
                    <span className="flex items-center gap-[6px]">
                      <span
                        className="rounded-full shrink-0"
                        style={{
                          width: 7,
                          height: 7,
                          background:
                            e.eventType === "relative_elevation" ? "#F59E0B" : "#06B6D4",
                        }}
                      />
                      <span style={{ color: "var(--text-primary)" }}>
                        {EVENT_LABEL[e.eventType]}
                      </span>
                    </span>
                  </Td>
                  <Td nowrap>{formatDuration(e.durationSec)}</Td>
                  <Td nowrap>{num(e.baselineC, 2)} °C</Td>
                  <Td nowrap>{num(e.peakC, 2)} °C</Td>
                  <Td nowrap>{num(e.changeC, 2)} °C</Td>
                </tr>
              ))}
            </ScrollTable>
          </>
        )}
      </Card>

      <TechnicalDetails rows={technicalRows} summary={report.technicalSummary} />
    </div>
  );
}
