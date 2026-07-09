"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Clock, Heart, Activity, Thermometer, Wifi, Plus, Minus, Download, Info, AlertCircle, RefreshCw } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ECGWaveform from "@/components/ui/ECGWaveform";
import MiniChart from "@/components/ui/MiniChart";
import Btn from "@/components/ui/Btn";
import { useSessionDetail } from "@/lib/hooks";
import { downloadExport } from "@/lib/api";
import { formatTime } from "@/lib/utils";

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { data, error, isLoading, mutate } = useSessionDetail(sessionId);
  const [zoomLevel, setZoomLevel] = useState(1);

  const session = data as Record<string, unknown> | undefined;

  // Real ECG samples only — no synthetic fallback. Empty array => "no data" state.
  const ecgData = useMemo(() => {
    if (!session) return [];
    const readings = session.readings as { ecgValue: number }[] | undefined;
    const ecgValues = session.ecgValues as number[] | undefined;
    if (ecgValues && ecgValues.length > 0) return ecgValues;
    if (readings && readings.length > 0) return readings.map(r => r.ecgValue);
    return [];
  }, [session]);

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

  const metrics = [
    { l: "Duration", v: `${session.duration} min`, i: Clock, c: "#06B6D4" },
    { l: "Avg Heart Rate", v: `${session.avgHR} bpm`, i: Heart, c: "#F43F5E" },
    { l: "HR Range", v: `${session.minHR}–${session.maxHR} bpm`, i: Activity, c: "#8B5CF6" },
    { l: "Avg Temperature", v: `${Number(session.avgTemp).toFixed(1)}°C`, i: Thermometer, c: "#F59E0B" },
    { l: "Data Source", v: session.dataSource as string, i: Wifi, c: "#10B981" },
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
      <div className="grid grid-cols-5 gap-3 mb-5">
        {metrics.map((m, i) => (
          <div key={i} className="rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)", padding: "16px 18px" }}>
            <div className="flex items-center gap-[6px] mb-2"><m.i size={14} style={{ color: m.c }} /><span className="text-[11px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: 0.5 }}>{m.l}</span></div>
            <div className="text-lg font-bold capitalize" style={{ color: "var(--text-primary)" }}>{m.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-6 mb-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold m-0" style={{ color: "var(--text-primary)" }}>ECG Waveform</h3>
          <div className="flex gap-2">
            <Btn variant="ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setZoomLevel(z => Math.max(0.25, z - 0.5))} disabled={zoomLevel <= 0.25}><Minus size={12} />Zoom Out</Btn>
            <span className="flex items-center px-2 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{zoomLevel.toFixed(1)}x</span>
            <Btn variant="ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setZoomLevel(z => Math.min(4, z + 0.5))} disabled={zoomLevel >= 4}><Plus size={12} />Zoom In</Btn>
          </div>
        </div>
        {ecgData.length > 0 ? (
          <ECGWaveform data={ecgData} height={180} zoom={zoomLevel} />
        ) : (
          <div className="flex items-center justify-center" style={{ height: 180, borderRadius: 8, background: "#020a05", color: "#4a8a62", fontSize: 13, fontFamily: "monospace", letterSpacing: 1 }}>
            NO ECG DATA RECORDED FOR THIS SESSION
          </div>
        )}
        <div className="flex justify-between mt-[10px] text-[11px]" style={{ color: "var(--text-muted)" }}>
          <span>{formatTime(session.startTime as string)}</span>
          <span className="font-semibold" style={{ color: "#06B6D4" }}>Wellness monitoring only — Not for clinical diagnosis</span>
          <span>{formatTime(session.endTime as string)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}>
          <h3 className="text-[15px] font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}><Heart size={16} color="#F43F5E" />Heart Rate Trend</h3>
          <div className="flex items-center justify-center py-3">{noData("No heart-rate waveform recorded")}</div>
          <div className="flex justify-around mt-[14px]">
            {[{ l: "Min", v: `${session.minHR} bpm`, c: "#10B981" }, { l: "Avg", v: `${session.avgHR} bpm`, c: "#F43F5E" }, { l: "Max", v: `${session.maxHR} bpm`, c: "#EF4444" }].map((s, i) => (
              <div key={i} className="text-center"><div className="text-[11px] mb-[2px]" style={{ color: "var(--text-muted)" }}>{s.l}</div><div className="text-base font-bold" style={{ color: s.c }}>{s.v}</div></div>
            ))}
          </div>
          <div className="mt-[14px] rounded-[10px] text-xs flex items-start gap-2" style={{ padding: "10px 14px", background: "rgba(244,63,94,0.12)", color: "var(--text-secondary)" }}>
            <Info size={14} color="#F43F5E" className="shrink-0 mt-[1px]" /><span>Heart rate from MAX30102 PPG sensor (PCB-F, left chest). Firmware peak detection with motion artifact filtering via SQI thresholding.</span>
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
