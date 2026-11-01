import { Link } from 'react-router-dom';
import { MaterialIcon } from '@components/ui/MaterialIcon';

interface AccountSaveInviteProps {
  onDismiss: () => void;
}

export function AccountSaveInvite({ onDismiss }: AccountSaveInviteProps) {
  return (
    <section
      aria-labelledby="account-save-invite-title"
      className="rounded-lg border border-secondary-fixed-dim bg-secondary-fixed/40 p-space-md flex flex-col gap-space-sm"
    >
      <div className="flex items-start gap-space-sm">
        <span className="w-9 h-9 rounded-full bg-surface-container-lowest text-secondary flex items-center justify-center shrink-0" aria-hidden="true">
          <MaterialIcon name="lock" size={20} />
        </span>
        <div className="flex flex-col gap-space-xs min-w-0">
          <h2 id="account-save-invite-title" className="font-label-lg text-label-lg text-on-surface">
            Quer manter seus indicadores?
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Sua conta ainda é anônima. Salve com Google ou link mágico para não perder o acesso ao trocar de navegador ou aparelho. Você pode continuar usando o Pulsar normalmente.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-space-sm">
        <Link
          to="/account"
          className="min-h-[44px] px-space-lg rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          Salvar minha conta
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-[44px] px-space-md rounded-full text-on-surface-variant font-label-lg text-label-lg hover:bg-surface-container-lowest/70 transition-colors"
        >
          Agora não
        </button>
      </div>
    </section>
  );
}

export default AccountSaveInvite;
