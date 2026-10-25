# Dúvidas — etapa 0

Responda na linha `Resposta:` de cada item. Itens sem resposta mantêm o default escolhido.

## F-5.02

### Q-1
**Pergunta:** Quantos usos definem o convite interno para instalar a PWA?
**Escolhido:** Registros em >= 5 dias distintos e conta convertida
**Alternativas:** 3 dias (igual ao convite de conta); 7 dias; N aberturas do app
**Impacto:** Momento em que o convite de instalação aparece
Resposta: 

### Q-18
**Pergunta:** O que conta como 'alguns usos' para o convite de instalar a PWA?
**Escolhido:** Registros em >= 5 dias distintos e conta já convertida; se anônima, mostra a conversão antes
**Alternativas:** 3 dias distintos (igual ao convite de salvar conta); N aberturas do app; 7 dias
**Impacto:** Momento do convite de instalação e do opt-in do lembrete
Resposta: 

## F-4.03

### Q-2
**Pergunta:** O que é 'evidência nova material' para reexibir hipótese descartada?
**Escolhido:** >= 7 dias pareados a mais ou inversão do sinal do efeito
**Alternativas:** Qualquer mudança de evidenceVersion; Nunca reexibir na mesma janela de 30 dias; Mudança de efeito >= 50%
**Impacto:** Frequência com que insights descartados voltam
Resposta: 

### Q-19
**Pergunta:** O que é 'evidência nova material' para uma hipótese descartada (dislike) reaparecer?
**Escolhido:** >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito
**Alternativas:** Qualquer mudança de evidenceVersion; Nunca reaparecer; +14 dias pareados
**Impacto:** Frequência com que hipóteses descartadas voltam ao dashboard
Resposta: 

## F-3.02

### Q-3
**Pergunta:** Quais dias a comparação simples usa a partir do 2º dia?
**Escolhido:** Hoje vs. o dia anterior mais recente com valor do mesmo indicador, como resumo factual
**Alternativas:** Somente ontem vs. hoje; Média dos últimos dias
**Impacto:** Conteúdo dos cartões descritivos
Resposta: 

### Q-20
**Pergunta:** Como é a comparação simples a partir do 2º dia?
**Escolhido:** Hoje vs. o dia anterior mais recente com valor do mesmo indicador; conta como resumo factual entre os 5 cartões
**Alternativas:** Hoje vs. ontem estritamente; Hoje vs. média dos dias anteriores
**Impacto:** Cartões exibidos nos primeiros dias de uso
Resposta: 

### Q-39
**Pergunta:** Como comparar a partir do 2º dia?
**Escolhido:** Hoje vs. o dia anterior mais recente com valor do mesmo indicador; conta como resumo factual
**Alternativas:** Hoje vs. ontem estrito; Hoje vs. média dos dias anteriores
**Impacto:** Cartões de comparação no início do uso
Resposta: 

### Q-60
**Pergunta:** Com quais dias a comparação a partir do 2º dia é feita?
**Escolhido:** Hoje vs. o dia anterior mais recente com valor do mesmo indicador; conta como resumo factual
**Alternativas:** Hoje vs. ontem estrito; Média dos dias anteriores
**Impacto:** Conteúdo dos cartões nos primeiros dias
Resposta: 

### Q-81
**Pergunta:** Como resumir indicadores ordinais?
**Escolhido:** Contagem por opção na ordem configurada (inclui zeros), denominador = dias com resposta, moda com desempate pela ordem; só descritivo
**Alternativas:** Só a moda; Percentuais sem contagem
**Impacto:** Cartões de resumo de ordinais
Resposta: 

## F-3.03

### Q-4
**Pergunta:** Como ancorar as duas janelas de 7 dias da tendência?
**Escolhido:** hoje..hoje-6 vs hoje-7..hoje-13 (dias corridos de localDate)
**Alternativas:** Terminar no último dia com registro; Semanas de calendário
**Impacto:** Quando tendências aparecem
Resposta: 

