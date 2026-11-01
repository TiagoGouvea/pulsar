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
- **Warning**: `#f59e0b` (âmbar, baixa confiança/amostras pequenas)
- **Surface Tint**: `#732ee4` · **Inverse Primary**: `#d2bbff`

**Autoridade da paleta:** o front matter do `design/pulsar_bio_analytics/DESIGN.md` é a fonte canônica dos tokens (cores, tipografia, raios e espaçamentos); cores nomeadas apenas na narrativa entram como tokens semânticos aditivos (ex.: `warning`). Valores numéricos usam algarismos tabulares (`font-variant-numeric: tabular-nums` em `.stat-display`), conforme a regra de Tabular Figures do design oficial. Raios `sm` (0.5rem) e `md` (1.5rem) do front matter também são expostos como tokens.

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

1. Security Rules do Firestore, isolamento por UID e testes de emulador (REQ-1-003, task-004)
2. Cadastro e gestão de indicadores (REQ-2-001, task-005)
3. Registro diário e privacidade visual (REQ-2-002, task-006)

## 12. Task-002 — Entrada anônima e conversão de conta (31/10/2026)

### Sessão e conversão
- A sessão é criada por `signInAnonymously` com `browserLocalPersistence`; a inicialização é memoizada para impedir UIDs duplicados em montagens concorrentes e não cria usuário enquanto um link mágico está pendente ou depois de logout explícito (`pulsar.auth.signedOut`).
- Google e link mágico usam somente `linkWithPopup`/`linkWithCredential` no usuário corrente. O UID é comparado antes e depois; um resultado com outro UID é interrompido (`account/uid-mismatch`). Nunca há fallback para `signInWithPopup`/`signInWithEmailLink` durante a conversão.
- O contexto do link mágico guarda e-mail, UID original, intenção (`link`, `login`, `reauthenticate`) e nonce de sessão na URL. O link só é aceito no mesmo navegador/perfil e na mesma sessão; abrir em outro dispositivo não vincula nem transfere dados.
- Conflitos de credencial (`auth/credential-already-in-use`, `auth/email-already-in-use`, `auth/account-exists-with-different-credential`) propagam o erro sem tocar em UID, sessão, dados ou credenciais. A tela explica que nada foi mesclado/substituído/apagado e oferece “Continuar nesta conta”.

### Logout, reautenticação e exclusão
- `logout` grava primeiro o marcador de saída e só então chama `signOut`; uma falha remove o marcador. A recriação anônima exige ação explícita (“Começar sem cadastro”).
- A exclusão é uma callable `deleteAccount` em `southamerica-east1`. O servidor ignora qualquer UID do cliente, exige `auth_time` recente (até 300 s) para contas permanentes, marca a exclusão, remove recursivamente `users/{uid}`, remove o usuário do Auth e limpa o marcador. Falhas preservam o marcador e nunca são reportadas como sucesso.
- O cliente só faz logout depois de receber `deleted: true` para o mesmo UID. `auth/requires-recent-login`/`functions/failed-precondition` exibem reautenticação por Google ou link mágico; a reautenticação não exclui sozinha — a confirmação é repetida.
- A tela de conta segue a referência mobile de `design/configura_es_e_conta` e reflui em largura máxima, sem navegação ou desenho exclusivo de desktop.

### Operação
- `functions/` é um pacote separado; o `postinstall` do app instala suas dependências para que `yarn install`, `yarn test`, `yarn typecheck` e `yarn build` funcionem em checkout limpo.
- O desenvolvimento local usa emuladores opt-in (`VITE_USE_FIREBASE_EMULATORS=true`); produção nunca conecta emuladores.

## 13. Task-003 — Onboarding e estado inicial (31/10/2026)

### Tutorial e persistência
- O tutorial mantém três telas (Fatores, Resultados e Associações), com Próximo e Voltar entre etapas e Pular encerrando o fluxo em qualquer tela. A terceira tela segue `design/onboarding_3_associacoes` e apresenta uma associação de exemplo com aviso explícito de que correlação não implica causalidade.
- A conclusão é gravada em `users/{uid}` com `onboardingCompleted: true` e também em marcador local por UID. A gravação local é deliberadamente anterior à remota: se o Firestore estiver indisponível ou as Security Rules ainda negarem a escrita, o tutorial continua concluído e o app não fica bloqueado.
- A rota raiz só redireciona para `/dashboard` quando a conclusão é conhecida; sem conclusão, o primeiro acesso permanece em `/onboarding`.

### Estado inicial
- O dashboard vazio oferece quatro sugestões e a ação “Criar meu próprio indicador”. Nenhuma escrita de indicador acontece na montagem; a criação é sempre disparada por um clique explícito.
- As sugestões usam o modelo estruturado (`group`, `valueType`, `frequency`, `dailyAggregation`, direção/faixa ideal) e o cache local por UID mantém a tela utilizável enquanto as regras de isolamento da task-004 não existem.
- O convite para salvar a conta é inline, aparece somente após interação útil, pode ser dispensado e não usa modal, foco preso ou bloqueio de navegação. Contas permanentes não recebem o convite.

---

## 14. Task-004 — Isolamento e exclusão segura

- Isolamento por UID, schemas e limites-base, recursos futuros fechados e estado sensível separado em `internal/{namespace}/{uid}/{document}`.
- Exclusão recursiva dos dados funcionais e internos antes do Auth; falhas não declaram sucesso e podem ser retomadas explicitamente.
- Diferentemente da decisão inicial da task-002, o marcador privado mínimo de exclusão é mantido após a conclusão, para impedir recriação por ID token ainda válido. Contém somente timestamps, não dados funcionais.
- Ordinais têm limite-base de 8 opções, com criação e atualização no limite testadas dentro da capacidade de avaliação das Rules.
- Suítes reais de regras, Auth/Firestore/Functions e callable emulada fazem parte de `yarn test`; E2E usa portas isoladas. Nenhuma aprovação ou deploy é feito pelo implementador.
- Contrato detalhado e limites: [`SECURITY.md`](SECURITY.md). Relato das verificações: [`IMPLEMENTATION-STATUS-TASK-004.md`](IMPLEMENTATION-STATUS-TASK-004.md).

---

**Status anterior à task-004:** ✅ Task-001 concluída; task-002 (entrada anônima e conversão) e task-003 (onboarding e estado inicial) prontas para verificação
**Build:** ✅ Passando (app + functions)  
**Testes:** ✅ 61 Vitest + 9 functions; E2E 60/60 nos cinco projetos
