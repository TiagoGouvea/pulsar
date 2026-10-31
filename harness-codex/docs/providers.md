# Provedores e credenciais

Credenciais ficam em variáveis de ambiente e nunca no YAML. Configure `credentialEnv` no candidato, por exemplo `OPENROUTER_API_KEY`.

- `metered_api`: requer preços e `budget.projectLimit`. Sem limite, a chamada é bloqueada.
- `subscription`: registra quota quando o provedor expõe; não inventa custo marginal.
- `local`: custo de API zero, mas registra duração e uso.
- `fake`: somente testes do controlador.

Pi 1.4.0 foi validado pela documentação e declarações instaladas em 24/10/2026. Cada tarefa recebe `ModelRuntime`, modelo explícito, `SessionManager.inMemory()`, ferramentas delimitadas e cancelamento.

O Bionic/LM Studio usa o endpoint OpenAI-compatible configurado, atualmente `http://localhost:1235/v1`, para inferência. O `modelId` precisa ser o ID real retornado por `/v1/models`, não o nome do repositório. O gerenciamento de instâncias usa a API REST nativa `/api/v1/models`, `/api/v1/models/load` e `/api/v1/models/unload`; o servidor e o harness precisam rodar em ambientes que compartilhem o mesmo `localhost`.

```bash
yarn harness models list --config harness.config.yaml
yarn harness models test-local --config harness.config.yaml
yarn harness models probe --config harness.config.yaml --alias <alias> --inference
```

A política aceita somente um modelo local carregado. Antes do uso, o harness descarrega instâncias existentes pela API, carrega somente o candidato com contexto inicial limitado e descarrega as instâncias ao terminar, inclusive em falha. `models test-local` testa os modelos habilitados em sequência e registra tempo de carga, tempo HTTP+JSON da resposta, tempo de geração reportado pelo servidor quando disponível, tokens, resposta e erro. O relatório fica em `.harness/local-model-tests/<data>/results.{md,json,csv}`. Esse teste poderá descarregar outras instâncias locais carregadas, portanto encerre inferências concorrentes; nenhum modelo é baixado pelo harness.

O catálogo local inclui seis IDs observados na API: `qwen3.5-9b-mlx`, `qwen3.5-9b-optiq`, `qwen3-coder-30b-a3b-instruct`, `qwen3-coder-30b-a3b-instruct-mlx`, `mlx-community/gpt-oss-20b` e `unsloth/gpt-oss-20b`. O contexto de carga está limitado a 24K para Qwen 3.5 9B e 8K nos outros modelos. O LM Studio pode recusar modelos 30B por pressão de memória; nesse caso o harness registra a falha e tenta descarregar antes de continuar. Os IDs locais não declaram visão nem saída estruturada.

As credenciais próprias desta cópia do harness ficam em `harness-codex/.env` (ignorado pelo Git) e são carregadas ao iniciar a CLI, prevalecendo sobre variáveis homônimas herdadas do shell. Use `OPENROUTER_API_KEY` para candidatos OpenRouter e `OPENAI_API_KEY` somente para o candidato OpenAI direto.

OpenRouter é consultado pelo catálogo. Inferência de diagnóstico permanece desabilitada sem `diagnosticsLimit` e ação explícita. Usage/cost do provedor tem precedência sobre estimativas.

Assinaturas de produtos não são tratadas como chaves de API. O harness não extrai cookies nem contorna autenticação oficial.
