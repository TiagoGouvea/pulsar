# Como testar — etapa 1 (Base)

Preview: (local) yarn dev

**O que dá para testar nesta etapa**
- Entrada anônima automática: o app abre sem cadastro, sem e-mail e sem tela de login, e o mesmo usuário continua depois de recarregar.
- Tutorial de 3 telas (Próximo/Voltar/Pular), que não reaparece depois de concluído ou pulado.
- Estrutura do app (AppShell): cabeçalho com o olho (modo de siglas/privado) e navegação inferior com o item ativo destacado.
- Tela de conta (/settings): aviso de conta anônima, salvar a conta com Google ou link mágico mantendo o mesmo UID, resolução de conflito quando a credencial já está em uso, sair (com confirmação na conta anônima) e excluir a conta (só depois de digitar EXCLUIR).

**O que ainda não existe**
- Cadastro e edição de indicadores, registro diário, dashboard com dados, tendências, insights e insights salvos, e convite para instalar a PWA. Essas rotas podem aparecer vazias ou como placeholder. Não é bug: chegam nas próximas etapas.

**Rodar localmente**
- Em `app/`: `yarn install` e depois `yarn e2e:serve` (sobe emuladores e seed). Abra http://localhost:4792. No celular, use http://IP-DA-MAQUINA:4792 na mesma rede Wi-Fi.
- O preview de produção não traz o login do usuário do seed (custom token, só dev/emulador) nem os dados do seed. Lá, Google e link mágico usam o Firebase real. No emulador, o login Google abre a tela falsa do Auth Emulator e o link mágico não chega por e-mail: ele aparece no log ou na UI do emulador.

**Roteiro (10–15 min, no celular)**
1. Abra o app numa aba anônima. Ele deve entrar direto no tutorial, sem pedir login.
2. Passe pelas 3 telas com Próximo e volte uma com Voltar. Na tela 3, confira o texto sobre correlação ≠ causalidade, o modo de siglas e a conta anônima. Conclua.
3. Recarregue a página. O tutorial não deve voltar e você continua no app.
4. Toque no olho do cabeçalho e veja o modo alternar. Navegue pelos itens da barra inferior: o item ativo fica destacado, e os botões devem ser fáceis de tocar (≥ 44px).
5. Vá em Conta/Configurações e confira o aviso de que perder o navegador pode significar perder os dados.
6. Toque em Sair. Deve aparecer uma confirmação explícita. Cancele.
7. Em Excluir conta, o botão fica desabilitado até você digitar EXCLUIR. Digite, confirme e veja o app voltar ao início como um usuário novo (o tutorial aparece de novo).
8. Salve a conta com Google (no emulador, crie uma conta fake). Ela deixa de ser anônima e o aviso some.
9. Com a conta salva, tente excluir. O app deve pedir reautenticação antes.
10. Opcional: numa segunda aba anônima, tente vincular o mesmo Google. Deve abrir a resolução com 'Cancelar' / 'Entrar na conta existente', e nada é mesclado nem apagado.
11. Procure em toda a UI campos de senha ou telefone. Não deve haver nenhum.

**No computador:** só confira que o layout estica e não tem rolagem horizontal (ex.: 1280×800).

**O que observar:** textos em pt-BR, nenhuma mensagem de sucesso quando a rede falha (teste em modo avião), nenhum overflow horizontal a 375px e nenhum dado do usuário anterior depois de excluir ou sair.
