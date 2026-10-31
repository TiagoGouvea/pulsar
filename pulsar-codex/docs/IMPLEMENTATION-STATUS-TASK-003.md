# Status de Implementação - Task-003

**Tarefa:** Onboarding e estado inicial (REQ-1-002)  
**Data:** 31/10/2026

## Entregue

- Tutorial de três telas alinhado às referências `onboarding_1_fatores`, `onboarding_2_resultados` e `onboarding_3_associacoes`.
- Próximo e Voltar navegam entre as telas; Pular encerra o tutorial em qualquer etapa; todas as saídas persistem a conclusão.
- Conclusão gravada em `users/{uid}.onboardingCompleted` via Firestore e em marcador local por UID. O marcador local mantém o estado se o Firestore estiver indisponível ou as regras ainda não permitirem a escrita.
- `/` redireciona para o dashboard somente quando a conclusão é conhecida; primeiro acesso continua indo para `/onboarding`.
- Dashboard inicial com quatro sugestões opcionais: Exercício Físico e Café Expresso como Fatores; Nível de Energia e Concentração / Foco como Resultados.
- Nenhum indicador é criado na montagem da tela. A criação de sugestão só acontece no clique em “Adicionar”; “Criar meu próprio indicador” leva a `/indicators/new`.
- Sugestões aceitas usam os campos estruturados do modelo de indicador e ficam visíveis em “Seus indicadores”; há cache local por UID para manter a tela utilizável enquanto as Security Rules não estão disponíveis.
- Convite para salvar a conta aparece apenas depois de uma interação útil (adicionar sugestão ou abrir a criação de indicador próprio), é inline, dispensável e não bloqueia o dashboard.
- O convite não aparece para contas permanentes e a dispensa é persistida.

## Verificações executadas

```bash
yarn lint
yarn typecheck
yarn test
yarn build
E2E_PORT=3115 yarn test:e2e
```

Resultado: lint e typecheck sem erros; 61 testes Vitest + 9 testes das functions; build do app/functions concluído; E2E 60/60 em Chromium, Firefox, WebKit, Pixel 7 e iPhone 15, incluindo tutorial completo e reflow do dashboard vazio em 390, 430 e 1440 px.

## Limites deste bloco

- As Security Rules de isolamento por UID pertencem a REQ-1-003 (task-004). Até lá, o cache local evita que a tela inicial dependa de uma escrita permitida no Firestore.
- O formulário completo de criação/edição de indicador e o registro diário pertencem às tarefas seguintes; a ação “Criar meu próprio indicador” já aponta para a rota correspondente.
