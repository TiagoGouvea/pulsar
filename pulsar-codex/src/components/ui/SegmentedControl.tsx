import React from 'react';
import clsx from 'clsx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  caption?: string;
  icon?: React.ReactNode;
  /** Active-state classes; defaults to the primary tone. */
  activeClassName?: string;
}

interface SegmentedControlProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  columns?: 2 | 3;
}

/**
 * Pill-shaped picker for mutually exclusive choices, as used by the official
 * design for the indicator group and frequency selectors.
 */
export function SegmentedControl<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  columns = 2
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={clsx(
        'w-full p-1 rounded-full bg-surface-container gap-1',
        columns === 2 ? 'grid grid-cols-2' : 'grid grid-cols-3'
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={clsx(
              'min-h-[44px] w-full rounded-full font-label-md text-label-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed',
              active
                ? option.activeClassName ?? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant'
            )}
          >
            {option.icon}
            <span className="flex flex-col text-center leading-tight">
              <span className={active ? 'font-semibold' : 'font-medium'}>{option.label}</span>
              {option.caption && (
                <span className="font-label-code text-[9px] tracking-normal opacity-75 leading-none pt-0.5">
                  {option.caption}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
