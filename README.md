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
```

## Demonstração sem custo

```bash
yarn harness preflight --config harness.config.example.yaml
yarn harness run --config harness.config.example.yaml
```

O executor fake testa o controlador e para no gate humano. Ele não comprova integrações de IA.

## Documentação

- [Arquitetura](docs/architecture.md)
- [Provedores](docs/providers.md)
- [Segurança](docs/security.md)
- [Operação e recuperação](docs/operations.md)
- [Estado e limitações](docs/implementation-status.md)
