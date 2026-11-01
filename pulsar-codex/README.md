# Pulsar Codex

Aplicação Pulsar desenvolvida pelo harness localizado em `../harness-codex`.

As especificações ficam em `../harness-codex/docs`, as referências visuais em `../design` e o Firebase de desenvolvimento usa o projeto `pulsar-codex`.

## Estado atual

Etapa 1 — Base: entrada por Firebase Anonymous Authentication, conversão para Google ou link mágico preservando UID, logout, exclusão integral via Cloud Function, tutorial de três telas com conclusão persistida e dashboard inicial com sugestões opcionais. O Firestore tem isolamento por UID, proteção de campos internos, limites de schema e testes de emulador; a exclusão remove a árvore inteira e só então o usuário do Auth. A interface é mobile-first em pt-BR, com alvos de 390 px e 430 px; telas largas apenas refluem o mesmo conteúdo.

## Comandos

```bash
yarn install       # instala o app e as dependências da Cloud Function
yarn dev           # servidor de desenvolvimento
yarn lint          # ESLint
yarn typecheck     # TypeScript do app e das functions
yarn test          # Vitest + functions + regras/exclusão nos emuladores
yarn build         # build de produção (app + functions)
yarn test:rules    # somente Security Rules no emulador Firestore
yarn test:deletion:emulator  # exclusão integral com Auth + Firestore
yarn test:emulators          # regras + exclusão no mesmo emulador
yarn test:e2e      # Playwright
```

Os testes de emulador exigem Java e usam `firebase.test.json` (Firestore em
`8090`, Auth em `9199` e Functions em `5101`), apenas com dados sintéticos no
projeto `demo-pulsar`. O `firebase.json` de produção/hosting não é alterado.
O contrato de segurança e a retenção mínima do bloqueio de exclusão estão em
[`docs/SECURITY.md`](docs/SECURITY.md).

Para testar o fluxo de autenticação local, habilite os emuladores em `.env`:

```env
VITE_USE_FIREBASE_EMULATORS=true
VITE_FIREBASE_PROJECT_ID=demo-pulsar
VITE_FIREBASE_API_KEY=demo-api-key
```

Depois inicie `firebase emulators:start --only auth,firestore,functions --project demo-pulsar` ou use `yarn test:e2e:emulators`. As regras e a exclusão são verificadas por `yarn test:emulators`. O passo a passo dos provedores está em [`docs/AUTH-SETUP.md`](docs/AUTH-SETUP.md) e as decisões em [`docs/DECISIONS.md`](docs/DECISIONS.md).
