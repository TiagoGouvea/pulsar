# Decisões Técnicas do Projeto Pulsar

**Data:** 25/10/2026  
**Task:** task-001 - Scaffold, design system e base mobile-only

## 1. Stack Tecnológica

### Framework e linguagem
- **React 19.0.0**: Framework principal, compatível com React Server Components futuras
- **TypeScript 5.8.x**: Tipagem estrita com modo `strict` ativado

### Build tools
- **Vite 6.4.x**: Build tool e dev server moderno com HMR rápido
- **Tailwind CSS 4.x**: Sistema de design com CSS-first configuration

### Dependências
- **Firebase 11.3.x**: Auth, Firestore, Hosting, Functions
- **React Router DOM 7.1.x**: Roteamento SPA
- **Zustand 5.0.x**: Gestão de estado leve (opcional para futuras necessidades)
- **clsx 2.1.x**: Utilitário para classes condicionais

### Testes
- **Vitest 3.x**: Testes unitários e componentes com API Jest-like
- **Playwright 1.50.x**: Testes E2E com suporte mobile simulado

### Linting e qualidade
- **ESLint 9.x**: Linting com regras estritas
- **Prettier 3.x**: Formatação de código
- **@tailwindcss/postcss**: Plugin PostCSS para Tailwind CSS v4

## 2. Estrutura de Diretórios

```
pulsar-codex/
├── src/
│   ├── assets/              # Imagens, ícones, fontes
│   │   ├── icons/
│   │   └── images/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── ui/             # Componentes de UI base
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Chip.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Heading.tsx
│   │   │   ├── Text.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── Toggle.tsx
│   │   ├── layout/         # Layouts e shells
│   │   │   ├── AppShell.tsx
│   │   │   └── Header.tsx
│   │   └── indicators/     # Componentes de indicadores (futuro)
│   ├── features/           # Feature modules (futuro)
│   │   ├── auth/
│   │   ├── indicators/
│   │   ├── dashboard/
│   │   └── entries/
│   ├── pages/              # Páginas/rotas
│   │   ├── onboarding/
│   │   │   ├── OnboardingPage.tsx
│   │   │   ├── OnboardingStep1.tsx
│   │   │   ├── OnboardingStep2.tsx
│   │   │   └── OnboardingStep3.tsx
│   │   ├── dashboard/
│   │   ├── indicators/
│   │   ├── saved-insights/
│   │   ├── account/
│   │   ├── settings/
│   │   └── install/
│   ├── hooks/              # Hooks personalizados
│   │   └── useFirebase.ts
│   ├── lib/                # Utilitários e bibliotecas
│   │   ├── firebase/       # Configuração e helpers Firebase
│   │   │   ├── config.ts
│   │   │   ├── context.tsx
│   │   │   ├── hooks.ts
│   │   │   └── utils.ts
│   │   ├── design/         # Design tokens e tipografia
│   │   │   ├── tokens.ts
│   │   │   └── typography.ts
│   │   └── utils/          # Utilitários gerais
│   │       ├── date.ts
│   │       └── validation.ts
│   └── styles/             # Estilos globais
│       └── globals.css
├── tests/
│   ├── e2e/                # Testes Playwright
│   └── setup.ts            # Configuração Vitest
├── public/                 # Arquivos estáticos
├── dist/                   # Build output
├── docs/                   # Documentação do projeto
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── tailwind.config.ts
```

## 3. Design System

### Cores (Theme Pulsar)
Baseado nas cores do design oficial exportado de Figma:

- **Primary (Pulsar brand)**: `#630ed4` (roxo intenso)
- **Primary Container**: `#7c3aed`
- **Secondary**: `#0051d5` (azul)
- **Tertiary**: `#005b3d` (verde)

### Tipografia
- **Headings**: Space Grotesk (Google Fonts)
- **Body**: Geist (Google Fonts)
- **Label Code**: Geist (monoespaçado)

### Variáveis CSS

```css
:root {
  /* Cores */
  --primary: #630ed4;
  --secondary: #0051d5;
  --tertiary: #005b3d;
  --background: #faf8ff;
  --surface: #faf8ff;
  --on-surface: #131b2e;
  
  /* Tipografia */
  --font-family-headline-lg-mobile: 'Space Grotesk', sans-serif;
  --font-family-body-md: 'Geist', sans-serif;
  
  /* Espaçamento */
  --gutter: 1rem;
  --space-md: 0.75rem;
}
```

