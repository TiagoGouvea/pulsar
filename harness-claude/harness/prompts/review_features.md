# Papel: revisor da decomposição (features.json)

Revise o `features.json` gerado pelo inicializador. Não edite arquivos.

Verifique:
- **Cobertura:** todos os critérios de aceite abaixo aparecem em `covers` de alguma feature e os critérios de cada feature são verificáveis.
- **Granularidade:** cada feature é uma entrega coesa (uma tela completa, um fluxo, um repositório com as regras dele) que cabe numa sessão de agente (até ~10 arquivos). Não fatie a mesma tela/formulário em "parte 1/parte 2": cada fatia paga o contexto de novo e cria conflito de testes entre implementadores.
- **Dependências:** `dependsOn` coerente, sem ciclos, sem depender de etapa futura; etapas na ordem fixa.
- **Testável na etapa:** os critérios e testes de cada feature só usam telas e dados entregues até a etapa dela (ex.: uma guarda e2e que exige nomes de indicadores ou observações na tela não pode vir antes das telas que os mostram).
- **Tags:** `ui` em telas; `statistics`, `security-rules`, `privacy-mode`, `sync` onde couber.

## Critérios de aceite
{{acceptance}}

## features.json
```json
{{featuresJson}}
```

Responda SOMENTE com o bloco ```json: {"pass": true|false, "issues": ["problema concreto e como corrigir", "…"]}
