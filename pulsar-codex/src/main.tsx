import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { FirebaseProvider } from '@lib/firebase/context';
import { routes } from './routes';

import '@styles/globals.css';

const router = createBrowserRouter(routes);

// AppShell is rendered by the router itself (see routes.tsx), keeping the
// Header's <Link> inside the router context.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FirebaseProvider>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">Carregando...</div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </FirebaseProvider>
  </React.StrictMode>
);
