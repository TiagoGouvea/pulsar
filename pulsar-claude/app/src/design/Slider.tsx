import type { Tone } from './Chip';

interface SliderProps {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  /** null = not answered (never treated as zero). */
  value: number | null;
  onChange: (value: number) => void;
  tone?: Exclude<Tone, 'neutral'>;
  minLabel?: string;
  maxLabel?: string;
}

const MAX_PILLS = 11;

// Scale input. Small discrete scales (e.g. 0–10 step 1) render the tappable pill bar from the mockup;
// larger ones fall back to a native range input.
export function Slider({
  label,
  min = 0,
  max = 10,
  step = 1,
  value,
  onChange,
  tone = 'result',
  minLabel,
  maxLabel,
}: SliderProps) {
  const count = Math.floor((max - min) / step) + 1;
  const selected =
    tone === 'factor' ? 'bg-secondary text-on-secondary' : 'bg-primary-container text-on-primary';
  return (
    <div className="flex flex-col gap-2">
      {(minLabel || maxLabel) && (
        <div className="flex justify-between px-1 font-label-code text-label-code text-on-surface-variant">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
      {count <= MAX_PILLS ? (
        <div role="radiogroup" aria-label={label} className="flex items-center justify-between gap-0.5 py-1">
          {Array.from({ length: count }, (_, i) => Number((min + i * step).toFixed(6))).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              onClick={() => onChange(n)}
              className={`flex h-11 min-w-0 flex-1 items-center justify-center rounded-full font-label-code text-label-code transition-transform active:scale-90 ${value === n ? `${selected} font-headline-md text-headline-md shadow-md` : 'bg-surface-container text-on-surface-variant'}`}
            >
              {n}
            </button>
          ))}
        </div>
      ) : (
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value ?? min}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`h-11 w-full ${tone === 'factor' ? 'accent-secondary' : 'accent-primary-container'}`}
        />
      )}
    </div>
  );
}
