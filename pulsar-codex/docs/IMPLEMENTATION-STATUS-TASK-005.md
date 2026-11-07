# Relato de implementação — task-005

**Requisito:** REQ-2-001 — Cadastro e gestão de indicadores
**Encaminhamento:** verificação independente; sem aprovação pelo implementador.

## Alterações

- Formulário completo de criação em `/indicators/new` e edição em `/indicators/:id/edit`, com as seções numeradas da referência `design/novo_indicador_modal`: classificação causal (Fator/Resultado), identificação (nome, sigla, emoji com sugestões), tipo de resposta (booleano, escala, número + unidade, ordinal com 2–8 opções), frequência diária com agregações compatíveis e direção desejável (Resultados: sem preferência, maior, menor ou faixa ideal).
- Tela `Meus Indicadores` implementada conforme `design/meus_indicadores`: seções Fatores/Resultados com chips de configuração, pílulas de filtro com contadores, menu de opções em bottom sheet (Editar parâmetros / Arquivar), seção Arquivados recolhível com Restaurar, aviso de integridade e estados vazios.
- Reordenação livre dentro de cada grupo por botões mover para cima/baixo, persistida em `sortOrder` (batch com `updatedAt` por documento).
- Congelamento estrutural após o primeiro registro: campo `firstEntryAt` no indicador (catraca nas Rules), campo de direção/faixa ideal e nome/sigla/emoji/ordem/status sempre editáveis. A UI desabilita os campos estruturais de indicadores com registros.
- Rules ampliadas: agregação booleana aceita `Presença` e `Último`; sigla e unidade aceitam vazio; faixa ideal restrita a Resultados de escala/número; `firstEntryAt` só pode ser criado com o relógio do servidor e nunca removido/regravado; congelamento compara grupo, tipo, frequência, agregação e configuração de valor com o documento existente.
- Repositório com `updateIndicator` (patches com `deleteField` para chaves que deixam de ser válidas), `archiveIndicator`, `restoreIndicator` e `reorderIndicators`; falhas de gravação são propagadas para a tela, nunca apresentadas como sucesso. O cache local por UID continua sendo camada de resiliência.
- Indicadores arquivados não aparecem nas seções ativas nem na lista do dashboard; nada é apagado (Rules continuam negando `delete` de indicadores) e o histórico permanece para as análises.

## Verificações declaradas

```bash
yarn lint
yarn typecheck
yarn test
yarn build
E2E_PORT=3115 yarn test:e2e:emulators
git diff --check -- .
```

Na rodada final: lint e typecheck sem erros; 106 testes Vitest (41 novos entre modelo, formulário e páginas); 15 testes de functions; 103 testes de Rules (15 novos de congelamento/agregação/limites, incluindo criação, catraca, edição travada e liberada); 7 testes de exclusão; build do app e functions; 85 testes Playwright (65 anteriores + fluxo real de criar/ordenar/arquivar/restaurar/editar contra Auth/Firestore emulados e reflow em 390, 430 e 1440 px). Estes são resultados declarados, não evidência de aceite nem aprovação independente.

## Decisões e limites

- O congelamento depende de `firstEntryAt`; a task-006 (REQ-2-002) deve gravá-lo no mesmo batch da primeira entrada de cada indicador. Até lá nenhum indicador real possui registros, o campo permanece nulo e todos os campos estruturais são editáveis — exatamente o comportamento esperado antes do primeiro registro. O mecanismo completo (Rules, catraca e UI travada) já está coberto por testes de Rules e Vitest.
- Os limites de tamanho validados no cliente usam bytes UTF-8 para espelhar `string.size()` das Rules; nenhuma entrada aceita pelo formulário é recusada pelo servidor por tamanho.
- A direção/faixa ideal continua editável com histórico, mudando apenas a interpretação atual, sem reescrever valores ou snapshots (especificação 4.3).
- A reordenação usa botões acessíveis em vez de arraste; o handle do design permanece como elemento visual. A ordem também permanece gravável pelas Rules para uso por outras telas.
- Nenhum indicador é excluído: arquivamento é reversível e o histórico é preservado, inclusive para as correlações futuras.

## Pendências conhecidas (fora do escopo desta task)

- O botão global “Siglas” do Header ainda é decorativo; a alternância sigla/nome é REQ-2-002 (task-006) e usará `displayAbbreviation`/`valueTypeSummary` já centralizados em `src/features/indicators/model.ts`.
- O preenchimento diário que consumirá os indicadores ativos é a própria REQ-2-002.
