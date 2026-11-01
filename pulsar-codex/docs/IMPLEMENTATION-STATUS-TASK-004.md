# Relato de implementação — task-004

**Requisito:** REQ-1-003 — Isolamento, regras e exclusão segura
**Encaminhamento:** verificação independente; sem aprovação pelo implementador.

## Alterações

- Regras efetivas por UID, inclusive contas anônimas, sem acesso público ou entre contas.
- Schemas e limites-base para perfil e sugestões de indicadores, preservação de `createdAt`, proteção contra campos internos/desconhecidos e remoção indevida desses campos.
- Estado interno separado em `internal/{namespace}/{uid}/{document}`; recursos ainda não implementados permanecem fechados.
- Bloqueio privado de leitura/escrita antes da exclusão; remoção recursiva dos dados funcionais e de todos os namespaces internos do UID antes do Auth.
- Adapter Admin compartilhado pela callable de produção e pelos testes de falha/retomada. Exclusão não aceita UID nem parâmetros do cliente.
- Limpeza local somente após confirmação do mesmo UID, preservando caches com chave de outras contas. Alterações pré-existentes relacionadas a essa limpeza foram preservadas e integradas.
- Comandos de teste reproduzíveis com Auth, Firestore e Functions emulados; E2E usa as mesmas portas isoladas. Nenhuma alteração de interface, harness, orçamento ou publicação.

## Verificações declaradas

```bash
yarn install --frozen-lockfile --ignore-engines
yarn lint
yarn typecheck
yarn test
yarn build
E2E_PORT=3115 yarn test:e2e:emulators
git diff --check -- .
```

Na rodada final: 64 testes do app, 15 testes unitários das functions, 88 testes de regras e 7 testes de exclusão com emuladores; build do app/functions; 60 testes Playwright nos cinco projetos, cobrindo também reflow em 390, 430 e 1440 px. Lint e typecheck sem erros. Estes são resultados declarados, não evidência de aceite nem aprovação independente.

A suíte expôs durante a implementação o limite de avaliação das Rules para listas ordinais grandes. O limite-base foi fixado em 8 opções e tanto a criação quanto a atualização no limite máximo são verificadas positivamente, inclusive para Resultados com direção, agregação múltipla e arquivamento. Testes negativos usam timestamps válidos e configurações válidas nos demais campos para não mascarar o motivo de rejeição.

O Firebase CLI avisou que o runtime local Node 24 difere do runtime Node 22 declarado para produção e que a dependência `firebase-functions` existente tem versão mais nova disponível. Não houve migração de runtime/dependências fora do escopo nem deploy.

## Decisões e limites

- `accountDeletions/{uid}` é o único marcador retido intencionalmente, apenas com timestamps, para bloquear ID tokens ainda válidos após remover o Auth. Não é dado funcional órfão. A política está em [`SECURITY.md`](SECURITY.md).
- A futura gestão completa de indicadores deve ampliar as regras com congelamento estrutural. A abertura dos registros e demais recursos deve vir com schemas e testes próprios, preservando ownership e bloqueio de exclusão.
- Jobs/callables futuros que usam Admin SDK precisam coordenar suas gravações com o bloqueio; regras não restringem o Admin SDK.
- Exclusão e testes foram executados somente com dados sintéticos no projeto `demo-pulsar`. Produção não foi acessada ou publicada.
