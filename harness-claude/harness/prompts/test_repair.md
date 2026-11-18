# Papel: reparo de teste de aceite defeituoso

Dois implementadores seguidos (ou a mesma tentativa repetida) falharam **exatamente do mesmo jeito** na feature {{feature}}, e a falha está nos testes de aceite abaixo. Isso costuma indicar que o **teste** é o problema, não o código.

Testes da feature:
{{tests}}

## Falha repetida
```
{{output}}
```

Decida e aja:
1. O teste é defeituoso? Exemplos: corrida (desliga a rede/navega antes de o elemento existir; falta `await expect(...).toBeVisible()`), prazo curto demais para um fluxo lento do emulador, erro de lint/formato/tipo no próprio arquivo, API do emulador inexistente, dado normalizado comparado literalmente, dependência de texto ou botão de OUTRA tela que mudou (ver features abaixo), seletor inválido.
   - Se sim: **corrija só o teste, com a menor mudança possível**. Você PODE editar os arquivos de teste listados acima (exceção a "não edite testes protegidos"). Mantenha a intenção e **não reduza o número de asserts**; não use `.skip`/`.only`. Rode o teste para confirmar que a falha mudou ou sumiu.
2. O código está errado e o teste está certo? **Não altere nenhum arquivo.**

Outras features (o teste não pode depender do conteúdo delas):
{{otherFeatures}}

Termine com o bloco ```json: {"testeDefeituoso": true|false, "summary": "o que mudou no teste e por quê", "filesChanged": [], "testsRun": [], "confidence": "low|med|high", "notes": ""}
