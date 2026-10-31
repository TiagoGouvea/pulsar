# Papel: retrospectiva ({{kind}}, etapa {{stage}})

Analise o desempenho recente do harness e mantenha as lições. Não edite arquivos.

Regras para lições:
- Toda lição nova precisa de `evidence` com ids de eventos (`evt-N`) listados abaixo. Sem evidência = rejeitada.
- Prefira editar/consolidar a criar. Máximo ~60 lições ativas por arquivo.
- Aposente lições com baixa eficácia (helpedRate) ou obsoletas; promova as consolidadas (viram parte do AGENTS.md).
- `file: "harness"` só para lições que valem para qualquer projeto.

## Eventos recentes (id feature papel worker tentativa resultado)
{{events}}

## Lições atuais
{{lessonFiles}}

## Features da etapa
{{features}}

Responda SOMENTE com o bloco ```json:
{"create": [{"scope": {"roles": ["implement"], "tags": ["security-rules"]}, "rule": "…", "evidence": ["evt-12"], "file": "project|harness"}],
 "edit": [{"id": "L-003", "rule": "…"}], "retire": ["L-001"], "promote": ["L-004"],
 "aprendizados": "markdown curto para o RELATORIO.md",
 "comoTestar": "se kind=stage: comece com 'O que dá para testar nesta etapa' e 'O que ainda não existe' (telas/fluxos que só chegam em etapas futuras), para o humano não esperar o que não foi feito. Depois, roteiro de 10–15 min, passo a passo, no celular (no computador, só conferir que estica/desempilha sem quebrar). Rodar localmente: em app/, `yarn install` e `yarn e2e:serve` (emuladores + seed), abrir {{baseUrl}}; no celular, http://IP-DA-MAQUINA:{{basePort}} na mesma rede. Diga também o que não aparece no preview de produção (rotas só de dev/emulador). O que observar."}
