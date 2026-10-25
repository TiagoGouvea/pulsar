# Product Requirements Document (PRD) — Pulsar (V1.1)

**Produto:** Pulsar — Aplicativo Web / PWA de Acompanhamento Pessoal e Descoberta de Associações  
**Versão:** 1.1 Executiva  
**Status:** Escopo Aprovado & Interface 100% Desenhada (13 Telas Mapeadas)  
**Público-alvo:** Pessoas interessadas em autocuidado, bio-analytics, saúde personalizada, rotina e produtividade baseados em evidências empíricas próprias.  
**Plataforma principal:** Web Responsiva (Mobile-First) / PWA instalável (Chrome no Android/Desktop e Safari no iOS).

---

## 1. Visão Executiva e Proposta de Valor

O **Pulsar** é um laboratório pessoal de dados diários. Ele permite que qualquer pessoa acompanhe hábitos, consumos e rotinas (**Fatores**) e os cruze com percepções subjetivas e biométricas de bem-estar (**Resultados**).

### Princípio Fundamental
> **"Registrar em poucos toques e descobrir relações úteis entre o que a pessoa faz e como ela se sente — com absoluto rigor ético: correlação nunca implica causalidade direta."**

Ao contrário de plataformas genéricas ou quantificadores complexos que exigem hardware proprietário ou dezenas de campos burocráticos, o Pulsar foca em:
1. **Fricção Mínima:** Preenchimento diário completável em menos de 15 segundos;
2. **Personalização Total:** Liberdade para criar qualquer indicador sem catálogo imposto;
3. **Evolução Gradual e Transparente:** Resumos factuais nos primeiros dias e associações estatísticas estritas somente após maturidade amostral ($\ge 14$ dias pareados);
4. **Discrição e Privacidade:** Modo padrão por siglas (*privacy-first*) e autenticação anônima imediata sem barreiras de entrada.

---

## 2. Objetivos de Negócio e Metas de Produto

| Objetivo | Métrica / Critério de Sucesso |
|---|---|
| **Zero Fricção de Adoção** | 100% dos usuários iniciam o uso imediatamente via Firebase Anonymous Auth, sem tela de bloqueio de cadastro. |
| **Retenção & Rapidez de Registro** | Tempo médio de registro diário < 20 segundos; nenhum campo obrigatório. |
| **Integridade Estatística** | Zero extrapolações antes dos limiares matemáticos definidos (14 pares para Pearson / diferenças $\ge 1.5$ pontos). |
| **Soberania do Usuário** | Conversão de conta preservando UID em um clique; exclusão total de dados e consentimento explícito para IA. |

---

## 3. Personas & Jornadas do Usuário

### Persona 1: O Otimizador Consciente (Biohacker / Produtividade)
- **Perfil:** Toma suplementos (ex: Coenzima Q10, Magnésio), monitora café e quer saber se o exercício matinal afeta a energia ou o foco à tarde.
- **Dor:** Planilhas manuais são chatas de preencher no celular; apps de saúde exigem vestíveis caros.
- **Necessidade no Pulsar:** Criar indicadores específicos com unidades personalizadas (`mg`, `xícaras`) e validar correlações numéricas.

### Persona 2: Acompanhamento de Bem-Estar e Sintomas
- **Perfil:** Deseja entender gatilhos de enxaqueca, dor ou oscilações de humor e sono.
- **Dor:** Medo de compartilhar dados íntimos em redes ou plataformas que vendem informações.
- **Necessidade no Pulsar:** Modo privado com siglas em locais públicos, conta anônima segura e capacidade de definir direção ideal ("quanto menor, melhor" para dor).

---

## 4. Requisitos Funcionais (Core Features)

