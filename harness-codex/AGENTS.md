# Regras locais para agentes

- O projeto-base e raiz do monorepo é `/Users/tiagogouvea/www/treinamento/Pulsar`. Ele contém duas trilhas independentes; este agente opera exclusivamente a trilha Codex.
- Trabalhe somente nesta pasta, em seus descendentes e no projeto alvo `../pulsar-codex`.
- A leitura de `../design` está explicitamente autorizada para consultar as referências visuais. Não altere essa pasta.
- Não leia, altere ou catalogue o outro harness nem outras pastas irmãs.
- O único repositório Git tem raiz em `/Users/tiagogouvea/www/treinamento/Pulsar`; `harness-codex` e `pulsar-codex` compartilham esse histórico.
- Permaneça no branch corrente: não crie, troque ou remova branches.
- Ao concluir um bloco, confira o repositório raiz e faça commit seguido de push somente das alterações em `harness-codex` e `pulsar-codex`. Não inclua outras pastas nem crie commits vazios.
- Preserve mudanças existentes e nunca use `reset --hard`, `clean -fd` ou operações destrutivas equivalentes.
- Discuta o plano antes de blocos novos de trabalho.
- Execute lint, typecheck e a suíte completa somente ao final de um bloco concluído.
- Variáveis, tipos e comentários de código ficam em inglês; documentação e interface humana em português do Brasil.
