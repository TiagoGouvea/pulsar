# Como testar — etapa 1 (Base)

Preview: (local) yarn dev

**O que dá para testar nesta etapa:** só a base técnica: modelo de domínio de indicadores, utilitários de tempo, regras do Firestore para `users/{uid}`, workspace de Cloud Functions com emulador e a function `deleteAccount`. Quase tudo isso é verificado por testes automatizados. Quase nada aparece na interface.

**O que ainda não existe:** acesso anônimo automático (F-1.03, bloqueada), AppShell com olho e navegação inferior (F-1.04), fixtures de e2e (F-1.05), guarda do modo privado (F-1.06), tutorial de três telas (F-1.07), conversão de conta com Google ou link mágico (F-1.09) e tela de conta com sair e excluir (F-1.12). Não espere ver essas telas no celular.

**Roteiro de 10–15 min:**
1. Em `app/`, rode `yarn install`. Rode também `yarn install` em `app/functions`.
2. Rode `yarn test:unit` e confira que os testes de domínio (F-1.01) e de tempo (F-1.02) passam.
3. Rode `yarn test:functions` e confira que as regras (F-1.08), o workspace (F-1.10) e `deleteAccount` (F-1.11) passam contra os emuladores. Em `deleteAccount`, confira a ordem da limpeza, o erro `requires-recent-login` e o isolamento entre UIDs.
4. Rode `yarn e2e:serve` (emuladores + seed) e abra http://localhost:4792. No celular, use http://IP-DA-MAQUINA:4792 na mesma rede. Espere uma tela básica ou vazia, sem tutorial, sem navegação inferior e sem login anônimo garantido, porque F-1.03 está bloqueada.
5. No computador, confira só que a página estica e não quebra.

**Preview de produção:** rotas e helpers só de dev/emulador, como o login por custom token do seed, não aparecem.

**O que observar:** nenhum erro vermelho no console no carregamento. Os testes de functions devem rodar na região southamerica-east1 e o build em `functions/lib` deve ficar fora do lint e do format.
