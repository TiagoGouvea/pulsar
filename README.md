# Harness local de desenvolvimento autônomo

Orquestrador determinístico para executar tarefas de desenvolvimento com Pi, modelos locais/remotos, evidências verificáveis, limites de custo e aprovação humana.

## Instalação

Requisitos: macOS, Node 24 LTS, Yarn e Git.

```bash
yarn install --frozen-lockfile
yarn harness doctor
```

Instale o Chromium somente quando for usar evidência visual:

```bash
yarn playwright install chromium
```

## Primeiro projeto

```bash
yarn harness init --project "/caminho/com espaços/meu-projeto"
# Edite specs, modelos, comandos e limites no harness.config.yaml
yarn harness preflight --config ./harness.config.yaml
yarn harness models probe --config ./harness.config.yaml --alias <local-alias> --inference
yarn harness plan --config ./harness.config.yaml
yarn harness run --config ./harness.config.yaml
```

A especificação usa cabeçalhos rastreáveis:

```markdown
## REQ-001 [required] Cadastrar item

Critérios:

- Item aparece na lista.
```

No gate humano:

```bash
yarn harness review --config harness.config.yaml --run <runId> --milestone milestone-001
yarn harness approve --config harness.config.yaml --run <runId> --milestone milestone-001 --revision '<revisão>'
```

Ou importe ajustes:

```bash
yarn harness feedback import --config harness.config.yaml --run <runId> --file docs/templates/human-feedback.md
```

Execução desacoplada do terminal e painel:

```bash
yarn harness run --config harness.config.yaml --background
yarn harness dashboard --config harness.config.yaml --run <runId>
yarn harness visual --config harness.config.yaml --run <runId> --url http://127.0.0.1:4173
```

## Demonstração sem custo

```bash
yarn harness preflight --config harness.config.example.yaml
yarn harness run --config harness.config.example.yaml
```

O executor fake testa o controlador e para no gate humano. Ele não comprova integrações de IA.

## Modelos locais no LM Studio

O catálogo de exemplo já aponta para `http://localhost:1235/v1` e contém os IDs validados:

- `qwen3-coder-30b-a3b-instruct`: implementação principal.
- `qwen3.5-9b-mlx`: alternativa leve para implementação e diagnóstico.
- `mlx-community/gpt-oss-20b`: planejamento e revisões independentes.

Para usar os modelos reais, execute `init`, altere `execution.executor` de `fake` para `pi` no YAML gerado e valide cada candidato:

```bash
yarn harness models probe --config harness.config.yaml --alias local-qwen-coder --inference
yarn harness models probe --config harness.config.yaml --alias local-qwen-9b --inference
yarn harness models probe --config harness.config.yaml --alias local-gpt-oss --inference
```

Antes de cada inferência local, o harness descarrega todos os modelos, carrega somente o candidato com contexto inicial de 8K e, ao terminar ou falhar, descarrega tudo novamente. Isso exige uso exclusivo do LM Studio durante uma execução do harness. Os Qwen de raciocínio precisam de saída acima de 64 tokens até para respostas curtas; o harness usa 2048 e o probe reserva no mínimo 256.

## Documentação

- [Arquitetura](docs/architecture.md)
- [Provedores](docs/providers.md)
- [Segurança](docs/security.md)
- [Operação e recuperação](docs/operations.md)
- [Estado e limitações](docs/implementation-status.md)
