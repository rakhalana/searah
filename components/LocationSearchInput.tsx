"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GeocodingResult } from "@/lib/types";

// ============================================================
// LocationSearchInput — Input autocomplete dengan geocoding
// ============================================================

interface LocationSearchInputProps {
  label: string;
  placeholder: string;
  value: GeocodingResult | null;
  onSelect: (result: GeocodingResult) => void;
  icon: React.ReactNode;
  onPickOnMap?: () => void;
  isPicking?: boolean;
}

export default function LocationSearchInput({
  label,
  placeholder,
  value,
  onSelect,
  icon,
  onPickOnMap,
  isPicking = false,
}: LocationSearchInputProps) {
  const [query, setQuery] = useState(value ? value.display_name : "");
  const [prevValue, setPrevValue] = useState(value);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sinkronkan query jika prop value berubah
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value ? value.display_name : "");
  }

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(q)}`
      );
      const data = await response.json();
      if (data.results) {
        setResults(data.results);
        setIsOpen(true);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (result: GeocodingResult) => {
    setQuery(result.display_name);
    setIsOpen(false);
    setResults([]);
    onSelect(result);
  };

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[12px] font-medium text-[var(--text-muted)]">
          {label}
        </label>
        {onPickOnMap && (
          <button
            type="button"
            onClick={onPickOnMap}
            className={`text-[11px] px-2 py-0.5 rounded-[6px] transition-colors border ${
              isPicking
                ? "bg-[var(--accent-route)] border-[var(--accent-route)] text-white font-medium"
                : "border-[var(--line)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-raised)]"
            }`}
            title="Klik langsung di peta untuk menentukan koordinat"
          >
            {isPicking ? "Klik di peta…" : "Pilih di peta"}
          </button>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {icon}
        </span>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={isPicking ? "Klik titik di peta…" : placeholder}
          className={`w-full pl-8 pr-8 py-2 bg-[var(--bg-panel-raised)] border rounded-[6px] 
                     text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] 
                     focus:outline-none transition-colors ${
                       isPicking
                         ? "border-[var(--accent-route)] ring-1 ring-[var(--accent-route)]"
                         : "border-[var(--line)] focus:border-[var(--accent-route)]"
                     }`}
        />
        {isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="animate-spin h-3.5 w-3.5 text-[var(--text-muted)]"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </span>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 bg-[var(--bg-panel-raised)] border border-[var(--line)] 
                     rounded-[6px] shadow-none overflow-hidden max-h-56 overflow-y-auto custom-scrollbar"
        >
          {results.map((result, idx) => (
            <li key={`${result.lat}-${result.lng}-${idx}`}>
              <button
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left px-3 py-2.5 text-xs text-[var(--text-primary)] 
                           hover:bg-[var(--line)] transition-colors
                           border-b border-[var(--line)] last:border-b-0"
              >
                <span className="line-clamp-2">{result.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
