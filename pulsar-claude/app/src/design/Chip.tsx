import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

export type Tone = 'factor' | 'result' | 'neutral';

const selectedTone: Record<Tone, string> = {
  factor: 'bg-secondary text-on-secondary shadow-sm',
  result: 'bg-primary-container text-on-primary shadow-sm',
  neutral: 'bg-on-surface text-surface shadow-sm',
};

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  tone?: Tone;
  icon?: IconName;
}

// Pill toggle used for Sim/Não, ordinal options and quick picks. Selection is exposed via aria-pressed.
export function Chip({
  selected = false,
  tone = 'neutral',
  icon,
  className = '',
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-4 font-label-md text-label-md transition-all active:scale-95 ${selected ? selectedTone[tone] : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} className="text-[18px]" />}
      {children}
    </button>
  );
}
