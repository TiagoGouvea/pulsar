# Lições do projeto (geradas pelo harness). Formato YAML.
- id: L-001
  scope:
    roles:
      - implement
      - implement_hard
    tags: []
  rule: "Cobertura (G4): não passe --coverage no script do package.json se a
    config do vitest já ativa coverage, para não duplicar a configuração. Touch
    targets (G10): todo controle interativo (radios, switch, input) deve ter
    pelo menos 44px, por exemplo min-w-[44px] e h-11."
  evidence:
    - evt-24
  added: 2026-10-25
  hits: 15
  helped: 8
  helpedRate: 0.5333333333333333
  status: active
- id: L-002
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - ui
  rule: Rode `yarn format:fix` (Prettier --write) nos arquivos que você criar ou
    alterar antes de entregar. Isso evita falhas em format:check, como a G2 de
    evt-33.
  evidence:
    - evt-32
  added: 2026-10-25
  hits: 5
  helped: 3
  helpedRate: 0.6
  status: active
- id: L-003
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - gates
  rule: Antes de terminar, rode localmente os gates que costumam falhar
    (format:check, lint, typecheck, test:unit, coverage). Falhas G2/G4 em
    evt-25, evt-33 e evt-53 vieram de formatação ou configuração de coverage que
    um yarn format:fix e um yarn test:unit teriam pego.
  evidence:
    - evt-25
    - evt-33
    - evt-53
  added: 2026-10-26
  hits: 0
  helped: 0
  helpedRate: null
  status: active
- id: L-004
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - review
  rule: Implementações com deepseek e sonnet foram rejeitadas na revisão de código
    em várias tentativas (evt-40, evt-45, evt-42, evt-58). Releia os critérios
    de aceite da feature item por item e confira cada um no código antes de
    entregar. Isso vale em especial para features de UI e de modo privado.
  evidence:
    - evt-40
    - evt-42
    - evt-45
    - evt-58
  added: 2026-10-26
  hits: 0
  helped: 0
  helpedRate: null
  status: active
