import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, type RouteObject } from 'react-router';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { Button } from './design';
import { emulatorsEnabled } from './lib/env';
import { HomePlaceholder } from './pages/HomePlaceholder';
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
      {
        path: '/onboarding',
        element: (
          <HomePlaceholder title="Boas-vindas ao Pulsar">
            <p className={textClass}>
              Registre o que você faz e descubra possíveis relações com como você se sente.
            </p>
          </HomePlaceholder>
        ),
      },
      {
        path: '/dashboard',
        element: (
          <HomePlaceholder title="Seu painel">
            <p className={textClass}>Seus indicadores e registros aparecerão aqui.</p>
          </HomePlaceholder>
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
