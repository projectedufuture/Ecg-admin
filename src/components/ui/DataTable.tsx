"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  pageSize?: number;
  loading?: boolean;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  pageSize = 10,
  loading = false,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return data;
    const q = debouncedSearch.toLowerCase();
    return data.filter((r) =>
      columns.some((c) => String(r[c.key] || "").toLowerCase().includes(q))
    );
  }, [data, debouncedSearch, columns]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortCol] ?? "";
      const vb = b[sortCol] ?? "";
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key: string) => {
    if (sortCol === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(key);
      setSortDir("asc");
    }
  };

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg animate-pulse"
            style={{ background: "var(--bg-surface)" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-[10px] mb-4">
        <div
          className="flex-1 flex items-center gap-2 rounded-[10px] px-[14px] py-2"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border-clr)" }}
        >
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search..."
            className="bg-transparent border-none outline-none flex-1 text-[13px] font-sans"
            style={{ color: "var(--text-primary)" }}
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
              }}
              className="bg-transparent border-none cursor-pointer p-0"
            >
              <X size={14} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
        <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
          {sorted.length} records
        </span>
      </div>

      <div
        className="overflow-x-auto rounded-xl"
        style={{ border: "1px solid var(--border-clr)" }}
      >
        <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => c.sortable !== false && toggleSort(c.key)}
                  className="text-left whitespace-nowrap select-none"
                  style={{
                    padding: "12px 16px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    background: "var(--bg-input)",
                    borderBottom: "1px solid var(--border-clr)",
                    cursor: c.sortable !== false ? "pointer" : "default",
                    fontSize: 12,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortCol === c.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : c.sortable !== false ? (
                      <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center"
                  style={{
                    padding: 48,
                    color: "var(--text-muted)",
                    background: "var(--bg-surface)",
                    fontSize: 14,
                  }}
                >
                  No records found
                </td>
              </tr>
            ) : (
              pageData.map((row, ri) => (
                <tr
                  key={ri}
                  onClick={() => onRowClick?.(row)}
                  className="transition-colors duration-150"
                  style={{ cursor: onRowClick ? "pointer" : "default" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                  }}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className="whitespace-nowrap"
                      style={{
                        padding: "11px 16px",
                        borderBottom: "1px solid var(--border-clr)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {c.render
                        ? c.render(row[c.key], row)
                        : (row[c.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-[14px] text-[13px]" style={{ color: "var(--text-secondary)" }}>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-[6px]">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 rounded-lg px-3 py-[6px] text-xs font-sans"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-clr)",
                color: "var(--text-primary)",
                cursor: page === 0 ? "not-allowed" : "pointer",
                opacity: page === 0 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 rounded-lg px-3 py-[6px] text-xs font-sans"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-clr)",
                color: "var(--text-primary)",
                cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                opacity: page >= totalPages - 1 ? 0.4 : 1,
              }}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
