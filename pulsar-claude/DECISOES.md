# Decisões do humano — Pulsar

> O que não estiver aqui o inicializador completa com o default mais conservador e registra como dúvida no checkpoint da etapa 0.

## Já decidido (docs/)
- Lembrete diário fixo às 20:00 `America/Sao_Paulo`, só ativar/desativar.
- Sem modo offline, sem app nativo, sem login por telefone/senha. Gerenciador de pacotes: yarn.

## Escopo da V1
- PWA + push (etapa 5): **sim**. Instalável, com o lembrete das 20:00 via FCM (Cloud Scheduler + Cloud Function).
- IA generativa nos insights (etapa 6): **sim, via Firebase**. Cloud Function callable v2 (`southamerica-east1`) chama Gemini pelo Vertex AI com a credencial do próprio projeto (Genkit ou `@google/genai` com Vertex). Sem chave de API no cliente nem em segredo externo. Modelo padrão: Gemini Flash, configurável por variável de ambiente da Function. Regras da arquitetura 6: consentimento `aiConsent`, máx. 1 chamada/UID/dia (quota em transação no servidor), até 3 textos, só agregados e IDs simbólicos, fallback para templates determinísticos. Emulador/testes usam um provedor fake.
- Projeto Firebase no plano Blaze (exigido por Functions, Scheduler e Vertex AI), com alerta de orçamento no GCP.

## Login
- Primeiro acesso sempre anônimo, sem cadastro.
- Convite discreto (banner dispensável no dashboard) para salvar a conta com Google ou link mágico quando a pessoa tiver registros em **3 dias distintos**. Dispensado, volta só depois de mais 7 dias com registro.
- A conversão fica sempre disponível em Configurações > Conta.
- Antes do convite interno de instalar a PWA, a conversão é obrigatória (spec 7). A conversão vincula ao mesmo UID; conflito de credencial em outro UID mostra resolução explícita, sem mesclar nem apagar.

## Limiares estatísticos
- Usar exatamente os da spec 6.5.1 / arquitetura 5.2, com testes de borda abaixo/igual/acima.

## Virada do dia
- Meia-noite local do navegador (`localDate` calculada no cliente ao registrar). A quota da IA usa o dia de Brasília (arquitetura 6).

## Exclusão de conta
- Imediata e definitiva, após confirmação explícita (digitar "EXCLUIR") e reautenticação recente quando a conta não for anônima. Cloud Function remove todas as subcoleções, tokens de push e, por último, o usuário do Auth. Sem período de carência.

## Outras
- Região: Firestore e Functions em `southamerica-east1`.
- Idioma único pt-BR; app somente mobile (desktop só estica/desempilha).

