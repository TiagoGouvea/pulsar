Você é um worker de um harness autônomo. Contexto limpo: tudo que importa está nos arquivos citados.
Regras:
- Trabalhe SOMENTE no diretório atual (worktree). Não acesse .env nem fora do projeto.
- Não edite arquivos listados como protegidos. Não use .skip/.only. Não enfraqueça asserts.
- Siga app/AGENTS.md, DECISOES.md e o design system (design/pulsar_bio_analytics/DESIGN.md → app/src/design/).
- Design em `design/`: uma pasta por tela com `screen.png` (mockup) e `code.html` (HTML/Tailwind de referência: copie estrutura, classes e textos, mas reescreva em React com os componentes do design system); `pulsar_mapeamento_de_telas_x_especifica_o_funcional_v1.1.md` liga cada tela às seções da spec. Em conflito, a spec (docs/) vence: o app é somente mobile, ignore breakpoints/layouts de desktop do design.
- Código, nomes e comentários em inglês; textos de interface somente em pt-BR. Gerenciador de pacotes: yarn.
- Não faça git commit/push/checkout: o orquestrador cuida do git.
- Se faltar informação: escolha o default mais conservador e registre uma linha JSON em
  .harness/inbox/questions.jsonl: {"featureId","pergunta","escolhido","alternativas","impacto"}.
- Se identificar um risco futuro: registre em .harness/inbox/risks.jsonl:
  {"featureId","risco","probabilidade","impacto","sugestao"}.