### 4.1 Onboarding e Conta Anônima
- **RF01 - Tutorial em 3 Passos:** Apresentar Fatores (azul), Resultados (violeta) e Associações com garantia de privacidade e botão pular.
- **RF02 - Autenticação Anônima:** Criação automática de credencial segura via Firebase Auth sem exigir email ou senha no Dia 1.
- **RF03 - Conversão Suave de Conta:** Possibilidade de vincular Google ou Magic Link por e-mail preservando o UID original e todos os registros históricos.
- **RF04 - PWA Instalável:** Capacidade de adicionar à tela de início; convite interno exibido após uso consistente e apenas em contas já vinculadas.

### 4.2 Arquitetura de Indicadores
- **RF05 - Divisão Semântica:** Todo indicador pertence obrigatoriamente a **Fatores** (ações/consumos) ou **Resultados** (percepções/medições).
- **RF06 - Formatos de Resposta:**
  1. *Booleano* (Sim/Não com opção de deixar em branco);
  2. *Escala Numérica* (Padrão 0 a 10 com passo configurável);
  3. *Opções Categóricas Ordenadas* (Chips com ordem predefinida);
  4. *Número com Unidade* (Inteiros e decimais, ex: mg, xícaras, horas, kg, bpm).
- **RF07 - Agregação Determinística para Múltiplos Registros:** Regras automáticas sem IA:
  - Fator numérico $\rightarrow$ Soma;
  - Resultado numérico $\rightarrow$ Último valor;
  - Escala 0–10 $\rightarrow$ Média;
  - Booleano $\rightarrow$ Presença de qualquer `Sim`.
- **RF08 - Direção Desejável (Exclusivo para Resultados):** Configuração de "Sem preferência", "Quanto maior, melhor", "Quanto menor, melhor" ou "Faixa ideal ($min \dots max$)".
- **RF09 - Imutabilidade Estrutural:** Após o primeiro registro, bloqueia-se tipo de dado, frequência e regra de agregação para preservar integridade histórica.
- **RF10 - Arquivamento e Reordenação:** Permite ocultar indicadores inativos sem deletar seu histórico estatístico.

### 4.3 Coleta de Dados e Preenchimento
- **RF11 - Preenchimento Rápido:** Painel acessível a 1 toque no Dashboard.
- **RF12 - Flexibilidade Total:** Nenhum campo obrigatório; o usuário pode registrar 1 indicador isolado se desejar.
- **RF13 - Lançamento Apenas no Presente:** Registros são gravados com timestamp UTC para a data corrente local (`localDate`). Edição retroativa não é permitida; exclusão de registros passados é permitida.
- **RF14 - Campo de Observação:** Nota textual opcional para contexto livre (não processada por IA na V1).

### 4.4 Dashboard Evolutivo e Inteligência
- **RF15 - Ciclo de Vida Temporal:**
  - *Dia 1:* Estado vazio, acolhimento e 4 sugestões científicas (`EXE`, `CAF`, `NRG`, `CON`);
  - *Dia 2:* Resumos factuais e contrastes descritivos puros entre dias consecutivos;
  - *Dia 14:* Desbloqueio da primeira associação estatística auditada ($r$ de Pearson / Spearman);
  - *Dia 30+:* Feed maduro equilibrado com até 5 cartões curados.
- **RF16 - Critérios de Validade Estatística (V1.1):**
  - Associação Booleano $\times$ Escala 0–10: $\ge 14$ dias pareados, $\ge 5$ respostas em cada grupo, diferença absoluta $\ge 1.5$ pt;
  - Numérico $\times$ Numérico: $\ge 16$ dias pareados, correlação $|\rho| \ge 0.55$.
- **RF17 - Interação com Insights:**
  - *Like (👍):* Salva snapshot imutável com texto, métricas e data na timeline de **Conclusões Salvas**;
  - *Dislike (👎):* Oculta a hipótese até que haja nova evidência amostral relevante.
- **RF18 - Camada de IA Responsável:** Máximo de 1 chamada diária por usuário (até 3 sínteses de texto), exigindo consentimento prévio, com fallback 100% determinístico.
- **RF19 - Modo Discreto Global (Olhinho):** Alternância instantânea entre siglas de 3 letras e nomes completos para discrição em ambientes públicos.

