import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './design/tokens.css';
import { App } from './App';
import { PrivacyProvider } from './privacy/PrivacyContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivacyProvider>
      <App />
    </PrivacyProvider>
  </StrictMode>,
);
