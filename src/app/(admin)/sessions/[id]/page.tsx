"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Clock, Heart, Activity, Thermometer, Wifi, Play, Pause, Download, Info, AlertCircle, RefreshCw, Droplets, Waves } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import EcgMonitorChart, {
  chartSpeedLabel,
  sampleRateLabel,
  type EcgQuality,
  type EcgPqrst,
} from "@/components/ui/EcgMonitorChart";
import MiniChart from "@/components/ui/MiniChart";
import Btn from "@/components/ui/Btn";
import { useSessionDetail } from "@/lib/hooks";
import { downloadExport } from "@/lib/api";
import { formatTime, formatDuration } from "@/lib/utils";

/**
 * Replay constants, taken from the app's own previous-session screen
 * (_ReplayEcgArea in features/sessions/screens/session_detail_screen.dart) so
 * the admin replays a recording exactly the way the phone does.
 */
const REPLAY_TICK_MS = 40;
const REPLAY_WINDOW_SEC = 6;
const FALLBACK_PACE_HZ = 130;

/**
 * The app charts a 1500-point downsample of the recording and reports the raw
 * sample count separately. Matching that keeps the two traces the same SHAPE:
 * drawing all 18k samples of a long recording instead would stack several
 * samples on every pixel and render a visibly denser waveform.
 */
const CHART_MAX_POINTS = 1500;

/** Stride-pick downsample — the app's own _downsample, unchanged. */
function downsampleTo(src: number[], target: number): number[] {
  if (src.length <= target) return src;
  const step = src.length / target;
  return Array.from({ length: target }, (_, i) => src[Math.floor(i * step)]);
}

