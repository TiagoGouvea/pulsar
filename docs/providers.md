# Provedores e credenciais

Credenciais ficam em variáveis de ambiente e nunca no YAML. Configure `credentialEnv` no candidato, por exemplo `OPENROUTER_API_KEY`.

- `metered_api`: requer preços e `budget.projectLimit`. Sem limite, a chamada é bloqueada.
- `subscription`: registra quota quando o provedor expõe; não inventa custo marginal.
- `local`: custo de API zero, mas registra duração e uso.
- `fake`: somente testes do controlador.

Pi 1.4.0 foi validado pela documentação e declarações instaladas em 24/10/2026. Cada tarefa recebe `ModelRuntime`, modelo explícito, `SessionManager.inMemory()`, ferramentas delimitadas e cancelamento.

LM Studio usa a API REST v1 para listar modelos e endpoint OpenAI-compatible para o Pi. O `modelId` precisa ser o ID real do servidor, não o nome do repositório. Use:

```bash
lms ls
lms load <model-key> --context-length 8192 --identifier <id-configurado>
lms server start
yarn harness models probe --config harness.config.yaml --alias <alias>
```

A política aceita somente um modelo local carregado. Configure no LM Studio “Only Keep Last JIT Loaded Model” ou faça load/unload explicitamente. O harness não baixa modelos sozinho.

OpenRouter é consultado pelo catálogo. Inferência de diagnóstico permanece desabilitada sem `diagnosticsLimit` e ação explícita. Usage/cost do provedor tem precedência sobre estimativas.

Assinaturas de produtos não são tratadas como chaves de API. O harness não extrai cookies nem contorna autenticação oficial.
