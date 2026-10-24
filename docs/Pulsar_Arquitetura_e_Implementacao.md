# Pulsar — Arquitetura técnica e plano de implementação

**Versão:** 1.1 — 24/10/2026 (decisões de V1 fechadas)  
**Complementa:** `Pulsar_Especificacao_Completa.md`  
**Objetivo:** orientar a implementação de um web app completo, mantendo a stack enxuta e os dados isolados por usuário.

## 1. Decisão de arquitetura

| Camada | V1 | Observação |
|---|---|---|
| Frontend | React + TypeScript + Vite + **yarn** | Web mobile-first, exclusivamente pt-BR. |
| UI | Implementação fiel ao design fornecido | Teste humano de esquerda/direita em telas estreitas. |
| Autenticação | Firebase Auth: **Anonymous**, Google, e-mail por link mágico | Converter anônimo via **link de credencial** preservando UID. Sem senha/telefone na UI. |
| Dados | Cloud Firestore | Isolamento por UID com Security Rules. |
| Publicação | Firebase Hosting | HTTPS. |
| Instalação | **PWA** instalável | Sem modo offline. |
| Push | Web Push / FCM + service worker | Um lembrete opcional por dia. |
| Jobs | Uma Cloud Function agendada diariamente | 20:00 `America/Sao_Paulo`, sem heurística de horário. |
| Cálculos | TypeScript determinístico no frontend | Recálculo após registro/exclusão e mudança de dia. |
| IA | Cloud Function callable + modelo configurável | Até uma chamada/dia/UID, até 3 textos, com consentimento. |
| Exclusão da conta | Cloud Function segura | Remove dados filhos e usuário do Auth. |

Sem API REST própria ou servidor permanentemente ativo. Cloud Functions apenas para geração com quota, exclusão integral e notificações. Utilizar Firebase Blaze e estabelecer limites financeiros.

### 1.1 Princípios técnicos

- **Padrões fechados:** seguir a especificação funcional, inclusive limiares e agregações; não inventar critérios alternativos.
- **Separação de contas:** Firestore sob `users/{uid}` com regras efetivas inclusive para usuários anônimos.
- **Sem retroatividade de criação:** lançamentos só para o dia local atual do dispositivo. **Exclusão histórica liberada**.
- **Tempo simples:** armazenar timestamps em UTC e `localDate` calculada pelo navegador na inclusão; frontend apresenta no timezone do navegador; nenhuma validação especial de data ou viagem no servidor.
- **Discrição visual limitada:** olho alterna sigla/nome em rótulos textuais de indicador e oculta emoji; não modifica dados, valores ou apresentação gráfica.
- **IA sem números próprios:** apenas explicar métricas calculadas pelo motor determinístico, com cache e quota.
- **PWA:** instala, mas sem sincronização ou armazenamento offline.
- **Código e comentários em inglês; UI pt-BR.**

## 2. Estrutura de navegação e componentes

Rotas aproximadas (adaptar ao design entregue):

```text
/
/start                     # anonymous sign-in, first visit
/onboarding
/dashboard
/indicators
/indicators/new
/indicators/:id/edit
/saved-insights
/account                   # Google/email link conversion, logout, account deletion
/settings                  # AI consent, reminders and privacy
/install                   # install invitation and fallback guidance
```

Componentes essenciais:

```text
AppShell
  GlobalIndicatorNameToggle
  Dashboard
    TodaySummary
    InsightList + InsightCard + InsightFeedback
    QuickEntryPanel
      FactorSection + ResultSection
      BooleanInput / ScaleInput / OrdinalInput / NumericInput
  IndicatorEditor + DailyAggregationControl
  SavedInsightsTimeline
  AccountUpgrade (Google, EmailLink)
  InstallPrompt / InstallInstructions
  Settings + PushOptIn + AiConsent
```

O estado `isNameRevealed` inicia `false` por abertura do app; persistir apenas durante a sessão de interface. Apenas nomes de indicadores em textos/legendas são alternados; ícones emoji somem com olho fechado. Gráficos não recebem filtro especial. A PWA **não** deve prometer que uma conta anônima será acessível após instalação: oferecer conversão antes do convite interno.

