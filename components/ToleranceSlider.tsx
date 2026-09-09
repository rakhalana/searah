"use client";

// ============================================================
// ToleranceSlider — Kontrol toleransi deviasi dari rute (50 – 500 meter)
// ============================================================

interface ToleranceSliderProps {
  value: number; // dalam meter (50 - 500)
  onChange: (value: number) => void;
}

export default function ToleranceSlider({
  value,
  onChange,
}: ToleranceSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[12px] font-medium text-[var(--text-muted)]">
          Toleransi deviasi
        </label>
        <span className="font-overpass text-[13px] font-bold text-[var(--text-primary)]">
          {Math.round(value)} m
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min="50"
          max="500"
          step="25"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="tolerance-slider w-full"
        />
        <div className="flex justify-between text-[10px] text-[var(--text-faint)] -mt-1 px-0.5">
          <span>50 m</span>
          <span>250 m</span>
          <span>500 m</span>
        </div>
      </div>
    </div>
  );
}
