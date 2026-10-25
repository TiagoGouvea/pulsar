# Lições do projeto (geradas pelo harness). Formato YAML.
- id: L-001
  scope:
    roles:
      - implement
      - implement_hard
    tags: []
  rule: "G4 (prioritário): Remova --coverage do script package.json (vitest 3.x já
    ativa coverage via config block). G10: Aumente touch targets para ≥44px —
    troque min-w-0 por min-w-[44px] nos radios do Slider, passe o switch de h-7
    para h-11 e o input de h-9/py-2 para h-11."
  evidence:
    - evt-24
  added: 2026-10-25
  hits: 9
  helped: 4
  helpedRate: 0.4444444444444444
  status: active
- id: L-002
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - ui
  rule: Inicializadores devem rodar Prettier --write nos arquivos que criam antes
    de commitá-los. Para destravar esta feature, o orquestrador deve executar
    format:fix nos arquivos protegidos ou relaxar temporariamente a proteção
    para correção de formatação.
  evidence:
    - evt-32
  added: 2026-10-25
  hits: 2
  helped: 1
  helpedRate: 0.5
  status: active