## 3. Modelo de dados sugerido (Firestore)

```text
users/{uid}
users/{uid}/indicators/{indicatorId}
users/{uid}/entries/{entryId}
users/{uid}/insights/{insightId}             # cache de insights atuais
users/{uid}/savedInsights/{savedInsightId} # snapshots curtidos
users/{uid}/insightFeedback/{feedbackId}    # likes/dislikes
users/{uid}/pushSubscriptions/{deviceId}
users/{uid}/dailySummaries/{yyyyMMdd}        # cache opcional
internal/userQuotas/{uid}                    # somente servidor, se necessário
```

### 3.1 Usuário

```json
{
  "createdAt": "serverTimestamp",
  "onboardingCompleted": true,
  "aiConsent": false,
  "reminderEnabled": false,
  "lastInsightRefreshAt": "serverTimestamp"
}
```

Autenticação: entrar como anônimo e armazenar sob o UID anônimo. Ao converter, vincular Google ou credencial de **e-mail por link** ao usuário atual (API Firebase equivalente a `linkWithPopup`/`linkWithCredential` conforme o provedor). **Verificar o UID antes e depois**. Se a credencial pertencer a outro UID, não trocar silenciosamente de usuário, não mesclar coleções e não excluir registros; exibir uma resolução explícita de conflito. E-mail por link deve manter o endereço digitado para completar a vinculação, com cuidados ao abrir em outro dispositivo.

O Firebase pode exigir habilitar o provedor e-mail/senha no console para usar link mágico; **não oferecer senha como método na UI**. Não habilitar limpeza automática de contas anônimas sem analisar impacto. Antes de recomendar instalação da PWA, exigir conversão para conta permanente. No iPhone, a PWA pode usar armazenamento de sessão separado do Safari.

### 3.2 Indicador

