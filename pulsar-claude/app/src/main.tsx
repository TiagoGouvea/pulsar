import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './design/tokens.css';
import { App } from './App';

// Test-only bridge for the e2e suite. The flag is a build-time constant (vite.config.ts), so in a
// production build the whole branch — and the `__pulsarTest` global — is removed from the bundle.
if (__PULSAR_TEST_HELPER__) {
  void import('./lib/testHelper').then((module) => module.installTestHelper());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
