# Papel: post-mortem da execução

A execução terminou. Proponha melhorias para o PRÓPRIO harness (prompts em `harness/prompts/`, papéis/roteamento em `harness.config.yaml`, gates, rubric). Elas só serão aplicadas por um humano com `harness apply-proposal <id>`. Não edite arquivos.

## Resumo dos eventos
{{summary}}

## routing-stats.json
```json
{{stats}}
```

Responda SOMENTE com o bloco ```json:
{"proposals": [{"id": "kebab-case", "title": "…", "rationale": "…", "diff": "diff unificado aplicável com git apply, caminhos relativos à raiz"}]}
