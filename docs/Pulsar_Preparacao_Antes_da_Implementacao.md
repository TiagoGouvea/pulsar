# Pulsar — Preparação antes da implementação

**Versão:** 1.1 · **Data:** 24/10/2026  
**Finalidade:** checklist separado das especificações funcional e técnica. O desenvolvimento só deve começar quando os itens bloqueantes estiverem resolvidos.

## 1. O que o responsável pelo projeto vai fornecer (bloqueante)

- [ ] **Projeto Firebase de desenvolvimento** criado e identificado por `projectId`. Usar um projeto isolado, sem dados reais de produção.
- [ ] **Acesso autorizado ao Firebase/GCP** concedido ao desenvolvedor/agente com permissões necessárias e limitadas. Preferir login/IAM, **não enviar chaves privadas por chat** e não versionar contas de serviço.
- [ ] **Plano Firebase Blaze** ativado e faturamento associado para Cloud Functions e jobs agendados.
- [ ] **Alertas de orçamento** configurados no Google Cloud. Alertas não são limites automáticos de gastos; complementar com quotas e limites por usuário no app.
- [ ] **Design quase completo entregue:** fluxos, telas mobile e desktop quando houver, estados vazios, preenchimento, configurações de indicador, cartões de insight, timeline, login, upgrade de conta e notificações. Incluir assets, tipografia, cores e instruções de interação; informar o formato de entrega (ex.: Figma, imagens, HTML).
- [ ] **Provedor e modelo de IA** escolhidos e acesso/billing configurados para a geração de texto. Credenciais privadas devem ser guardadas no Secret Manager/ambiente de funções; nunca no bundle frontend.
- [x] **Horário do lembrete aprovado:** 20:00 em `America/Sao_Paulo`, diário, sem adaptação a viagens/fusos. Usuário apenas ativa/desativa, sem criar horários personalizados.

## 2. Firebase — configuração mínima

### Autenticação

- [ ] Ativar **Anonymous Authentication**.
- [ ] Ativar provedor **Google**.
- [ ] Ativar provedor **E-mail/Senha** e também **E-mail por link (passwordless)**: o Firebase exige ativar o primeiro para usar o segundo, embora a interface não ofereça login por senha.
- [ ] Configurar domínios autorizados de autenticação, endereço de retorno de link mágico e templates de e-mail.
- [ ] Testar upgrade **anônimo → Google** e **anônimo → link mágico** com **preservação do UID** e dados.
- [ ] Definir tratamento de credenciais já vinculadas a outra conta: **não mesclar automaticamente nem sobrescrever dados**. Informar o conflito e permitir entrar na conta existente somente após confirmação.
- [ ] Testar link mágico aberto no mesmo dispositivo/ambiente. A conversão deve vincular credencial à conta atual, não autenticar uma nova conta inadvertidamente.
- [ ] Não ativar limpeza automática de anônimos sem avaliar o risco de perder contas que ainda não foram convertidas.

### Banco e infraestrutura

- [ ] Criar **Cloud Firestore** e escolher região antes de popular os dados.
- [ ] Configurar Security Rules por UID, validações básicas e testes com Firebase Emulator Suite.
- [ ] Configurar **Firebase Hosting** com HTTPS; domínio `*.web.app` pode ser suficiente inicialmente.
- [ ] Configurar **Cloud Functions v2** e Cloud Scheduler na região definida; reservar funções para envio de lembretes, geração de textos de IA e exclusão integral de conta, conforme necessidade.
- [ ] Habilitar **Firebase Cloud Messaging para Web**, incluindo geração/configuração de chave pública VAPID e credenciais necessárias, sem colocar segredos privados no frontend.
- [ ] Configurar **App Check** onde for suportado e necessário, sem bloquear desenvolvimento local.
- [ ] Separar configurações públicas do Firebase (permitidas no cliente) de credenciais e segredos de servidor.

## 3. PWA e notificações — escopo fechado da V1

- [ ] Manifest, nome **Pulsar**, ícones instaláveis, splash e modo de apresentação conforme design.
- [ ] Registrar service worker somente para requisitos de PWA/push; **não implementar modo offline**.
- [ ] Solicitar permissão de push somente após ação explícita do usuário, nunca automaticamente no primeiro acesso.
- [ ] Uma notificação genérica por dia, **somente para quem optou por recebê-la** e ainda não fez registro naquele dia.
- [ ] Horário compartilhado por todos, baseado em `America/Sao_Paulo` (sem ajuste por fuso ou viagens nesta V1).
- [ ] Um job agendado diário às **20:00 em `America/Sao_Paulo`** chama a função que seleciona destinatários e envia via FCM. Registrar idempotentemente o envio por UID/dia para evitar duplicação, inclusive em tentativas repetidas; priorizar só o token/dispositivo ativo mais recente.
- [ ] Testar Chrome/Android e Safari/iPhone. No iPhone, push requer web app adicionado à Tela de Início e versão compatível do iOS.
- [ ] Mostrar o **convite interno** à instalação só depois de converter a conta anônima em Google/link mágico; antes, oferecer conversão. Instalação manual pelo navegador não pode ser bloqueada. No iPhone, a PWA pode ter sessão/armazenamento separado do Safari; permitir novo login definitivo.
- [ ] Se push não estiver disponível ou permissão for recusada, o restante do Pulsar funciona normalmente.
- [ ] Fora do escopo: aprendizado de horários, frequência personalizada, múltiplos lembretes, notificações por indicador e sincronização offline.

