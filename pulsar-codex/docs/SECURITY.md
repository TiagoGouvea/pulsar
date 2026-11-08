# Isolamento e exclusão segura — task-004 / REQ-1-003

## Contrato de armazenamento e regras

- Dados funcionais vivem exclusivamente em `users/{uid}` e seus descendentes. O UID do caminho deve ser o de `request.auth.uid`, inclusive em sessões anônimas. Não há compartilhamento público nem regra recursiva permissiva.
- Perfil e sugestões de indicadores já existentes têm schemas de campos permitidos, tipos, limites e timestamps de commit. Campos desconhecidos são negados em criação, alteração e remoção. `createdAt` não pode ser reescrito nem removido.
- Limites-base de indicadores: nome 80 caracteres, sigla/emoji 8, unidade 24, ordinal de 2 a 8 opções (ID 64, rótulo 120), valores/configuração numérica entre -1.000.000 e 1.000.000. O teto ordinal de 8 é uma decisão técnica desta base: permite validar todas as posições em criação **e** atualização, inclusive em Resultados com direção, agregação múltipla e arquivamento, dentro do limite de 1.000 expressões das Rules. O limite deve ser mantido ou reavaliado com testes positivos no recurso completo de indicadores; não basta testar rejeições.
- Quota, billing, estado de entrega push e idempotência ficam fora dos documentos legíveis: `internal/{namespace}/{uid}/{document}`, com subcoleções opcionais. Isso inclui a coleção de quota `internal/userQuotas/{uid}` do modelo sugerido. Nunca guardar estado pessoal diretamente no documento de namespace compartilhado nem em mapas compartilhados por vários UIDs.
- `lastInsightRefreshAt` é estado de execução do servidor, não um mecanismo de quota editável pelo cliente. Deve ser armazenado no namespace interno quando o recurso de IA for implementado.
- `internal/**`, `accountDeletions/**`, assinaturas push e recursos ainda não implementados negam leitura e escrita por clientes. Admin SDK ignora as regras; futuros jobs/callables devem verificar o bloqueio de exclusão antes de gravar e coordenar operações em andamento com ele.
- Indicadores são arquivados, não apagados individualmente. O congelamento estrutural após o primeiro registro é garantido pela catraca `firstEntryAt` de REQ-2-001/REQ-2-002.
- Registros em `users/{uid}/entries/{entryId}` têm schema fechado: `indicatorId`, `localDate` (`YYYY-MM-DD`), `recordedAt` de servidor, `valueType`, um `value` estruturado (`boolean`, `number` ou `optionId`) e `note` opcional de até 500 bytes. O tipo, a faixa de escala/número e a opção ordinal precisam corresponder ao indicador referenciado, que não pode estar arquivado. Frequência única exige ID determinístico `indicatorId_localDate`; frequência múltipla aceita IDs únicos. Exclusão é permitida pelo dono para qualquer data e não desfaz a trava `firstEntryAt`. Insights, snapshots, feedback e resumos continuam fechados até as tarefas correspondentes.

## Exclusão integral

1. A callable `deleteAccount` usa apenas o UID autenticado e rejeita qualquer parâmetro. Contas permanentes exigem `auth_time` de até 300 segundos. O provedor real é consultado no Auth, para não confundir conta vinculada com uma claim anônima antiga.
2. Grava `accountDeletions/{uid}` antes da limpeza. As regras bloqueiam leituras e escritas do UID durante e após a operação, sem afetar outros usuários.
3. `recursiveDelete(users/{uid})` remove registros, indicadores, insights, feedback, conclusões, tokens, preferências, resumos e quaisquer subcoleções futuras, inclusive sob pais ausentes.
4. Enumera namespaces de `internal` com `listDocuments` (inclui pais ausentes) e remove recursivamente **somente a coleção do UID** em cada um. Não apaga os namespaces compartilhados nem dados de outros UIDs.
5. Somente após as duas limpezas, remove o usuário do Firebase Auth e registra `completedAt` no bloqueio.
6. O cliente só limpa caches locais e sai após confirmação de exclusão do mesmo UID. Caches com chave de outros UIDs são preservados.

Falhas interrompem o fluxo sem declarar sucesso. O Auth não é removido se a limpeza falhar. Uma nova confirmação explícita repete as operações idempotentes; ausência de usuário no Auth é tolerada somente com token recente na retomada. Não há retry automático ou rollback que reabra o acesso.

### Marcador de segurança não é dado funcional órfão

O único documento intencionalmente retido é `accountDeletions/{uid}`, contendo apenas timestamps `startedAt` e `completedAt`, sem perfil, conteúdo, quota, billing ou tokens. Removê-lo logo após apagar o Auth permitiria que um ID token já emitido, ainda válido por até uma hora, recriasse a árvore. O bloqueio privado não é legível nem removível pelo cliente e não libera o UID novamente. Não configurar TTL nesse documento sem um mecanismo equivalente contra tokens antigos e novas tentativas concorrentes. Uma eventual política de retenção/purga desse identificador de segurança requer decisão própria.

## Testes reproduzíveis

```bash
yarn test:rules                # regras reais no Firestore emulado
yarn test:deletion:emulator    # adapter de produção + callable real emulada
yarn test:emulators            # ambas as suítes no mesmo ciclo
yarn test                     # app, functions e emuladores
yarn lint
yarn typecheck
yarn build
yarn test:e2e:emulators       # regressão do layout e fluxos existentes
```

Requer Node e Java compatíveis com o Firebase CLI. Configuração isolada em `firebase.test.json`: projeto sintético `demo-pulsar-codex`, Hub `4423`, Logging `4523`, Auth `9124`, Firestore `8123`/WebSocket `9123`, Functions `5123`, Eventarc `9323` e Tasks `9523`; o Vite E2E usa `3123`. A suíte de exclusão recusa execução sem hosts locais de emulador. O comando E2E passa as portas de Auth, Firestore e Functions via `VITE_AUTH_EMULATOR_PORT`, `VITE_FIRESTORE_EMULATOR_PORT` e `VITE_FUNCTIONS_EMULATOR_PORT`; fora dele os padrões de desenvolvimento são preservados. Nenhum deploy ou acesso a dados reais é necessário.

Cobertura: operações entre UIDs e sem autenticação, consultas de coleção/grupo e batch misto, schemas/limites, campos internos inclusive remoção, entradas diárias válidas/inválidas e compatibilidade com o indicador, recursos fechados e bloqueio de exclusão; remoção com mais de 500 registros, subcoleções desconhecidas/pais ausentes, todos os namespaces internos, preservação do outro UID, ordem antes de Auth, falhas parciais/retomada e token antigo após exclusão pela callable.

Os resultados de execução são verificações declaradas pelo implementador, não aprovação da tarefa nem substituto da verificação independente. Não há alteração de interface nesta tarefa; o design mobile e o reflow existentes são preservados.
