"use client";

import React from "react";

type BtnVariant = "primary" | "danger" | "ghost" | "success" | "accentSoft";

interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  style?: React.CSSProperties;
  disabled?: boolean;
  type?: "button" | "submit";
}

const variantStyles: Record<BtnVariant, React.CSSProperties> = {
  primary: { background: "#06B6D4", color: "#fff", border: "none" },
  danger: { background: "#EF4444", color: "#fff", border: "none" },
  ghost: { background: "#111827", color: "#F1F5F9", border: "1px solid #1e293b" },
  success: { background: "#10B981", color: "#fff", border: "none" },
  accentSoft: { background: "rgba(6,182,212,0.15)", color: "#06B6D4", border: "1px solid rgba(6,182,212,0.25)" },
};

export default function Btn({
  children,
  onClick,
  variant = "primary",
  style: sx = {},
  disabled,
  type = "button",
}: BtnProps) {
  const s = variantStyles[variant] || variantStyles.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s,
        borderRadius: 10,
        padding: "10px 20px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
        ...sx,
      }}
    >
      {children}
    </button>
  );
}
