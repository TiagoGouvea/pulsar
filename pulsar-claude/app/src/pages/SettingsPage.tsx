import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import {
  completeEmailLink,
  linkWithGoogle,
  sendEmailLink,
  signInToExistingAccount,
  type LinkConflict,
  type LinkResult,
} from '../auth/linkAccount';

/** Result of completing an e-mail link: linked, conflict, or entering the existing account. */
type CompletedLinkResult = LinkResult | { status: 'signed-in-existing'; uid: string };
import { auth } from '../lib/firebase';
import { Button, Card, Icon, Sheet } from '../design';

function actionError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'A vinculação foi cancelada. Sua conta continua como estava.';
  }
  if (code === 'auth/link-session-mismatch') {
    return 'Abra este link no navegador e na sessão em que você o solicitou para preservar seus dados.';
  }
  if (code === 'auth/invalid-email') return 'Digite um e-mail válido.';
  if (code === 'auth/invalid-action-code') return 'Este link já foi usado ou expirou. Solicite um novo link.';
  if (code === 'auth/network-request-failed') {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
  }
  return 'Não foi possível concluir a ação. Nenhum dado foi alterado. Tente novamente.';
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 fill-current">
      <path d="M12.24 10.285V13.4h6.887C18.2 16.037 15.65 18 12.24 18c-3.61 0-6.54-2.93-6.54-6.54s2.93-6.54 6.54-6.54c1.65 0 3.16.61 4.33 1.62l2.35-2.35C17.15 2.57 14.86 1.8 12.24 1.8 6.54 1.8 2 6.34 2 12s4.54 10.2 10.24 10.2c5.96 0 9.87-4.19 9.87-10.05 0-.67-.06-1.32-.17-1.865H12.24z" />
    </svg>
  );
}

// Survives the AuthGate remount caused by the credential change while the action URL is still present.
let completedActionLink: { href: string; result: CompletedLinkResult } | null = null;