- Rode os testes relevantes antes de terminar. Termine com o bloco ```json final pedido no seu papel
  (padrão: {"summary","filesChanged","testsRun","confidence":"low|med|high","notes"}).
LIÇÕES RELEVANTES:
- [L-001] G4 (prioritário): Remova --coverage do script package.json (vitest 3.x já ativa coverage via config block). G10: Aumente touch targets para ≥44px — troque min-w-0 por min-w-[44px] nos radios do Slider, passe o switch de h-7 para h-11 e o input de h-9/py-2 para h-11.


# Papel: implementador (tentativa 1)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/scripts/__tests__/seed-data.test.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Diagnóstico da tentativa anterior
(primeira tentativa)

## Feature
```json
{
  "id": "F-0.03",
  "stage": 0,
  "title": "Seed sintético do usuário de desenvolvimento",
  "description": "scripts/seed-data.ts (gerador puro e determinístico, exatamente 30 dias (SEED_DAYS, sem opção de alterar), correlações plantadas, ruído, sentinelas ZQX_*) e scripts/seed.ts (grava via Admin SDK; recusa sem FIRESTORE_EMULATOR_HOST, exceto --demo com HARNESS_ALLOW_DEMO_SEED=1 e --project não-prod). Feito pelo inicializador.",
  "specRefs": [
    "spec.md#10",
    "arquitetura.md#11",
    "arquitetura.md#12"
  ],
  "covers": [
    "AC-21"
  ],
  "acceptance": [
    "Seed gera exatamente 30 dias sintéticos terminando hoje (firstDate = hoje - 29; nenhum registro fora dessa janela)",
    "Seed é determinístico para a mesma data",
    "Cobre Não explícito vs ausência, 0 vs ausência, múltiplos por dia, valor extremo, indicador arquivado e sem sigla",
    "Exercício -> energia com diferença >= 1,5 ponto plantada; sono -> foco monotônico com >= 16 dias pareados; café x dor sem relação",
    "Recusa rodar fora do emulador sem opt-in explícito"
  ],
  "tests": [
    "app/scripts/__tests__/seed-data.test.ts"
  ],
  "protectedTests": [
    "app/scripts/__tests__/seed-data.test.ts"
  ],
  "tags": [],
  "difficulty": "easy",
  "dependsOn": [
    "F-0.04"
  ],
  "status": "in_progress",
  "attempts": 0,
  "costUsd": 0
}
```

## Trechos da spec
<!-- spec.md#10 -->
## 10. Critérios de aceite da primeira versão

### Conta e onboarding
- [ ] Primeiro acesso anônimo funciona sem cadastro; tutorial e sugestões opcionais de 3–4 indicadores.
- [ ] Conversão para Google ou link mágico preserva UID e registros; tratar conflitos sem perda/mescla automática.
- [ ] Não existe autenticação por telefone/senha na UI da V1.
- [ ] Usuários não conseguem acessar dados uns dos outros; exclusão de conta apaga dados relacionados.

### Indicadores e registros
- [ ] Quatro formatos estruturados, observação opcional, frequência única/múltipla por dia.
- [ ] Sugestão **determinística** de agregação por tipo/grupo; usuário ajusta nas configurações avançadas antes do primeiro registro.
- [ ] Nome/sigla/emoji e arquivamento/reordenação; tipo/grupo/unidade/frequência/agregação bloqueados após haver histórico.
- [ ] Resultados aceitam sem preferência (padrão), maior, menor ou faixa ideal configurável.
- [ ] Registrar apenas hoje; substituir registro único de hoje; múltiplos registram eventos independentes.
- [ ] Excluir registro de qualquer dia; não editar valores de dias passados; recalcular o presente com os dados atuais.
- [ ] Persistir UTC; apresentar horário do navegador; sem lógica de viagens nem validação de data no servidor.

### Dashboard, IA e privacidade visual
- [ ] Descrições desde o primeiro dia; comparação desde o segundo; associações seguem limiares fechados da seção 6.5.1.
- [ ] Até 5 cartões; like salva snapshot; dislike oculta versão; sem reação não cria pendência nem influencia análises futuras.
- [ ] Recalcular deterministicamente após inclusão/exclusão e na mudança de dia.
- [ ] Uma chamada de IA por usuário/dia, até 3 textos, com aceite antes da primeira chamada e fallback automático.
- [ ] Olho global alterna somente **nomes ↔ siglas** dos indicadores; emojis ocultos com olho fechado; gráficos não são mascarados.
- [ ] Design mobile fornecido deve ser validado por humano (metáfora esquerda/direita); no computador o layout só estica/desempilha, sem quebrar.

### PWA, lembretes e escopo
- [ ] PWA instalável; convite contextual a partir de uso recorrente, precedido por conversão de conta se anônima.
- [ ] Lembrete opcional único às 20h Brasília somente se não houve registro no dia; testes Chrome/Android e Safari/iPhone.
- [ ] Sem aprendizado de horários, offline, app nativo ou outros idiomas além de pt-BR.
- [ ] Seed de um usuário com 30 dias sintéticos e novos usuários criados em testes, sem seed em produção.

<!-- arquitetura.md#11 -->
## 11. Plano de implementação sugerido

### Fase 0 — Pré-requisitos
- Concluir `Pulsar_Preparacao_Antes_da_Implementacao.md`: projeto Firebase dev, acessos, design e assets, modelo de IA, billing/segredos e orçamento.
- Definir e testar seed **reproduzível** com 30 dias para usuário de desenvolvimento.

### Fase 1 — Fluxo principal
- React + Vite + TS + yarn; Firestore Rules, Auth anônimo, conversão Google/link mágico.
- Tutorial, sugestões, indicadores, agregações sugeridas e configuráveis, registro e exclusão.
- Siglas/emoji, estado do olho, conta e exclusão integral de dados.

### Fase 2 — Descobertas
- Motor determinístico com limiares fechados e testes, dashboard, like/dislike e timeline.
- Recálculo em inclusão/exclusão e abertura da primeira sessão do dia.

### Fase 3 — IA
- Aceite curto; callable Function, limite de uma chamada/dia, textos até 3 e fallback.

### Fase 4 — Instalação e lembrete
- PWA, convite pós-conversão, Web Push/FCM, job diário às 20h Brasília e testes Chrome/Safari.

Critério transversal: validação visual humana do design; novos usuários criados durante testes, além do usuário do seed.

<!-- arquitetura.md#12 -->
## 12. Testes essenciais

### Auth, dados e regras
- Anônimo começa sem e-mail; converter Google/link mágico mantém UID e dados; conflito não mescla automaticamente.
- UID A nunca lê/escreve caminhos do UID B; flags/quotas internas protegidas.
- Indicador com dados rejeita edição de grupo/tipo/unidade/frequência/agregação; permite nome/sigla/emoji/ordem/faixa ideal.
- `false`, `0` e dado ausente são diferentes; múltiplos agregam sem erros; excluir histórico recalcula o presente, não snapshots curtidos.
- Excluir conta apaga entradas, indicadores, insights, feedback, tokens, Auth e outras subcoleções, sem documento órfão.

### Estatística e IA
- 2 dias jamais geram correlação; cada limiar da seção 5.2 tem teste de borda `abaixo`, `igual`, `acima`.
- Ausências não viram grupo `Não` nem valor zero; constantes não produzem Spearman/divisão por zero.
- Janela 30 dias, 5 cartões no máximo, snapshots de likes e descarte de não avaliados.
- Quota por UID/dia impede chamada de IA paralela/duplicada; sem consentimento usa templates determinísticos.

### UX/PWA
- Navegadores Chrome/Safari no celular; no computador o layout mobile só estica/desempilha (sem layout próprio), sem offline; modo sigla/emoji nunca esconde dados do gráfico.
- Convite para instalação exige conta convertida; teste de PWA iPhone com sessão potencialmente isolada.
- Push apenas com opt-in, 20h Brasília, uma vez/dia/UID, suprimido se já registrou; sem push o app funciona normalmente.
- Seed 30 dias só no projeto dev; usuários novos em simulações reais, incluindo conversão e exclusão.

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
- 2026-10-25T16:09 INIT concluído: 63 features
- 2026-10-25T16:14 F-0.01 passing — Scaffold: Vite, TypeScript, Tailwind, lint e Vitest (worker opus, 3 tentativa(s), US$ 0.79)
- 2026-10-25T16:17 F-0.04 passing — Firebase com emuladores e regras-base por UID (worker opus, 1 tentativa(s), US$ 1.06)

