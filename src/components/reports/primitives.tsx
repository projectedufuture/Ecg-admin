"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, FileText, Info } from "lucide-react";
import { usePrintMode } from "@/lib/printMode";

/**
 * Shared building blocks for the report sections.
 *
 * The four earlier report components each grew their own copy of these; the
 * three signal reports use these instead. Extracting them keeps the card
 * geometry, the em-dash-for-null rule and the unavailable state identical across
 * sections, which matters more here than in most UI because a subtly different
 * "0 vs —" would change what the report appears to claim.
 */

export function Card({
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

export function Stat({
  label,
  value,
  unit,
  dot,
}: {
  label: string;
  value: string;
  unit?: string;
  /** Optional status dot colour, for values that carry a grade. */
  dot?: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div
        className="text-[19px] font-bold mt-1 flex items-center gap-[7px]"
        style={{ color: "var(--text-primary)" }}
      >
        {dot && (
          <span className="rounded-full shrink-0" style={{ width: 8, height: 8, background: dot }} />
        )}
        <span>
          {value}
          {unit && (
            <span className="text-[12px] font-medium ml-1" style={{ color: "var(--text-muted)" }}>
              {unit}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

/** A grid that reflows rather than overflowing on narrow screens. */
export function StatGrid({
  min = 130,
  children,
}: {
  min?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid gap-5"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}
    >
      {children}
    </div>
  );
}

/**
 * A null from the backend renders as an em dash, never as 0.
 *
 * This is load-bearing: "SpO₂ 0%" would be a false measurement, while "—" is
 * the truth that nothing was measured.
 */
export function num(value: number | null | undefined, decimals = 0): string {
  return value === null || value === undefined ? "—" : value.toFixed(decimals);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 90) return `${Math.round(seconds)} s`;
  const mins = Math.floor(seconds / 60);
  return `${mins}m ${Math.round(seconds % 60)}s`;
}

/** Seconds into the recording as m:ss, for event tables. */
export function formatOffset(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The shared unavailable state.
 *
 * `noData` picks the neutral grey treatment for "nothing was recorded" versus
 * amber for "recorded but not usable", because those are different situations
 * for the reader.
 */
export function UnavailableState({
  title,
  message,
  noData,
  children,
}: {
  title: string;
  message: string | null;
  noData: boolean;
  /** Optional accounting that explains why. */
  children?: React.ReactNode;
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
          width: 64,
          height: 64,
          borderRadius: 18,
          background: noData ? "rgba(100,116,139,0.12)" : "rgba(245,158,11,0.12)",
          border: `1px solid ${noData ? "rgba(100,116,139,0.25)" : "rgba(245,158,11,0.28)"}`,
        }}
      >
        {noData ? (
          <Info size={28} style={{ color: "#64748B" }} />
        ) : (
          <AlertTriangle size={28} style={{ color: "#F59E0B" }} />
        )}
      </div>

      <h3 className="text-[17px] font-bold mt-5" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      {message && (
        <p
          className="text-[13px] mt-2 mx-auto leading-relaxed"
          style={{ color: "var(--text-secondary)", maxWidth: 480 }}
        >
          {message}
        </p>
      )}

      {children && <div className="mt-6 mx-auto text-left" style={{ maxWidth: 480 }}>{children}</div>}
    </div>
  );
}

/** Collapsible technical section with a label/value table. */
export function TechnicalDetails({
  rows,
  summary,
}: {
  rows: Array<[string, string]>;
  summary?: string | null;
}) {
  const [open, setOpen] = useState(false);
  // While printing, always include the body: a PDF that quietly drops data
  // because a toggle was shut is worse than one that is a little longer.
  const printing = usePrintMode();
  const expanded = open || printing;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-clr)" }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
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
        {expanded ? (
          <ChevronDown size={18} style={{ color: "var(--text-muted)" }} />
        ) : (
          <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
        )}
      </button>

      {expanded && (
        <div style={{ padding: "0 24px 22px" }}>
          <div
            className="grid gap-x-6"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
          >
            {rows.map(([label, value]) => (
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

          {summary && (
            <p
              className="text-[12px] mt-5 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Horizontally scrollable table wrapper, so a wide table never breaks the page. */
export function ScrollTable({
  headers,
  children,
  minWidth = 620,
}: {
  headers: string[];
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left text-[11px] uppercase tracking-wide font-semibold py-2 px-2"
                style={{
                  color: "var(--text-muted)",
                  borderBottom: "1px solid var(--border-clr)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  nowrap,
}: {
  children: React.ReactNode;
  nowrap?: boolean;
}) {
  return (
    <td
      className={`text-[12.5px] py-[10px] px-2${nowrap ? " whitespace-nowrap" : ""}`}
      style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-clr)" }}
    >
      {children}
    </td>
  );
}