```json
{
  "group": "factor",
  "name": "Quantidade de café",
  "abbreviation": "CAF",
  "emoji": "☕",
  "valueType": "numeric",
  "numeric": { "unit": "xícaras", "min": 0, "max": null, "step": 0.5 },
  "scale": null,
  "options": null,
  "desiredDirection": null,
  "idealRange": null,
  "frequency": "multiple_per_day",
  "dailyAggregation": "sum",
  "sortOrder": 1000,
  "archivedAt": null,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

- `group`: `factor | result`; `valueType`: `boolean | scale | ordinal | numeric`.
- `frequency`: `single_per_day | multiple_per_day`.
- `dailyAggregation`: `sum | mean | last | any`; null/não aplicável para frequência única.
- `desiredDirection` (Resultados): `neutral` (**default**) | `higher` | `lower` | `target_range`.
- `idealRange`: `{ "min": number, "max": number }` obrigatório apenas para `target_range`, com `min <= max`.
- `sum` e `mean` para números/escalas; `any` para booleano (presença de `true`); `last` onde fizer sentido, inclusive ordinal. Impedir opções incompatíveis no formulário e na validação.
- Sugestão de agregação é **determinística e baseada em grupo/tipo**: Fator numérico `sum`, Resultado numérico `last`, escala `mean`, booleano `any`, ordinal `last`. Se múltiplos, usuário pode escolher opção compatível **antes** do primeiro registro. Sem IA para escolher agregação.
- Após qualquer registro, `group`, `valueType`, unidade, parâmetros de escala/opções, `frequency` e `dailyAggregation` ficam bloqueados. Nome, sigla, emoji, posição, status e direção/faixa ideal permanecem editáveis.
- Não usar nome/sigla (podem repetir) como chave de relacionamento. Campo de bloqueio (por exemplo, registro de esquema imutável) deve ser protegido com regras, para não depender apenas de esconder opções no frontend.

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

### 3.4 Insight

```json
{
  "type": "association",
  "status": "active",
  "factorIds": ["ind_coffee"],
  "resultIds": ["ind_energy"],
  "hypothesisKey": "association:ind_coffee:ind_energy:daily",
  "evidenceVersion": "2026-10-24:hash-of-current-evidence",
  "period": { "from": "2026-09-25", "to": "2026-10-24" },
  "sample": { "pairedDays": 20, "groupA": 11, "groupB": 9 },
  "metrics": { "groupAMean": 7.2, "groupBMean": 6.1, "difference": 1.1 },
  "quality": "exploratory",
  "generatedAt": "serverTimestamp"
}
```

Usar estrutura por IDs e templates para alternar somente os **nomes** dos indicadores entre sigla e nome real. Não mascarar gráficos, eixos ou valores. O texto de IA recebe IDs simbólicos/placeholders e os números já calculados, não dados brutos nem notas privadas.

### 3.5 Feedback e timeline

- `insightFeedback`: `hypothesisKey`, `evidenceVersion`, `action: liked|disliked`, `createdAt`.
- `savedInsights`: cópia imutável de frase estruturada, métricas, amostra, período e `likedAt`. Não mudar snapshots após exclusão de registros.
- Dislike oculta **aquela versão**; só reapresentar a hipótese com evidência nova material (não apenas nova redação).
- Sem avaliação: cartão só permanece enquanto elegível para a janela atual; depois desaparece, **não é salvo em caixa de pendências e não interfere em cálculos/seleção futura**.

### 3.6 Assinaturas push

Guardar token FCM por dispositivo, último uso e consentimento. Limpar tokens inválidos. Apenas contas que optaram recebem push; nenhum nome, sigla ou dado privado no payload. Para limite de 1 notificação por usuário/dia, enviar preferencialmente ao dispositivo ativo mais recente.

## 4. Políticas de agregação diária

O indicador define se aceita um ou vários registros por dia. O sistema calcula uma sugestão automática **sem IA**, baseada exclusivamente no tipo/grupo, mas o usuário pode escolher uma agregação compatível antes de registrar pela primeira vez.

| Indicador | Frequência | Agregação sugerida |
|---|---|---|
| Café / Q10 / água (Fator numérico) | Múltipla | `sum` |
| Peso (Resultado numérico) | Única ou múltipla | `last` se múltipla |
| Energia / concentração (escala) | Múltipla | `mean` |
| Exercício (booleano) | Única ou múltipla | `any` se múltipla |
| Humor (ordinal) | Múltipla | `last` |

Agregações da V1: `sum` (soma de incrementos), `mean` (média aritmética), `last` (último timestamp; desempate por ID estável), `any` (verdadeiro quando ao menos um registro é `true`). O indicador único por dia retorna seu valor diretamente. Os valores de uma entrada aditiva significam **quantidade daquele evento**, não acumulado no dia.

Nunca aplicar uma agregação a tipo incompatível; uma série incompleta não deve ter registros ausentes computados como zero/Não. Para associações por dia, cruzar somente dias com Fator e Resultado agregados válidos.

## 5. Motor estatístico

### 5.1 Pipeline proposto

```text
Nova entrada / substituição de hoje / exclusão de qualquer dia
  → persistir no Firestore
  → invalidar resumo diário daquele indicador/dia
  → calcular agregação do dia
  → atualizar séries temporais pertinentes
  → gerar candidatos a insights
  → aplicar filtros de qualidade e duplicidade
  → atualizar dashboard
  → chamar texto de IA somente se elegível, consentido e dentro da quota de 1 vez/dia