## 4. Dados e testes — obrigatórios antes de validar insights

- [ ] Implementar seed reproduzível de **um usuário de teste com aproximadamente 30 dias de uso**, com indicadores Fatores e Resultados e diferentes tipos/agregações.
- [ ] Seed com padrões sintéticos **conhecidos e verificáveis**, além de relações inexistentes, dias sem dados e múltiplos registros no mesmo dia.
- [ ] Cobrir dados explicitamente `Não` versus ausência de registro; `0` numérico versus ausência; valores extremos; indicador arquivado; dados excluídos.
- [ ] Script de seed executável **somente em desenvolvimento**, com confirmação de projeto e proteção contra gravação em produção.
- [ ] Criar **outros usuários de teste durante as simulações de uso real** para validar onboarding, conversão anônima, preenchimento e isolamento de dados. Não usar o seed como substituto desses fluxos.
- [ ] Validar exclusão de registros e novo recálculo com os dados atuais; sem reconstruir conclusões antigas curtidas.
- [ ] Validar exclusão da conta e **todos os dados relacionados**, inclusive subcoleções e tokens de push, em fluxo seguro.
- [ ] Testar regras de acesso para comprovar que um UID não lê nem altera registros de outro.
- [ ] Testar as condições estatísticas fechadas da V1, inclusive mínimo de amostras, diferenças e correlações mínimas, limite de 5 insights, associações ordinais fora de escopo e ausência de inferência causal.

## 5. Checklist do design a entregar

- [ ] Entrada anônima automática e convite contextual para salvar conta via Google/link mágico.
- [ ] Tutorial de três telas e dashboard vazio com sugestões opcionais de indicadores.
- [ ] Dashboard com resumo, botão de preenchimento rápido, insights, like/dislike e acesso à timeline.
- [ ] Cadastro/edição de Fatores e Resultados, inclusive frequência, agregação sugerida **deterministicamente pelo tipo/grupo**, escolha avançada do usuário antes de registrar, direção, faixa ideal e arquivamento.
- [ ] Componentes dos quatro tipos de resposta e observação opcional.
- [ ] Alternância global nome/sigla; emojis ocultos em modo privado; **nenhuma obrigação de mascarar gráficos**.
- [ ] Versões ou regras responsivas: avaliar a metáfora esquerda/direita em mobile e desktop; a validação visual final é humana.
- [ ] Estado sem dados suficientes para associações, estado carregando, erros de salvamento e confirmações de exclusão.
- [ ] Convite de instalação PWA **depois da conversão da conta**, instruções Android/iPhone e opt-in/opt-out de lembrete, quando compatível.

## 6. Convenções para o agente de implementação

- Tecnologias-base: **React, TypeScript, Vite, Firestore, Firebase Authentication, Firebase Hosting**; Cloud Functions somente para funções necessárias. Gerenciador de pacotes: **yarn**.
- Código, nomes de variáveis e comentários técnicos em **inglês**; interface e conteúdos do usuário somente em **pt-BR**.
- Não inventar comportamentos além da especificação. Decisões ainda não definidas devem ser explicitamente perguntadas antes de implementar.
- Usar o design fornecido como referência principal. Não redesenhar telas arbitrariamente.
- Navegadores prioritários: **Chrome e Safari**. Sem aplicativo Android/iOS nativo, integrações Health Connect ou modo offline.
- Gravar timestamps em **UTC**; frontend exibe no horário do navegador e cria chave do dia local no momento do registro. Sem validação adicional de data no servidor e sem lógica de viagens na V1.
- Gerar cálculo estatístico determinístico após inclusão/exclusão; texto com IA é **opcional**, condicionado a aceite curto e limitado a **uma chamada por usuário por dia**, até 3 textos; usar fallback com frases automáticas.
- Não implementar sistema burocrático de conformidade LGPD; manter controles mínimos necessários para dados privados: isolamento por UID, autorização, consentimento de IA, exclusão e credenciais seguras.

## 7. Critérios para liberar o início

O projeto estará pronto para começar quando: (1) houver Firebase dev com acesso e permissões, (2) o design estiver entregue, (3) o acesso ao modelo de IA estiver definido, (4) Firebase Blaze/push e orçamento estiverem configurados e (5) todos os itens marcados como bloqueantes forem resolvidos. **Horário de 20h Brasília já está decidido.**

**Nota:** este é o checklist operacional separado. Requisitos de produto e arquitetura foram harmonizados nos outros dois documentos da versão 1.1.
