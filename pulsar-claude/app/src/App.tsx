import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, type RouteObject } from 'react-router';
import { AppShell } from './app/AppShell';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { Button } from './design';
import { emulatorsEnabled } from './lib/env';
import { DashboardPage } from './pages/DashboardPage';
import { HomePlaceholder } from './pages/HomePlaceholder';
import { IndicatorEditorPage } from './pages/IndicatorEditorPage';
import { IndicatorsPage } from './pages/IndicatorsPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { QuickEntryPage } from './pages/QuickEntryPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyProvider } from './privacy/PrivacyContext';

const DesignPage = lazy(() => import('./pages/DesignPage'));

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
  // Render nothing while loading (only the body background) to avoid a flash of interim content.
  if (loading) return null;
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
            <DashboardPage />
          </AppShell>
        ),
      },
      {
        path: '/register',
        element: (
          <AppShell>
            <QuickEntryPage />
          </AppShell>
        ),
      },
      {
        path: '/indicators',
        element: (
          <AppShell>
            <IndicatorsPage />
          </AppShell>
        ),
      },
      {
        path: '/indicators/new',
        element: (
          <AppShell>
            <IndicatorEditorPage mode="create" />
          </AppShell>
        ),
      },
      {
        path: '/indicators/:id/edit',
        element: (
          <AppShell>
            <IndicatorEditorPage mode="edit" />
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
            <SettingsPage />
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
