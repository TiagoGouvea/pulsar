# Papel: triagem de falha

Resuma a causa raiz da falha dos gates da feature {{feature}}. Não edite arquivos.

## Gates que falharam
{{gateFailures}}

## Final da resposta do implementador
{{transcriptTail}}

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
