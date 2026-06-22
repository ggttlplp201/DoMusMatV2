"use client";

import { useT } from "@/state/locale";

interface QuantityStepperProps {
  value: number;
  min: number;
  onChange: (value: number) => void;
}

export function QuantityStepper({ value, min, onChange }: QuantityStepperProps) {
  const t = useT();

  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  const increment = () => {
    onChange(value + 1);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed) && parsed >= min) onChange(parsed);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={t("qty.decrease")}
        onClick={decrement}
        disabled={value <= min}
        className="w-8 h-8 flex items-center justify-center rounded border border-aluminium text-ink disabled:opacity-40"
      >
        −
      </button>
      <input
        type="number"
        aria-label={t("order.quantity")}
        value={value}
        min={min}
        onChange={handleInput}
        className="tabular w-16 text-center rounded border border-aluminium px-2 py-1 text-sm"
      />
      <button
        type="button"
        aria-label={t("qty.increase")}
        onClick={increment}
        className="w-8 h-8 flex items-center justify-center rounded border border-aluminium text-ink"
      >
        +
      </button>
    </div>
  );
}
