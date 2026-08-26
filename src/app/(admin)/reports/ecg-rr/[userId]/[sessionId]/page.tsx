"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  Clock,
  Droplets,
  HeartPulse,
  Layers,
  Download,
  RefreshCw,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Btn from "@/components/ui/Btn";
import { printPage } from "@/lib/printMode";
import EcgRrReport from "@/components/reports/EcgRrReport";
import HrvReport from "@/components/reports/HrvReport";
import RhythmReport from "@/components/reports/RhythmReport";
import RespirationReport from "@/components/reports/RespirationReport";
import Spo2Report from "@/components/reports/Spo2Report";
import TemperatureReport from "@/components/reports/TemperatureReport";
import CombinedReport from "@/components/reports/CombinedReport";
import {
  useEcgRrReport,
  useHrvReport,
  useHrvTrend,
  useRespirationReport,
  useRhythmReport,
  useSpo2Report,
  useTemperatureReport,
  useCombinedReport,
  useUser,
} from "@/lib/hooks";
import { User } from "@/types";

/**
 * Session report — both physiological report modules for one recording.
 *
 * ECG / RR Analysis first, then HRV Analysis. Both are derived from the same
 * validated NN sequence server-side, so they always describe the same heartbeats.
 * Each section owns its own loading / error / unavailable state: a session can
 * legitimately support one report and not the other.
 */

// ── Section shell ──────────────────────────────────────────────────

function SectionHeading({
  icon: Icon,
  color,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  color: string;
  title: string;
  subtitle?: string | null;
}) {
  return (
    <div className="flex items-center gap-[10px] mb-4">
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: 34, height: 34, borderRadius: 10, background: `${color}24` }}
      >
        <Icon size={17} style={{ color }} />
      </div>
      <div>
        <h2 className="text-[17px] font-bold m-0" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-[12px] mt-[2px]" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function LoadingCard({ message }: { message: string }) {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-clr)",
        padding: "48px 28px",
      }}
    >
      <div className="animate-spin-slow" style={{ color: "#06B6D4" }}>
        <RefreshCw size={24} />
      </div>
      <p className="text-[13px] mt-4" style={{ color: "var(--text-secondary)" }}>
        {message}
      </p>
    </div>
  );
}

/**
 * A recording too short to report on.
 *
 * This is a rule being applied, not a failure, so it gets one calm panel for
 * the whole page rather than the same message repeated across seven sections -
 * and no "Try again", because retrying cannot lengthen the recording.
 */
