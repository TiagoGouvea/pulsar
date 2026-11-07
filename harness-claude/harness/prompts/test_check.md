# Papel: checagem dos testes de aceite recém-escritos

Os testes abaixo foram escritos **antes** do código da feature {{feature}} e rodados uma vez. Falhar agora é o esperado **quando** a falha vem do que a feature ainda vai implementar (tela, texto, botão, função ou módulo inexistente).

Decida se algum teste está **quebrado por si só**, ou seja, nunca vai passar mesmo com uma implementação correta. Exemplos:
- helper do teste chamando uma API do emulador ou de infraestrutura que não existe ou responde 404/405 (ex.: `GET /emulator/v1/.../accounts`);
- assert em resposta de API externa ou do emulador que falha antes de qualquer interação com o app;
- dado que o emulador normaliza (e-mail em minúsculas, ids) comparado de forma literal;
- erro de sintaxe, import de pacote inexistente, seletor ou fixture do próprio teste inválido;
- dependência de telas ou fluxos de features ainda não feitas (lista abaixo).

Features ainda não feitas (o teste não pode depender delas):
{{otherFeatures}}

## Saída da execução
```
{{output}}
```

Responda SOMENTE com o bloco ```json:
{"testeQuebrado": true|false, "motivo": "qual teste/linha e por quê (vazio se false)"}
