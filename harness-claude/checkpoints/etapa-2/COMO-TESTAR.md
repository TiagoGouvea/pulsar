# Como testar — etapa 2 (Registro)

Preview: (local) yarn dev

## O que dá para testar nesta etapa
- Dashboard vazio de conta nova, com sugestões rápidas de indicadores e o agradecimento do primeiro registro.
- Criar e editar indicadores dos 4 tipos (sim/não, número, escala, ordinal), com sigla, emoji, direção desejada, faixa ideal, frequência e agregação.
- Bloqueio de edição quando o indicador já tem histórico: tipo, grupo, unidade, frequência e agregação ficam travados.
- Tela **Meus indicadores**: grupos Fatores e Resultados, reordenar com os botões subir/descer, arquivar e restaurar.
- **Preenchimento rápido** (/register): salvar só um indicador, limpar a resposta, aceitar vírgula decimal e mostrar o estado pendente quando offline.
- **Histórico** de registros por indicador, com exclusão confirmada para qualquer dia e sem edição de dias passados.
- Convite discreto para salvar a conta: aparece a partir do 3º dia distinto com registro.
- Modo privado (olho) em todas essas telas.

## O que ainda não existe
- Insights, hipóteses, tendências e comparações: os cartões e a tela /insights/:hypothesisKey chegam nas próximas etapas.
- Insights salvos: a rota /saved-insights existe, mas ainda sem conteúdo real.
- Textos gerados por IA e o convite de instalar a PWA.

## Rodar localmente
1. Em `app/`: `yarn install` e depois `yarn e2e:serve` (sobe os emuladores e o seed).
2. No computador, abra http://localhost:4792. No celular, abra http://IP-DA-MAQUINA:4792 na mesma rede Wi-Fi.
3. A rota `/_design` (catálogo do design system) e o login do usuário seed só existem no build de dev/emulador. Não aparecem no preview de produção.

## Roteiro (10–15 min, no celular)
1. **Conta nova** (aba anônima): o dashboard deve vir vazio, sem indicadores, mostrando as sugestões. Toque numa sugestão e confira que aparece exatamente um indicador.
2. **Criar indicador** (Meus indicadores → novo): deixe o nome vazio e confira a mensagem em pt-BR; com a sigla vazia, a prévia deve ser 'Abc...'. Crie um número com unidade e faixa ideal, e depois um ordinal com frequência única (o campo agregação não deve aparecer).
3. **Olho fechado**: os nomes viram siglas na lista e no registro. No campo de nome do editor, o nome real continua aparecendo. Abra o olho e os nomes e emojis aparecem; recarregue a página e tudo volta para siglas.
4. **Registrar** (/register): salve só um fator. No campo numérico o teclado deve ser decimal: digite '7,5'. Toque de novo numa resposta Sim/Não para limpá-la. Ative o modo avião, salve e confira que aparece 'pendente', nunca 'salvo'. Desative e o estado deve mudar para salvo.
5. **Histórico**: abra o indicador em Meus indicadores e veja o histórico. Os horários devem estar no seu fuso. Exclua um registro antigo (com confirmação) e confirme que não há como editar o valor.
6. **Editar com histórico**: no indicador que já tem registro, tipo, grupo, unidade e frequência devem estar bloqueados, e direção e faixa continuam editáveis.
7. **Reordenar e arquivar**: mova um item com subir/descer, recarregue e confira que a ordem se manteve. Arquive um indicador: ele vai para a seção de arquivados e some do /register. Depois restaure.
8. **Convite para salvar a conta**: com menos de 3 dias distintos com registro, ele não aparece. Não dá para simular dias passados pela interface, então confie no teste e2e ou confira com uma conta anônima que tenha registros em 3 dias. O convite nunca deve bloquear o uso.
9. **Computador**: abra as mesmas telas numa janela larga e confira só que a coluna fica centralizada e nada quebra.

## O que observar
- Todos os textos devem estar em pt-BR. Nunca deve aparecer 'salvo' antes de o registro ser gravado.
- Toques confortáveis, com alvos de pelo menos 44px.
- Nenhum nome real visível com o olho fechado, fora do campo de nome do editor e de notas abertas explicitamente.
