# Riscos — etapa 0

| # | Feature | Risco | Prob. | Impacto | Sugestão | Status |
|---|---|---|---|---|---|---|
| R-1 | F-0.01 | Portas fixas dos emuladores (8080, 9099) e do preview (4173) colidem quando vários worktrees rodam e2e em paralelo; reuseExistingServer pode testar o app de outro worktree | alta | alto | Orquestrador serializar e2e/rules ou parametrizar portas por worktree (firebase.json gerado + E2E_BASE_URL) | aberto |
| R-2 | F-0.01 | Emulador do Firestore órfão após Playwright encerrar o webServer deixa a porta 8080 ocupada (observado na 2ª execução local) | média | médio | Orquestrador matar processos java/firebase do worktree ao fim de cada gate | aberto |
| R-3 | F-7.06 | Fonte Material Symbols completa tem ~3,6 MB no bundle | alta | médio | Subconjunto de ícones ou SVG inline (F-7.06) | aberto |
| R-4 | F-1.09 | Link mágico e popup do Google em e2e dependem de recursos do Auth Emulator (oobCodes, IdP fake); comportamento no iPhone PWA com sessão separada não é testável automaticamente | média | médio | Testes manuais em F-5.05 e uso de endpoints do emulador nos e2e | aberto |
| R-5 | F-6.02 | Vertex AI/Blaze/orçamento ainda não provisionados (checklist de preparação pendente) | alta | alto | Desenvolver com provedor fake no emulador; humano provisiona projeto dev antes do deploy | aberto |
| R-6 | F-2.07 | Regras com get()/getAfter() do indicador em cada registro aumentam leituras e custo e podem complicar batches | média | baixo | Manter registros simples e medir; limitar get() ao necessário | aberto |