```

**Execução incremental** onde possível, evitando recalcular todo o histórico e todos os pares a cada toque. Para poucas contas e poucas métricas, recálculo local inicial pode ser suficiente; manter funções puras e separadas para evoluir.

### 5.2 Limiares estatísticos **obrigatórios** da V1

Janela: últimos **30 dias corridos**. Renderizar até **5 insights**: tentar até 2 associações, até 2 tendências e pelo menos 1 resumo factual, redistribuindo vagas para classes disponíveis. Não produzir outras modalidades estatísticas fora das regras. Os limiares servem para filtragem exploratória e **não** comprovam significância científica.

| Modalidade | Limite obrigatório |
|---|---|
| Resumo factual | Um registro no dia. |
| Comparação simples | Dois dias com medidas válidas e comparáveis. |
| Tendência escala 0–10 | Últimas duas janelas consecutivas de 7 dias, >=4 dias em **cada**, diferença absoluta de médias >=1 ponto. |
| Tendência numérica livre | Mesma amostra mínima; diferença absoluta de médias >=0,8 × desvio-padrão da série reunida; descartar desvio-padrão zero. |
| Fator booleano × Resultado 0–10 | >=14 dias pareados, grupos `true` e `false` cada um >=5 dias (resposta explícita) e diferença absoluta de médias >=1,5 ponto. |
| Fator booleano × Resultado numérico livre | Mesmas quantidades; diferença absoluta >=0,8 × desvio-padrão do Resultado nos dias pareados; descartar desvio zero. |
| Fator numérico × Resultado numérico | >=16 dias pareados, pelo menos 4 valores distintos por variável, abs(Spearman rho) >=0,55. |
| Fator booleano × Resultado booleano | >=14 dias pareados, >=5 dias em cada grupo do Fator e diferença absoluta >=25 pontos percentuais na taxa de Resultado `true`. |

Regras complementares:
- Todas as comparações usam **agregados diários**; ausência não é negativo/zero; dia só conta se as duas séries têm valor válido.
- Variáveis ordinais podem compor distribuições e resumos descritivos, **não associações estatísticas na V1** (não há limiar aprovado específico). Escalas numéricas fora de 0–10 usam o critério padronizado quando aplicável.
- Comparações entre um Fator e um Resultado somente: sem inferência multivariada ou efeitos defasados.
- Ordenar candidatos elegíveis por força da diferença/correlação, tamanho de amostra e novidade; evitar cartões redundantes para o mesmo par/hipótese.
- Não usar `desiredDirection` como filtro de validade: `neutral` informa variação sem julgar ganho ou perda; `target_range` apresenta distância/faixa explicitamente definida pelo usuário.
- Mostrar amostra, período e os números reais usados. Nunca atribuir causalidade ou percentual fictício de confiança.

### 5.3 Formatos e cálculo

- Estatísticas determinísticas em funções puras testáveis, com os limiares **fixos** acima.
- Spearman com empates tratados por postos médios; em caso de série constante, não gerar associação.
- Diferenças em pontos de escala ou pontos percentuais para booleanos; `>=` inclui igualdade no limite.
- Desvio-padrão calculado sobre amostras diárias válidas, com fórmula amostral (n-1), sem imputar faltantes.
- Para trend, janelas são dias corridos de calendário, permitindo até 3 dias ausentes em cada uma se houver ao menos 4 dias válidos.
- Manter testes sintéticos com relações positivas/negativas, ausência de relação e dados esparsos para prevenir associações triviais.

### 5.4 Qualidade e proteção contra falsos insights

- Exigir **dias pareados**: fator e resultado válidos no mesmo dia.
- Mostrar os denominadores de cada cálculo.
- Não comparar “registrou” com “não registrou” como se fossem presença/ausência clínica.
- Não inferir “mais é melhor” a partir de fatores; direção desejável só orienta leitura de resultados.
- Verificar diversidade dos dados; série constante não produz correlação útil.
- Dar preferência a mediana/distribuição quando existirem valores extremos.
- Controlar o volume de testes simultâneos e evitar ranquear centenas de correlações espúrias.
- Evidenciar que relações podem mudar com novos dados e fatores omitidos.
- Não produzir recomendações de uso/dose de suplementos ou medicamentos.
- Análises com defasagem temporal e efeitos combinados são futuras e precisam de mais amostras.

### 5.5 Representação de evidência

Sugerir níveis de linguagem, não “percentuais de confiança” inventados:

- **Descrição:** fatos sobre registros existentes.
- **Exploratório:** tendência/associação inicial, com poucas observações.
- **Sinal consistente:** evidência repetida no histórico, ainda não causal.
- **Dados insuficientes:** não apresentar a associação, ou mostrar apenas convite a continuar registrando.

Mostrar sempre que possível `n`, período, valores comparados e metodologia resumida em “Entenda a análise”.

## 6. IA generativa

### 6.1 Responsabilidade

IA apenas converte candidatos estatísticos **já elegíveis** em até três frases/explicações curtas por execução, em pt-BR. Não calcula agregações, não inventa coeficientes, não altera filtros do motor, não recomenda medicação/dose.

### 6.2 Gatilho, quota e fallback

- Motor determinístico recalcula após cada inclusão/substituição/exclusão e quando se inicia uma nova janela de dia.
- Na **primeira sessão de preenchimento concluída do dia que produzir candidatos elegíveis novos**, o app pode chamar uma **Cloud Function callable** para gerar até 3 narrativas; sem candidatos novos, não chamar.
- **No máximo uma chamada ao provedor por UID por dia (dia de Brasília para chave de quota da IA, escolha operacional uniforme)**; enforcement em servidor por operação atômica/transação e com tratamento de concorrência. Se falhar, não repetir automaticamente sem política explícita de retry dentro da mesma tentativa.
- Chaves/cache por `uid + analysisDate + hypothesisKey + evidenceVersion`; se dados mudam depois, atualizar estatística instantaneamente e usar template determinístico, sem nova chamada naquele dia.
- Limitar tokens, timeout, tamanho de entrada e saída, com tetos configurados no servidor; aplicar orçamento e alertas de faturamento no GCP. Nunca confiar no limite apenas no frontend.
- Provedor, credenciais e billing definidos no checklist separado. Segredos somente em ambiente seguro de Cloud Functions. Não enviar notas de texto ou histórico bruto; somente agregados mínimos e IDs simbólicos.

### 6.3 Aceite curto e revogável

Na primeira ativação da IA, mostrar: “Permitir que a IA analise resumos dos seus registros para explicar padrões encontrados? Seus dados continuam privados na sua conta. Você pode desativar depois.” Um checkbox/ação explícita deve ser armazenado em `aiConsent`; recusas e revogações deixam estatística e templates locais funcionando. A autorização deve preceder qualquer envio ao serviço.

## 7. Recálculo e atualização do dashboard

1. Persistir registro/exclusão.
2. Recalcular dados diários e janela de 30 dias com o estado atual, de forma determinística.
3. Atualizar o dashboard imediatamente após persistência confirmada, com estados carregando/erro consistentes.
4. Na primeira abertura de um novo dia, avançar janelas móveis e atualizar; **não é necessária Cloud Function diária para estatística**.
5. Snapshots de insights curtidos permanecem estáveis, ainda que dados históricos sejam excluídos.
6. Evitar listas permanentes de insights sem reação: resultados atuais são derivados da análise atual e substituíveis.

## 8. PWA e lembrete diário fixo — Cloud Functions agendadas

### 8.1 Instalação

Implementar manifest, ícones e service worker sem sincronização offline. O Pulsar convida a instalar **após alguns usos**, destacando acesso rápido e lembrete diário, **somente depois que a conta anônima for vinculada ao Google/e-mail**. Se a conta ainda for anônima, primeiro mostrar conversão. O usuário ainda pode instalar diretamente pelo menu do navegador; não é possível proibir isso. Para iPhone, instruir uso de **Adicionar à Tela de Início** e autenticação de conta definitiva na PWA instalada, se a sessão do Safari não for compartilhada.

### 8.2 Regra de envio

- Um horário único: **20:00**, timezone `America/Sao_Paulo`, **todos os dias**.
- Apenas usuários com `reminderEnabled === true` e permissão/token válido; **não enviar se tiver ao menos um registro no dia de Brasília**.
- Máximo **1 notificação por UID e data de Brasília**: usar chave de envio idempotente armazenada no servidor, incluindo proteção contra execuções repetidas.
- Se houver vários dispositivos, usar somente o token ativo mais recente. Texto genérico: “Quer registrar como foi seu dia no Pulsar?”; jamais incluir nome/sigla/observação.
- Opt-in contextual após ação explícita e opt-out em configurações. Nenhuma notificação automática antes do consentimento.
- Não implementar heurística de horários, preferências, múltiplas mensagens, cronograma por indicador, silencioso por fuso ou regras de viagens.

### 8.3 Infraestrutura e compatibilidade

FCM Web Push, HTTPS, service worker e Cloud Scheduler chamando Cloud Function **uma vez ao dia**. Firebase Blaze. Validar Chrome/Android e Safari/iPhone; no iPhone requer web app na Tela de Início e iOS compatível. Se não há suporte/permissão, o app segue funcional, sem promessa de push universal.

## 9. Segurança e Firestore Rules

### 9.1 Princípio

Cada documento está sob `users/{uid}`; só o usuário com `request.auth.uid == uid` pode ler/escrever seus documentos **normais**. Cloud Functions com Admin SDK trabalham separadamente, usando credenciais de serviço.

Exemplo ilustrativo de regra-base (não é uma regra de produção completa):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

**Antes de produção**, acrescentar validação de schema, tipos, limites de tamanho, ownership e proteção a campos internos sensíveis (sem validar datas do usuário no servidor). Campos administrativos (por exemplo, `lastNotificationSentAt`) devem ser gravados apenas por Cloud Functions, idealmente em caminho separado. Testar regras com Firebase Emulator Suite.

### 9.2 Controles adicionais

- App Check quando suportado, sem bloquear emuladores/ambiente local.
- Bloquear acesso a campos internos de quota, idempotência, push e billing por clientes. Validar tipos e tamanho de observações e unidades.
- Excluir a conta por Cloud Function com autenticação recente/reautenticação quando necessária, percorrendo subcoleções e removendo Auth depois de concluir a limpeza.
- Para congelar configurações com histórico, não confiar apenas no estado do React: usar salvaguardas de regras e fluxo seguro de persistência, com testes de alterações indevidas.
- Não impor verificação rígida de data no servidor nem cálculos especiais de timezone/viagens na V1.
- Segurança mínima de dados pessoais, consentimento para IA e exclusão; sem suíte burocrática de conformidade LGPD.

## 10. Performance e custos

- Usar janela de 30 dias para análise e caches/resumos apenas quando reduzirem leituras do Firestore.
- O frontend pode recalcular todo o histórico da janela para poucos usuários; não introduzir pipelines incrementais complexos sem necessidade.
- Limitar os candidatos estatísticos e exibir no máximo 5 insights por vez; não comparar toda combinação indiscriminadamente sem elegibilidade.
- IA no máximo uma vez por dia/UID, até 3 narrativas, com quota efetiva em servidor, token budget e fallback.
- Cloud Scheduler invoca apenas um job diário às 20h Brasília para destinatários opt-in; manter idempotência para impedir repetição.
- Alertas de orçamento não impõem teto; cotas e limites no aplicativo continuam necessários.

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
- Navegadores Chrome/Safari, mobile/desktop, sem offline; modo sigla/emoji nunca esconde dados do gráfico.
- Convite para instalação exige conta convertida; teste de PWA iPhone com sessão potencialmente isolada.
- Push apenas com opt-in, 20h Brasília, uma vez/dia/UID, suprimido se já registrou; sem push o app funciona normalmente.
- Seed 30 dias só no projeto dev; usuários novos em simulações reais, incluindo conversão e exclusão.

## 13. Validação visual e decisões fixadas

**Único ponto de UX a validar pelo humano:** melhor composição Fatores à esquerda / Resultados à direita em telas estreitas versus seções verticais. Design quase completo será fornecido antes de iniciar.

Autenticação, faixa ideal, direção neutra, agregações, limites estatísticos, consentimento/quotas de IA, PWA e lembrete fixo estão **fechados para V1**. O agente não deve reabrir essas decisões por iniciativa própria. O checklist separado traz os pré-requisitos do projeto.

---

**Aviso técnico:** exemplos de JSON, regras e algoritmos são propostas de implementação, não substituem validação final, testes de segurança e verificação da documentação vigente dos serviços Firebase utilizados.
