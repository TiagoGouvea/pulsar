import { lazy } from 'react';
import { Navigate, RouteObject } from 'react-router-dom';
import { AppShell } from '@components/layout/AppShell';

// Lazy-loaded pages
const OnboardingPage = lazy(() => import('@pages/onboarding/OnboardingPage'));
const DashboardPage = lazy(() => import('@pages/dashboard/DashboardPage'));
const IndicatorsPage = lazy(() => import('@pages/indicators/IndicatorsPage'));
const NewIndicatorPage = lazy(() => import('@pages/indicators/NewIndicatorPage'));
const EditIndicatorPage = lazy(() => import('@pages/indicators/EditIndicatorPage'));
const SavedInsightsPage = lazy(() => import('@pages/saved-insights/SavedInsightsPage'));
const AccountPage = lazy(() => import('@pages/account/AccountPage'));
const SettingsPage = lazy(() => import('@pages/settings/SettingsPage'));
const InstallPage = lazy(() => import('@pages/install/InstallPage'));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/onboarding" />
      },
      {
        path: 'onboarding',
        element: <OnboardingPage />
      },
      {
        path: 'onboarding/:step',
        element: <OnboardingPage />
      },
      {
        path: 'dashboard',
        element: <DashboardPage />
      },
      {
        path: 'indicators',
        element: <IndicatorsPage />
      },
      {
        path: 'indicators/new',
        element: <NewIndicatorPage />
      },
      {
        path: 'indicators/:id/edit',
        element: <EditIndicatorPage />
      },
      {
        path: 'saved-insights',
        element: <SavedInsightsPage />
      },
      {
        path: 'account',
        element: <AccountPage />
      },
      {
        path: 'settings',
        element: <SettingsPage />
      },
      {
        path: 'install',
        element: <InstallPage />
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" />
      }
    ]
  }
];
