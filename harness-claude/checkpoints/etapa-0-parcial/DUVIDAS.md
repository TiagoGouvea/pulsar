# Dúvidas — etapa 0

Responda na linha `Resposta:` de cada item. Itens sem resposta mantêm o default escolhido.

## F-5.02

### Q-1
**Pergunta:** Quantos usos definem o convite interno para instalar a PWA?
**Escolhido:** Registros em >= 5 dias distintos e conta convertida
**Alternativas:** 3 dias (igual ao convite de conta); 7 dias; N aberturas do app
**Impacto:** Momento em que o convite de instalação aparece
Resposta: 

## F-4.03

### Q-2
**Pergunta:** O que é 'evidência nova material' para reexibir hipótese descartada?
**Escolhido:** >= 7 dias pareados a mais ou inversão do sinal do efeito
**Alternativas:** Qualquer mudança de evidenceVersion; Nunca reexibir na mesma janela de 30 dias; Mudança de efeito >= 50%
**Impacto:** Frequência com que insights descartados voltam
Resposta: 

## F-3.02

### Q-3
**Pergunta:** Quais dias a comparação simples usa a partir do 2º dia?
**Escolhido:** Hoje vs. o dia anterior mais recente com valor do mesmo indicador, como resumo factual
**Alternativas:** Somente ontem vs. hoje; Média dos últimos dias
**Impacto:** Conteúdo dos cartões descritivos
Resposta: 

## F-3.03

### Q-4
**Pergunta:** Como ancorar as duas janelas de 7 dias da tendência?
**Escolhido:** hoje..hoje-6 vs hoje-7..hoje-13 (dias corridos de localDate)
**Alternativas:** Terminar no último dia com registro; Semanas de calendário
**Impacto:** Quando tendências aparecem
Resposta: 

## F-3.06

### Q-5
**Pergunta:** Critério de ordenação dos cartões elegíveis?
**Escolhido:** Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc
**Alternativas:** Só tamanho do efeito; Novidade primeiro
**Impacto:** Quais insights ocupam os 5 cartões
Resposta: 

## F-3.07

### Q-6
**Pergunta:** Usar o nível 'sinal consistente' da arquitetura 5.5?
**Escolhido:** Não na V1; só 'Descrição' e 'Exploratório/Possível associação'
**Alternativas:** Consistente se elegível em N dias seguidos
**Impacto:** Linguagem dos cartões
Resposta: 

## F-4.01

### Q-7
**Pergunta:** O snapshot do like congela nome/sigla/emoji dos indicadores?
**Escolhido:** Sim, copia os rótulos do momento; exibição segue o olho global. Dono pode remover, nunca editar
**Alternativas:** Guardar só IDs e usar rótulos atuais; Não permitir remover conclusões
**Impacto:** Timeline após renomear/excluir indicadores
Resposta: 

## F-1.01

### Q-8
**Pergunta:** Limites de tamanho e formato da sigla?
**Escolhido:** Sigla até 4 chars exibida como digitada; nome 60; unidade 20; observação 500; 2–7 opções ordinais
**Alternativas:** Sigla até 6; Forçar maiúsculas como no design
**Impacto:** Validação de formulário e regras
Resposta: 

## F-2.08

### Q-9
**Pergunta:** Como deixar Sim/Não sem resposta após responder?
**Escolhido:** Tocar de novo na opção selecionada limpa (exclui o registro de hoje do indicador único)
**Alternativas:** Botão 'Limpar' separado; Não permitir limpar
**Impacto:** Interação do preenchimento rápido
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

## F-1.04

### Q-13
**Pergunta:** Quais rotas e largura máxima no computador?
**Escolhido:** /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:key, /settings, /install; coluna até 960 px com grids auto-fit (mín. 300 px)
**Alternativas:** Preenchimento como painel na home; Coluna de 448 px fixa
**Impacto:** Estrutura de navegação e layout no desktop
Resposta: 

## F-1.09

### Q-14
**Pergunta:** Opções na tela de conflito de credencial?
**Escolhido:** Cancelar ou Entrar na conta existente após aviso de que a sessão anônima ficará inacessível; nada é apagado/mesclado
**Alternativas:** Só cancelar
**Impacto:** Fluxo de conversão
Resposta: 

## F-0.03

### Q-15
**Pergunta:** Semântica de seed --demo e login do usuário do seed
**Escolhido:** --demo exige HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod'; usuário seed-user-0001 sem senha, e2e entra por custom token do Auth Emulator
**Alternativas:** --demo só gera JSON local; Usuário seed com senha
**Impacto:** Como o seed é usado fora do emulador e nos e2e
Resposta: 

## F-7.05

### Q-16
**Pergunta:** Ativar App Check na V1?
**Escolhido:** Não inicialmente; reavaliar na etapa 7
**Alternativas:** Ativar com reCAPTCHA Enterprise e debug token nos emuladores
**Impacto:** Proteção contra abuso das functions
Resposta: 