function TooShortCard({
  recordingDurationSec,
  minimumDurationSec,
  message,
}: {
  recordingDurationSec: number | null;
  minimumDurationSec: number;
  message: string;
}) {
  return (
    <div
      className="rounded-2xl text-center"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-clr)",
        padding: "48px 28px",
      }}
    >
      <div
        className="flex items-center justify-center mx-auto"
        style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          background: "rgba(148,163,184,0.12)",
          border: "1px solid rgba(148,163,184,0.30)",
        }}
      >
        <Clock size={26} style={{ color: "#94A3B8" }} />
      </div>
      <p className="text-[17px] font-bold mt-4" style={{ color: "var(--text-primary)" }}>
        Reports not generated
      </p>
      <p
        className="text-[13px] mt-2 mx-auto leading-relaxed"
        style={{ color: "var(--text-secondary)", maxWidth: 420 }}
      >
        {message}
      </p>
      <div className="flex items-stretch justify-center gap-3 mt-6 flex-wrap">
        <div
          className="rounded-[12px]"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border-clr)",
            padding: "12px 20px",
            minWidth: 140,
          }}
        >
          <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            This recording
          </div>
          <div className="text-[20px] font-bold mt-1" style={{ color: "var(--text-primary)" }}>
            {formatSpan(recordingDurationSec)}
          </div>
        </div>
        <div
          className="rounded-[12px]"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border-clr)",
            padding: "12px 20px",
            minWidth: 140,
          }}
        >
          <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Minimum needed
          </div>
          <div className="text-[20px] font-bold mt-1" style={{ color: "#06B6D4" }}>
            {formatSpan(minimumDurationSec)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Seconds as "5m", "2m 30s" or "45s". */
function formatSpan(sec: number | null): string {
  if (sec === null || sec === undefined) return "—";
  const whole = Math.max(0, Math.round(sec));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function ErrorCard({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
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
          width: 60,
          height: 60,
          borderRadius: 16,
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.26)",
        }}
      >
        <AlertCircle size={26} style={{ color: "#EF4444" }} />
      </div>
      <p className="text-[16px] font-bold mt-4" style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      <p
        className="text-[13px] mt-2 mx-auto leading-relaxed"
        style={{ color: "var(--text-secondary)", maxWidth: 380 }}
      >
        {message}
      </p>
      <div className="mt-5 flex justify-center">
        <Btn variant="ghost" onClick={onRetry}>
          <RefreshCw size={14} />
          Try again
        </Btn>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────

export default function SessionReportPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const sessionId = params.sessionId as string;

  const userQuery = useUser(userId);
  const user = userQuery.data as unknown as User | undefined;

  const ecgRr = useEcgRrReport(sessionId);
  const hrv = useHrvReport(sessionId);
  const hrvTrend = useHrvTrend(sessionId);
  const rhythm = useRhythmReport(sessionId);
  const respiration = useRespirationReport(sessionId);
  const spo2 = useSpo2Report(sessionId);
  const temperature = useTemperatureReport(sessionId);
  const combined = useCombinedReport(sessionId);

  // Either report carries the session's identity; whichever arrives first wins.
  const meta = ecgRr.data ?? hrv.data;
  const started = meta?.startTime ? new Date(meta.startTime) : null;
  const sessionLabel =
    meta?.sessionName ||
    (started && !Number.isNaN(started.getTime()) ? started.toLocaleString() : "Session");

  // Suggested filename for the saved PDF. Slashes and colons are illegal in
  // filenames on Windows and would be silently mangled, so the date is written
  // as an ISO day and the parts are joined with dashes.
  const pdfName = [
    "Session Report",
    meta?.userName,
    started && !Number.isNaN(started.getTime())
      ? started.toISOString().slice(0, 10)
      : null,
  ]
    .filter(Boolean)
    .join(" - ");

  // Every report endpoint returns the same too_short body for a recording below
  // the minimum length, so whichever response arrived first tells us the rule
  // applied. One panel then replaces all seven sections.
  const tooShort =
    [ecgRr.data, hrv.data, rhythm.data, respiration.data, spo2.data, temperature.data, combined.data]
      .find((d) => d && (d as { reportStatus?: string }).reportStatus === "too_short") ?? null;

  const refreshAll = () => {
    ecgRr.mutate();
    hrv.mutate();
    hrvTrend.mutate();
    rhythm.mutate();
    respiration.mutate();
    spo2.mutate();
    temperature.mutate();
    combined.mutate();
  };

  return (
    <div>
      <div data-print="hide">
        <Breadcrumbs
          items={[
          { label: "Reports", onClick: () => router.push("/reports") },
          { label: "ECG / RR Analysis", onClick: () => router.push("/reports/ecg-rr") },
          {
            label: user?.name || userId,
            onClick: () => router.push(`/reports/ecg-rr/${userId}`),
          },
            { label: sessionLabel },
          ]}
        />
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "var(--text-primary)" }}>
            Session Report
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
            {meta
              ? `${meta.userName} · ${meta.deviceId} · ${new Date(
                  meta.startTime
                ).toLocaleString()}`
              : "Physiological reports generated from the recorded session."}
          </p>
        </div>
        {!ecgRr.isLoading && !hrv.isLoading && (
          <div className="flex items-center gap-[10px]" data-print="hide">
            <Btn variant="ghost" onClick={refreshAll}>
              <RefreshCw size={14} />
              Refresh
            </Btn>
            {/* Hands the page to the browser's own PDF writer. The charts are
                inline SVG, so they land in the PDF as vectors rather than a
                screenshot - sharp at any zoom, and no extra dependency.
                Offered only when there is a report to download. */}
            {!tooShort && (
              <Btn onClick={() => printPage(pdfName)}>
                <Download size={14} />
                Download PDF
              </Btn>
            )}
          </div>
        )}
      </div>

      {tooShort ? (
        <TooShortCard
          recordingDurationSec={
            (tooShort as { recordingDurationSec?: number | null }).recordingDurationSec ?? null
          }
          minimumDurationSec={
            (tooShort as { minimumDurationSec?: number }).minimumDurationSec ?? 300
          }
          message={
            (tooShort as { message?: string }).message ??
            "This recording is too short for reports to be generated."
          }
        />
      ) : (
        <>
      {/* ── ECG / RR Analysis ────────────────────────────────────── */}
      <section>
        <SectionHeading
          icon={Activity}
          color="#06B6D4"
          title="ECG / RR Analysis"
          subtitle="RR intervals, heart rate, rhythm timing and signal quality"
        />

        {ecgRr.isLoading ? (
          <LoadingCard message="Loading ECG/RR analysis…" />
        ) : ecgRr.error ? (
          <ErrorCard
            title="Unable to load ECG/RR analysis"
            message="Unable to load ECG/RR analysis. Please try again."
            onRetry={() => ecgRr.mutate()}
          />
        ) : ecgRr.data ? (
          <EcgRrReport report={ecgRr.data} />
        ) : (
          <ErrorCard
            title="No ECG/RR data"
            message="No ECG/RR data is available for this session."
            onRetry={() => ecgRr.mutate()}
          />
        )}
      </section>

      {/* ── HRV Analysis ─────────────────────────────────────────── */}
      <section className="mt-9">
        <SectionHeading
          icon={Waves}
          color="#8B5CF6"
          title="HRV Analysis"
          subtitle="Time-domain heart rate variability from the validated NN intervals"
        />

        {hrv.isLoading ? (
          <LoadingCard message="Calculating HRV analysis…" />
        ) : hrv.error ? (
          <ErrorCard
            title="Unable to load HRV analysis"
            message="Unable to load HRV analysis. Please try again."
            onRetry={() => hrv.mutate()}
          />
        ) : hrv.data ? (
          <HrvReport
            report={hrv.data}
            trend={hrvTrend.data}
            trendLoading={hrvTrend.isLoading}
          />
        ) : (
          <ErrorCard
            title="No HRV data"
            message="No HRV data is available for this session."
            onRetry={() => hrv.mutate()}
          />
        )}
      </section>

      {/* ── Rhythm Screening ─────────────────────────────────────── */}
      <section className="mt-9">
        <SectionHeading
          icon={HeartPulse}
          color="#EF4444"
          title="Rhythm Screening"
          subtitle="Heart-rate and RR-timing observations flagged for review"
        />

        {rhythm.isLoading ? (
          <LoadingCard message="Loading rhythm screening…" />
        ) : rhythm.error ? (
          <ErrorCard
            title="Unable to load rhythm screening"
            message="Unable to load rhythm screening. Please try again."
            onRetry={() => rhythm.mutate()}
          />
        ) : rhythm.data ? (
          <RhythmReport report={rhythm.data} />
        ) : (
          <ErrorCard
            title="No rhythm data"
            message="No rhythm screening is available for this session."
            onRetry={() => rhythm.mutate()}
          />
        )}
      </section>

      {/* ── Respiration Rate ─────────────────────────────────────── */}
      <section className="mt-9">
        <SectionHeading
          icon={Wind}
          color="#06B6D4"
          title="Respiration Rate"
          subtitle="Breathing rate estimated from ECG and, where available, pulse signals"
        />

        {respiration.isLoading ? (
          <LoadingCard message="Estimating respiration rate…" />
        ) : respiration.error ? (
          <ErrorCard
            title="Unable to load respiration analysis"
            message="Unable to load respiration analysis. Please try again."
            onRetry={() => respiration.mutate()}
          />
        ) : respiration.data ? (
          <RespirationReport report={respiration.data} />
        ) : (
          <ErrorCard
            title="No respiration data"
            message="No respiration analysis is available for this session."
            onRetry={() => respiration.mutate()}
          />
        )}
      </section>

      {/* ── SpO2 Analysis ────────────────────────────────────────── */}
      <section className="mt-9">
        <SectionHeading
          icon={Droplets}
          color="#06B6D4"
          title="SpO₂ Analysis"
          subtitle="Oxygen saturation trends, desaturation events and sensor coverage"
        />

        {spo2.isLoading ? (
          <LoadingCard message="Loading SpO₂ analysis…" />
        ) : spo2.error ? (
          <ErrorCard
            title="Unable to load SpO₂ analysis"
            message="Unable to load SpO₂ analysis. Please try again."
            onRetry={() => spo2.mutate()}
          />
        ) : spo2.data ? (
          <Spo2Report report={spo2.data} />
        ) : (
          <ErrorCard
            title="No SpO₂ data"
            message="No SpO₂ analysis is available for this session."
            onRetry={() => spo2.mutate()}
          />
        )}
      </section>

      {/* ── Temperature Analysis ─────────────────────────────────── */}
      <section className="mt-9">
        <SectionHeading
          icon={Thermometer}
          color="#F59E0B"
          title="Temperature Analysis"
          subtitle="Skin-surface temperature trends and changes relative to this recording"
        />

        {temperature.isLoading ? (
          <LoadingCard message="Loading temperature analysis…" />
        ) : temperature.error ? (
          <ErrorCard
            title="Unable to load temperature analysis"
            message="Unable to load temperature analysis. Please try again."
            onRetry={() => temperature.mutate()}
          />
        ) : temperature.data ? (
          <TemperatureReport report={temperature.data} />
        ) : (
          <ErrorCard
            title="No temperature data"
            message="No temperature analysis is available for this session."
            onRetry={() => temperature.mutate()}
          />
        )}
      </section>

      {/* ── Combined Physiological Analysis ──────────────────────── */}
      <section className="mt-9">
        <SectionHeading
          icon={Layers}
          color="#8B5CF6"
          title="Combined Physiological Analysis"
          subtitle="How the measurements moved in relation to one another"
        />

        {combined.isLoading ? (
          <LoadingCard message="Comparing the measurements…" />
        ) : combined.error ? (
          <ErrorCard
            title="Unable to load combined analysis"
            message="Unable to load combined analysis. Please try again."
            onRetry={() => combined.mutate()}
          />
        ) : combined.data ? (
          <CombinedReport report={combined.data} />
        ) : (
          <ErrorCard
            title="No combined analysis"
            message="No combined analysis is available for this session."
            onRetry={() => combined.mutate()}
          />
        )}
      </section>
        </>
      )}
    </div>
  );
}
