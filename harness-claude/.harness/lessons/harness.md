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
- id: L-056
  scope:
    roles:
      - implement
      - implement_hard
      - triage
    tags:
      - gates
      - fix
  rule: "Se o mesmo gate falhar com o mesmo teste e a mesma mensagem em 2
    tentativas seguidas, não repita a abordagem. Copie do gate-report a linha do
    assert que falhou e o erro exato (ex.: `getByRole('alert')` não encontrado
    em 5000ms). Pergunte por que o estado esperado não aparece dentro do
    timeout: a causa pode ser um atraso conhecido do SDK, em vez de bug no
    código. Em F-2.fix-1 e F-2.fix-2, 10 tentativas seguidas falharam no mesmo
    G11. Só a F-2.fix-3 passou, depois que a triagem identificou a causa: o
    Firebase só rejeita popup-closed-by-user cerca de 8s depois."
  evidence:
    - evt-361
    - evt-363
    - evt-365
    - evt-367
    - evt-369
    - evt-371
    - evt-379
    - evt-380
    - evt-383
  added: 2026-11-08
  hits: 0
  helped: 0
  helpedRate: null
  status: active
- id: L-058
  scope:
    roles:
      - implement
      - implement_easy
    tags: []
  rule: Os modelos baratos (minimax, deepseek-flash) estouraram o tempo no
    implement da etapa 2 (F-2.03, F-2.05, F-2.09). Na tentativa seguinte, a
    mesma feature passou com um diff focado. Rode só os gates rápidos
    (format:check, lint, typecheck, test:unit) e o spec e2e da própria feature
    (`yarn e2e <arquivo>`). Não rode a suíte e2e completa nem reinicie
    emuladores várias vezes.
  evidence:
    - evt-305
    - evt-321
    - evt-344
    - evt-313
    - evt-349
  added: 2026-11-08
  hits: 0
  helped: 0
  helpedRate: null
  status: active
- id: L-059
  scope:
    roles:
      - test_writer
    tags: []
  rule: "Roteamento do test_writer: com glm-or, cada chamada custou de 6 a 15
    vezes mais ($0.95 e $1.39) que com codex-mid ($0.07 a $0.15), e o resultado
    foi equivalente. Use codex-mid como padrão e deixe glm-or só como fallback."
  evidence:
    - evt-316
    - evt-317
    - evt-319
    - evt-338
  added: 2026-11-08
  hits: 0
  helped: 0
  helpedRate: null
  status: active