/** Settings > Account: converts the anonymous session without replacing its UID. */
export function SettingsPage() {
  const { user, refreshCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [anonymous, setAnonymous] = useState(user?.isAnonymous ?? true);
  const [linkedEmail, setLinkedEmail] = useState(user?.email ?? '');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<LinkConflict | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [confirmExisting, setConfirmExisting] = useState(false);
  const [needsEmailCompletion, setNeedsEmailCompletion] = useState(false);
  const processedHref = useRef<string | null>(null);

  function finishLink(result: CompletedLinkResult, completedWithEmail = false) {
    if (result.status === 'conflict') {
      setConflict(result);
      setConflictError(null);
      setConfirmExisting(false);
      return;
    }
    if (result.status === 'signed-in-existing') {
      refreshCurrentUser();
      setAnonymous(false);
      setLinkedEmail(auth.currentUser?.email ?? (completedWithEmail ? email : ''));
      setShowEmailForm(false);
      setNeedsEmailCompletion(false);
      setMessage('Você entrou na conta existente.');
      navigate('/settings', { replace: true });
      return;
    }
    refreshCurrentUser();
    setAnonymous(false);
    setLinkedEmail(auth.currentUser?.email ?? (completedWithEmail ? email : ''));
    setShowEmailForm(false);
    setNeedsEmailCompletion(false);
    setMessage('Conta vinculada. Seus registros continuam no mesmo espaço.');
    navigate('/settings', { replace: true });
  }

  useEffect(() => {
    const href = window.location.href;
    if (processedHref.current === href) return;
    processedHref.current = href;
    if (completedActionLink?.href === href) {
      finishLink(completedActionLink.result, true);
      return;
    }

    setBusy(true);
    void completeEmailLink(href)
      .then((result) => {
        if (result.status === 'not-a-link') return;
        if (result.status === 'needs-email') {
          setShowEmailForm(true);
          setNeedsEmailCompletion(true);
          setMessage('Digite o e-mail que recebeu o link para concluir a vinculação.');
          return;
        }
        completedActionLink = { href, result };
        finishLink(result, true);
      })
      .catch((reason: unknown) => setError(actionError(reason)))
      .finally(() => setBusy(false));
    // The href guard makes link completion idempotent under React StrictMode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      finishLink(await linkWithGoogle());
    } catch (reason) {
      setError(actionError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (needsEmailCompletion) {
        const result = await completeEmailLink(window.location.href, email);
        if (
          result.status === 'linked' ||
          result.status === 'conflict' ||
          result.status === 'signed-in-existing'
        )
          finishLink(result, true);
        else if (result.status === 'not-a-link') {
          setNeedsEmailCompletion(false);
          setError('Este link não é válido. Solicite um novo link por e-mail.');
        } else setError('Digite o e-mail que recebeu o link para concluir a vinculação.');
      } else {
        await sendEmailLink(email);
        setMessage('Link enviado. Abra a mensagem neste aparelho para concluir a vinculação.');
      }
    } catch (reason) {
      setError(actionError(reason));
    } finally {
      setBusy(false);
    }
  }

  function closeConflict() {
    setConflict(null);
    setConflictError(null);
    setConfirmExisting(false);
    navigate('/settings', { replace: true });
  }

  async function enterExistingAccount() {
    if (!conflict || busy) return;
    setBusy(true);
    setConflictError(null);
    // Remove the single-use action URL before AuthGate remounts this page for the new UID.
    navigate('/settings', { replace: true });
    try {
      const outcome = await signInToExistingAccount(conflict);
      if (outcome.status === 'link-resent') {
        // The single-use code was consumed while detecting the conflict; a new access link was sent.
        setConflict(null);
        setConfirmExisting(false);
        setShowEmailForm(false);
        setNeedsEmailCompletion(false);
        setMessage(
          'Como o link anterior já foi usado, enviamos um novo link de acesso ao seu e-mail. Abra a mensagem recebida para entrar na conta existente.',
        );
      }
    } catch (reason) {
      // Shown inside the open sheet: the overlay would hide a page-level error.
      setConflictError(actionError(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-space-lg pb-8">
      <div className="flex flex-col gap-1">
        <Link
          to="/dashboard"
          className="inline-flex min-h-11 w-fit items-center gap-1.5 py-1 font-label-md text-body-sm text-secondary transition-opacity active:opacity-70"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Voltar ao Dashboard
        </Link>
        <div className="mt-1 flex items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile tracking-tight">Configurações</h1>
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
              Conta e segurança dos seus dados
            </p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary shadow-sm">
            <Icon name="person" className="text-[22px]" />
          </span>
        </div>
      </div>

      <Card data-testid="account-status" className="gap-space-md p-space-lg">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-label-code text-label-code tracking-wider uppercase ${
              anonymous
                ? 'bg-secondary-fixed text-on-secondary-fixed'
                : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
            }`}
          >
            <Icon name={anonymous ? 'no_accounts' : 'check_circle'} className="text-[14px]" />
            {anonymous ? 'Conta anônima ativa' : 'Conta vinculada'}
          </span>
          {user?.uid && (
            <span className="font-label-code text-label-code break-all text-on-surface-variant">
              UID {user.uid}
            </span>
          )}
        </div>

        {anonymous ? (
          <>
            <p className="rounded-2xl bg-surface-container-low p-3 font-body-sm text-body-sm leading-snug">
              Se você perder a sessão, limpar o navegador ou trocar de aparelho sem vincular, pode perder o
              acesso aos seus dados.
            </p>
            <div className="flex flex-col gap-2.5 pt-1">
              <Button fullWidth onClick={handleGoogle} disabled={busy} className="gap-2.5">
                <GoogleIcon />
                Vincular com Google
              </Button>
              <Button
                fullWidth
                variant="neutral"
                icon="input"
                onClick={() => {
                  setShowEmailForm((visible) => !visible);
                  setError(null);
                }}
                disabled={busy}
                className="bg-secondary-fixed text-on-secondary-fixed"
              >
                Enviar link mágico por e-mail
              </Button>
            </div>
            {showEmailForm && (
              <form onSubmit={handleEmail} className="flex flex-col gap-space-sm">
                <label htmlFor="account-email" className="font-label-md text-label-md text-on-surface">
                  E-mail
                </label>
                <input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  className="h-12 w-full rounded-full border border-outline-variant bg-surface-container-lowest px-4 font-body-lg text-body-lg text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                />
                <Button type="submit" fullWidth disabled={busy || !email.trim()}>
                  {needsEmailCompletion ? 'Concluir vinculação' : 'Enviar link'}
                </Button>
              </form>
            )}
            <p className="text-center font-body-sm text-[11px] leading-tight text-on-surface-variant">
              Ao salvar sua conta, seus registros continuam atribuídos ao mesmo identificador.
            </p>
          </>
        ) : (
          <div className="rounded-2xl bg-surface-container-low p-3">
            <p className="font-label-lg text-label-lg text-on-surface">Sua conta está protegida</p>
            {linkedEmail && (
              <p className="mt-1 font-body-md text-body-md break-all text-on-surface-variant">
                {linkedEmail}
              </p>
            )}
          </div>
        )}
      </Card>

      {busy && (
        <p
          role="status"
          className="rounded-2xl bg-surface-container p-3 font-body-md text-body-md text-on-surface-variant"
        >
          Processando sua solicitação…
        </p>
      )}

      {(message || error) && (
        <p
          role={error ? 'alert' : 'status'}
          className={`rounded-2xl p-3 font-body-md text-body-md ${error ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'}`}
        >
          {error ?? message}
        </p>
      )}

      <Sheet
        open={conflict !== null}
        onClose={closeConflict}
        title="Esta conta já existe"
        description="A credencial informada já pertence a outra conta. Nada foi mesclado, substituído ou apagado."
      >
        <p className="rounded-2xl bg-surface-container-low p-3 font-body-md text-body-md text-on-surface">
          Você pode cancelar e continuar nesta conta ou entrar na conta existente.
        </p>
        {conflictError && (
          <p
            role="alert"
            className="rounded-2xl bg-error-container p-3 font-body-md text-body-md text-on-error-container"
          >
            {conflictError}
          </p>
        )}
        {confirmExisting ? (
          <>
            <p
              role="alert"
              className="rounded-2xl bg-error-container p-3 font-body-md text-body-md text-on-error-container"
            >
              Os dados desta sessão anônima ficarão inacessíveis neste navegador. Nada será apagado nem
              mesclado.
            </p>
            <Button fullWidth onClick={enterExistingAccount} disabled={busy}>
              Confirmar entrada na conta existente
            </Button>
          </>
        ) : (
          <Button fullWidth onClick={() => setConfirmExisting(true)} disabled={busy}>
            Entrar na conta existente
          </Button>
        )}
        <Button fullWidth variant="neutral" onClick={closeConflict} disabled={busy}>
          Cancelar
        </Button>
      </Sheet>
    </div>
  );
}
