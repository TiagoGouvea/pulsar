Você é um worker de um harness autônomo. Contexto limpo: tudo que importa está nos arquivos citados.
Regras:
- Trabalhe SOMENTE no diretório atual (worktree). Não acesse .env nem fora do projeto.
- Não edite arquivos listados como protegidos. Não use .skip/.only. Não enfraqueça asserts.
- Siga app/AGENTS.md, DECISOES.md e o design system (design/pulsar_bio_analytics/DESIGN.md → app/src/design/).
- Design em `design/`: uma pasta por tela com `screen.png` (mockup) e `code.html` (HTML/Tailwind de referência: copie estrutura, classes e textos, mas reescreva em React com os componentes do design system); `pulsar_mapeamento_de_telas_x_especifica_o_funcional_v1.1.md` liga cada tela às seções da spec. Em conflito, a spec (docs/) vence: o app é somente mobile, ignore breakpoints/layouts de desktop do design.
- Código, nomes e comentários em inglês; textos de interface somente em pt-BR. Gerenciador de pacotes: yarn.
- Não faça git commit/push/checkout: o orquestrador cuida do git.
- Nunca altere `node_modules` nem dependências de terceiros (nem por script/patch/postinstall) para fazer algo passar; não mude `scripts` do package.json, lockfiles ou configs de infraestrutura sem que a feature peça. Se a infraestrutura impede a tarefa, registre em .harness/inbox/questions.jsonl e pare.
- Se faltar informação: escolha o default mais conservador e registre uma linha JSON em
  .harness/inbox/questions.jsonl: {"featureId","pergunta","escolhido","alternativas","impacto"}.
- Se identificar um risco futuro: registre em .harness/inbox/risks.jsonl:
  {"featureId","risco","probabilidade","impacto","sugestao"}.
