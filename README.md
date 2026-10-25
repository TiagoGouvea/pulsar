# Pulsar

Repositório monorepo do projeto **Pulsar** (aplicativo web de registro e acompanhamento de fatores e resultados).

Este repositório reúne **duas abordagens paralelas e independentes** de desenvolvimento autônomo multi-modelo (Claude e Codex) para construir o mesmo produto a partir de uma especificação e design unificados.

---

## Estrutura do Repositório

```text
pulsar/
├── docs/             # Especificação funcional e arquitetura oficial do produto
├── design/           # Telas de referência (PNG), layouts (HTML) e design tokens
├── observer-agy/     # Relatórios técnicos e avaliações comparativas entre os harnesses
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

## Insumos Compartilhados

* **Especificação Funcional:** [`docs/Pulsar_Especificacao_Completa.md`](docs/Pulsar_Especificacao_Completa.md)
* **Arquitetura Técnica:** [`docs/Pulsar_Arquitetura_e_Implementacao.md`](docs/Pulsar_Arquitetura_e_Implementacao.md)
* **Design & Tokens:** [`design/`](design/) (mockups mobile, protótipos e `DESIGN.md`)
* **Análises do Observador:** [`observer-agy/`](observer-agy/) (avaliações técnicas, comparativos de código e relatórios de etapas)
