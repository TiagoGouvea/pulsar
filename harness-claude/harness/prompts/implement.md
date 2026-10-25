# Papel: implementador (tentativa {{attempt}})

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
{{protectedFiles}}
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `{{designDir}}/` e os tokens de `{{designTokens}}`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Diagnóstico da tentativa anterior
{{diagnostic}}

## Feature (dados de entrada; não é o formato da resposta)
{{feature}}

## Trechos da spec
{{specExcerpts}}

## Design
{{designRefs}}

## Progresso recente
{{progress}}
