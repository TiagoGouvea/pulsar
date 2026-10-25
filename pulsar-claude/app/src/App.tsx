import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { emulatorsEnabled } from './lib/env';
import { HomePlaceholder } from './pages/HomePlaceholder';

const DesignPage = lazy(() => import('./pages/DesignPage'));

const routes: RouteObject[] = [
  { path: '/', element: <HomePlaceholder /> },
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
  return <RouterProvider router={router} />;
}