## Pendências completadas pelo inicializador (defaults conservadores — confirmar no checkpoint da etapa 0)
- **Convite de instalar a PWA ("alguns usos")**: registros em ≥ 5 dias distintos **e** conta já convertida; se anônima, mostra a conversão. Justificativa: mais tarde que o convite de salvar conta (3 dias), nunca antes da conversão.
- **Dislike → "evidência nova material"**: a hipótese só reaparece com ≥ 7 dias pareados a mais que a versão descartada ou com inversão do sinal do efeito. Justificativa: evita reexibir o mesmo achado com 1–2 dias novos.
- **Comparação desde o 2º dia**: hoje vs. o dia anterior mais recente com valor do mesmo indicador; conta como resumo factual nos 5 cartões. Justificativa: comparação simples e sem extrapolar.
- **Janelas de tendência**: hoje..hoje−6 vs. hoje−7..hoje−13 (dias corridos do `localDate`). Justificativa: leitura literal de "duas janelas consecutivas de 7 dias".
- **Ranking dos cartões**: razão efeito/limiar (desc), depois dias pareados (desc), depois `hypothesisKey` (asc) para desempate determinístico.
- **Nível de evidência**: V1 usa só "Descrição" e "Exploratório/Possível associação"; não rotula "sinal consistente". Justificativa: não superestimar evidência.
- **Snapshot de like**: copia tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; renderizado pelo olho global. Conclusões salvas podem ser removidas pelo dono, nunca editadas.
- **Sigla**: até 4 caracteres (como no design), exibida exatamente como digitada (sem forçar maiúsculas). Nome até 60, unidade até 20, observação até 500 caracteres; opções ordinais 2–7.
- **"Sem resposta" em Sim/Não**: tocar de novo na opção selecionada limpa a resposta (exclui o registro de hoje do indicador único).
- **Controle de escala**: pílulas tocáveis para escalas com até 11 valores (0–10 passo 1); slider nativo acima disso.
- **Reordenação**: botões subir/descer (acessíveis) em vez de arrastar.
- **Histórico de registros**: acessado pelo indicador em "Meus indicadores"; exclusão com confirmação.
- **Rotas**: `/onboarding`, `/dashboard`, `/register`, `/indicators`, `/saved-insights`, `/insights/:hypothesisKey`, `/settings` (conta, privacidade, IA, lembrete, exclusão), `/install`.
- **Largura no computador**: coluna central de até 960 px; listas de cartões em grid `auto-fit` (mín. 300 px).
- **Conflito na conversão**: opções "Cancelar" ou "Entrar na conta existente" (após aviso de que os dados desta sessão anônima ficarão inacessíveis neste navegador; nada é apagado nem mesclado).
- **Ícones e fontes**: Material Symbols, Geist e Space Grotesk servidos pelo próprio app (pacotes npm), sem CDN.
- **Seed**: usuário `seed-user-0001` (`seed@pulsar.test`, sem senha), exatamente 30 dias terminando hoje (AC-21); e2e entra por custom token do Auth Emulator. `--demo` só com `HARNESS_ALLOW_DEMO_SEED=1` e `--project` explícito cujo id não contenha "prod".
- **Portas dos emuladores**: Firestore 8282, Auth 9299 (fonte única `app/firebase.json`). Justificativa: as padrão (8080/9099) colidem com outros serviços/emuladores órfãos.
- **Registros imutáveis**: as regras negam `update` em `entries` (nenhum valor pode ser reescrito, de nenhum dia). A substituição do registro único de hoje é um batch atômico "cria o novo documento (ID gerado) + exclui o de hoje", feito só pelo fluxo do cliente; a agregação de indicador único usa o mais recente do dia como desempate defensivo. Justificativa: impede edição retroativa por escrita direta sem validar data no servidor (AC-10/AC-11); diverge do ID determinístico sugerido na arquitetura 3.3, que é só proposta.
- **Cache de textos da IA**: gravado somente pela Function `generateInsightTexts` (Admin SDK), depois do validador de saída; o cliente só lê `users/{uid}/aiTexts` e valida de novo antes de exibir. Justificativa: cliente não consegue injetar texto não validado.
- **App Check**: fora da V1 inicial (reavaliar na etapa 7) para não bloquear emuladores.
- **Estado de dispensa do convite de salvar conta**: campos `saveAccountInviteDismissedAt` (timestamp|null) e `saveAccountInviteDismissedDayCount` (inteiro ≥ 0|null) em `users/{uid}`, validados pelas regras; reaparece quando os dias distintos com registro ≥ contagem salva + 7. Justificativa: estado no servidor sobrevive a troca de navegador após conversão e a regra fica testável sem relógio.
- **Distribuição ordinal**: contagem por opção na ordem configurada (inclui opções com 0), denominador = dias com resposta na janela de 30 dias, moda com desempate pela ordem das opções; conta como resumo factual. Justificativa: spec 6.5.1 permite retratos/distribuições ordinais sem associação.
- **Tendências só para Resultados**: Fatores nunca geram cartão de tendência (spec 6.2 "Tendência de um resultado"); ordinais e booleanos também não. Justificativa: leitura literal da spec; Fatores aparecem em retratos e associações.