- Rode os testes relevantes antes de terminar. Termine com o bloco ```json final pedido no seu papel
  (padrão: {"summary","filesChanged","testsRun","confidence":"low|med|high","notes"}).
LIÇÕES RELEVANTES:
- [L-050] Aumente o tamanho do container ou aplique padding suficiente no botão para garantir a área de toque mínima de 44px.
- [L-049] Refine as asserções de teste unitário para excluir elementos de feedback de sistema (como banners de status de salvamento) da verificação de texto global, e aumente a resiliência dos testes E2E offline garantindo que o estado de salvamento pendente seja renderizado antes da interação.
- [L-048] Antes de terminar, rode em app/ `yarn build:emulator && yarn --cwd functions build` e corrija qualquer erro (imports, ícones fora de scripts/icons.ts, rota nova sem a página lazy correspondente). Depois rode `yarn test:e2e` (ele sobe o e2e:serve sob port-lock) para confirmar que o preview sobe na porta 4792. Não deixe emuladores nem preview rodando ao sair. Se o build passar e a porta continuar ocupada ou travada, registre em .harness/inbox/questions.jsonl como problema de infraestrutura.
- [L-051] Após mudar o estado da rede com setOffline(true), aguarde a confirmação de que a página ainda está responsiva ou use um retry explícito com lógica de espera para estabilização do navegador.
- [L-052] Adicione um `await page.waitForLoadState('networkidle')` ou aguarde o estado de prontidão da página/componente antes de ativar o modo offline e realizar a interação.


# Papel: implementador (tentativa 1)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/e2e/entry-history.spec.ts
app/src/__tests__/scaffold.test.ts
app/src/design/__tests__/design-system.f002.test.tsx
app/e2e/routes.spec.ts
app/e2e/visual.spec.ts
app/src/lib/__tests__/time.test.ts
app/src/domain/__tests__/indicator.test.ts
app/tests/rules/users.test.ts
app/e2e/anonymous-start.spec.ts
app/functions/src/__tests__/setup.test.ts
app/functions/src/__tests__/deleteAccount.test.ts
app/e2e/app-shell.spec.ts
app/e2e/fixtures.spec.ts
app/e2e/onboarding.spec.ts
app/e2e/account-link.spec.ts
app/e2e/account-delete.spec.ts
app/e2e/initial-session-loading.spec.ts
app/src/__tests__/initial-session-loading.test.tsx
app/tests/rules/indicators.test.ts
app/src/data/__tests__/entries.test.ts
app/tests/rules/entries.test.ts
app/e2e/indicators-list.spec.ts
- Testes de features já entregues: pode acrescentar casos, mas não remova, renomeie nem enfraqueça os existentes:
app/src/lib/__tests__/firebase.test.ts
app/e2e/design.spec.ts
app/src/__tests__/designRoute.test.tsx
app/tests/rules/usersAdminFields.test.ts
app/src/domain/__tests__/entry.test.ts
app/src/auth/__tests__/AuthProvider.test.tsx
app/src/lib/__tests__/testHelper.test.ts
app/src/app/__tests__/AppShell.test.tsx
app/src/auth/__tests__/userRepository.test.ts
app/e2e/account-link-visual.spec.ts
app/src/auth/__tests__/linkAccount.test.ts
app/e2e/account-delete-reauth.spec.ts
app/src/data/__tests__/indicators.test.ts
app/tests/rules/indicator-lock-transition.test.ts
app/tests/rules/entry-validation-extra.test.ts
app/src/indicators/__tests__/AggregationControl.test.tsx
app/src/indicators/__tests__/IndicatorEditor.test.tsx
app/e2e/save-account-banner.spec.ts
app/src/indicators/__tests__/IndicatorCard.test.tsx
app/src/indicators/__tests__/summary.test.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Testes
- Se a lista de testes protegidos acima estiver vazia, **você** escreve os testes de aceite em `app/e2e/entry-history.spec.ts` (um por critério de `acceptance`, determinísticos, e2e no projeto `mobile`). Eles ficam protegidos quando a feature for entregue: não escreva testes triviais.

## Escopo
- Faça **somente** o que esta feature pede (descrição e critérios de aceite), mesmo que a spec ou o design mostrem mais.
- Estas features (desta etapa e das próximas) ainda serão feitas por outro implementador; não implemente telas, fluxos nem dados delas:
- F-1.06 (etapa 2) Guarda e2e do modo privado (sentinelas)
- F-2.08 (etapa 2) Preenchimento rápido
- F-2.10 (etapa 2) Dashboard vazio com sugestões
- F-3.01 (etapa 3) Estatística: agregação diária e séries da janela
- F-3.02 (etapa 3) Estatística: retrato do dia, comparação entre dias e distribuições ordinais
- F-3.03 (etapa 3) Estatística: tendências de Resultados
- F-3.04 (etapa 3) Estatística: associações com fator booleano
- F-3.05 (etapa 3) Estatística: Spearman fator numérico x resultado numérico
- F-3.06 (etapa 3) Seleção de insights (até 5 cartões) e versões de evidência
- F-3.07 (etapa 3) Textos determinísticos dos insights (templates pt-BR)
- F-3.08 (etapa 3) Motor de recálculo no cliente
- F-3.09 (etapa 3) Dashboard com insights
- F-3.10 (etapa 3) Cartão de insight e mini gráficos
- F-3.11 (etapa 3) Detalhes do insight (Entender análise)
- F-3.12 (etapa 3) Regra de evidência nova material após dislike
- F-4.01 (etapa 4) Dados de curadoria: like, dislike e snapshots
- F-4.02 (etapa 4) Regras: snapshots e feedback
- F-4.03 (etapa 4) Dislikes no recálculo: ocultar e permitir retorno com evidência nova
- F-4.04 (etapa 4) Like e dislike nos cartões
- F-4.05 (etapa 4) Conclusões salvas (timeline)
- F-5.01 (etapa 5) PWA instalável sem offline
- F-5.02 (etapa 5) Convite interno para instalar
- F-5.03 (etapa 5) Opt-in do lembrete e token FCM
- F-5.04 (etapa 5) Function agendada do lembrete das 20h
- F-5.05 (etapa 5) Roteiro de testes manuais Chrome/Android e Safari/iPhone
- F-6.01 (etapa 6) Consentimento da IA
- F-6.02 (etapa 6) Function generateInsightTexts com quota diária
- F-6.03 (etapa 6) Integração da IA no dashboard com cache e fallback
- F-6.04 (etapa 6) Validação de saída da IA
- F-6.05 (etapa 6) Regras: cache de textos da IA
- F-7.01 (etapa 7) Guardas de escopo
- F-7.02 (etapa 7) Auditoria de layout mobile e esticado no desktop
- F-7.03 (etapa 7) Roteiro de validação humana do design
- F-7.04 (etapa 7) Jornadas ponta a ponta com seed e usuários novos
- F-7.05 (etapa 7) Endurecimento de regras e hosting
- F-7.06 (etapa 7) Orçamento de bundle e fonte de ícones
- Se precisar navegar para uma tela de outra feature, crie no máximo um placeholder mínimo (título e uma linha, sem lógica).
- Não remova nem reescreva código de features já entregues.
- Se a revisão anterior pedir algo que exija alterar um teste protegido ou sair do escopo, **não faça**: atenda o resto e registre a discordância em `.harness/inbox/questions.jsonl`.

## Diagnóstico da tentativa anterior
(primeira tentativa)

## Feature (dados de entrada; não é o formato da resposta)
{
  "id": "F-2.09",
  "stage": 2,
  "title": "Histórico de registros e exclusão retroativa",
  "description": "A partir do indicador (Meus indicadores) abrir histórico com registros (data/hora no fuso do navegador, valor, observação ao tocar com data-privacy-allow) e excluir qualquer registro com confirmação. Sem edição de valores passados.",
  "specRefs": [
    "spec.md#5.2",
    "spec.md#5.3",
    "arquitetura.md#3.3"
  ],
  "covers": [
    "AC-10",
    "AC-11"
  ],
  "acceptance": [
    "Lista mostra horários no fuso do navegador",
    "Excluir pede confirmação e remove o registro",
    "Não há controle para editar valor de dia passado"
  ],
  "tests": [
    "app/e2e/entry-history.spec.ts"
  ],
  "protectedTests": [
    "app/e2e/entry-history.spec.ts"
  ],
  "tags": [
    "ui",
    "privacy-mode"
  ],
  "difficulty": "normal",
  "dependsOn": [
    "F-2.06",
    "F-2.05"
  ],
  "status": "in_progress",
  "attempts": 0,
  "costUsd": 0,
  "origin": []
}

## Trechos da spec
<!-- spec.md#5.2 -->
### 5.2 Um registro ou vários registros no dia

- **Único por dia:** manter um valor por indicador e dia; novo preenchimento **no próprio dia** substitui o valor atual.
- **Múltiplos por dia:** cada resposta gera novo evento com timestamp UTC; a agregação definida no indicador calcula o valor consolidado para aquele dia.
- **Sem lançamento retroativo** e sem editar valores de dias anteriores. O usuário pode **excluir qualquer registro, inclusive passado**.
- Excluir uma entrada invalida os resumos afetados e recalcula o dashboard **com os dados atualmente existentes**, sem reconstruir retrospectivamente os snapshots de insights curtidos.
- Todos os timestamps persistidos são UTC. O frontend apresenta datas/horários no fuso do navegador e define a chave `localDate` no momento de registrar; sem tratamento especial de viagens e **sem validação adicional da data no servidor**.
- Registro vazio não equivale a zero ou resposta `Não`. Falsas presenças/ausências jamais entram nas análises.

<!-- spec.md#5.3 -->
### 5.3 Observação opcional

- Em qualquer registro, há um campo opcional **Observação**.
- Não haverá um quinto tipo de resposta “texto livre”.
- A observação complementa um valor estruturado; não o substitui.
- Análise estatística usa os valores estruturados. **Na V1 a IA não recebe observações**; eventual processamento de observações livres fica para uma versão futura.

<!-- arquitetura.md#3.3 -->
### 3.3 Registro

```json
{
  "indicatorId": "ind_abc",
  "localDate": "2026-10-24",
  "recordedAt": "serverTimestamp",
  "valueType": "numeric",
  "value": { "number": 1.5 },
  "note": "Depois do almoço"
}
```

Valores possíveis de `value`: `{ "boolean": true }`, `{ "number": 7 }`, `{ "optionId": "high" }`. Sempre verificar compatibilidade com o tipo do indicador; `note` é opcional, sem tipo de indicador exclusivamente textual.

- Para `single_per_day`, ID determinístico por `indicatorId + localDate`; nova resposta do **dia vigente** substitui o documento.
- Para `multiple_per_day`, usar IDs únicos; guardar cada resposta de forma independente.
- **Excluir** um registro antigo é permitido. **Editar** valores de dias antigos ou criar registros retroativos não é permitido na interface.
- Guardar timestamps em UTC e `localDate` calculada no navegador no momento de registrar; front mostra hora local conforme o dispositivo. Sem tratamento especial de viagens/timezones e **sem validar data de registro no servidor**.
- Ao excluir/substituir, invalidar agregados daquele dia e recalcular insights da janela atual; **não reprocessar snapshots históricos salvos por like**.
- Não imputar ausência como `false` ou 0. Distinguir `false`, `0` e ausência de registro.

## Design
design/pulsar_bio_analytics/DESIGN.md
design/conclus_es_salvas/screen.png
design/configura_es_e_conta/screen.png
design/dashboard_dia_14_primeira_correla_o/screen.png
design/dashboard_dia_2_compara_es_iniciais/screen.png
design/dashboard_inicial_estado_vazio/screen.png
design/dashboard_insights/screen.png
design/detalhes_do_insight/screen.png
design/meus_indicadores/screen.png
design/novo_indicador_modal/screen.png
design/onboarding_1_fatores/screen.png
design/onboarding_2_resultados/screen.png
design/onboarding_3_associa_es/screen.png
design/preenchimento_r_pido/screen.png

## Progresso recente
- 2026-11-05T10:30 ⏸ 1 feature(s) esperando bloqueadas (F-1.09): ajuste e rode harness resume
- 2026-11-06T23:24 ▶ etapa 1 (Base) │ features 9/11 │ 0 bloqueadas │ US$ 28.41/30 │ branch 1-base
- 2026-11-06T23:42 ✔ F-1.09 passing — Conversão da conta: Google e link mágico preservando UID (worker glm-or, 1 tentativa(s), US$ 6.47) │ features 10/11
- 2026-11-07T00:12 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-07T00:19 ▶ etapa 1 (Base) │ features 10/11 │ 0 bloqueadas │ US$ 29.72/31 │ branch 1-base
- 2026-11-07T00:34 ✔ F-1.12 passing — Tela de conta: sair e excluir conta (worker glm-or, 3 tentativa(s), US$ 1.30) │ features 11/11
- 2026-11-07T00:39 ▶ etapa 1 (Base) │ features 11/12 │ 0 bloqueadas │ US$ 30.39/31 │ branch 1-base
- 2026-11-07T11:26 ▶ etapa 1 (Base) │ features 12/12 │ 0 bloqueadas │ US$ 30.89/31 │ branch 1-base
- 2026-11-07T11:31 ▶ etapa 1 (Base) │ features 12/13 │ 0 bloqueadas │ US$ 30.89/31 │ branch 1-base
- 2026-11-07T11:31 teto da etapa 1 aumentado para US$ 32 (budget.yaml)
- 2026-11-07T11:31 ▶ etapa 1 (Base) │ features 12/13 │ 0 bloqueadas │ US$ 30.89/32 │ branch 1-base
- 2026-11-07T11:35 ✔ F-1.fix-2 passing — Suíte completa da etapa falhou nos gates G2, G6 (worker codex-mid, 1 tentativa(s), US$ 0.24) │ features 13/13
- 2026-11-07T12:59 etapa 1: 1 ajuste(s) viraram features F-1.adj-*; rodando agora
- 2026-11-07T12:59 ▶ etapa 1 (Base) │ features 13/14 │ 0 bloqueadas │ US$ 31.53/32 │ branch 1-base
- 2026-11-07T13:06 teto da etapa 1 aumentado para US$ 33 (budget.yaml)
- 2026-11-07T13:06 ▶ etapa 1 (Base) │ features 13/14 │ 0 bloqueadas │ US$ 32.22/33 │ branch 1-base
- 2026-11-07T13:11 ✔ F-1.adj-01 passing — Remover o texto "Preparando seu espaço" durante a carga inicial (worker minimax, 1 tentativa(s), US$ 0.97) │ features 14/14
- 2026-11-07T14:24 ✔ etapa 1 aprovada · commits em 1-base
- 2026-11-07T17:58 ▶ etapa 2 (Registro) │ features 0/9 │ 0 bloqueadas │ US$ 0.00/9 │ branch 2-registro
- 2026-11-07T17:59 ⛔ F-2.01 BLOQUEADA: test_writer não produziu testes de aceite │ features 0/9
- 2026-11-07T17:59 ⏸ 8 feature(s) esperando bloqueadas (F-2.01): ajuste e rode harness resume
- 2026-11-07T18:08 ▶ etapa 2 (Registro) │ features 0/9 │ 1 bloqueadas │ US$ 0.14/9 │ branch 2-registro
- 2026-11-07T18:08 ⏸ 8 feature(s) esperando bloqueadas (F-2.01): ajuste e rode harness resume
- 2026-11-07T18:08 ▶ etapa 2 (Registro) │ features 0/9 │ 0 bloqueadas │ US$ 0.14/9 │ branch 2-registro
- 2026-11-07T18:17 ⛔ F-2.01 BLOQUEADA: sem progresso: kimi-pro e codex-mid falharam igual (gates G2); provável problema no teste, na spec ou no ambiente │ features 0/9
- 2026-11-07T18:17 ⏸ 8 feature(s) esperando bloqueadas (F-2.01): ajuste e rode harness resume
- 2026-11-07T19:25 ▶ etapa 2 (Registro) │ features 0/9 │ 0 bloqueadas │ US$ 1.44/9 │ branch 2-registro
- 2026-11-07T19:27 ✔ F-2.01 passing — Repositório e regras de indicadores (worker codex-mid, 3 tentativa(s), US$ 1.77) │ features 1/9
- 2026-11-07T19:32 ✔ F-2.06 passing — Repositório e regras de registros (worker codex-mid, 1 tentativa(s), US$ 0.56) │ features 2/9
- 2026-11-07T20:11 ✔ F-2.03 passing — Editor de indicador (worker haiku, 2 tentativa(s), US$ 1.28) │ features 3/9
- 2026-11-07T20:15 ⛔ F-2.10 BLOQUEADA: teto de custo da feature atingido │ features 3/9
- 2026-11-07T20:32 ⛔ F-2.08 BLOQUEADA: teto de custo da feature atingido │ features 3/9
- 2026-11-07T20:53 ⛔ F-2.05 BLOQUEADA: teto de custo da feature atingido │ features 3/9
- 2026-11-07T21:02 ✔ F-2.11 passing — Convite discreto para salvar a conta (worker minimax, 1 tentativa(s), US$ 0.60) │ features 4/9
- 2026-11-07T21:02 ⏸ 2 feature(s) esperando bloqueadas (F-2.05, F-2.08, F-2.10): ajuste e rode harness resume
- 2026-11-08T11:01 ▶ etapa 2 (Registro) │ features 4/9 │ 3 bloqueadas │ US$ 9.03/9 │ branch 2-registro
- 2026-11-08T11:01 ⏸ 2 feature(s) esperando bloqueadas (F-2.05, F-2.08, F-2.10): ajuste e rode harness resume
- 2026-11-08T11:02 ▶ etapa 2 (Registro) │ features 4/9 │ 0 bloqueadas │ US$ 9.03/12 │ branch 2-registro
- 2026-11-08T11:21 ✔ F-2.05 passing — Tela Meus indicadores (worker codex-mid, 4 tentativa(s), US$ 2.66) │ features 5/9

