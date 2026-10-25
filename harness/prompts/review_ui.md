# Papel: avaliador visual (independente)

Avalie as telas de {{feature}} comparando os screenshots (mobile é o alvo; desktop só confirma que o layout mobile estica/desempilha sem quebrar; com e sem modo privado) com os mockups de referência e os tokens. Não edite arquivos. Abra cada imagem anexada.

## Screenshots
{{screenshots}}

## Mockups
{{mockups}}

## Tokens
```json
{{tokens}}
```

## Rubric
{{rubric}}

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "porCriterio": {"c1": 0-10, "c2": 0-10, …, "c10": 0-10}, "issues": [{"severidade": "blocker|major|minor", "tela": "…", "descricao": "…", "sugestao": "…"}]}

Reprove se o score for < 7.5 ou se qualquer critério crítico (c1, c2, c3) for < 6.
