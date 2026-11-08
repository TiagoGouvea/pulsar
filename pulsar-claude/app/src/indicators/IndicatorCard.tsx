import { GroupBadge, Icon, IndicatorLabel, type IconName } from '../design';
import type { StoredIndicator as Indicator } from '../data/indicators';
import {
  aggregationSummary,
  directionSummary,
  frequencyLabel,
  idealRangeSummary,
  valueTypeLabel,
} from './summary';

const TYPE_ICON: Record<Indicator['valueType'], IconName> = {
  boolean: 'check_circle',
  scale: 'ssid_chart',
  numeric: 'vital_signs',
  ordinal: 'analytics',
};

/** Small metadata pill of the card (type, frequency, aggregation, direction). */
function MetaChip({
  icon,
  children,
  tone = 'neutral',
}: {
  icon?: IconName;
  children: string;
  tone?: 'neutral' | 'factor' | 'result';
}) {
  const tones = {
    neutral: 'bg-surface-container-low text-on-surface-variant',
    factor: 'bg-secondary-fixed text-on-secondary-fixed',
    result: 'bg-primary-fixed text-on-primary-fixed',
  } as const;
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-label-md text-label-md ${tones[tone]}`}
    >
      {icon && <Icon name={icon} className="text-[14px]" />}
      {children}
    </span>
  );
}

interface IndicatorCardProps {
  indicator: Indicator;
  /** True when the card is the first one of its group (nothing to move up). */
  first: boolean;
  /** True when the card is the last one of its group (nothing to move down). */
  last: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOpenOptions: () => void;
}

/**
 * Active indicator card (design/meus_indicadores): acronym, name, type, frequency and
 * aggregation, plus the reorder and options controls.
 */
export function IndicatorCard({
  indicator,
  first,
  last,
  onMoveUp,
  onMoveDown,
  onOpenOptions,
}: IndicatorCardProps) {
  const aggregation = aggregationSummary(indicator);
  const direction = directionSummary(indicator);
  const idealRange = idealRangeSummary(indicator);

  return (
    <article
      data-testid="indicator-card"
      className="flex flex-col gap-space-sm rounded-lg bg-surface-container-lowest p-3 shadow-level-1"
    >
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h3 className="min-w-0 truncate font-label-lg text-label-lg text-on-surface">
            <IndicatorLabel indicator={indicator} />
          </h3>
        </div>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            aria-label="Subir indicador"
            disabled={first}
            onClick={onMoveUp}
            className="flex size-11 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Icon name="arrow_upward" className="text-[18px]" />
          </button>
          <button
            type="button"
            aria-label="Descer indicador"
            disabled={last}
            onClick={onMoveDown}
            className="flex size-11 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Icon name="arrow_downward" className="text-[18px]" />
          </button>
          <button
            type="button"
            aria-label="Opções do indicador"
            onClick={onOpenOptions}
            className="flex size-11 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Icon name="more_vert" className="text-[18px]" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <MetaChip icon={TYPE_ICON[indicator.valueType]}>{valueTypeLabel(indicator)}</MetaChip>
        <MetaChip>{frequencyLabel(indicator)}</MetaChip>
        {aggregation && (
          <MetaChip tone={indicator.group === 'factor' ? 'factor' : 'result'}>{aggregation}</MetaChip>
        )}
        {direction && <MetaChip tone="result">{direction}</MetaChip>}
        {idealRange && <MetaChip tone="result">{idealRange}</MetaChip>}
      </div>
    </article>
  );
}

interface ArchivedIndicatorCardProps {
  indicator: Indicator;
  onRestore: () => void;
}

/**
 * Archived indicator card: it keeps its history, leaves the daily entry and can be restored.
 */
export function ArchivedIndicatorCard({ indicator, onRestore }: ArchivedIndicatorCardProps) {
  return (
    <article
      data-testid="indicator-card"
      className="flex flex-col gap-space-sm rounded-lg bg-surface-container-lowest p-3 shadow-level-1"
    >
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate font-label-lg text-label-lg text-on-surface-variant">
          <IndicatorLabel indicator={indicator} />
        </h3>
        <span className="shrink-0 rounded-full bg-surface-container-high px-2.5 py-1 font-label-code text-label-code tracking-wider text-on-surface-variant uppercase">
          Arquivado
        </span>
      </div>
      <div>
        <GroupBadge group={indicator.group} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-body-sm text-body-sm text-on-surface-variant">
          {valueTypeLabel(indicator)} • Desativado
        </span>
        <button
          type="button"
          onClick={onRestore}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-primary-fixed px-3 font-label-md text-label-md text-primary transition-transform active:scale-95"
        >
          <Icon name="restore" className="text-[16px]" />
          Restaurar
        </button>
      </div>
    </article>
  );
}
