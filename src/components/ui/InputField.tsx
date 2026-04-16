"use client";

import { useState } from "react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";

interface InputFieldProps {
  label?: string;
  icon?: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function InputField({
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: InputFieldProps) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";

  return (
    <div className="mb-4">
      {label && (
        <label
          className="block text-xs font-semibold mb-[6px] uppercase"
          style={{ color: "var(--text-secondary)", letterSpacing: 0.5 }}
        >
          {label}
        </label>
      )}
      <div
        className="flex items-center gap-2 rounded-[10px] px-[14px] py-[10px]"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border-clr)",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {Icon && <Icon size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={isPass && !show ? "password" : isPass && show ? "text" : type}
          placeholder={placeholder}
          disabled={disabled}
          className="bg-transparent border-none outline-none flex-1 text-sm font-sans"
          style={{ color: "var(--text-primary)" }}
        />
        {isPass && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="bg-transparent border-none cursor-pointer p-0"
          >
            {show ? (
              <EyeOff size={16} style={{ color: "var(--text-muted)" }} />
            ) : (
              <Eye size={16} style={{ color: "var(--text-muted)" }} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
