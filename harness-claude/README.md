# Harness Claude

Harness autônomo e multi-modelo construído com base na especificação do Claude para desenvolver e validar o aplicativo Pulsar etapa por etapa.

Ele opera sobre o repositório da aplicação em `../pulsar-claude`, utilizando as especificações em `../docs` e os mockups/tokens em `../design`.

## Comandos

```bash
# Instalação inicial (dentro da pasta harness/)
cd harness && npm install && cd ..

# Verificação do ambiente e calibração dos workers
./harness/bin/harness doctor
./harness/bin/harness smoke

# Sincronização do design system
./harness/bin/harness sync-design

# Execução do loop autônomo (recomendado com caffeinate no macOS)
caffeinate -dimsu ./harness/bin/harness start

# Retomada após interrupção ou pausa
./harness/bin/harness resume

# Status e controle
./harness/bin/harness status
./harness/bin/harness pause
./harness/bin/harness report

# Aprovação humana de fim de etapa
./harness/bin/harness approve
```

## Estrutura do Módulo

* `harness/src/orchestrator.ts`: Máquina de estados principal e loop de features em Git Worktrees.
* `harness/src/gates/`: 13 gates determinísticos (build, types, vitest, rules, e2e, a11y, sentinelas de privacidade).
* `harness/src/adapters/`: Adapters não-interativos para Claude Code, Codex CLI, Gemini (`agy`), Pi e Fake.
* `harness/src/router.ts`: Roteamento por Multi-Armed Bandit com exploração e regra de famílias diferentes para revisão.
* `harness/src/evaluator.ts`: Revisão independente de código, revisão visual com rubrica e julgamento de torneios.
* `harness/src/budget.ts`: Livro-caixa (`ledger.jsonl`), estimativas por histórico e tetos rígidos.
* `harness/src/learning.ts`: Gestão de lições ativas/aposentadas e retrospectivas periódicas.
* `harness/src/checkpoint.ts`: Geração do pacote de entrega em `checkpoints/etapa-N/` e deploy de preview.
* `harness.config.yaml`: Linha de modelos, papéis, regras de roteamento e limites.
* `budget.yaml`: Tetos de orçamento por execução, etapa e feature.
* `prices.yaml`: Tabela de preços por milhão de tokens por worker.
* `HARNESS_PULSAR.md`: Especificação técnica completa de implementação.
