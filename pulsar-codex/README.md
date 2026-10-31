# Pulsar Codex

Aplicação Pulsar desenvolvida pelo harness localizado em `../harness-codex`.

As especificações ficam em `../harness-codex/docs`, as referências visuais em `../design` e o Firebase de desenvolvimento usa o projeto `pulsar-codex`.

## Estado atual

Etapa 1 — Base: entrada por Firebase Anonymous Authentication, conversão para Google ou link mágico preservando UID, logout, exclusão integral via Cloud Function, tutorial de três telas com conclusão persistida e dashboard inicial com sugestões opcionais. A interface é mobile-first em pt-BR, com alvos de 390 px e 430 px; telas largas apenas refluem o mesmo conteúdo.

## Comandos

```bash
yarn install       # instala o app e as dependências da Cloud Function
yarn dev           # servidor de desenvolvimento
yarn lint          # ESLint
yarn typecheck     # TypeScript do app e das functions
yarn test          # Vitest + testes das functions
yarn build         # build de produção (app + functions)
yarn test:e2e      # Playwright
```

Para testar o fluxo de autenticação local, habilite os emuladores em `.env`:

```env
VITE_USE_FIREBASE_EMULATORS=true
VITE_FIREBASE_PROJECT_ID=demo-pulsar
VITE_FIREBASE_API_KEY=demo-api-key
```

Depois inicie `firebase emulators:start --only auth,firestore,functions --project demo-pulsar` ou use `yarn test:e2e:emulators`. O passo a passo dos provedores está em [`docs/AUTH-SETUP.md`](docs/AUTH-SETUP.md).
