import { Icon } from './Icon';

export type IndicatorGroup = 'factor' | 'result';

const config = {
  factor: { label: 'Fator', icon: 'input', className: 'bg-secondary-fixed text-on-secondary-fixed-variant' },
  result: {
    label: 'Resultado',
    icon: 'insights',
    className: 'bg-primary-fixed text-on-primary-fixed-variant',
  },
} as const;

// Group identity never relies on color alone (spec 7.1): icon + text label + tint.
export function GroupBadge({ group, plural = false }: { group: IndicatorGroup; plural?: boolean }) {
  const { label, icon, className } = config[group];
  return (
    <span
      data-group={group}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-md text-label-md ${className}`}
    >
      <Icon name={icon} className="text-[14px]" />
      {plural ? (group === 'factor' ? 'Fatores' : 'Resultados') : label}
    </span>
  );
}
