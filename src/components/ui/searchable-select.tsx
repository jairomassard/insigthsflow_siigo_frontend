"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  maxResults?: number;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar...",
  emptyText = "Sin resultados",
  className,
  maxResults = 100,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) || null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? options
      : options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            o.value.toLowerCase().includes(q)
        );
    return base.slice(0, maxResults);
  }, [options, query, maxResults]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
      >
        <span className={cn("truncate text-left", !selected && "text-slate-400")}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {selected && (
            <X
              size={14}
              className="text-slate-400 hover:text-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            />
          )}
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe nombre o código..."
              className="w-full text-sm outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                {emptyText}
              </div>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-emerald-50",
                  o.value === value && "bg-emerald-50"
                )}
              >
                <span className="font-medium text-slate-800">{o.label}</span>
                {o.sublabel && (
                  <span className="text-xs text-slate-400">{o.sublabel}</span>
                )}
              </button>
            ))}
            {options.length > maxResults && filtered.length === maxResults && (
              <div className="px-3 py-2 text-center text-[10px] text-slate-400">
                Mostrando los primeros {maxResults} resultados. Sigue escribiendo para
                afinar la búsqueda.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
