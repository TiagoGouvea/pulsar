import { Link } from 'react-router';
import { EmptyState, Icon, type IconName } from '../design';

interface PlaceholderPageProps {
  /** Page heading. */
  title: string;
  /** Illustrative icon of the empty state. */
  icon: IconName;
  /** Empty state headline. */
  emptyTitle: string;
  /** Empty state explanation. */
  description: string;
  /** Optional call to action pointing to the next step. */
  cta?: { label: string; to: string };
  /** Optional primary action above the empty state (e.g. "Novo Indicador"). */
  headerAction?: { label: string; to: string };
}

const linkClass =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary shadow-md shadow-primary/20 transition-transform active:scale-[0.98]';

/**
 * Placeholder screen for the routes whose features land later (dashboard, quick entry,
 * indicators, saved insights). It shows the shell structure and a reusable empty state.
 */
export function PlaceholderPage({
  title,
  icon,
  emptyTitle,
  description,
  cta,
  headerAction,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-headline-xl-mobile text-headline-xl-mobile">{title}</h1>
      {headerAction && (
        <Link to={headerAction.to} className={`${linkClass} self-start`}>
          <Icon name="add" className="text-[20px]" />
          {headerAction.label}
        </Link>
      )}
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={description}
        action={
          cta && (
            <Link to={cta.to} className={linkClass}>
              {cta.label}
            </Link>
          )
        }
      />
    </div>
  );
}
