"use client";

import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="flex items-center gap-[6px] text-[13px] mb-5" style={{ color: "var(--text-muted)" }}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-[6px]">
          {i > 0 && <ChevronRight size={14} style={{ opacity: 0.4 }} />}
          <span
            onClick={item.onClick}
            className="transition-colors duration-150"
            style={{
              color: i === items.length - 1 ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: i === items.length - 1 ? 600 : 400,
              cursor: item.onClick ? "pointer" : "default",
            }}
            onMouseEnter={(e) => {
              if (item.onClick) (e.target as HTMLSpanElement).style.color = "#06B6D4";
            }}
            onMouseLeave={(e) => {
              if (item.onClick)
                (e.target as HTMLSpanElement).style.color =
                  i === items.length - 1 ? "var(--text-primary)" : "var(--text-muted)";
            }}
          >
            {item.label}
          </span>
        </span>
      ))}
    </div>
  );
}
