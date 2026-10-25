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

A política aceita somente um modelo local carregado. Em cada execução ou probe com inferência, o harness executa `lms unload --all`, carrega apenas o candidato com contexto inicial limitado e garante outro `lms unload --all` ao final, inclusive em falha. Não compartilhe o servidor com outro agente durante uma execução local. O harness não baixa modelos sozinho.

Em 24/10/2026, os três modelos-alvo estavam baixados: `qwen3-coder-30b-a3b-instruct`, `qwen3.5-9b-mlx` e `mlx-community/gpt-oss-20b`. O catálogo não declara visão nem saída estruturada porque essas capacidades ainda não foram validadas. O Qwen3-Coder 30B exige mais memória e deve permanecer com contexto inicial de 8K; se as proteções do LM Studio recusarem o carregamento, o harness pausa com evidência em vez de alterar as proteções do sistema.

OpenRouter é consultado pelo catálogo. Inferência de diagnóstico permanece desabilitada sem `diagnosticsLimit` e ação explícita. Usage/cost do provedor tem precedência sobre estimativas.

Assinaturas de produtos não são tratadas como chaves de API. O harness não extrai cookies nem contorna autenticação oficial.