### Q-21
**Pergunta:** Quais são as janelas da tendência?
**Escolhido:** hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate
**Alternativas:** Últimos 7 dias com registro vs. 7 anteriores com registro; Janelas excluindo hoje
**Impacto:** Quando tendências aparecem e com quais valores
Resposta: 

### Q-40
**Pergunta:** Quais são as janelas de tendência?
**Escolhido:** hoje..hoje-6 vs. hoje-7..hoje-13 (dias corridos de localDate)
**Alternativas:** Janelas de 7 dias com registro; Janelas móveis sobrepostas
**Impacto:** Quando tendências aparecem
Resposta: 

### Q-61
**Pergunta:** Como definir as duas janelas consecutivas de 7 dias das tendências?
**Escolhido:** hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate
**Alternativas:** Últimos 7 dias com registro vs. 7 anteriores com registro
**Impacto:** Quando tendências aparecem
Resposta: 

### Q-62
**Pergunta:** Tendências podem ser geradas para Fatores?
**Escolhido:** Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado')
**Alternativas:** Também para Fatores numéricos
**Impacto:** Quantidade e tipo de cartões de tendência
Resposta: 

## F-3.06

### Q-5
**Pergunta:** Critério de ordenação dos cartões elegíveis?
**Escolhido:** Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc
**Alternativas:** Só tamanho do efeito; Novidade primeiro
**Impacto:** Quais insights ocupam os 5 cartões
Resposta: 

### Q-22
**Pergunta:** Como ordenar os cartões de insight?
**Escolhido:** Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc
**Alternativas:** Só tamanho do efeito; Mais recente primeiro
**Impacto:** Quais cartões entram nos 5 exibidos
Resposta: 

### Q-41
**Pergunta:** Como ordenar os cartões?
**Escolhido:** Razão efeito/limiar desc, dias pareados desc, hypothesisKey asc
**Alternativas:** Mais recente primeiro; Somente amostra
**Impacto:** Quais 5 cartões aparecem
Resposta: 

### Q-63
**Pergunta:** Como ordenar os cartões elegíveis?
**Escolhido:** Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc
**Alternativas:** Por recência; Por p-valor
**Impacto:** Quais cartões aparecem entre os 5
Resposta: 

## F-3.07

### Q-6
**Pergunta:** Usar o nível 'sinal consistente' da arquitetura 5.5?
**Escolhido:** Não na V1; só 'Descrição' e 'Exploratório/Possível associação'
**Alternativas:** Consistente se elegível em N dias seguidos
**Impacto:** Linguagem dos cartões
Resposta: 

### Q-23
**Pergunta:** Quais níveis de evidência rotular na V1?
**Escolhido:** Somente 'Descrição' e 'Exploratório/Possível associação'; sem rótulo 'sinal consistente'
**Alternativas:** Incluir 'sinal consistente' com critério de estabilidade
**Impacto:** Linguagem dos cartões; evita superestimar evidência
Resposta: 

### Q-64
**Pergunta:** Quais níveis de evidência rotular?
**Escolhido:** Só 'Descrição' e 'Possível associação'; sem 'sinal consistente'
**Alternativas:** Três níveis incluindo 'sinal consistente'
**Impacto:** Linguagem dos cartões
Resposta: 

## F-4.01

### Q-7
**Pergunta:** O snapshot do like congela nome/sigla/emoji dos indicadores?
**Escolhido:** Sim, copia os rótulos do momento; exibição segue o olho global. Dono pode remover, nunca editar
**Alternativas:** Guardar só IDs e usar rótulos atuais; Não permitir remover conclusões
**Impacto:** Timeline após renomear/excluir indicadores
Resposta: 

### Q-24
**Pergunta:** O que o snapshot de like guarda e o que o usuário pode fazer com ele?
**Escolhido:** Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; o dono pode remover, nunca editar
**Alternativas:** Guardar só texto renderizado; Permitir editar anotações no snapshot
**Impacto:** Schema de savedInsights e regras de segurança
Resposta: 

