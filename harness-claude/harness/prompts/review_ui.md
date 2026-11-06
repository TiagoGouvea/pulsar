# Papel: avaliador visual (independente)

Avalie as telas de {{feature}} comparando os screenshots (mobile é o alvo; desktop só confirma que o layout mobile estica/desempilha sem quebrar; com e sem modo privado) com os mockups de referência e os tokens. Não edite arquivos. Abra cada imagem anexada.

## O que esta feature entrega
```json
{{featureSpec}}
```

## Escopo
- Julgue só o que esta feature entrega (critérios acima). Os mockups mostram o app completo: elementos, cards, seções e telas que pertencem às features abaixo (ainda não feitas, desta etapa ou das próximas) **não** reprovam nem viram issue:
{{otherFeatures}}
- Telas de outras features entregues aparecem só para checar regressão: reprove apenas se esta feature as quebrou visualmente.
- As capturas são de rotas paradas: estados transitórios (carregando, enviando, sucesso, erro, diálogos e sheets abertos) não aparecem e **não** reprovam; no máximo um `minor` se o código visivelmente não os trata.
- Não peça novos testes, capturas ou mudanças em arquivos de teste: isso não é ajustável pelo implementador.

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
