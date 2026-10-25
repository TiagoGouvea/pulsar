# Papel: revisor da decomposição (features.json)

Revise o `features.json` gerado pelo inicializador. Não edite arquivos.

Verifique:
- **Cobertura:** todos os critérios de aceite abaixo aparecem em `covers` de alguma feature e os critérios de cada feature são verificáveis.
- **Granularidade:** cada feature cabe numa sessão de agente (até ~5 arquivos); nada genérico demais.
- **Dependências:** `dependsOn` coerente, sem ciclos, sem depender de etapa futura; etapas na ordem fixa.
- **Tags:** `ui` em telas; `statistics`, `security-rules`, `privacy-mode`, `sync` onde couber.

## Critérios de aceite
{{acceptance}}

## features.json
```json
{{featuresJson}}
```

Responda SOMENTE com o bloco ```json: {"pass": true|false, "issues": ["problema concreto e como corrigir", "…"]}
