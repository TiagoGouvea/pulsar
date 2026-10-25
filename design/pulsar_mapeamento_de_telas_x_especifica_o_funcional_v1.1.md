# Pulsar — Mapeamento de Telas e Especificação Funcional (V1.1)

Este documento relaciona todas as telas desenvolvidas no projeto com as respectivas seções e diretrizes da **Especificação Funcional Completa (v1.1)** do Pulsar.

---

## 1. Fluxo de Boas-Vindas & Tutorial

### 1.1 Onboarding 1: Fatores
- **Tela no Projeto:** `Onboarding 1: Fatores` (`{{DATA:SCREEN:SCREEN_10}}`)
- **Seção na Documentação:** **Seção 3.1** *(Primeiro acesso — tutorial e configuração)* e **Seção 1.1 / 2** *(Conceitos: O que são Fatores)*.
- **Papel da Tela:** Primeira tela do tutorial em 3 etapas. Explica o conceito de **Fatores** (o que a pessoa faz, consome, vivencia ou registra, sem pressupor bom ou ruim) utilizando o código de cor azul/frio e micro-interações de resposta rápida.

### 1.2 Onboarding 2: Resultados
- **Tela no Projeto:** `Onboarding 2: Resultados` (`{{DATA:SCREEN:SCREEN_12}}`)
- **Seção na Documentação:** **Seção 3.1** *(Primeiro acesso)* e **Seção 4.3** *(Direção desejável para Resultados: maior, menor ou faixa ideal)*.
- **Papel da Tela:** Segunda tela do tutorial. Introduz os **Resultados** (percepções subjetivas ou medições fisiológicas em tom violeta) e demonstra que o usuário pode definir o que considera ideal (ex: quanto maior melhor para energia, quanto menor melhor para dor).

### 1.3 Onboarding 3: Associações & Privacidade
- **Tela no Projeto:** `Onboarding 3: Associações` (`{{DATA:SCREEN:SCREEN_8}}`)
- **Seção na Documentação:** **Seção 3.1**, **Seção 4.4** *(Modo privado de siglas e "olhinho")* e **Seção 6.6** *(Comunicação responsável: correlação não é causalidade)*.
- **Papel da Tela:** Conclusão do onboarding. Apresenta o funcionamento das descobertas (Tipo 3), a ressalva científica de que correlações não implicam relações de causa direta, o modo de discrição visual por siglas e a conta anônima inicial.

---

## 2. Ciclo de Vida do Dashboard (Estados Temporais)

### 2.1 Dashboard Inicial (Dia 1 — Estado Vazio)
- **Tela no Projeto:** `Dashboard Inicial (Estado Vazio)` (`{{DATA:SCREEN:SCREEN_6}}`)
- **Seção na Documentação:** **Seção 3.1** *(Sugestões iniciais)*, **Seção 5.4** *(Estado vazio e feedback)* e **Seção 6.1** *(Objetivos do dashboard)*.
- **Papel da Tela:** Estado pós-onboarding imediato em conta anônima limpa. Exibe as 3–4 sugestões científicas iniciais (Exercício `EXE`, Café `CAF`, Energia `ENE`, Concentração `CON`) com botão de adição rápida, ação para criar indicador próprio e linha do tempo de expectativa metodológica (Dia 1 ➔ Dia 2 ➔ Dia 14). *Nenhum indicador é criado automaticamente.*

### 2.2 Dashboard — Dia 2 (Comparações Iniciais)
- **Tela no Projeto:** `Dashboard — Dia 2 (Comparações Iniciais)` (`{{DATA:SCREEN:SCREEN_4}}`)
- **Seção na Documentação:** **Seção 6.1** *(A partir do segundo dia)*, **Seção 6.2 (Tipo 1 e Tipo 2)**, **Seção 6.5.1** *(Tabela de critérios estatísticos)* e **Seção 13 (Jornada 1)**.
- **Papel da Tela:** Demonstra o comportamento após dois dias de registros. Exibe resumos factuais e contrastes descritivos puros entre dias consecutivos (ex: energia 5 ontem vs. 7 hoje), sem extrapolar nem inventar correlações prematuras antes do limiar matemático mínimo.

### 2.3 Dashboard — Dia 14 (Primeira Correlação Desbloqueada)
- **Tela no Projeto:** `Dashboard — Dia 14 (Primeira Correlação)` (`{{DATA:SCREEN:SCREEN_2}}`)
- **Seção na Documentação:** **Seção 6.2 (Tipo 3)** *(Associação entre fator e resultado)* e **Seção 6.5.1** *(Critérios: $\ge 14$ pares válidos, $\ge 5$ respostas por grupo e diferença $\ge 1,5$ ponto)*.
- **Papel da Tela:** Simula o marco metodológico em que a margem mínima de 14 dias pareados é atingida. Apresenta o card auditado de associação estatística ($r = +0.64$), mini-gráfico de dispersão temporal, validação dos critérios metodológicos, ressalva científica e opções de snapshot (like) e dislike.

### 2.4 Dashboard & Insights (Estado Maduro)
- **Tela no Projeto:** `Dashboard & Insights` (`{{DATA:SCREEN:SCREEN_26}}`)
- **Seção na Documentação:** **Seção 6.1 a 6.5** *(Composição do dashboard, limite de 5 cards, curadoria de insights e recálculo determinístico)*.
- **Papel da Tela:** Experiência central e contínua do aplicativo. Contém cabeçalho com alternador de siglas ("olho"), botão principal "Registrar agora", resumo do dia atual, feed equilibrado de cards de insights (retratos, tendências e associações) e links para aprofundamento.

