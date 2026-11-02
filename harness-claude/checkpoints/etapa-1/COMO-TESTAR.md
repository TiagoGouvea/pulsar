# Como testar — etapa 1 (Base)

Preview: (local) yarn dev

**O que dá para testar nesta etapa:** só a base técnica. Existem o modelo de domínio de indicadores/registros, os utilitários de tempo, as regras de segurança do Firestore para o documento do usuário e o workspace de Cloud Functions com emulador. Tudo isso é verificado por testes automatizados, não por telas.

**O que ainda não existe:** acesso anônimo automático (F-1.03, bloqueada), AppShell com olho e navegação (F-1.04), fixtures de e2e, guarda do modo privado, tutorial, conversão de conta Google/link mágico, função deleteAccount (F-1.11, bloqueada) e tela de conta. Dashboard, registro e indicadores chegam em etapas futuras. Não espere telas funcionais no celular.

**Roteiro (10–15 min):**
1. Em `app/`, rode `yarn install`.
2. Rode `yarn test:unit` e confirme que passam os testes de domínio (F-1.01) e de tempo (F-1.02).
3. Rode `yarn --cwd app test:functions` e confirme que os testes das functions rodam contra os emuladores, com região southamerica-east1 (F-1.10).
4. Rode os testes de regras do Firestore e confirme que o UID A não acessa users/B e que campos desconhecidos são rejeitados (F-1.08).
5. Rode `yarn e2e:serve` e abra http://localhost:4792 (no celular, http://IP-DA-MAQUINA:4792 na mesma rede). Deve aparecer no máximo a casca inicial do app, sem fluxos completos.
6. No computador, confira apenas que a página não quebra ao redimensionar.

**No preview de produção** não aparecem rotas só de dev/emulador nem o seed.

**O que observar:** testes verdes, ausência de erros no console e nenhuma tela de login.
