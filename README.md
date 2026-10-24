# Pulsar

O Pulsar possui duas implementações independentes de um harness autônomo para desenvolver e validar o projeto: Codex e Claude.

# Harness Codex

Instale, verifique o ambiente e execute:

```bash
yarn install --frozen-lockfile
yarn harness doctor
yarn harness preflight --config harness.config.example.yaml
yarn harness run --config harness.config.example.yaml
```

Para apontar o harness a um projeto real:

```bash
yarn harness init --project "/caminho/do/projeto"
yarn harness run --config harness.config.yaml
```

# Harness Claude

Na implementação Claude, instale o harness, verifique o ambiente e inicie:

```bash
cd harness
npm install
cd ..
./harness/bin/harness doctor
./harness/bin/harness smoke
caffeinate -dimsu ./harness/bin/harness start
```
