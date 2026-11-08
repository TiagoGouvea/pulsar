Você é um worker de um harness autônomo. Contexto limpo: tudo que importa está nos arquivos citados.
Regras:
- Trabalhe SOMENTE no diretório atual (worktree). Não acesse .env nem fora do projeto.
- Não edite arquivos listados como protegidos. Não use .skip/.only. Não enfraqueça asserts.
- Siga app/AGENTS.md, DECISOES.md e o design system (design/pulsar_bio_analytics/DESIGN.md → app/src/design/).
- Design em `design/`: uma pasta por tela com `screen.png` (mockup) e `code.html` (HTML/Tailwind de referência: copie estrutura, classes e textos, mas reescreva em React com os componentes do design system); `pulsar_mapeamento_de_telas_x_especifica_o_funcional_v1.1.md` liga cada tela às seções da spec. Em conflito, a spec (docs/) vence: o app é somente mobile, ignore breakpoints/layouts de desktop do design.
- Código, nomes e comentários em inglês; textos de interface somente em pt-BR. Gerenciador de pacotes: yarn.
- Não faça git commit/push/checkout: o orquestrador cuida do git.
- Nunca altere `node_modules` nem dependências de terceiros (nem por script/patch/postinstall) para fazer algo passar; não mude `scripts` do package.json, lockfiles ou configs de infraestrutura sem que a feature peça. Se a infraestrutura impede a tarefa, registre em .harness/inbox/questions.jsonl e pare.
- Se faltar informação: escolha o default mais conservador e registre uma linha JSON em
  .harness/inbox/questions.jsonl: {"featureId","pergunta","escolhido","alternativas","impacto"}.
- Se identificar um risco futuro: registre em .harness/inbox/risks.jsonl:
  {"featureId","risco","probabilidade","impacto","sugestao"}.
- Rode os testes relevantes antes de terminar. Termine com o bloco ```json final pedido no seu papel
  (padrão: {"summary","filesChanged","testsRun","confidence":"low|med|high","notes"}).
LIÇÕES RELEVANTES:
(nenhuma)


# Papel: triagem de falha

Resuma a causa raiz da falha dos gates da feature F-2.01 Repositório e regras de indicadores. Não edite arquivos.

## Gates que falharam
### G2 lint-format
yarn run v1.23.0-20220130.1630
$ eslint . --max-warnings=0

/Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.01/pulsar-claude/app/tests/rules/indicators.test.ts
  106:19  error  '_name' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)

error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

## Final da resposta do implementador
```json
{
  "summary": "Implementados o repositório de indicadores e o hook useIndicators com criação, edição protegida, arquivamento, restauração, reordenação por grupo e sincronização via onSnapshot. Security Rules agora validam schema, agregações, direção/faixa, ownership e imutabilidade após lockedAt.",
  "filesChanged": [
    "app/src/data/indicators.ts",
    "app/firestore.rules",
    ".harness/inbox/questions.jsonl"
  ],
  "testsRun": [
    "yarn test:unit — 139 testes aprovados",
    "yarn test:rules — 71 testes aprovados",
    "yarn typecheck — aprovado",
    "yarn format:check — aprovado",
    "ESLint de src/data/indicators.ts — aprovado",
    "yarn lint — bloqueado por _name não utilizado no teste protegido app/tests/rules/indicators.test.ts:106"
  ],
  "confidence": "med",
  "notes": "Nenhum teste protegido foi alterado. Não há e2e específico desta feature, pois ela não cria telas ou rotas. A limitação do lint global foi registrada em .harness/inbox/questions.jsonl."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
