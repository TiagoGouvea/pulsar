# Relato de implementação — task-006

**Requisito:** REQ-2-002 — Registro diário e privacidade visual
**Encaminhamento:** verificação independente; sem aprovação pelo implementador.

## Alterações

- Coleção `users/{uid}/entries` implementada com valor estruturado por tipo, `localDate`, `recordedAt` de servidor, observação opcional e IDs determinísticos para frequência única.
- Tela `/registrar` baseada em `design/preenchimento_r_pido`: Fatores e Resultados, todos os quatro tipos de resposta, preenchimento de qualquer subconjunto, observação do dia, histórico completo e exclusão de qualquer registro.
- Frequência múltipla cria eventos e exibe a agregação escolhida (`Soma`, `Média`, `Último`, `Presença`); frequência única substitui o documento do dia atual. O cliente não oferece lançamento retroativo.
- Ausência, zero e `Não` são estados distintos: falta de documento, `{ number: 0 }` e `{ boolean: false }`.
- Primeiro registro grava `firstEntryAt` no mesmo batch, após reler o indicador para evitar corrida entre abas. A tela aguarda `waitForPendingWrites` e só mostra sucesso depois da confirmação; erros e pendências são explícitos.
- Estado global de privacidade em memória, iniciando em siglas, sem persistência entre aberturas. Header, dashboard, Meus Indicadores, registro e histórico ocultam nomes e emojis em modo siglas; valores e números permanecem visíveis. A conta ganhou a seção “Privacidade na Tela”.
- Rules de entradas com ownership, schema fechado, validação de tipo/faixa/opção contra o indicador, ID determinístico na frequência única, bloqueio de escrita em indicador arquivado e exclusão permitida em qualquer data.
- Documentação de segurança e decisões atualizada.

## Verificações declaradas

```bash
yarn lint
yarn typecheck
yarn test
yarn build
E2E_PORT=3115 yarn test:e2e:emulators
git diff --check -- .
```

Os resultados são declarados pelo implementador, não evidência de aceite nem aprovação independente.

## Decisões e limites

- A observação é anexada a cada resposta do envio atual, coerente com o modelo de `note` por entrada da arquitetura. A V1 não envia observações à IA.
- A validação de “dia atual” é de interface; o servidor valida apenas o formato de `localDate`, conforme a especificação 5.2. Exclusões passadas continuam disponíveis.
- A agregação diária é determinística e vive em `src/features/entries/model.ts`, pronta para o motor estatístico de REQ-3-001; nenhum insight é fabricado nesta tarefa.
- Não foi criada navegação exclusiva de desktop. O acesso ao registro parte do botão “Registrar agora” do dashboard e da rota `/registrar`.
