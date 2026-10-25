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
