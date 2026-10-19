"use client";

export function QuantityStepper({
  label,
  value,
  pending,
  onChange,
}: {
  label: string;
  value: number;
  pending: boolean;
  onChange: (quantity: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-stone-200">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Reducir ${label}`}
          disabled={pending || value <= 0}
          onClick={() => onChange(value - 1)}
          className="inline-flex size-11 items-center justify-center rounded-lg bg-white text-lg text-stone-900 ring-1 ring-stone-300 disabled:text-stone-300"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums text-stone-950">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          disabled={pending || value >= 99}
          onClick={() => onChange(Math.min(99, value + 1))}
          className="inline-flex size-11 items-center justify-center rounded-lg bg-white text-lg text-stone-900 ring-1 ring-stone-300 disabled:text-stone-300"
        >
          +
        </button>
      </div>
    </div>
  );
}
