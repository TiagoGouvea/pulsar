import { usePrivacy } from '../privacy/PrivacyContext';
import { indicatorLabel, type LabelSource } from '../privacy/label';
import type { IndicatorGroup } from './GroupBadge';

interface IndicatorLabelProps {
  indicator: LabelSource;
  /** `badge` = tinted acronym pill (needs `group`); `text` = inline, e.g. inside insight sentences. */
  variant?: 'text' | 'badge';
  group?: IndicatorGroup;
  className?: string;
}

const badgeTone: Record<IndicatorGroup, string> = {
  factor: 'bg-secondary-fixed text-on-secondary-fixed',
  result: 'bg-primary-fixed text-on-primary-fixed',
};

/**
 * The ONLY way to render an indicator name/abbreviation/emoji. Honors the global eye toggle:
 * closed -> abbreviation, no emoji; open -> full name + emoji. Never use indicator.name directly in JSX.
 */
export function IndicatorLabel({ indicator, variant = 'text', group, className = '' }: IndicatorLabelProps) {
  const { isNameRevealed } = usePrivacy();
  const { text, emoji } = indicatorLabel(indicator, isNameRevealed);
  const style =
    variant === 'badge'
      ? `rounded-md px-2 py-0.5 font-label-code text-label-code ${group ? badgeTone[group] : 'bg-surface-container text-on-surface'}`
      : '';
  return (
    <span data-indicator-label className={`inline-flex items-center gap-1 ${style} ${className}`}>
      {emoji && <span aria-hidden="true">{emoji}</span>}
      <span>{text}</span>
    </span>
  );
}