### Q-43
**Pergunta:** O que o snapshot de like copia?
**Escolhido:** Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; removível pelo dono, nunca editável
**Alternativas:** Só IDs de indicador (rótulo atual); Texto já renderizado
**Impacto:** Estabilidade das conclusões salvas e privacidade
Resposta: 

## F-1.01

### Q-8
**Pergunta:** Limites de tamanho e formato da sigla?
**Escolhido:** Sigla até 4 chars exibida como digitada; nome 60; unidade 20; observação 500; 2–7 opções ordinais
**Alternativas:** Sigla até 6; Forçar maiúsculas como no design
**Impacto:** Validação de formulário e regras
Resposta: 

### Q-25
**Pergunta:** Quais são os limites de tamanho dos campos?
**Escolhido:** Sigla até 4 caracteres (exibida como digitada), nome até 60, unidade até 20, observação até 500; opções ordinais 2–7
**Alternativas:** Sigla até 3 e forçada em maiúsculas; Limites maiores
**Impacto:** Validação no cliente e nas Security Rules
Resposta: 

### Q-66
**Pergunta:** Limites de tamanho de campos?
**Escolhido:** Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7
**Alternativas:** Sigla até 3; Sigla forçada em maiúsculas
**Impacto:** Validação no cliente e nas regras
Resposta: 

## F-2.08

### Q-9
**Pergunta:** Como deixar Sim/Não sem resposta após responder?
**Escolhido:** Tocar de novo na opção selecionada limpa (exclui o registro de hoje do indicador único)
**Alternativas:** Botão 'Limpar' separado; Não permitir limpar
**Impacto:** Interação do preenchimento rápido
Resposta: 

### Q-26
**Pergunta:** Como representar 'sem resposta' em indicador Sim/Não?
**Escolhido:** Tocar de novo na opção selecionada limpa a resposta (exclui o registro de hoje do indicador único)
**Alternativas:** Botão 'limpar' separado; Terceira opção 'sem resposta'
**Impacto:** Distinção entre Não explícito e ausência nas estatísticas
Resposta: 

### Q-27
**Pergunta:** Qual controle usar para escalas?
**Escolhido:** Pílulas tocáveis para escalas com até 11 valores (0–10 passo 1); slider nativo acima disso
**Alternativas:** Sempre slider; Sempre pílulas
**Impacto:** UI do preenchimento rápido
Resposta: 

### Q-45
**Pergunta:** Como representar 'sem resposta' em Sim/Não?
**Escolhido:** Tocar de novo na opção selecionada limpa a resposta (exclui o registro de hoje)
**Alternativas:** Botão 'Limpar' explícito; Terceira opção 'Sem resposta'
**Impacto:** Distinção entre Não e ausência
Resposta: 

### Q-46
**Pergunta:** Qual controle usar para escala?
**Escolhido:** Pílulas tocáveis até 11 valores; slider nativo acima disso
**Alternativas:** Sempre slider; Sempre pílulas
**Impacto:** Usabilidade do preenchimento
Resposta: 

## F-0.02

### Q-10
**Pergunta:** Controle da escala: slider ou pílulas?
**Escolhido:** Pílulas tocáveis até 11 valores (como no design); slider nativo acima disso
**Alternativas:** Sempre slider nativo
**Impacto:** Componente Slider do design system
Resposta: 

### Q-17
**Pergunta:** Fontes e ícones via CDN do Google ou empacotados?
**Escolhido:** Empacotados (npm: @fontsource-variable/geist, space-grotesk, material-symbols)
**Alternativas:** CDN Google Fonts como no code.html
**Impacto:** Determinismo dos testes visuais e privacidade
Resposta: 

### Q-33
**Pergunta:** De onde servir ícones e fontes?
**Escolhido:** Material Symbols, Geist e Space Grotesk servidos pelo próprio app via pacotes npm, sem CDN
**Alternativas:** Google Fonts CDN
**Impacto:** Privacidade, CSP e tamanho do bundle (fonte de ícones de 3,6 MB, ver F-7.06)
Resposta: 

## F-2.05

### Q-11
**Pergunta:** Como reordenar indicadores?
**Escolhido:** Botões subir/descer acessíveis
**Alternativas:** Arrastar e soltar; Ambos
**Impacto:** Tela Meus indicadores
Resposta: 

