import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, type RouteObject } from 'react-router';
import { AppShell } from './app/AppShell';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { Button } from './design';
import { emulatorsEnabled } from './lib/env';
import { HomePlaceholder } from './pages/HomePlaceholder';
import { OnboardingPage } from './pages/OnboardingPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PrivacyProvider } from './privacy/PrivacyContext';

const DesignPage = lazy(() => import('./pages/DesignPage'));
const textClass = 'font-body-lg text-body-lg text-on-surface-variant';

// App routes only render once the anonymous session and users/{uid} are ready; errors never look like success.
function AuthGate() {
  const { loading, error } = useAuth();
  if (error)
    return (
      <HomePlaceholder>
        <p role="alert" className="font-body-lg text-body-lg text-error">
          {error}
        </p>
        <Button className="mt-4 self-start" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </HomePlaceholder>
    );
  if (loading)
    return (
      <HomePlaceholder>
        <p role="status" className={textClass}>
          Preparando seu espaço…
        </p>
      </HomePlaceholder>
    );
  return <Outlet />;
}

function RootRedirect() {
  const { profile } = useAuth();
  return <Navigate to={profile?.onboardingCompleted ? '/dashboard' : '/onboarding'} replace />;
}

const routes: RouteObject[] = [
  {
    element: (
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    ),
    children: [
      { path: '/', element: <RootRedirect /> },
      { path: '/onboarding', element: <OnboardingPage /> },
      {
        path: '/dashboard',
        element: (
          <AppShell>
            <PlaceholderPage
              title="Seu painel"
              icon="ssid_chart"
              emptyTitle="Comece registrando o seu dia"
              description="O Pulsar cruza fatores e resultados para revelar relações entre a sua rotina e como você se sente."
              cta={{ label: 'Registrar agora', to: '/register' }}
            />
          </AppShell>
        ),
      },
      {
        path: '/register',
        element: (
          <AppShell>
            <PlaceholderPage
              title="Registrar"
              icon="edit_note"
              emptyTitle="Preenchimento rápido"
              description="Escolha os fatores e os resultados do dia e registre em poucos segundos."
            />
          </AppShell>
        ),
      },
      {
        path: '/indicators',
        element: (
          <AppShell>
            <PlaceholderPage
              title="Meus indicadores"
              icon="tune"
              emptyTitle="Nenhum indicador ainda"
              description="Crie seus indicadores para acompanhar fatores e resultados ao longo do tempo."
              headerAction={{ label: 'Novo Indicador', to: '/indicators/new' }}
            />
          </AppShell>
        ),
      },
      {
        path: '/indicators/new',
        element: (
          <AppShell>
            <PlaceholderPage
              title="Novo Indicador"
              icon="tune"
              emptyTitle="Em breve"
              description="A criação de indicadores chega em breve."
            />
          </AppShell>
        ),
      },
      {
        path: '/saved-insights',
        element: (
          <AppShell>
            <PlaceholderPage
              title="Conclusões salvas"
              icon="lightbulb"
              emptyTitle="Nenhuma conclusão salva"
              description="Curta um insight para guardá-lo aqui e revisitar quando quiser."
            />
          </AppShell>
        ),
      },
      {
        path: '/settings',
        element: (
          <AppShell>
            <PlaceholderPage
              title="Configurações"
              icon="person"
              emptyTitle="Sua conta e preferências"
              description="Gerencie sua conta, sua privacidade visual e seus dados aqui."
            />
          </AppShell>
        ),
      },
    ],
  },
  ...(emulatorsEnabled
    ? [
        {
          path: '/_design',
          element: (
            <Suspense fallback={null}>
              <DesignPage />
            </Suspense>
          ),
        },
      ]
    : []),
];

const router = createBrowserRouter(routes);

export function App() {
  return (
    <PrivacyProvider>
      <RouterProvider router={router} />
    </PrivacyProvider>
  );
}
