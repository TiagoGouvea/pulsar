import { SaveAccountInviteBanner } from '../account/SaveAccountInviteBanner';
import { PlaceholderPage } from './PlaceholderPage';

/**
 * Dashboard screen. It shows the discreet "save your account" invite (anonymous accounts only)
 * above the empty state that arrives with the dashboard feature.
 */
export function DashboardPage() {
  return (
    <div className="flex flex-col gap-space-lg">
      <SaveAccountInviteBanner />
      <PlaceholderPage
        title="Seu painel"
        icon="ssid_chart"
        emptyTitle="Comece registrando o seu dia"
        description="O Pulsar cruza fatores e resultados para revelar relações entre a sua rotina e como você se sente."
        cta={{ label: 'Registrar agora', to: '/register' }}
      />
    </div>
  );
}
