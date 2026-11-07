# Configuração de autenticação

A entrada do Pulsar usa três métodos do Firebase Authentication:

1. **Anônimo** — cria o UID inicial sem cadastro permanente.
2. **Google** — vincula uma credencial ao UID anônimo atual.
3. **E-mail por link mágico** — usa o provedor E-mail/Senha apenas para o link; nenhuma senha é exibida ou solicitada na UI.

## Console do Firebase

Em **Authentication → Sign-in method**:

- habilite **Anônimo**;
- habilite **Google** e informe o e-mail de suporte;
- habilite **E-mail/senha** e mantenha o **link de e-mail** disponível. O Pulsar não oferece senha, telefone ou login por redes sociais além do Google.

Em **Authentication → Settings → Authorized domains**, inclua:

- `localhost` para desenvolvimento;
- o domínio de produção/hosting usado pelo app;
- o domínio do preview, se aplicável.

O link mágico é enviado para `/account?session=<nonce>` com `handleCodeInApp: true`. O endereço digitado, a intenção e o UID original ficam no armazenamento local do mesmo navegador; abrir o link em outro navegador, perfil ou dispositivo é recusado sem vincular, mesclar ou apagar dados.

## Desenvolvimento local

Use os emuladores e um projeto de demonstração:

```env
VITE_USE_FIREBASE_EMULATORS=true
VITE_FIREBASE_PROJECT_ID=demo-pulsar
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=demo-pulsar.firebaseapp.com
VITE_FIREBASE_APP_ID=demo-app
```

```bash
firebase emulators:start --only auth,firestore,functions --project demo-pulsar
yarn dev
```

Os testes Playwright podem iniciar os emuladores automaticamente com `yarn test:e2e:emulators`. Sem os emuladores, o shell e a tela de conta continuam renderizando, mas a criação de sessão anônima fica indisponível.

## Cloud Function de exclusão

A callable `deleteAccount` roda em `southamerica-east1` e usa o Admin SDK. Para publicar em um ambiente autorizado:

```bash
yarn build:functions
firebase deploy --only functions:deleteAccount --project <projeto>
```

A função rejeita UID enviado pelo cliente, exige autenticação recente para contas permanentes, marca a exclusão em `accountDeletions/{uid}`, remove `users/{uid}` recursivamente (inclusive subcoleções sem documento pai), remove o estado por UID em todos os namespaces `internal/{namespace}/{uid}/{document}`, e só então remove o usuário do Auth. O bloqueio mínimo de segurança é mantido para impedir recriação por tokens ainda válidos; não contém perfil, tokens ou dados funcionais. O cliente faz logout somente depois de receber `{ deleted: true, uid }` para o mesmo UID e limpa caches locais (indicadores, tutorial, convite e preferência de nomes), preservando caches com chave de outros UIDs.

As Security Rules em `firestore.rules` isolam `users/{uid}` e subcoleções por UID, validam os schemas e limites, rejeitam campos internos (quota, billing, push, idempotência) e mantêm `internal/**` e `accountDeletions/**` inacessíveis ao cliente. Enquanto o marcador de exclusão existir, o cliente não pode ler nem gravar dados daquele UID. Metadados de quota, incluindo `lastInsightRefreshAt`, devem ficar no caminho interno, não no perfil legível pelo cliente.

## Testes de emulador

```bash
yarn test:rules
yarn test:deletion:emulator
yarn test:emulators
```

Os testes exigem Java e usam `firebase.test.json` com Firestore em `8090`, Auth em `9199` e Functions em `5101`, sem alterar as portas do `firebase.json` padrão. `yarn test` executa as regras e a exclusão integral no emulador, além dos testes unitários. A suíte chama também a callable real emulada e usa o mesmo adapter Admin de produção para verificar falhas parciais. Consulte [`SECURITY.md`](SECURITY.md).

## Limites

- Não habilite limpeza automática de contas anônimas sem analisar o impacto: ela apagaria dados de quem ainda não converteu.
- A PWA pode ter armazenamento separado no iPhone; ofereça a conversão antes do convite de instalação (etapa de PWA).
- Regras de `indicators` e `entries` validam o schema, o dono, a compatibilidade de valor e o congelamento estrutural após o primeiro registro. `insights`, `savedInsights`, `insightFeedback`, `pushSubscriptions` e `dailySummaries` ficam fechadas até as tarefas dos respectivos recursos, que devem ampliar o schema ao lado do recurso.