## F-2.09

### Q-12
**Pergunta:** Onde fica o histórico de registros para exclusão retroativa?
**Escolhido:** No indicador, a partir de Meus indicadores
**Alternativas:** Tela de calendário/dia; No dashboard
**Impacto:** Navegação e nova rota
Resposta: 

### Q-48
**Pergunta:** Onde fica o histórico de registros?
**Escolhido:** A partir do indicador em Meus indicadores; exclusão com confirmação
**Alternativas:** Tela de histórico global por dia
**Impacto:** Navegação para exclusão retroativa
Resposta: 

## F-1.04

### Q-13
**Pergunta:** Quais rotas e largura máxima no computador?
**Escolhido:** /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:key, /settings, /install; coluna até 960 px com grids auto-fit (mín. 300 px)
**Alternativas:** Preenchimento como painel na home; Coluna de 448 px fixa
**Impacto:** Estrutura de navegação e layout no desktop
Resposta: 

### Q-30
**Pergunta:** Quais são as rotas do app?
**Escolhido:** /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install
**Alternativas:** Rotas em pt-BR
**Impacto:** e2e/routes.json e links internos
Resposta: 

### Q-31
**Pergunta:** Como o layout estica no computador?
**Escolhido:** Coluna central de até 960 px; listas de cartões em grid auto-fit (mín. 300 px)
**Alternativas:** Coluna fixa de 480 px; Layout desktop dedicado
**Impacto:** Smoke de layout desktop e validação humana do design
Resposta: 

### Q-49
**Pergunta:** Quais rotas usar?
**Escolhido:** /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install
**Alternativas:** Nomes em pt-BR
**Impacto:** URLs e gates de navegador
Resposta: 

### Q-72
**Pergunta:** Como o layout se comporta no computador?
**Escolhido:** Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px)
**Alternativas:** Coluna fixa de 375 px
**Impacto:** Aparência no desktop
Resposta: 

## F-1.09

### Q-14
**Pergunta:** Opções na tela de conflito de credencial?
**Escolhido:** Cancelar ou Entrar na conta existente após aviso de que a sessão anônima ficará inacessível; nada é apagado/mesclado
**Alternativas:** Só cancelar
**Impacto:** Fluxo de conversão
Resposta: 

### Q-32
**Pergunta:** Que opções mostrar quando a credencial já pertence a outro UID?
**Escolhido:** 'Cancelar' ou 'Entrar na conta existente' após aviso de que os dados desta sessão anônima ficam inacessíveis neste navegador; nada é apagado nem mesclado
**Alternativas:** Mesclar dados automaticamente; Só cancelar
**Impacto:** Risco de perda de dados na conversão
Resposta: 

### Q-51
**Pergunta:** Que opções oferecer no conflito de credencial na conversão?
**Escolhido:** 'Cancelar' ou 'Entrar na conta existente' após aviso; nada é apagado nem mesclado
**Alternativas:** Somente cancelar
**Impacto:** Risco de perda de acesso aos dados anônimos
Resposta: 

### Q-73
**Pergunta:** Como resolver conflito de credencial na conversão?
**Escolhido:** Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado
**Alternativas:** Mesclar dados; Substituir conta existente
**Impacto:** Risco de perda de dados
Resposta: 

## F-0.03

### Q-15
**Pergunta:** Semântica de seed --demo e login do usuário do seed
**Escolhido:** --demo exige HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod'; usuário seed-user-0001 sem senha, e2e entra por custom token do Auth Emulator
**Alternativas:** --demo só gera JSON local; Usuário seed com senha
**Impacto:** Como o seed é usado fora do emulador e nos e2e
Resposta: 

### Q-34
**Pergunta:** Como é o usuário do seed e como o e2e entra nele?
**Escolhido:** seed-user-0001 (seed@pulsar.test, sem senha), 45 dias; e2e entra por custom token do Auth Emulator; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod'
**Alternativas:** 30 dias; Login por senha no emulador
**Impacto:** Fixtures de e2e e segurança do seed
Resposta: 

