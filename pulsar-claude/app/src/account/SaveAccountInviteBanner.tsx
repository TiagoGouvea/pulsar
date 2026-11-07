import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { Button, Card, Icon } from '../design';
import { shouldShowSaveAccountInvite } from './invite';
import {
  countDistinctEntryDays,
  dismissSaveAccountInvite,
  readSaveAccountInviteDismissal,
} from './inviteRepository';

interface InviteState {
  distinctDaysWithEntries: number;
  dismissedDayCount: number | null;
}

/**
 * Discreet, dismissable banner that invites an anonymous person to save the account (spec 3).
 *
 * The banner never blocks the app: it is one more card on the dashboard and can be dismissed at
 * any time. It only shows for anonymous accounts with entries in three distinct days, and comes
 * back after seven more distinct days with entries (see `shouldShowSaveAccountInvite`).
 */
export function SaveAccountInviteBanner() {
  const { user } = useAuth();
  const [state, setState] = useState<InviteState | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [dismissing, setDismissing] = useState(false);

  const uid = user?.uid ?? null;
  const isAnonymous = user?.isAnonymous === true;

  useEffect(() => {
    // A converted account is never invited again.
    if (!uid || !isAnonymous) {
      setState(null);
      setStatus('ready');
      return;
    }
    let cancelled = false;
    Promise.all([countDistinctEntryDays(uid), readSaveAccountInviteDismissal(uid)])
      .then(([distinctDaysWithEntries, dismissal]) => {
        if (cancelled) return;
        setState({ distinctDaysWithEntries, dismissedDayCount: dismissal.dayCount });
        setStatus('ready');
      })
      .catch(() => {
        // Without the numbers the banner cannot be decided; staying silent is safer than guessing.
        if (!cancelled) {
          setState(null);
          setStatus('ready');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uid, isAnonymous]);

  const visible =
    status === 'ready' &&
    state !== null &&
    shouldShowSaveAccountInvite({
      isAnonymous,
      distinctDaysWithEntries: state.distinctDaysWithEntries,
      dismissedDayCount: state.dismissedDayCount,
    });

  async function handleDismiss() {
    if (!uid || !state || dismissing) return;
    setDismissing(true);
    try {
      await dismissSaveAccountInvite(uid, state.distinctDaysWithEntries);
      setState({ ...state, dismissedDayCount: state.distinctDaysWithEntries });
    } catch {
      // The dismissal could not be saved: keep the banner so the invite is not lost silently.
    } finally {
      setDismissing(false);
    }
  }

  return (
    <div
      data-testid="save-account-invite-slot"
      data-invite-state={visible ? 'visible' : status === 'ready' ? 'hidden' : 'loading'}
      className="contents"
    >
      {visible && state && (
        <Card data-testid="save-account-invite" className="gap-space-md p-space-md">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-secondary">
              <Icon name="cloud_sync" className="text-[22px]" />
            </span>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-label-lg text-label-lg font-semibold text-on-surface">
                Salve sua conta para não perder seus registros
              </h2>
              <p className="font-body-sm text-body-sm leading-snug text-on-surface-variant">
                Seus registros ficam salvos apenas neste navegador. Vincule sua conta com Google ou e-mail
                para acessá-los de qualquer aparelho.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <Link
              to="/settings"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 font-label-md text-label-md text-on-primary transition-transform active:scale-[0.98]"
            >
              <Icon name="verified" className="text-[18px]" />
              Salvar minha conta
            </Link>
            <Button variant="neutral" icon="close" onClick={handleDismiss} disabled={dismissing}>
              Agora não
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