### 4.5 Notificações e Retenção
- **RF20 - Lembrete Único às 20h:** Disparo diário via Cloud Scheduler / Web Push (horário de Brasília) enviado estritamente caso o usuário ainda não tenha registrado nada no dia.

---

## 5. Requisitos Não Funcionais (Técnicos & Segurança)

| Parâmetro | Especificação |
|---|---|
| **Arquitetura** | Frontend SPA / PWA responsivo + Firebase Backend (Auth, Firestore, Cloud Functions). |
| **Segurança & LGPD** | Firestore Security Rules baseadas no UID; isolamento criptográfico por conta; opção de "Excluir Conta e Todos os Dados" permanente. |
| **Performance** | First Contentful Paint (FCP) < 1.2s; salvamento otimista no cliente com sincronização background. |
| **Offline-Graceful** | Estado local em IndexedDB/cache de navegador para evitar perda de rascunhos de preenchimento. |
| **Design System** | Sistema **Pulsar Bio-Analytics** com tipografia Space Grotesk, cantos totalmente arredondados (`ROUND_FULL`) e paleta de alto contraste com tokens funcionais Fatores (Azul) e Resultados (Violeta). |

---

## 6. Mapeamento de Telas Entregues

Todas as 13 interfaces necessárias para cobrir o PRD já foram desenvolvidas e validadas:

```
[Tutorial Onboarding]
 ├── Passo 1: Fatores ({{DATA:SCREEN:SCREEN_11}})
 ├── Passo 2: Resultados ({{DATA:SCREEN:SCREEN_13}})
 └── Passo 3: Associações & Privacidade ({{DATA:SCREEN:SCREEN_9}})

[Evolução do Dashboard]
 ├── Dia 1: Estado Vazio com Sugestões ({{DATA:SCREEN:SCREEN_7}})
 ├── Dia 2: Comparações Iniciais Descritivas ({{DATA:SCREEN:SCREEN_5}})
 ├── Dia 14: Primeira Associação Desbloqueada ({{DATA:SCREEN:SCREEN_3}})
 └── Estado Maduro: Feed Contínuo com 5 Insights ({{DATA:SCREEN:SCREEN_27}})

[Operações do Usuário]
 ├── Preenchimento Rápido em Segundos ({{DATA:SCREEN:SCREEN_25}})
 ├── Gestão de Indicadores ({{DATA:SCREEN:SCREEN_21}})
 └── Modal de Cadastro Estruturado ({{DATA:SCREEN:SCREEN_19}})

[Auditoria & Governança]
 ├── Auditoria Detalhada de Insight ({{DATA:SCREEN:SCREEN_17}})
 ├── Conclusões Salvas / Snapshots ({{DATA:SCREEN:SCREEN_23}})
 └── Configurações, Conta, PWA e Lembretes ({{DATA:SCREEN:SCREEN_15}})
```

---

## 7. Roadmap de Lançamento & Etapas de Implementação

- **Etapa A (Fundação & Registro):** Auth anônima, estrutura de Firestore, onboarding, tela de indicadores e painel de preenchimento rápido.
- **Etapa B (Motor Estatístico & Visualização):** Algoritmos determinísticos locais de corte (14 dias, médias ponderadas, dispersão) e dashboards evolutivos (Dias 1, 2 e 14).
- **Etapa C (Snapshots & Timeline):** Armazenamento de conclusões curtidas com metadados congelados e modal de auditoria detalhada.
- **Etapa D (PWA & Notificações):** Service Worker, integração FCM com Cloud Scheduler para o lembrete das 20h e conversão de credenciais Google/Magic Link.
- **Etapa E (Síntese por IA):** Integração com Gemini API para gerar descrições textuais enriquecidas sobre os dados estatísticos já aprovados.