### Q-53
**Pergunta:** Quantos dias e qual usuário no seed?
**Escolhido:** seed-user-0001 (seed@pulsar.test), exatamente 30 dias terminando hoje; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e projeto não-prod
**Alternativas:** 45 dias; 60 dias
**Impacto:** AC-21 e elegibilidade das associações plantadas
Resposta: 

### Q-75
**Pergunta:** Como identificar e autenticar o usuário do seed?
**Escolhido:** seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod'
**Alternativas:** Usuário com senha no emulador
**Impacto:** Fixtures de e2e e segurança do seed
Resposta: 

## F-7.05

### Q-16
**Pergunta:** Ativar App Check na V1?
**Escolhido:** Não inicialmente; reavaliar na etapa 7
**Alternativas:** Ativar com reCAPTCHA Enterprise e debug token nos emuladores
**Impacto:** Proteção contra abuso das functions
Resposta: 

### Q-36
**Pergunta:** Usar App Check na V1?
**Escolhido:** Fora da V1 inicial; reavaliar na etapa 7
**Alternativas:** App Check com reCAPTCHA Enterprise desde a etapa 1
**Impacto:** Proteção contra abuso das functions vs. atrito com emuladores
Resposta: 

## F-0.01

### Q-35
**Pergunta:** Quais portas usar nos emuladores?
**Escolhido:** Firestore 8282, Auth 9299 (fonte única app/firebase.json)
**Alternativas:** Portas padrão 8080/9099
**Impacto:** Colisão com outros serviços locais
Resposta: 

## F-3.12

### Q-38
**Pergunta:** O que é 'evidência nova material' para reexibir hipótese com dislike?
**Escolhido:** >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito
**Alternativas:** +3 dias; +14 dias; qualquer mudança de evidenceVersion
**Impacto:** Frequência com que achados descartados voltam
Resposta: 

### Q-59
**Pergunta:** O que é 'evidência nova material' para uma hipótese com dislike reaparecer?
**Escolhido:** >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito
**Alternativas:** Qualquer novo dia pareado; Mudança de magnitude >= X%; Nunca reaparecer
**Impacto:** Frequência com que cartões descartados voltam
Resposta: 

## F-7.02

### Q-50
**Pergunta:** Como esticar no computador?
**Escolhido:** Coluna central até 960 px; cartões em grid auto-fit (mín. 300 px)
**Alternativas:** Coluna fixa de 480 px; Sem limite
**Impacto:** Layout no desktop
Resposta: 

## F-2.07

### Q-56
**Pergunta:** Como impedir edição retroativa de registros sem validar data no servidor?
**Escolhido:** Registros imutáveis: rules negam update; substituir o único de hoje = batch create (novo ID) + delete do de hoje
**Alternativas:** ID determinístico com update permitido; Comparar recordedAt com request.time nas rules
**Impacto:** AC-10/AC-11; diverge do ID determinístico da arquitetura 3.3
Resposta: 

### Q-77
**Pergunta:** Registros podem ser atualizados?
**Escolhido:** Não; update negado. Substituir o único de hoje = batch create + delete
**Alternativas:** ID determinístico por dia com update permitido só hoje
**Impacto:** Imutabilidade e ausência de validação de data no servidor
Resposta: 

## F-6.02

### Q-57
**Pergunta:** Quem grava o cache de textos da IA?
**Escolhido:** Somente a Function, após validateAiText; cliente só lê e revalida antes de exibir
**Alternativas:** Cliente grava com regras de schema
**Impacto:** Impede injeção de texto não validado
Resposta: 

## F-2.11

### Q-80
**Pergunta:** Onde guardar o estado de dispensa do convite de salvar conta?
**Escolhido:** users/{uid}.saveAccountInviteDismissedAt (timestamp|null) e saveAccountInviteDismissedDayCount (int >= 0|null), validados em F-1.08
**Alternativas:** localStorage; Subcoleção dedicada
**Impacto:** Persistência entre navegadores e schema das regras
Resposta: 
