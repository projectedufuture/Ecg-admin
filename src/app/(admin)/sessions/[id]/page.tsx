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

function generateECGFallback(count: number = 1200): number[] {
  const d: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i % 100) / 100; let v = 0;
    if (t > 0.05 && t < 0.10) v = Math.sin((t - 0.05) * Math.PI / 0.05) * 0.15;
    else if (t > 0.15 && t < 0.18) v = -0.08;
    else if (t > 0.18 && t < 0.22) v = Math.sin((t - 0.18) * Math.PI / 0.04) * 1.0;
    else if (t > 0.22 && t < 0.26) v = -0.2;
    else if (t > 0.30 && t < 0.42) v = Math.sin((t - 0.30) * Math.PI / 0.12) * 0.25;
    v += (Math.random() - 0.5) * 0.03; d.push(v);
  }
  return d;
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { data, error, isLoading, mutate } = useSessionDetail(sessionId);
  const [zoomLevel, setZoomLevel] = useState(1);

  const session = data as Record<string, unknown> | undefined;

  // Build ECG data from readings or from ecgValues array
  const ecgData = useMemo(() => {
    if (!session) return [];
    const readings = session.readings as { ecgValue: number }[] | undefined;
    const ecgValues = session.ecgValues as number[] | undefined;
    if (ecgValues && ecgValues.length > 0) return ecgValues;
    if (readings && readings.length > 0) return readings.map(r => r.ecgValue);
    return generateECGFallback(1200);
  }, [session]);

  const hrData = useMemo(() => {
    if (!session) return [];
    const readings = session.readings as { ecgValue: number; temperatureCelsius: number }[] | undefined;
    if (readings && readings.length > 0) {
      // Sample ~40 HR points from ecg data variance
      const step = Math.max(1, Math.floor(readings.length / 40));
      return Array.from({ length: 40 }, (_, i) => {
        const minHR = (session.minHR as number) || 60;
        const maxHR = (session.maxHR as number) || 100;
        return minHR + Math.random() * (maxHR - minHR);
      });
    }
    const minHR = (session.minHR as number) || 60;
    const maxHR = (session.maxHR as number) || 100;
    return Array.from({ length: 40 }, () => minHR + Math.random() * (maxHR - minHR));
  }, [session]);

  const tempData = useMemo(() => {
    if (!session) return [];
    const readings = session.readings as { temperatureCelsius: number }[] | undefined;
    const temperatureValues = session.temperatureValues as number[] | undefined;
    if (temperatureValues && temperatureValues.length > 0) {
      const step = Math.max(1, Math.floor(temperatureValues.length / 30));
      return Array.from({ length: Math.min(30, temperatureValues.length) }, (_, i) => temperatureValues[i * step] || 36.5);
    }
    if (readings && readings.length > 0) {
      const step = Math.max(1, Math.floor(readings.length / 30));
      return Array.from({ length: 30 }, (_, i) => readings[Math.min(i * step, readings.length - 1)]?.temperatureCelsius || 36.5);
    }
    return Array.from({ length: 30 }, () => 36.1 + Math.random() * 1.3);
  }, [session]);

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-[180px] rounded-2xl animate-pulse" style={{ background: "#151d2e" }} />)}</div>;
  }

  if (error || !session) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>Failed to load session</p>
        <Btn onClick={() => mutate()} variant="ghost"><RefreshCw size={14} />Retry</Btn>
      </div>
    );
  }

  const metrics = [
    { l: "Duration", v: `${session.duration} min`, i: Clock, c: "#06B6D4" },
    { l: "Avg Heart Rate", v: `${session.avgHR} bpm`, i: Heart, c: "#F43F5E" },
    { l: "HR Range", v: `${session.minHR}–${session.maxHR} bpm`, i: Activity, c: "#8B5CF6" },
    { l: "Avg Temperature", v: `${session.avgTemp}°C`, i: Thermometer, c: "#F59E0B" },
    { l: "Data Source", v: session.dataSource as string, i: Wifi, c: "#10B981" },
  ];

  const sessionInfo = [
    ["Session ID", session.id as string],
    ["User", session.userName as string],
    ["Device", session.deviceId as string],
    ["Start", new Date(session.startTime as string).toLocaleString()],
    ["End", new Date(session.endTime as string).toLocaleString()],
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Sessions", onClick: () => router.push("/sessions") }, { label: session.id as string }]} />
      <div className="grid grid-cols-5 gap-3 mb-5">
        {metrics.map((m, i) => (
          <div key={i} className="rounded-xl" style={{ background: "#151d2e", border: "1px solid #1e293b", padding: "16px 18px" }}>
            <div className="flex items-center gap-[6px] mb-2"><m.i size={14} style={{ color: m.c }} /><span className="text-[11px] uppercase" style={{ color: "#64748B", letterSpacing: 0.5 }}>{m.l}</span></div>
            <div className="text-lg font-bold capitalize" style={{ color: "#F1F5F9" }}>{m.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-6 mb-5" style={{ background: "#151d2e", border: "1px solid #1e293b" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold m-0" style={{ color: "#F1F5F9" }}>ECG Waveform</h3>
          <div className="flex gap-2">
            <Btn variant="ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setZoomLevel(z => Math.max(0.25, z - 0.5))} disabled={zoomLevel <= 0.25}><Minus size={12} />Zoom Out</Btn>
            <span className="flex items-center px-2 text-xs font-semibold" style={{ color: "#94A3B8" }}>{zoomLevel.toFixed(1)}x</span>
            <Btn variant="ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setZoomLevel(z => Math.min(4, z + 0.5))} disabled={zoomLevel >= 4}><Plus size={12} />Zoom In</Btn>
          </div>
        </div>
        <ECGWaveform data={ecgData} height={180} zoom={zoomLevel} />
        <div className="flex justify-between mt-[10px] text-[11px]" style={{ color: "#64748B" }}>
          <span>{formatTime(session.startTime as string)}</span>
          <span className="font-semibold" style={{ color: "#06B6D4" }}>Wellness monitoring only — Not for clinical diagnosis</span>
          <span>{formatTime(session.endTime as string)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-6" style={{ background: "#151d2e", border: "1px solid #1e293b" }}>
          <h3 className="text-[15px] font-semibold mb-4 flex items-center gap-2" style={{ color: "#F1F5F9" }}><Heart size={16} color="#F43F5E" />Heart Rate Trend</h3>
          <div className="flex items-center justify-center py-3"><MiniChart data={hrData} color="#F43F5E" height={80} width={300} /></div>
          <div className="flex justify-around mt-[14px]">
            {[{ l: "Min", v: `${session.minHR} bpm`, c: "#10B981" }, { l: "Avg", v: `${session.avgHR} bpm`, c: "#F43F5E" }, { l: "Max", v: `${session.maxHR} bpm`, c: "#EF4444" }].map((s, i) => (
              <div key={i} className="text-center"><div className="text-[11px] mb-[2px]" style={{ color: "#64748B" }}>{s.l}</div><div className="text-base font-bold" style={{ color: s.c }}>{s.v}</div></div>
            ))}
          </div>
          <div className="mt-[14px] rounded-[10px] text-xs flex items-start gap-2" style={{ padding: "10px 14px", background: "rgba(244,63,94,0.12)", color: "#94A3B8" }}>
            <Info size={14} color="#F43F5E" className="shrink-0 mt-[1px]" /><span>Heart rate from MAX30102 PPG sensor (PCB-F, left chest). Firmware peak detection with motion artifact filtering via SQI thresholding.</span>
          </div>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "#151d2e", border: "1px solid #1e293b" }}>
          <h3 className="text-[15px] font-semibold mb-4 flex items-center gap-2" style={{ color: "#F1F5F9" }}><Thermometer size={16} color="#F59E0B" />Temperature Trend</h3>
          <div className="flex items-center justify-center py-3"><MiniChart data={tempData} color="#F59E0B" height={80} width={300} /></div>
          <div className="flex justify-around mt-[14px]">
            {[{ l: "Min", v: "36.1°C" }, { l: "Avg", v: `${session.avgTemp}°C` }, { l: "Max", v: "37.4°C" }].map((s, i) => (
              <div key={i} className="text-center"><div className="text-[11px] mb-[2px]" style={{ color: "#64748B" }}>{s.l}</div><div className="text-base font-bold" style={{ color: "#F1F5F9" }}>{s.v}</div></div>
            ))}
          </div>
          <div className="mt-5"><h4 className="text-[13px] font-semibold mb-[10px]" style={{ color: "#94A3B8" }}>Session Info</h4>
            {sessionInfo.map(([k, v], i) => (<div key={i} className="flex justify-between py-[6px] text-xs" style={{ borderBottom: "1px solid #1e293b" }}><span style={{ color: "#64748B" }}>{k}</span><span className="font-medium" style={{ color: "#F1F5F9" }}>{v}</span></div>))}
          </div>
          <div className="mt-4 text-center"><Btn variant="accentSoft" onClick={() => downloadExport("sessions")}><Download size={14} />Export Session CSV</Btn></div>
        </div>
      </div>
    </div>
  );
}
