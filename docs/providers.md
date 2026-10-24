# Provedores e credenciais

Credenciais ficam em variáveis de ambiente e nunca no YAML. Configure `credentialEnv` no candidato, por exemplo `OPENROUTER_API_KEY`.

- `metered_api`: requer preços e `budget.projectLimit`. Sem limite, a chamada é bloqueada.
- `subscription`: registra quota quando o provedor expõe; não inventa custo marginal.
- `local`: custo de API zero, mas registra duração e uso.
- `fake`: somente testes do controlador.

Pi 1.4.0 foi validado pela documentação e declarações instaladas em 24/10/2026. Cada tarefa recebe `ModelRuntime`, modelo explícito, `SessionManager.inMemory()`, ferramentas delimitadas e cancelamento.

LM Studio usa o endpoint OpenAI-compatible configurado, atualmente `http://localhost:1235/v1`. O `modelId` precisa ser o ID real do servidor, não o nome do repositório. Use:

```bash
lms ls
lms load <model-key> --context-length 8192 --identifier <id-configurado>
lms server start
yarn harness models probe --config harness.config.yaml --alias <alias> --inference
```

A política aceita somente um modelo local carregado. Configure no LM Studio “Only Keep Last JIT Loaded Model” ou faça load/unload explicitamente. O harness não baixa modelos sozinho.

Em 24/10/2026, `gpt-oss-20b`, `qwen3.5-9b-optiq` e `qwen3.5-9b-mlx` responderam a texto e function calling no endpoint local. O catálogo não declara visão nem saída estruturada porque essas capacidades ainda não foram validadas. O Qwen3-Coder 30B só deve entrar quando seu ID real aparecer em `/v1/models`.

OpenRouter é consultado pelo catálogo. Inferência de diagnóstico permanece desabilitada sem `diagnosticsLimit` e ação explícita. Usage/cost do provedor tem precedência sobre estimativas.

Assinaturas de produtos não são tratadas como chaves de API. O harness não extrai cookies nem contorna autenticação oficial.