/** Seconds -> "M:SS", for the playback timer. */
function formatMMSS(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) return "0:00";
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { data, error, isLoading, mutate } = useSessionDetail(sessionId);

  const session = data as Record<string, unknown> | undefined;

  /**
   * The recording's real ECG samples, plus the metadata the chart needs.
   *
   * POLARITY: every sample is negated, exactly as the phone does. The MAX30003
   * outputs inverted, so the device's stored value has R peaks pointing DOWN;
   * negating puts them up. The backend deliberately stores the device value
   * untouched and leaves this transform to the renderer, so negating here is
   * what makes the admin trace the same shape as the one on the phone -
   * skipping it would show every complex upside down.
   */
  const ecg = useMemo(() => {
    const empty = {
      samples: [] as number[],
      full: [] as number[],
      chartSamples: [] as number[],
      offsetsSec: [] as number[],
      sampleRateHz: null as number | null,
      leadOn: true,
      quality: "unknown" as EcgQuality,
      pqrst: null as EcgPqrst | null,
      totalSamples: 0,
      windowed: false,
      windowStartIndex: 0,
    };
    if (!session) return empty;

    const block = session.ecg as
      | {
          samples?: number[];
          sampleRateHz?: number | null;
          leadOn?: boolean;
          quality?: EcgQuality;
          pqrst?: EcgPqrst | null;
          totalSamples?: number;
          windowed?: boolean;
          windowStartIndex?: number;
        }
      | undefined;

    /**
     * The FULL, unwindowed series - every ECG sample recorded for the session,
     * in storage order. This is what playback scrubs through: the backend's
     * `ecg.samples` block only covers the most recent 60s, which would cut a
     * replay of an older recording off before it started.
     */
    const readings = session.readings as
      | { ecgValue: number; timestamp?: string }[]
      | undefined;
    const ecgValues = session.ecgValues as number[] | undefined;
    const rawFull =
      ecgValues && ecgValues.length > 0
        ? ecgValues
        : readings && readings.length > 0
          ? readings.map((r) => r.ecgValue)
          : [];
    const full = rawFull.map((v) => -v);

    /**
     * Each sample's REAL elapsed-time offset from session start, in seconds.
     *
     * This is what lets playback be paced against the recording's actual
     * wall-clock duration rather than against however many samples happen to
     * exist: a session can legitimately have long stretches with no ECG data
     * at all (lead-off, a dropped batch), and assuming a constant rate across
     * those gaps would make the timeline lie about how long the recording
     * really took.
     *
     * `readings` and `ecgValues`/`full` come from the same backend query in
     * the same order, so they line up 1:1. If timestamps are ever missing
     * (older data), fall back to a constant-rate estimate for just those
     * samples rather than losing the whole recording.
     */
    const startMs = Date.parse((session.startTime as string) || "");
    const fallbackRate = block?.sampleRateHz && block.sampleRateHz > 0 ? block.sampleRateHz : 128;
    const offsetsSec =
      readings && readings.length === full.length && Number.isFinite(startMs)
        ? readings.map((r, i) => {
            const t = Date.parse(r.timestamp || "");
            return Number.isFinite(t) ? Math.max(0, (t - startMs) / 1000) : i / fallbackRate;
          })
        : full.map((_, i) => i / fallbackRate);

    // What the chart actually draws: the app's 1500-point downsample.
    const chartSamples = downsampleTo(full, CHART_MAX_POINTS);

    // Preferred source for the static (non-playback) metadata: the backend's
    // ECG block, which carries the device's declared rate and contact flags.

    if (block && Array.isArray(block.samples) && block.samples.length > 0) {
      return {
        samples: block.samples.map((v) => -v),
        full,
        chartSamples,
        offsetsSec,
        sampleRateHz: block.sampleRateHz ?? null,
        leadOn: block.leadOn ?? true,
        quality: block.quality ?? "unknown",
        pqrst: block.pqrst ?? null,
        totalSamples: block.totalSamples ?? full.length,
        windowed: block.windowed ?? false,
        windowStartIndex: block.windowStartIndex ?? 0,
      };
    }

    // Fallback for sessions recorded before the ECG block existed. The samples
    // are real, but no rate was stored - so sampleRateHz stays null and the
    // chart declines to claim a calibrated sample-rate label (playback itself
    // still works, since it is now paced by real timestamps, not by rate).
    return { ...empty, samples: full, full, chartSamples, offsetsSec, totalSamples: full.length };
  }, [session]);

  // The recording's real elapsed duration, from its own start/end timestamps -
  // this is what playback is paced against, NOT how many samples exist. A
  // session can legitimately hold long real gaps (lead-off, dropped frames),
  // so pacing by sample count would make a sparse recording finish in far
  // less time than it actually took and would say nothing true about speed.
  const totalSamples = ecg.full.length;
  const sessionDurationSec = session
    ? Math.max(
        0,
        (Date.parse((session.endTime as string) || "") - Date.parse((session.startTime as string) || "")) / 1000
      )
    : 0;
  const lastSampleOffsetSec = totalSamples > 0 ? ecg.offsetsSec[totalSamples - 1] : 0;
  // The larger of the two: the session's recorded wall-clock span, or the
  // span the samples themselves cover (in case a sample's timestamp ever
  // lands fractionally after the stored endTime). Floored above zero so
  // division by it is always safe.
  const effectiveDurationSec = Math.max(sessionDurationSec, lastSampleOffsetSec, 0.001);

  /**
   * Replay of the stored waveform, ported from the app's previous-session
   * screen so the admin shows a recording the way the phone does.
   *
   * The app does not scroll a TIME window across the samples. It reveals the
   * recording one sample at a time - `revealCount` - and hands the chart a
   * FIXED-LENGTH slice ending at that point, which is what makes the trace
   * enter at the right edge and slide left at a constant rate. The reveal rate
   * is samples/duration, so a replay always finishes in exactly the
   * recording's own wall-clock duration whatever the sample density is.
   */
  const chartSamples = ecg.chartSamples;
  const totalChartSamples = chartSamples.length;
  const canPlay = totalChartSamples > 1 && effectiveDurationSec > 0;

  // Samples revealed per second: the whole recording, spread over its own
  // real duration.
  const paceCountPerSecond =
    effectiveDurationSec > 0 ? totalChartSamples / effectiveDurationSec : FALLBACK_PACE_HZ;

  const [playing, setPlaying] = useState(true);
  const [revealCount, setRevealCount] = useState(0);
  /** When the current play run started, and the reveal count it started from. */
  const playRunRef = useRef<{ at: number; from: number } | null>(null);

  // A new session - or this session's samples arriving - restarts the replay
  // from the beginning and auto-plays, as the app's didUpdateWidget does.
  useEffect(() => {
    setRevealCount(0);
    setPlaying(true);
    playRunRef.current = { at: performance.now(), from: 0 };
  }, [sessionId, totalChartSamples]);

  useEffect(() => {
    if (!playing || !canPlay) return;
    if (!playRunRef.current) playRunRef.current = { at: performance.now(), from: 0 };
    const id = window.setInterval(() => {
      const run = playRunRef.current;
      if (!run) return;
      const elapsed = (performance.now() - run.at) / 1000;
      const next = Math.max(
        0,
        Math.min(totalChartSamples, run.from + Math.round(elapsed * paceCountPerSecond))
      );
      setRevealCount(next);
      // The end stops the replay rather than looping it; Play restarts it.
      if (next >= totalChartSamples) setPlaying(false);
    }, REPLAY_TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, canPlay, totalChartSamples, paceCountPerSecond]);

  const playbackDone = canPlay && revealCount >= totalChartSamples;

  const togglePlayback = () => {
    if (!canPlay) return;
    if (playing) {
      playRunRef.current = null;
      setPlaying(false);
      return;
    }
    const from = revealCount >= totalChartSamples ? 0 : revealCount;
    setRevealCount(from);
    playRunRef.current = { at: performance.now(), from };
    setPlaying(true);
  };

  /** Scrubbing pauses and jumps, exactly like dragging the app's slider. */
  const scrubTo = (count: number) => {
    if (!canPlay) return;
    playRunRef.current = null;
    setPlaying(false);
    setRevealCount(Math.max(0, Math.min(totalChartSamples, count)));
  };

  /**
   * The fixed-length slice handed to the chart.
   *
   * Its width is REPLAY_WINDOW_SEC of the recording, in samples. Before that
   * many samples have been revealed the slice is LEFT-PADDED with the first
   * sample, so the window is always full and the trace starts at the right
   * edge immediately rather than growing out of the left one.
   */
  const replayWindowSamples = (() => {
    const total = totalChartSamples;
    let target: number;
    if (effectiveDurationSec <= 0) target = total < 400 ? total : 400;
    else target = Math.round((total / effectiveDurationSec) * REPLAY_WINDOW_SEC);
    if (target > total) target = total;
    if (target < 2) target = total < 2 ? total : 2;
    return target;
  })();

  const showingReplay =
    canPlay && (playing || (revealCount > 0 && revealCount < totalChartSamples));

  const visibleSamples = (() => {
    if (!showingReplay) return chartSamples;
    const end = Math.min(Math.max(revealCount, 2), totalChartSamples);
    const windowSize = Math.min(Math.max(replayWindowSamples, 2), totalChartSamples);
    if (end >= windowSize) return chartSamples.slice(end - windowSize, end);
    return [
      ...new Array<number>(windowSize - end).fill(chartSamples[0]),
      ...chartSamples.slice(0, end),
    ];
  })();

  /** Replay position in seconds, derived from the reveal count. */
  const replayElapsedSec =
    paceCountPerSecond > 0
      ? (showingReplay ? revealCount : totalChartSamples) / paceCountPerSecond
      : 0;

  /**
   * Heart rate, temperature, SpO2, PR interval and RR interval AT THE CURRENT
   * PLAYHEAD, updating as playback advances - like the numeric readouts next
   * to a real monitor's trace.
   *
   * All five are recorded once per FRAME, not once per ECG sample: a batched
   * frame's vitals sit on its first sample only, and every other sample in
   * that frame carries the schema's 0/null = "not reported" sentinel.
   * Forward-filling those sentinels with the last real reading is what a
   * monitor's own numeric display does too - it holds the last computed value
   * until a new one arrives, rather than blanking between updates.
   *
   * PR and RR come from the device's own per-reading fields (`pqrst.prMs`,
   * `rrIntervalMs`) - sparser than hr/temp/spo2 since they only land on the
   * sample the device actually reported them on, but forward-filled the same
   * way so the readout still holds a value between beats.
   */
  const vitalsAtSample = useMemo(() => {
    const empty = { hr: [] as number[], temp: [] as number[], spo2: [] as number[], pr: [] as number[], rr: [] as number[] };
    if (!session) return empty;
    const readings = session.readings as
      | { hr?: number; temperatureCelsius?: number; spo2?: number; prMs?: number | null; rrIntervalMs?: number | null }[]
      | undefined;
    if (!readings || readings.length === 0) return empty;
    const hr = new Array<number>(readings.length);
    const temp = new Array<number>(readings.length);
    const spo2 = new Array<number>(readings.length);
    const pr = new Array<number>(readings.length);
    const rr = new Array<number>(readings.length);
    let lastHr = 0;
    let lastTemp = 0;
    let lastSpo2 = 0;
    let lastPr = 0;
    let lastRr = 0;
    for (let i = 0; i < readings.length; i += 1) {
      const h = readings[i].hr ?? 0;
      const t = readings[i].temperatureCelsius ?? 0;
      const s = readings[i].spo2 ?? 0;
      const p = readings[i].prMs;
      const r = readings[i].rrIntervalMs;
      if (h > 0) lastHr = h;
      if (t > 0) lastTemp = t;
      if (s > 0) lastSpo2 = s;
      if (typeof p === "number" && p > 0) lastPr = p;
      if (typeof r === "number" && r > 0) lastRr = r;
      hr[i] = lastHr;
      temp[i] = lastTemp;
      spo2[i] = lastSpo2;
      pr[i] = lastPr;
      rr[i] = lastRr;
    }
    return { hr, temp, spo2, pr, rr };
  }, [session]);

  /**
   * The replay position as a 0..1 fraction, or null when the replay is at rest
   * (not started, or finished) - the app's own _replayFraction.
   */
  const replayFraction =
    showingReplay && totalChartSamples > 0 ? revealCount / totalChartSamples : null;

  /**
   * A vital AT THE REPLAY POSITION - the app's _atReplayPosition. The fraction
   * indexes straight into the forward-filled timeline, so the numbers track
   * the trace. At rest the recording's last value stands in, which is what the
   * cards show before playback starts and after it finishes.
   */
  const atReplayPosition = (timeline: number[]): number => {
    if (!timeline.length) return 0;
    const i = Math.round((replayFraction ?? 1) * (timeline.length - 1));
    return timeline[Math.max(0, Math.min(timeline.length - 1, i))] ?? 0;
  };

  const currentHr = atReplayPosition(vitalsAtSample.hr);
  const currentTemp = atReplayPosition(vitalsAtSample.temp);
  const currentSpo2 = atReplayPosition(vitalsAtSample.spo2);
  const currentPr = atReplayPosition(vitalsAtSample.pr);
  const currentRr = atReplayPosition(vitalsAtSample.rr);

  // Real temperature series from stored readings only (downsampled for the chart).
  const tempData = useMemo(() => {
    if (!session) return [];
    const readings = session.readings as { temperatureCelsius: number }[] | undefined;
    const temperatureValues = session.temperatureValues as number[] | undefined;
    const source =
      temperatureValues && temperatureValues.length > 0
        ? temperatureValues
        : readings && readings.length > 0
          ? readings.map(r => r.temperatureCelsius)
          : [];
    if (source.length === 0) return [];
    const step = Math.max(1, Math.floor(source.length / 30));
    return Array.from({ length: Math.min(30, source.length) }, (_, i) => source[i * step]);
  }, [session]);

  // Real heart-rate & SpO₂ series from stored readings (0 = no-finger, excluded).
  const seriesFrom = (values: number[] | undefined, points: number) => {
    const source = (values || []).filter(v => v > 0);
    if (source.length === 0) return [];
    const step = Math.max(1, Math.floor(source.length / points));
    return Array.from({ length: Math.min(points, source.length) }, (_, i) => source[i * step]);
  };
  const hrData = useMemo(() => (session ? seriesFrom(session.hrValues as number[] | undefined, 40) : []), [session]);
  const spo2Data = useMemo(() => (session ? seriesFrom(session.spo2Values as number[] | undefined, 40) : []), [session]);

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-[180px] rounded-2xl animate-pulse" style={{ background: "var(--bg-surface)" }} />)}</div>;
  }

  if (error || !session) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Failed to load session</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  // A session is "ended" once it has been stopped (endTime moves past startTime).
  // An ended session is no longer a live stream — its data is now stored.
  const hasEnded = new Date(session.endTime as string).getTime() > new Date(session.startTime as string).getTime();
  const displaySource = hasEnded && session.dataSource === "live" ? "stored" : (session.dataSource as string);

  const metrics = [
    { l: "Duration", v: formatDuration(session.startTime as string, session.endTime as string), i: Clock, c: "#06B6D4" },
    { l: "Avg Heart Rate", v: `${session.avgHR} bpm`, i: Heart, c: "#F43F5E" },
    { l: "HR Range", v: `${session.minHR}–${session.maxHR} bpm`, i: Activity, c: "#8B5CF6" },
    { l: "Avg SpO₂", v: `${session.avgSpo2}%`, i: Droplets, c: "#ff5fa2" },
    { l: "Avg Temperature", v: `${Number(session.avgTemp).toFixed(1)}°C`, i: Thermometer, c: "#F59E0B" },
    { l: "Data Source", v: displaySource, i: Wifi, c: "#10B981" },
  ];

  const sessionName = (session.name as string) || null;

  const sessionInfo = [
    ["Session ID", session.id as string],
    ...(sessionName ? [["Name", sessionName]] : []),
    ["User", session.userName as string],
    ["Device", session.deviceId as string],
    ["Start", new Date(session.startTime as string).toLocaleString()],
    ["End", new Date(session.endTime as string).toLocaleString()],
  ];

  // Real temperature range from stored samples (null when nothing recorded).
  const tempMin = tempData.length ? Math.min(...tempData) : null;
  const tempMax = tempData.length ? Math.max(...tempData) : null;

  const noData = (label: string) => (
    <div className="flex items-center justify-center" style={{ height: 80, color: "var(--text-muted)", fontSize: 12 }}>{label}</div>
  );

  return (
    <div>
      <Breadcrumbs items={[{ label: "Sessions", onClick: () => router.push("/sessions") }, { label: sessionName ? `${sessionName} · ${session.id}` : (session.id as string) }]} />
      <div className="grid grid-cols-6 gap-3 mb-5">
        {metrics.map((m, i) => (
          <div key={i} className="rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", padding: "16px 18px" }}>
            <div className="flex items-center gap-[6px] mb-2"><m.i size={14} style={{ color: m.c }} /><span className="text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: 0.5 }}>{m.l}</span></div>
            <div className="text-lg font-bold capitalize" style={{ color: "var(--text-primary)" }}>{m.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-6 mb-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-base font-semibold m-0" style={{ color: "var(--text-primary)" }}>ECG Waveform</h3>
          <div className="flex items-center gap-4 flex-wrap">
            {canPlay && (
              <>
                {/* Live readout at the replay position - like the numbers
                    beside a bedside monitor's trace, tracking the trace. */}
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "#F43F5E" }}>
                    <Heart size={12} />
                    {currentHr > 0 ? `${currentHr} bpm` : "— bpm"}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "#ff5fa2" }}>
                    <Droplets size={12} />
                    {currentSpo2 > 0 ? `${currentSpo2}%` : "—%"}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "#F59E0B" }}>
                    <Thermometer size={12} />
                    {currentTemp > 0 ? `${currentTemp.toFixed(1)}°C` : "—°C"}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "#A78BFA" }}>
                    <Activity size={12} />
                    {currentPr > 0 ? `PR ${Math.round(currentPr)}ms` : "PR —ms"}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "#38BDF8" }}>
                    <Waves size={12} />
                    {currentRr > 0 ? `RR ${Math.round(currentRr)}ms` : "RR —ms"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
        {/* The SAME chart the app draws with, fed the same way: a fixed-length
            slice of the recording ending at the reveal point. PQRST markers
            are off - the firmware's complex describes the newest beat only, so
            it cannot be attributed to a slice from mid-recording, which is why
            the app passes null here while replaying too. */}
        <EcgMonitorChart
          samples={visibleSamples}
          sampleRateHz={ecg.sampleRateHz}
          pqrst={null}
          leadOn={ecg.leadOn}
          quality={ecg.quality}
          height={220}
        />
        {canPlay && (
          <>
            {/* Transport: play/pause plus a scrub bar over the whole
                recording - the pair the app's replay screen carries. */}
            <div className="flex items-center gap-3 mt-3">
              <Btn
                variant="ghost"
                style={{ padding: "6px 12px", fontSize: 12 }}
                onClick={togglePlayback}
              >
                {playing ? <Pause size={12} /> : <Play size={12} />}
                {playing ? "Pause" : playbackDone ? "Replay" : "Play"}
              </Btn>
              <input
                type="range"
                min={0}
                max={totalChartSamples}
                value={showingReplay ? revealCount : totalChartSamples}
                onChange={(e) => scrubTo(Number(e.target.value))}
                aria-label="Scrub through the recording"
                className="flex-1 cursor-pointer"
                style={{ accentColor: "#2EE8A0", height: 4 }}
              />
            </div>
            <div
              className="flex justify-between mt-1 text-[11px] tabular-nums"
              style={{ color: "var(--text-muted)" }}
            >
              <span>{formatMMSS(replayElapsedSec)}</span>
              <span>{formatMMSS(effectiveDurationSec)}</span>
            </div>
          </>
        )}
        {/* Scale metadata, worded as the app words it: the chart speed and
            the device's rate are only claimed when the device actually
            reported them, and the gain is auto-scaled to the real signal
            (median-centred) rather than a fixed mV calibration. */}
        <div
          className="flex flex-wrap gap-x-4 gap-y-1 mt-[10px] text-[11px]"
          style={{ color: "var(--text-muted)" }}
        >
          <span>{chartSpeedLabel(ecg.sampleRateHz)}</span>
          <span>{sampleRateLabel(ecg.sampleRateHz)}</span>
          <span>Auto-scaled to the real signal (uncalibrated)</span>
          <span>
            {ecg.totalSamples.toLocaleString()} samples recorded
            {totalChartSamples > 0 && totalChartSamples < ecg.totalSamples
              ? ` · charted as a ${totalChartSamples.toLocaleString()}-point downsample`
              : ""}
            {canPlay
              ? playbackDone
                ? " · replay complete"
                : playing
                  ? ` · replaying at real time (${REPLAY_WINDOW_SEC}s window)`
                  : " · paused"
              : ""}
          </span>
          {!ecg.leadOn && <span style={{ color: "#FACC15" }}>Lead contact reported off</span>}
          {ecg.quality === "poor" && <span style={{ color: "#FACC15" }}>Device reported poor signal quality</span>}
        </div>
        <div className="flex justify-between mt-[10px] text-[11px]" style={{ color: "var(--text-muted)" }}>
          <span>{formatTime(session.startTime as string)}</span>
          <span className="font-semibold" style={{ color: "#06B6D4" }}>Wellness monitoring only — Not for clinical diagnosis</span>
          <span>{formatTime(session.endTime as string)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <h3 className="text-[15px] font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}><Heart size={16} color="#F43F5E" />Heart Rate Trend</h3>
          <div className="flex items-center justify-center py-3">{hrData.length > 0 ? <MiniChart data={hrData} color="#F43F5E" height={80} width={300} /> : noData("No heart-rate data recorded")}</div>
          <div className="flex justify-around mt-[14px]">
            {[{ l: "Min", v: `${session.minHR} bpm`, c: "#10B981" }, { l: "Avg", v: `${session.avgHR} bpm`, c: "#F43F5E" }, { l: "Max", v: `${session.maxHR} bpm`, c: "#EF4444" }].map((s, i) => (
              <div key={i} className="text-center"><div className="text-[11px] mb-[2px]" style={{ color: "var(--text-muted)" }}>{s.l}</div><div className="text-base font-bold" style={{ color: s.c }}>{s.v}</div></div>
            ))}
          </div>
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-clr)" }}>
            <h4 className="text-[13px] font-semibold mb-[10px] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}><Droplets size={14} color="#ff5fa2" />Blood Oxygen (SpO₂)</h4>
            <div className="flex items-center justify-center py-2">{spo2Data.length > 0 ? <MiniChart data={spo2Data} color="#ff5fa2" height={70} width={300} /> : noData("No SpO₂ data recorded")}</div>
            <div className="flex justify-around mt-2">
              {[{ l: "Min", v: `${session.minSpo2}%`, c: "#10B981" }, { l: "Avg", v: `${session.avgSpo2}%`, c: "#ff5fa2" }, { l: "Max", v: `${session.maxSpo2}%`, c: "#EF4444" }].map((s, i) => (
                <div key={i} className="text-center"><div className="text-[11px] mb-[2px]" style={{ color: "var(--text-muted)" }}>{s.l}</div><div className="text-base font-bold" style={{ color: s.c }}>{s.v}</div></div>
              ))}
            </div>
          </div>
          <div className="mt-[14px] rounded-[10px] text-xs flex items-start gap-2" style={{ padding: "10px 14px", background: "rgba(244,63,94,0.12)", color: "var(--text-secondary)" }}>
            <Info size={14} color="#F43F5E" className="shrink-0 mt-[1px]" /><span>Heart rate &amp; SpO₂ from MAX30102 PPG sensor (PCB-F, left chest). Firmware peak detection with motion artifact filtering via SQI thresholding.</span>
          </div>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <h3 className="text-[15px] font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}><Thermometer size={16} color="#F59E0B" />Temperature Trend</h3>
          <div className="flex items-center justify-center py-3">{tempData.length > 0 ? <MiniChart data={tempData} color="#F59E0B" height={80} width={300} /> : noData("No temperature data recorded")}</div>
          <div className="flex justify-around mt-[14px]">
            {[{ l: "Min", v: tempMin != null ? `${tempMin.toFixed(1)}°C` : "—" }, { l: "Avg", v: `${Number(session.avgTemp).toFixed(1)}°C` }, { l: "Max", v: tempMax != null ? `${tempMax.toFixed(1)}°C` : "—" }].map((s, i) => (
              <div key={i} className="text-center"><div className="text-[11px] mb-[2px]" style={{ color: "var(--text-muted)" }}>{s.l}</div><div className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{s.v}</div></div>
            ))}
          </div>
          <div className="mt-5"><h4 className="text-[13px] font-semibold mb-[10px]" style={{ color: "var(--text-secondary)" }}>Session Info</h4>
            {sessionInfo.map(([k, v], i) => (<div key={i} className="flex justify-between py-[6px] text-xs" style={{ borderBottom: "1px solid var(--border-clr)" }}><span style={{ color: "var(--text-muted)" }}>{k}</span><span className="font-medium" style={{ color: "var(--text-primary)" }}>{v}</span></div>))}
          </div>
          <div className="mt-4 text-center"><Btn variant="accentSoft" onClick={() => downloadExport("sessions")}><Download size={14} />Export Session CSV</Btn></div>
        </div>
      </div>
    </div>
  );
}
