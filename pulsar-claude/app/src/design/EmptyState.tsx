import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  /** Illustrative icon (Material Symbols) shown above the title. */
  icon?: IconName;
  title: string;
  description?: string;
  /** Optional call to action (usually a link to the next step). */
  action?: ReactNode;
  className?: string;
}

/**
 * Reusable empty state: icon, title, explanation and an optional CTA.
 * Used by screens that have nothing to show yet (no data, no indicators, no saved insights).
 */
export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-lg bg-surface-container px-6 py-10 text-center ${className}`}
    >
      {icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant">
          <Icon name={icon} className="text-[24px]" />
        </span>
      )}
      <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-balance text-on-surface">
        {title}
      </h2>
      {description && (
        <p className="max-w-[36ch] font-body-md text-body-md text-on-surface-variant">{description}</p>
      )}
      {action}
    </div>
  );
}
