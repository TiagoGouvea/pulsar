# Dúvidas — etapa 0

Responda na linha `Resposta:` com a letra da opção (ex.: `B`) ou com texto livre. Itens sem resposta mantêm a opção A (padrão).

## F-5.02

### Q-1

**Pergunta:** O que conta como 'alguns usos' para o convite de instalar a PWA?
**Impacto:** Momento em que o convite de instalação aparece
A) Registros em >= 5 dias distintos e conta já convertida; se anônima, oferecer conversão antes (padrão)
B) 3 dias distintos
C) 7 dias distintos
D) N aberturas do app
Resposta: D 2 aberturas, repetir nos dias seguintes ao usar

## F-3.12

### Q-2

**Pergunta:** O que é 'evidência nova material' para uma hipótese com dislike reaparecer?
**Impacto:** Frequência com que cartões descartados voltam
A) >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito (padrão)
B) Qualquer novo dia pareado
C) Mudança de magnitude >= X%
D) Nunca reaparecer
Resposta: a

## F-3.02

### Q-3

**Pergunta:** Com quais dias a comparação a partir do 2º dia é feita?
**Impacto:** Conteúdo dos cartões nos primeiros dias
A) Hoje vs. o dia anterior mais recente com valor do mesmo indicador; conta como resumo factual (padrão)
B) Hoje vs. ontem estrito
C) Média dos dias anteriores
Resposta: c - talvez 7 ou 10 dias

### Q-24

**Pergunta:** Como resumir indicadores ordinais?
**Impacto:** Cartões de resumo de ordinais
A) Contagem por opção na ordem configurada (inclui zeros), denominador = dias com resposta, moda com desempate pela ordem; só descritivo (padrão)
B) Só a moda
C) Percentuais sem contagem
Resposta: a

## F-3.03

### Q-4

**Pergunta:** Como definir as duas janelas consecutivas de 7 dias das tendências?
**Impacto:** Quando tendências aparecem
A) hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate (padrão)
B) Últimos 7 dias com registro vs. 7 anteriores com registro
Resposta:a

### Q-5

**Pergunta:** Tendências podem ser geradas para Fatores?
**Impacto:** Quantidade e tipo de cartões de tendência
A) Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') (padrão)
B) Também para Fatores numéricos
Resposta: a

## F-3.06

### Q-6

**Pergunta:** Como ordenar os cartões elegíveis?
**Impacto:** Quais cartões aparecem entre os 5
A) Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc (padrão)
B) Por recência
C) Por p-valor
Resposta: A

## F-3.07

### Q-7

**Pergunta:** Quais níveis de evidência rotular?
**Impacto:** Linguagem dos cartões
A) Só 'Descrição' e 'Possível associação'; sem 'sinal consistente' (padrão)
B) Três níveis incluindo 'sinal consistente'
Resposta: A

## F-4.01

### Q-8

**Pergunta:** O que o snapshot de like copia?
**Impacto:** Estabilidade e privacidade das Conclusões salvas
A) Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; removível, nunca editável (padrão)
B) Só o texto renderizado
C) Referência ao indicador vivo
Resposta: a

## F-1.01

### Q-9

**Pergunta:** Limites de tamanho de campos?
**Impacto:** Validação no cliente e nas regras
A) Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7 (padrão)
B) Sigla até 3
C) Sigla forçada em maiúsculas
Resposta: a

## F-2.08

### Q-10

**Pergunta:** Como representar 'sem resposta' em Sim/Não?
**Impacto:** Interação do preenchimento rápido
A) Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje (padrão)
B) Terceira opção 'Limpar'
Resposta: a

### Q-11

**Pergunta:** Qual controle usar para escala?
**Impacto:** Velocidade de preenchimento
A) Pílulas tocáveis até 11 valores; slider nativo acima disso (padrão)
B) Sempre slider
Resposta: a

## F-2.05

### Q-12

**Pergunta:** Como reordenar indicadores?
**Impacto:** Acessibilidade e complexidade
A) Botões subir/descer acessíveis (padrão)
B) Arrastar e soltar
Resposta: a

## F-2.09

### Q-13

**Pergunta:** Onde fica o histórico de registros?
**Impacto:** Navegação
A) A partir do indicador em Meus indicadores, exclusão com confirmação (padrão)
B) Tela de histórico global por dia
Resposta: a

## F-1.04

### Q-14

**Pergunta:** Quais rotas usar?
**Impacto:** URLs e gates de navegador
A) /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install (padrão)
B) Rotas em pt-BR
Resposta: a

### Q-15

**Pergunta:** Como o layout se comporta no computador?
**Impacto:** Aparência no desktop
A) Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) (padrão)
B) Coluna fixa de 375 px
Resposta: a

## F-1.09

### Q-16

**Pergunta:** Como resolver conflito de credencial na conversão?
**Impacto:** Risco de perda de dados
A) Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado (padrão)
B) Mesclar dados
C) Substituir conta existente
Resposta: a

## F-0.02

### Q-17

**Pergunta:** De onde servir ícones e fontes?
**Impacto:** Privacidade e tamanho do bundle
A) Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN (padrão)
B) Google Fonts CDN
Resposta:a

## F-0.03

### Q-18

**Pergunta:** Como identificar e autenticar o usuário do seed?
**Impacto:** Fixtures de e2e e segurança do seed
A) seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod' (padrão)
B) Usuário com senha no emulador
Resposta:a

## F-0.04

### Q-19

**Pergunta:** Quais portas usar nos emuladores?
**Impacto:** Colisão com outros serviços locais
A) Firestore 8282, Auth 9299 (fonte única app/firebase.json) (padrão)
B) Portas padrão 8080/9099
Resposta: a

## F-2.07

### Q-20

**Pergunta:** Registros podem ser atualizados?
**Impacto:** Imutabilidade e ausência de validação de data no servidor
A) Não; update negado. Substituir o único de hoje = batch create + delete (padrão)
B) ID determinístico por dia com update permitido só hoje
Resposta: b

## F-6.02

### Q-21

**Pergunta:** Quem grava o cache de textos da IA?
**Impacto:** Injeção de texto não validado
A) Só a Function generateInsightTexts após validação; cliente só lê e valida de novo (padrão)
B) Cliente grava o cache
Resposta: a

## F-7.05

### Q-22

**Pergunta:** Usar App Check na V1?
**Impacto:** Proteção contra abuso vs. atrito com emuladores
A) Fora da V1 inicial; reavaliar na etapa 7 (padrão)
B) Ativar desde o início
Resposta: a

## F-2.11

### Q-23

**Pergunta:** Onde guardar o estado de dispensa do convite de salvar conta?
**Impacto:** Persistência entre navegadores e schema das regras
A) users/{uid}.saveAccountInviteDismissedAt (timestamp|null) e saveAccountInviteDismissedDayCount (int >= 0|null), validados em F-1.08 (padrão)
B) localStorage
C) Subcoleção dedicada
Resposta: a