---

## 3. Coleta e Registro Diário

### 3.1 Preenchimento Rápido
- **Tela no Projeto:** `Preenchimento Rápido` (`{{DATA:SCREEN:SCREEN_24}}`)
- **Seção na Documentação:** **Seção 5.1 a 5.3** *(Fluxo de preenchimento, nenhum campo obrigatório, único vs. múltiplos registros e observação opcional)* e **Seção 7.2** *(Prioridade mobile e toque rápido)*.
- **Papel da Tela:** Painel de registro projetado para ser concluído em poucos segundos. Separa visualmente Fatores e Resultados, oferece seletores compactos (Sim/Não, sliders 0–10, inputs numéricos com unidade), permite preenchimento parcial e salva instantaneamente em UTC.

---

## 4. Gestão de Indicadores

### 4.1 Meus Indicadores
- **Tela no Projeto:** `Meus Indicadores` (`{{DATA:SCREEN:SCREEN_20}}`)
- **Seção na Documentação:** **Seção 4.1 a 4.5** *(Campos do indicador, frequência, agregação, reordenação, arquivamento e restauração)*.
- **Papel da Tela:** Listagem e gerenciamento de todos os indicadores criados pelo usuário. Mostra a divisão entre Fatores e Resultados, siglas, emojis, status de agregação diária (soma, média, último valor), opções de reordenação e gestão de indicadores arquivados.

### 4.2 Novo Indicador (Modal de Cadastro)
- **Tela no Projeto:** `Novo Indicador (Modal)` (`{{DATA:SCREEN:SCREEN_18}}`)
- **Seção na Documentação:** **Seção 4.1 a 4.3** *(Campos obrigatórios, 4 tipos de resposta, frequência, sugestão determinística de agregação e direção desejável)*.
- **Papel da Tela:** Modal completo de criação de indicadores. Permite definir grupo (Fator/Resultado), nome completo, sigla personalizada (ou automática de 3 letras), tipo de resposta (booleano, escala 0–10, ordinal ou número com unidade), frequência diária e parâmetros de direção desejável (maior, menor, faixa ideal).

---

## 5. Auditoria Científica & Conclusões Salvas

### 5.1 Detalhes do Insight (Auditoria Estatística)
- **Tela no Projeto:** `Detalhes do Insight` (`{{DATA:SCREEN:SCREEN_16}}`)
- **Seção na Documentação:** **Seção 6.3** *(Ação "Entender melhor / Entenda a análise")*, **Seção 6.5.1** *(Critérios estatísticos)* e **Seção 6.6** *(Comunicação responsável)*.
- **Papel da Tela:** Tela de aprofundamento técnico e transparência científica. Acessada via card de insight, exibe distribuição detalhada dos pontos pareados, comparação entre grupos de contraste, tamanho da amostra, critérios de validade atendidos e notas de não-causalidade.

### 5.2 Conclusões Salvas (Timeline)
- **Tela no Projeto:** `Conclusões Salvas` (`{{DATA:SCREEN:SCREEN_22}}`)
- **Seção na Documentação:** **Seção 6.4** *(Like, dislike e timeline de conclusões)* e **Seção 13 (Jornada 4)**.
- **Papel da Tela:** Histórico pessoal de insights que receberam curtida (👍). Preserva snapshots imutáveis com métricas, janela temporal e data original da captura, garantindo a memória analítica mesmo que novos registros alterem tendências futuras.

---

## 6. Governança, Conta e PWA

### 6.1 Configurações, Conta Anônima e Notificações
- **Tela no Projeto:** `Configurações e Conta` (`{{DATA:SCREEN:SCREEN_14}}`)
- **Seção na Documentação:** **Seção 3** *(Conversão de conta anônima para Google ou Magic Link)*, **Seção 4.4** *(Privacidade por siglas)*, **Seção 6.5** *(Consentimento de IA)*, **Seção 8** *(PWA instalável e lembrete das 20h)* e **Seção 9** *(Exclusão de conta e dados)*.
- **Papel da Tela:** Painel de controle do usuário. Permite vincular a conta anônima permanente sem perda de UID, gerenciar chave global de privacidade visual, conceder/revogar consentimento de IA, ativar o lembrete diário único às 20h (Brasília) e solicitar exclusão completa de dados.

---

## Matriz Resumo de Cobertura

| Componente / Fluxo | Telas Mapeadas | Status de Cobertura V1.1 |
|---|---|---|
| **Tutorial de Onboarding** | Telas 1, 2 e 3 | 100% (Passos 1 a 3 com conceitos e privacidade) |
| **Evolução do Dashboard** | Telas 4, 5, 6 e 7 | 100% (Vazio ➔ Comparações ➔ Correlação ➔ Feed contínuo) |
| **Registro Diário** | Tela 8 | 100% (Fluxo rápido, sem campos obrigatórios) |
| **Gestão de Variáveis** | Telas 9 e 10 | 100% (Listagem, arquivamento e modal estruturado) |
| **Inteligência & Auditoria**| Telas 11 e 12 | 100% (Auditoria estatística e timeline de snapshots) |
| **Conta, PWA & Privacidade**| Tela 13 | 100% (Auth anônima, conversão, PWA e lembrete 20h) |
