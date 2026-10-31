# Pulsar

Repositório monorepo do projeto **Pulsar** (aplicativo web de registro e acompanhamento de fatores e resultados).

Este repositório reúne **duas abordagens paralelas e independentes** de desenvolvimento autônomo multi-modelo (Claude e Codex) para construir o mesmo produto a partir de uma especificação e design unificados.

---

## Estrutura do Repositório

```text
pulsar/
├── docs/             # Especificação funcional e arquitetura oficial do produto
├── design/           # Telas de referência (PNG), layouts (HTML) e design tokens
├── observer-agy/     # Relatórios técnicos, checkpoints e análises comparativas
│
├── harness-claude/   # Fábrica autônoma implementada pelo Claude
├── pulsar-claude/    # Aplicação web desenvolvida pelo harness-claude
│
├── harness-codex/    # Fábrica autônoma implementada pelo Codex
└── pulsar-codex/     # Aplicação web desenvolvida pelo harness-codex
```

---

## Os Dois Projetos

| Abordagem | Harness (Fábrica) | Aplicação Alvo | Características Principais |
| :--- | :--- | :--- | :--- |
| **Claude** | [`harness-claude/`](harness-claude/) | [`pulsar-claude/`](pulsar-claude/) | Git Worktrees isoladas, 13 gates determinísticos, Multi-Armed Bandit, deploy de preview e webhooks. |
| **Codex** | [`harness-codex/`](harness-codex/) | [`pulsar-codex/`](pulsar-codex/) | Orquestrador com Pi SDK, banco transacional em SQLite, verificação por comandos e painel web local. |

Consulte o `README.md` dentro de cada pasta de harness para instruções detalhadas de execução, variáveis de ambiente e comandos de controle.

---

## Etapas de Desenvolvimento e Branches

Para registrar a evolução cronológica do projeto e permitir comparação precisa entre as duas abordagens, **cada etapa possui uma branch dedicada**. Ao fim de cada ciclo, o resumo detalhado (features entregues, métricas, custos e aprendizados) é documentado em [`observer-agy/`](observer-agy/).

| Etapa | Branch | Escopo Principal |
| :---: | :--- | :--- |
| **0** | `0-setup` | Scaffold Vite + React + TS, emuladores Firebase e tokens do design system |
| **1** | `1-base` | Autenticação, CRUD de indicadores, modo privado e Security Rules |
| **2** | `2-registro` | Painel de registro rápido mobile (fatores e resultados) e feedback |
| **3** | `3-insights` | Agregação diária, correlações estatísticas, dashboard e mini gráficos |
| **4** | `4-curadoria` | Timeline de descobertas, hipóteses, like/dislike e deduplicação |
| **5** | `5-pwa-push` | Suporte PWA, instalação no celular e lembretes por push |
| **6** | `6-ia-generativa` | Síntese de insights por IA com consentimento e preservação de privacidade |
| **7** | `7-polimento` | Acessibilidade (a11y), performance, estados de erro/vazio e revisão visual |

---

## Relatório por etapa

| Etapa | Modelo | Relatório |
| :---: | :--- | :--- |
| **0** | Claude | [`harness-claude/observacoes/etapa-0.md`](harness-claude/observacoes/etapa-0.md) |

---

## Insumos Compartilhados

* **Especificação Funcional:** [`docs/Pulsar_Especificacao_Completa.md`](docs/Pulsar_Especificacao_Completa.md)
* **Arquitetura Técnica:** [`docs/Pulsar_Arquitetura_e_Implementacao.md`](docs/Pulsar_Arquitetura_e_Implementacao.md)
* **Design & Tokens:** [`design/`](design/) (mockups mobile, protótipos e `DESIGN.md`)
* **Análises do Observador:** [`observer-agy/`](observer-agy/) (avaliações técnicas, comparativos de código e relatórios de etapas)
