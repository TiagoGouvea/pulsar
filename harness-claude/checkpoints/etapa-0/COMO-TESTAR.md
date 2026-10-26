# Como testar — etapa 0 (Setup)

Preview: https://pulsar-claude--etapa-0-opqcsxol.web.app

1. Na pasta `app/`, rode `yarn e2e:serve`. Isso sobe os emuladores de auth e Firestore, roda o seed e serve o preview em http://localhost:4173.
2. No celular, abra o endereço da sua máquina na mesma rede (por exemplo http://IP-DA-MAQUINA:4173). No computador, só confira que o layout estica e desempilha sem quebrar.
3. O seed de demonstração carrega sozinho no `e2e:serve`: são 30 dias sintéticos terminando hoje, para o usuário de desenvolvimento.
4. Abra `/_design`. Ela só existe no emulador ou em dev. Percorra os componentes (Slider, switch, input, GroupBadge) e confira que os controles são fáceis de tocar com o polegar.
5. Em `/_design`, confira que o GroupBadge distingue Fator e Resultado pelo texto, não só pela cor.
6. Toque no olho (EyeToggle). Ele deve começar fechado, mostrando siglas. Ao abrir, os nomes aparecem e o emoji volta. Toque de novo para voltar às siglas.
7. Recarregue a página. O olho deve voltar fechado, porque o estado não é persistido.
8. Procure um indicador sem sigla. Ele deve mostrar as 3 primeiras letras do nome seguidas de '...'.
9. Gire o celular ou estreite a janela até 375px e confira que não há rolagem horizontal.
10. Rode `yarn test:visual` e `yarn test:rules` no computador. Os dois devem passar sem erros.
11. Confira que o build de produção (`yarn build` seguido de `yarn preview`) não tem a rota `/_design` e não aponta para os emuladores.
