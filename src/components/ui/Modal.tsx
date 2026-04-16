"use client";

import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}

export default function Modal({ open, title, children, onClose, wide }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="overflow-y-auto"
        style={{
          background: "#151d2e",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: 28,
          width: wide ? 560 : 460,
          maxWidth: "92vw",
          maxHeight: "85vh",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3
            className="text-[17px] font-bold m-0"
            style={{ color: "#F1F5F9" }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer p-1"
          >
            <X size={18} style={{ color: "#64748B" }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
