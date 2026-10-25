# Segurança operacional

O painel faz bind somente em `127.0.0.1`, exige token aleatório nas mutações, valida `Origin`, desabilita cache e aplica CSP.

Subprocessos recebem argumentos estruturados e `shell: false`. O primeiro argumento precisa estar em `security.allowedCommands`. Logs passam por redaction antes de serem persistidos.

`workspace_process` não é sandbox: uma ferramenta de shell pode tentar acessar caminhos externos. Para execução sem supervisão com conteúdo não confiável, use um sandbox/VM e configure `trustMode: sandboxed` somente quando o isolamento existir de fato.

O workspace alvo nunca pode ser a raiz do harness. Produção fica desabilitada por padrão. Exclusão destrutiva, IAM, faturamento, mensagens externas e publicação de produção exigem autorização separada.

Evidências podem conter dados sensíveis. Use dados sintéticos e aplique a retenção definida no config; a limpeza permanece uma ação humana nesta versão.