### Classes CSS utilitárias
- `.headline-lg-mobile`, `.headline-md`, `.body-lg`, `.body-md`, `.body-sm`
- `.label-lg`, `.label-md`, `.label-code`, `.stat-display`
- `.chip-primary`, `.chip-secondary`, `.chip-tertiary`, `.chip-surface`
- `.btn-primary`, `.btn-secondary`, `.btn-tertiary`, `.btn-text`
- `.card`, `.card-hover`
- `.input-field`
- `.mobile-only`, `.desktop-only`

## 4. Arquitetura Firebase

### Autenticação
- **Anonymous**: Primeiro acesso sem cadastro
- **Google**: Conversão para conta permanente
- **Email Link**: Conversão alternativa (passwordless)

### Firestore
Estrutura de coleções:

```
users/{uid}
├── indicators/{indicatorId}
├── entries/{entryId}
├── insights/{insightId}
├── savedInsights/{savedInsightId}
├── insightFeedback/{feedbackId}
├── pushSubscriptions/{deviceId}
└── dailySummaries/{yyyyMMdd}
```

### Hooks Firebase Personalizados
- `useFirebase`: Contexto global de autenticação
- `useUserDoc`: Listener em documento de usuário
- `useIsFirstVisit`: Verifica se é primeira visita
- `useOnboardingStatus`: Verifica status do onboarding
- `useNameRevealed`: Gerencia modo de discrição visual

## 5. Roteamento

```
/                     → Redirect para /onboarding
/onboarding           → OnboardingPage (página inicial)
/onboarding/1         → OnboardingStep1 (Fatores)
/onboarding/2         → OnboardingStep2 (Resultados)
/onboarding/3         → OnboardingStep3 (Privacidade)
/dashboard            → DashboardPage
/indicators           → IndicatorsPage
/indicators/new       → NewIndicatorPage
/indicators/:id/edit  → EditIndicatorPage
/saved-insights       → SavedInsightsPage
/account              → AccountPage
/settings             → SettingsPage
/install              → InstallPage
```

## 6. Responsividade

### Alvos principais
- **Mobile (390px)**: Samsung Galaxy S20, iPhone 12/13/14
- **Mobile LG (430px)**: iPhone 14 Pro Max, Pixel 7 Pro
- **Desktop (1440px)**: Laptop 14"

### Comportamento
- **Mobile**: Layout vertical exclusivo, touch targets mínimos 44px
- **Desktop**: Apenas reflow (largura fluida/máxima, empilhamento de blocos)
- **Sem navegação desktop**: Mesmo layout mobile com reflow simples

### Breakpoints CSS
```css
.mobile-only {
  display: block;
}
@media (min-width: 1024px) {
  .mobile-only { display: none !important; }
}

.desktop-only {
  display: none;
}
@media (min-width: 1024px) {
  .desktop-only { display: block !important; }
}
```

## 7. Estrutura de Testes

### Vitest
- Testes unitários de componentes e utilitários
- Suporte a React Testing Library
- Coverage report com V8

### Playwright
- Testes E2E com suporte mobile simulado
- 6 configurações: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- Screenshot automático em falha

### Comandos
```bash
yarn test              # Executar todos os testes
yarn test:watch        # Testes em modo watch
yarn test:e2e          # Testes Playwright E2E
yarn test:ui           # Interface visual de testes
```

## 8. Comandos do Projeto

```bash
yarn dev        # Dev server (http://localhost:3000)
yarn build      # Build de produção
yarn preview    # Preview do build
yarn lint       # Executar ESLint
yarn lint:fix   # Corrigir erros de lint
yarn test       # Testes unitários
yarn test:e2e   # Testes E2E
```

## 9. Variáveis de Ambiente

O arquivo `.env.example` define as variáveis necessárias:

```env
VITE_FIREBASE_PROJECT_ID=pulsar-codex
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

## 10. Considerações de Segurança

- Nenhuma credencial é versionada (`.gitignore` protege arquivos sensíveis)
- Firebase Auth usa regras de segurança baseadas em UID
- Security Rules em `firestore.rules` devem ser implementadas na próxima etapa
- Consentimento explícito para IA e push notifications

## 11. Próximos Passos

1. Implementar Security Rules do Firestore (REQ-1-002)
2. Implementar estado do usuário e persistência (REQ-2-001)
3. Criar componentes de registro (REQ-2-002)
4. Implementar motor estatístico (REQ-3-001)
5. Dashboard e insights (REQ-3-002)

---

**Status:** ✅ Scaffold completo, design system implementado, base mobile-only funcional  
**Build:** ✅ Passando  
**Testes:** ⏳ A serem implementados na etapa seguinte
