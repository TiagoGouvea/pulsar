# Status de Implementação - Task-002

**Tarefa:** Entrada anônima e conversão de conta (REQ-1-001)  
**Data:** 31/10/2026

## Entregue

- Criação de sessão anônima com persistência local e proteção contra duplicação, links pendentes e recriação após logout explícito.
- Conversão por Google (`linkWithPopup`) e link mágico (`linkWithCredential`) usando apenas APIs de vinculação.
- Verificação do UID antes e depois de cada vinculação/reauth; conflito de credencial não faz login por cima, não mescla, não substitui e não apaga dados.
- Contexto de link mágico com e-mail, UID original, intenção (`link`, `login`, `reauthenticate`) e nonce de sessão; links abertos em outro navegador/perfil são recusados.
- Tela de conta com aviso de risco da sessão anônima, CTAs de conversão, mensagem explícita de conflito com ação “Continuar nesta conta”, logout e exclusão.
- Cloud Function `deleteAccount` (região `southamerica-east1`) que exige autenticação recente para contas permanentes, ignora UID enviado pelo cliente, marca a exclusão, remove recursivamente `users/{uid}`, remove o usuário do Auth e limpa o marcador. O cliente só faz logout depois da confirmação do servidor.
- Reautenticação por Google ou link mágico na própria tela quando o servidor exige login recente.
- Testes: sessão (27), onboarding inicial (2), tela de conta (7), Cloud Function (9); E2E 40/40.
- Desenvolvimento local com emuladores opt-in; build/test das functions integrados aos comandos do harness.

## Verificações executadas

```bash
yarn lint
yarn typecheck
yarn test
yarn build
E2E_PORT=3115 yarn test:e2e
```

Resultado: lint e typecheck sem erros; 49 testes Vitest + 9 testes das functions; build de app e functions concluído; E2E 40/40 em Chromium, Firefox, WebKit, Pixel 7 e iPhone 15.

## Limites deste bloco

- Firestore Security Rules de isolamento por UID e testes de emulador pertencem a REQ-1-003 (task-004).
- A exclusão de dados fora de `users/{uid}`/Auth deve ser ampliada quando as demais coleções forem implementadas.
