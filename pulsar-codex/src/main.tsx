import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { FirebaseProvider } from '@lib/firebase/context';
import { AppShell } from '@components/layout/AppShell';
import { routes } from './routes';

import '@styles/globals.css';

const router = createBrowserRouter(routes);

const RouterApp = () => (
  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
    <RouterProvider router={router} />
  </Suspense>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FirebaseProvider>
      <AppShell>
        <RouterApp />
      </AppShell>
    </FirebaseProvider>
  </React.StrictMode>
);
