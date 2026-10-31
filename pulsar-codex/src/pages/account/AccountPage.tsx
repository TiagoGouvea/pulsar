import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@components/ui/Button';
import { GoogleIcon } from '@components/ui/GoogleIcon';
import { useFirebase } from '@lib/firebase/context';
import { accountErrorMessage, getErrorCode } from '@features/auth/errors';

const actionClass = 'min-h-[48px] w-full';
const cardClass = 'rounded-lg bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md';

export function AccountPage() {
  const account = useFirebase();
  const { user, anonymous, isLoading, emailLinkPending } = account;
  const [email, setEmail] = useState(account.pendingEmail || user?.email || '');
  const [emailIntent, setEmailIntent] = useState<'link' | 'login' | 'reauthenticate' | null>(null);
  const [confirmation, setConfirmation] = useState<'logout' | 'delete' | null>(null);
  const [needsReauthentication, setNeedsReauthentication] = useState(false);
  const [busy, setBusy] = useState(false);
  const operationRunning = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function run(
    action: () => Promise<unknown>,
    message: string,
    onSuccess?: () => void,
    onFailure?: (failure: unknown) => void
  ) {
    if (operationRunning.current) return;
    operationRunning.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (message) setNotice(message);
      onSuccess?.();
    } catch (failure) {
      setError(accountErrorMessage(failure));
      onFailure?.(failure);
    } finally {
      setBusy(false);
      operationRunning.current = false;
    }
  }

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailIntent) return;
    void run(
      () => account.sendEmailLink(email, emailIntent),
      'Link enviado. Abra o e-mail neste mesmo navegador e perfil, mantendo esta sessão ativa. O envio ainda não concluiu a operação.'
    );
  }

  const googleLinked = user?.providerData.some((provider) => provider.providerId === 'google.com');
  const emailLinked = user?.providerData.some((provider) => provider.providerId === 'password');

  return (
    <div className="w-full max-w-xl mx-auto px-gutter py-space-lg pb-8 flex flex-col gap-space-lg">
      <div>
        <Link to="/dashboard" className="inline-flex items-center gap-1 min-h-[44px] text-secondary text-body-sm">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_back</span>
          Voltar ao Dashboard
        </Link>
        <div className="flex items-center justify-between gap-space-md">
          <div>
            <h1 className="headline-lg-mobile">Configurações e Conta</h1>
            <p className="body-sm text-on-surface-variant mt-1">Gestão de conta, identidade e dados</p>
          </div>
          <span aria-hidden="true" className="material-symbols-outlined rounded-full p-2 bg-primary-fixed text-primary">manage_accounts</span>
        </div>
      </div>

      {isLoading && <p role="status">Preparando sua sessão…</p>}
      {account.initializationError && !user && <p role="alert" className="body-sm text-error">{account.initializationError}</p>}
      {error && <div role="alert" className="rounded-2xl bg-error-container text-on-error-container p-3 body-sm flex flex-col gap-space-sm">
        <p>{error}</p>
        <button type="button" className="min-h-[44px] text-left underline underline-offset-2" onClick={() => setError('')}>
          Continuar nesta conta
        </button>
      </div>}
      {notice && <div role="status" className="rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed p-3 body-sm">{notice}</div>}
      {busy && <p role="status" className="body-sm">Aguarde a confirmação…</p>}

      <fieldset disabled={busy || isLoading} className="min-w-0 flex flex-col gap-space-lg">
        <section className={cardClass} aria-labelledby="account-status">
          <h2 id="account-status" className={`label-code rounded-full px-3 py-1 self-start ${anonymous ? 'bg-error-container text-on-error-container' : 'bg-primary-fixed text-primary'}`}>
            {user ? anonymous ? 'Conta anônima ativa' : 'Conta salva' : 'Nenhuma sessão ativa'}
          </h2>
          {user && (
            <div className="body-sm text-on-surface-variant min-w-0">
              <p className="break-all">UID: <span data-testid="account-uid">{user.uid}</span></p>
              {user.email && <p className="break-all mt-1">{user.email}</p>}
            </div>
          )}
          {anonymous ? (
            <p className="rounded-2xl bg-surface-container-low p-3 body-sm">
              Você pode usar o Pulsar sem cadastro. Seus dados ficam associados a este UID no serviço, mas o acesso depende da sessão deste navegador. Se sair, limpar os dados do navegador, perder a sessão ou trocar de dispositivo antes de vincular uma conta, poderá perder o acesso de forma irrecuperável.
            </p>
          ) : user ? (
            <p className="body-sm text-on-surface-variant">Sua conta está vinculada. O UID e os dados originais são mantidos, sem cópia ou migração de registros.</p>
          ) : (
            <p className="body-sm text-on-surface-variant">Entre em uma conta salva ou comece uma nova sessão anônima. Nenhuma conta será criada automaticamente após sair.</p>
          )}

          {emailLinkPending ? (
            <div className="flex flex-col gap-space-md">
              <h3 className="headline-md">Confirmar link mágico</h3>
              <p className="body-sm">Só confirme se você solicitou este link neste navegador e perfil. Links de vinculação nunca serão usados para entrar em outra conta ou recuperar uma sessão anônima perdida.</p>
              {account.pendingEmail && <p className="body-sm break-all">E-mail solicitado: {account.pendingEmail}</p>}
              <Button className={actionClass} onClick={() => void run(async () => {
                const intent = await account.completeEmailLink();
                setEmailIntent(null);
                setNeedsReauthentication(false);
                setNotice(intent === 'reauthenticate'
                  ? 'Identidade confirmada. Revise e confirme a exclusão novamente se quiser prosseguir.'
                  : 'Link confirmado. Sua conta está pronta para continuar.');
              }, '')}>Confirmar link mágico</Button>
              <Button variant="ghost" className={actionClass} onClick={() => {
                account.dismissEmailLink();
                setEmailIntent(null);
                setError('');
                setNotice('Link cancelado. Sua sessão e seus dados foram mantidos.');
              }}>Cancelar link</Button>
            </div>
          ) : (
            <>
              {!googleLinked && <Button
                className={actionClass}
                leftIcon={<GoogleIcon />}
                onClick={() => void run(
                  user ? account.linkGoogle : account.loginGoogle,
                  user ? 'Google vinculado. O UID e todos os seus dados foram preservados.' : 'Você entrou com Google.',
                  () => setEmailIntent(null)
                )}
              >{user ? 'Vincular com Google' : 'Entrar com Google'}</Button>}
              {!emailLinked && <Button
                variant="ghost"
                className={`${actionClass} bg-secondary-fixed text-on-secondary-fixed`}
                leftIcon={<span aria-hidden="true" className="material-symbols-outlined text-[19px]">magic_button</span>}
                onClick={() => setEmailIntent(user ? 'link' : 'login')}
              >
                {user ? 'Enviar link mágico por e-mail' : 'Entrar por link mágico'}
              </Button>}
              {!user && <Button variant="ghost" className={actionClass} onClick={() => void run(
                account.signInAnonymous,
                'Nova sessão anônima criada. Salve sua conta para não perder o acesso.',
                () => setEmailIntent(null)
              )}>
                Começar sem cadastro
              </Button>}
              {anonymous && <p className="body-sm text-on-surface-variant text-center">Ao vincular, seu identificador continua o mesmo. Se a credencial já existir, nada será mesclado, substituído ou apagado.</p>}
            </>
          )}

          {emailIntent && !emailLinkPending && (
            <form onSubmit={submitEmail} className="flex flex-col gap-space-md rounded-2xl bg-surface-container-low p-3">
              <label htmlFor="account-email" className="label-lg">{emailIntent === 'reauthenticate' ? 'E-mail da sua conta para confirmar identidade' : 'Seu e-mail'}</label>
              <input id="account-email" type="email" autoComplete="email" required maxLength={254}
                className="input-field min-h-[48px] min-w-0 w-full" value={email} onChange={(event) => setEmail(event.target.value)} />
              <p className="body-sm text-on-surface-variant">Sem senha. O link deve ser aberto neste mesmo navegador e perfil. Solicitar outro link substitui a solicitação anterior.</p>
              <Button type="submit" className={actionClass}>Enviar link</Button>
              <Button type="button" variant="ghost" className={actionClass} onClick={() => setEmailIntent(null)}>Fechar e-mail</Button>
            </form>
          )}
        </section>

        {user && !emailLinkPending && (
          <section className={cardClass} aria-labelledby="account-security">
            <h2 id="account-security" className="headline-md">Dados e segurança</h2>
            <p className="body-sm text-on-surface-variant">A exclusão é irreversível: remove registros, indicadores, insights, feedback, assinaturas de notificações e a conta. Sair não exclui dados.</p>
            <Button variant="ghost" className={`${actionClass} bg-surface-container-low`} onClick={() => setConfirmation('logout')}>Sair</Button>
            <Button variant="ghost" className={`${actionClass} bg-error-container text-on-error-container`} onClick={() => setConfirmation('delete')}>Excluir conta e todos os dados</Button>

            {confirmation && (
              <div role="alertdialog" aria-labelledby="account-confirmation" aria-describedby="account-confirmation-description" className="rounded-2xl bg-surface-container-low p-3 flex flex-col gap-space-md">
                <h3 id="account-confirmation" className="label-lg">{confirmation === 'delete' ? 'Excluir definitivamente?' : 'Sair desta sessão?'}</h3>
                <p id="account-confirmation-description" className="body-sm">
                  {confirmation === 'delete'
                    ? 'Todos os seus dados serão removidos antes da exclusão da identidade. Não é possível desfazer. Uma falha parcial não será apresentada como sucesso; tente novamente para concluir a limpeza.'
                    : anonymous ? 'Esta conta ainda é anônima. Ao sair, você perde o acesso aos dados. Cancele e vincule Google ou e-mail primeiro se quiser mantê-los acessíveis.' : 'Você poderá voltar usando o Google ou o link mágico da sua conta.'}
                </p>
                <Button variant="ghost" className={`${actionClass} bg-error-container text-on-error-container`} onClick={() => void run(
                  confirmation === 'delete' ? account.deleteAccount : account.signOutUser,
                  confirmation === 'delete' ? 'Conta e todos os dados excluídos.' : 'Você saiu da conta.',
                  () => { setConfirmation(null); setNeedsReauthentication(false); setEmailIntent(null); setEmail(''); },
                  (failure) => {
                    if (['auth/requires-recent-login', 'functions/failed-precondition'].includes(getErrorCode(failure))) {
                      setNeedsReauthentication(true);
                    }
                  }
                )}>{confirmation === 'delete' ? 'Excluir definitivamente' : 'Confirmar saída'}</Button>
                <Button variant="ghost" className={actionClass} onClick={() => { setConfirmation(null); setNeedsReauthentication(false); }}>Cancelar</Button>
              </div>
            )}

            {needsReauthentication && (
              <div className="flex flex-col gap-space-md rounded-2xl bg-primary-fixed p-3">
                <h3 className="label-lg">Confirme sua identidade</h3>
                <p className="body-sm">Use uma credencial desta mesma conta. Após confirmar, a exclusão ainda exige sua ação explícita.</p>
                {googleLinked && <Button className={actionClass} onClick={() => void run(
                  account.reauthenticateGoogle,
                  'Identidade confirmada. Confirme a exclusão novamente para prosseguir.',
                  () => setNeedsReauthentication(false)
                )}>Confirmar com Google</Button>}
                {emailLinked && <Button className={actionClass} onClick={() => {
                  setEmail(user.email || '');
                  setEmailIntent('reauthenticate');
                }}>Confirmar por link mágico</Button>}
              </div>
            )}
          </section>
        )}
      </fieldset>
    </div>
  );
}

export default AccountPage;
