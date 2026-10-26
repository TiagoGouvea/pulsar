# Lições do harness — sobrevivem entre projetos. Formato YAML.
- id: L-005
  scope:
    roles:
      - review_code
    tags: []
  rule: Se gemini-pro falhar como revisor, use o fallback (haiku ou sonnet). Ele
    resolveu a revisão sem custo extra relevante em evt-43/evt-44 e
    evt-19/evt-20.
  evidence:
    - evt-19
    - evt-20
    - evt-43
    - evt-44
  added: 2026-10-26
  hits: 0
  helped: 0
  helpedRate: null
  status: active
