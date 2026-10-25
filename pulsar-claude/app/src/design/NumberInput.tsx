import { useEffect, useState } from 'react';
import { formatDecimal as format, parseDecimal } from '../lib/number';
import { Icon } from './Icon';

interface NumberInputProps {
  label: string;
  /** null = not answered (distinct from 0). */
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
}

// Numeric answer with stepper. Empty means "not answered" (null), never 0.
export function NumberInput({ label, value, onChange, unit, step = 1, min, max }: NumberInputProps) {
  const [text, setText] = useState(format(value));
  useEffect(() => setText(format(value)), [value]);

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  const bump = (dir: 1 | -1) => onChange(clamp(Number(((value ?? 0) + dir * step).toFixed(6))));

  return (
    <div className="flex items-center justify-between gap-2 rounded-full bg-surface-container-low p-1.5">
      <button
        type="button"
        aria-label={`Diminuir ${label}`}
        onClick={() => bump(-1)}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface active:scale-90"
      >
        <Icon name="remove" className="text-[20px]" />
      </button>
      <label className="flex min-w-0 flex-1 flex-col items-center">
        <span className="sr-only">{label}</span>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder="—"
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const n = parseDecimal(text);
            onChange(n === null ? null : clamp(n));
          }}
          className="w-full bg-transparent text-center font-stat-display text-stat-display text-on-surface focus:outline-none"
        />
        {unit && (
          <span className="font-label-code text-label-code text-on-surface-variant uppercase">{unit}</span>
        )}
      </label>
      <button
        type="button"
        aria-label={`Aumentar ${label}`}
        onClick={() => bump(1)}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary active:scale-90"
      >
        <Icon name="add" className="text-[20px]" />
      </button>
    </div>
  );
}
